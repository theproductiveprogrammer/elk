package main

import (
	"crypto/tls"
	"fmt"
	"os"
	"path/filepath"
	"sort"
	"strings"
	"sync"
	"time"

	"github.com/jlaffaye/ftp"
)

type FTPEntry struct {
	Name string `json:"name"`
	Size uint64 `json:"size"`
	Time int64  `json:"time"`
}

type SiteInfo struct {
	Name   string     `json:"name"`
	Config FTPConfig  `json:"ftpConfig"`
	Logs   []FTPEntry `json:"logs"`
	Error  string     `json:"error"`
}

func getConnection(config FTPConfig) (*ftp.ServerConn, error) {
	fmt.Println("Getting new connection for " + config.Name)

	tlsConfig := &tls.Config{InsecureSkipVerify: true}
	conn, err := ftp.Dial(config.IP+":21", ftp.DialWithExplicitTLS(tlsConfig))
	if err != nil {
		return nil, fmt.Errorf("failed to connect to FTP server: %w", err)
	}

	err = conn.Login(config.User, config.Password)
	if err != nil {
		conn.Quit()
		return nil, fmt.Errorf("failed to login to FTP server: %w", err)
	}

	return conn, nil
}

type connectionCache struct {
	conn *ftp.ServerConn
	mu   sync.Mutex
}

var ftpConnCache sync.Map

func getOrCreateConnection(config FTPConfig) (*ftp.ServerConn, error) {
	cacheKey := config.IP
	value, ok := ftpConnCache.Load(cacheKey)
	if !ok {
		conn, err := getConnection(config)
		if err != nil {
			return nil, err
		}
		newCacheEntry := &connectionCache{conn: conn}
		ftpConnCache.Store(cacheKey, newCacheEntry)
		return conn, nil
	}

	cached := value.(*connectionCache)
	cached.mu.Lock()
	defer cached.mu.Unlock()

	if err := cached.conn.NoOp(); err != nil {
		fmt.Println("Connection NOOP failed! " + config.Name)
		fmt.Println(err)
		cached.conn.Quit()
		conn, err := getConnection(config)
		if err != nil {
			return nil, err
		}
		cached.conn = conn
	}
	return cached.conn, nil
}

func entryFrom(ftpEntry *ftp.Entry) FTPEntry {
	var ret FTPEntry
	ret.Name = ftpEntry.Name
	ret.Size = ftpEntry.Size
	ret.Time = ftpEntry.Time.UnixMilli()
	return ret
}

func getFileInfos(config FTPConfig) ([]FTPEntry, error) {
	conn, err := getOrCreateConnection(config)
	if err != nil {
		return nil, fmt.Errorf("failed to connect to FTP server: %w", err)
	}

	err = conn.Login(config.User, config.Password)
	if err != nil {
		return nil, fmt.Errorf("failed to login to FTP server: %w", err)
	}

	entries, err := conn.List(".")
	if err != nil {
		return nil, fmt.Errorf("failed to list files: %w", err)
	}

	var logFiles []FTPEntry
	for _, entry := range entries {
		if strings.HasSuffix(entry.Name, ".log") && entry.Type == ftp.EntryTypeFile && entry.Size > 0 {
			logFiles = append(logFiles, entryFrom(entry))
		}
	}

	sort.Slice(logFiles, func(i, j int) bool {
		return strings.ToUpper(logFiles[i].Name) < strings.ToUpper(logFiles[j].Name)
	})

	return logFiles, nil
}

func (a *App) GetFileInfos(config FTPConfig) SiteInfo {
	logs, err := getFileInfos(config)
	site := SiteInfo{
		Name:   config.Name,
		Config: config,
		Logs:   []FTPEntry{},
		Error:  "",
	}
	if err != nil {
		site.Error = err.Error()
	} else {
		site.Logs = logs
	}
	return site
}

func (a *App) DownloadLogs(site SiteInfo) []error {
	homeDir, err := os.UserHomeDir()
	if err != nil {
		return []error{fmt.Errorf("failed to get home directory: %w", err)}
	}

	appDataPath := filepath.Join(homeDir, "elkdata", site.Name, "logs")
	err = os.MkdirAll(appDataPath, os.ModePerm)
	if err != nil {
		return []error{fmt.Errorf("failed to create logs directory: %w", err)}
	}

	conn, err := getOrCreateConnection(site.Config)
	if err != nil {
		return []error{fmt.Errorf("failed to connect to FTP server: %w", err)}
	}

	// Create a semaphore to limit parallelism
	const maxConcurrentDownloads = 5
	semaphore := make(chan struct{}, maxConcurrentDownloads)

	var wg sync.WaitGroup
	var mu sync.Mutex
	errors := []error{}

	for _, file := range site.Logs {
		wg.Add(1)

		// Acquire a semaphore slot
		semaphore <- struct{}{}

		go func(file FTPEntry) {
			defer wg.Done()
			defer func() { <-semaphore }() // Release semaphore slot

			localPath := filepath.Join(appDataPath, file.Name)

			// Check if file already exists
			stat, err := os.Stat(localPath)
			if err == nil {
				localSize := uint64(stat.Size())
				if localSize == file.Size {
					fmt.Printf("File %s already exists and size matches. Skipping...\n", file.Name)
					return
				}

				// Check if partial download is possible
				if localSize < file.Size {
					modTime := stat.ModTime()
					if time.Since(modTime) < 24*time.Hour {
						fmt.Printf("Resuming download for file %s...\n", file.Name)

						localFile, err := os.OpenFile(localPath, os.O_APPEND|os.O_WRONLY, os.ModePerm)
						if err != nil {
							mu.Lock()
							errors = append(errors, fmt.Errorf("failed to open local file %s: %w", localPath, err))
							mu.Unlock()
							return
						}
						defer localFile.Close()

						r, err := conn.RetrFrom(file.Name, localSize)
						if err != nil {
							mu.Lock()
							errors = append(errors, fmt.Errorf("failed to resume download for file %s: %w", file.Name, err))
							mu.Unlock()
							return
						}
						defer r.Close()

						_, err = localFile.ReadFrom(r)
						if err != nil {
							mu.Lock()
							errors = append(errors, fmt.Errorf("failed to append to file %s: %w", localPath, err))
							mu.Unlock()
							return
						}

						fmt.Printf("Resumed and completed download for file %s successfully\n", file.Name)
						return
					}
				}
			}

			fmt.Printf("Downloading file %s to %s...\n", file.Name, localPath)
			r, err := conn.Retr(file.Name)
			if err != nil {
				mu.Lock()
				errors = append(errors, fmt.Errorf("failed to download file %s: %w", file.Name, err))
				mu.Unlock()
				return
			}
			defer r.Close()

			localFile, err := os.Create(localPath)
			if err != nil {
				mu.Lock()
				errors = append(errors, fmt.Errorf("failed to create local file %s: %w", localPath, err))
				mu.Unlock()
				return
			}
			defer localFile.Close()

			_, err = localFile.ReadFrom(r)
			if err != nil {
				mu.Lock()
				errors = append(errors, fmt.Errorf("failed to save file %s: %w", localPath, err))
				mu.Unlock()
				return
			}

			fmt.Printf("Downloaded file %s successfully\n", file.Name)
		}(file)
	}

	wg.Wait()

	if len(errors) > 0 {
		for _, e := range errors {
			fmt.Println(e)
		}
	}

	return errors
}

func (a *App) DownloadLog(site SiteInfo, file FTPEntry) (string, error) {
	homeDir, err := os.UserHomeDir()
	if err != nil {
		return "", fmt.Errorf("failed to get home directory: %w", err)
	}

	appDataPath := filepath.Join(homeDir, "elkdata", site.Name, "logs")
	err = os.MkdirAll(appDataPath, os.ModePerm)
	if err != nil {
		return "", fmt.Errorf("failed to create logs directory: %w", err)
	}

	localPath := filepath.Join(appDataPath, file.Name)
	localSize := uint64(0)

	stat, staterr := os.Stat(localPath)
	if staterr == nil {
		localSize = uint64(stat.Size())
	}

	if localSize == file.Size {
		fmt.Printf("File %s already exists and size matches. No need to fetch...\n", file.Name)
		return readFile(localPath)
	}

	conn, err := getConnection(site.Config)
	if err != nil {
		return "", fmt.Errorf("failed to connect to FTP server: %w", err)
	}
	defer conn.Quit()

	// Check if partial download is possible
	if localSize > 1 && localSize < file.Size {
		modTime := stat.ModTime()
		if time.Since(modTime) < 24*time.Hour {
			fmt.Printf("Resuming download for file %s...\n", file.Name)

			localFile, err := os.OpenFile(localPath, os.O_APPEND|os.O_WRONLY, os.ModePerm)
			if err != nil {
				return "", fmt.Errorf("failed to open local file %s: %w", localPath, err)
			}
			defer localFile.Close()

			r, err := conn.RetrFrom(file.Name, localSize)
			if err != nil {
				return "", fmt.Errorf("failed to resume download for file %s: %w", file.Name, err)
			}
			defer r.Close()

			_, err = localFile.ReadFrom(r)
			if err != nil {
				return "", fmt.Errorf("failed to append to file %s: %w", localPath, err)
			}

			fmt.Printf("Resumed and completed download for file %s successfully\n", file.Name)
			return readFile(localPath)
		}
	}

	fmt.Printf("Downloading file %s to %s...\n", file.Name, localPath)
	r, err := conn.Retr(file.Name)
	if err != nil {
		return "", fmt.Errorf("failed to download file %s: %w", file.Name, err)
	}
	defer r.Close()

	localFile, err := os.Create(localPath)
	if err != nil {
		return "", fmt.Errorf("failed to create local file %s: %w", localPath, err)
	}
	defer localFile.Close()

	_, err = localFile.ReadFrom(r)
	if err != nil {
		return "", fmt.Errorf("failed to save file %s: %w", localPath, err)
	}

	fmt.Printf("Downloaded file %s successfully\n", file.Name)
	return readFile(localPath)
}

func readFile(p string) (string, error) {
	data, err := os.ReadFile(p)
	if err != nil {
		return "", err
	}
	return string(data), nil
}
