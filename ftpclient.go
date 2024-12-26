package main

import (
	"crypto/tls"
	"fmt"
	"os"
	"path/filepath"
	"strings"
	"sync"

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

func entryFrom(ftpEntry *ftp.Entry) FTPEntry {
	var ret FTPEntry
	ret.Name = ftpEntry.Name
	ret.Size = ftpEntry.Size
	ret.Time = ftpEntry.Time.UnixMilli()
	return ret
}

func (a *App) GetLogInfo(config FTPConfig) ([]FTPEntry, error) {
	tlsConfig := &tls.Config{
		InsecureSkipVerify: true,
	}
	conn, err := ftp.Dial(config.IP+":21", ftp.DialWithExplicitTLS(tlsConfig))
	if err != nil {
		return nil, fmt.Errorf("failed to connect to FTP server: %w", err)
	}
	defer conn.Quit()

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

	return logFiles, nil
}

func (a *App) DownloadLogs(config FTPConfig) error {
	homeDir, err := os.UserHomeDir()
	if err != nil {
		return fmt.Errorf("failed to get home directory: %w", err)
	}

	appDataPath := filepath.Join(homeDir, "elkdata", config.Name, "logs")
	err = os.MkdirAll(appDataPath, os.ModePerm)
	if err != nil {
		return fmt.Errorf("failed to create logs directory: %w", err)
	}

	conn, err := ftp.Dial(config.IP)
	if err != nil {
		return fmt.Errorf("failed to connect to FTP server: %w", err)
	}
	defer conn.Quit()

	err = conn.Login(config.User, config.Password)
	if err != nil {
		return fmt.Errorf("failed to login to FTP server: %w", err)
	}

	entries, err := conn.List(".")
	if err != nil {
		return fmt.Errorf("failed to list files: %w", err)
	}

	var logFiles []ftp.Entry
	for _, entry := range entries {
		if strings.HasSuffix(entry.Name, ".log") && entry.Type == ftp.EntryTypeFile && entry.Size > 0 {
			logFiles = append(logFiles, *entry)
		}
	}

	// Create a semaphore to limit parallelism
	const maxConcurrentDownloads = 5
	semaphore := make(chan struct{}, maxConcurrentDownloads)

	var wg sync.WaitGroup
	var mu sync.Mutex
	errors := []error{}

	for _, file := range logFiles {
		wg.Add(1)

		// Acquire a semaphore slot
		semaphore <- struct{}{}

		go func(file ftp.Entry) {
			defer wg.Done()
			defer func() { <-semaphore }() // Release semaphore slot

			localPath := filepath.Join(appDataPath, file.Name)

			if stat, err := os.Stat(localPath); err == nil && uint64(stat.Size()) == file.Size {
				fmt.Printf("File %s already exists and size matches. Skipping...\n", file.Name)
				return
			}

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
		return fmt.Errorf("some files failed to download")
	}

	return nil
}

func (a *App) GetSiteInfos(infos []SiteInfo) []SiteInfo {
	var updated []SiteInfo
	for _, info := range infos {
		logs, err := a.GetLogInfo(info.Config)
		if err != nil {
			info.Error = err.Error()
		} else {
			info.Logs = logs
		}
		updated = append(updated, info)
	}
	return updated
}
