package main

import (
	"crypto/tls"
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
	"sort"
	"strings"
	"sync"
	"time"

	"github.com/jlaffaye/ftp"
	"github.com/wailsapp/wails/v2/pkg/runtime"
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

func (a *App) getConnection(config FTPConfig) (*ftp.ServerConn, error) {
	runtime.LogInfo(a.ctx, fmt.Sprintf("Getting new connection for %s", config.Name))

	tlsConfig := &tls.Config{InsecureSkipVerify: true}
	conn, err := ftp.Dial(config.IP+":21", ftp.DialWithExplicitTLS(tlsConfig))
	if err != nil {
		err = fmt.Errorf("failed to connect to FTP server: %w", err)
		runtime.LogError(a.ctx, err.Error())
		return nil, err
	}

	err = conn.Login(config.User, config.Password)
	if err != nil {
		conn.Quit()
		err = fmt.Errorf("failed to login to FTP server: %w", err)
		runtime.LogError(a.ctx, err.Error())
		return nil, err
	}

	return conn, nil
}

type connectionCache struct {
	conn *ftp.ServerConn
	mu   sync.Mutex
}

var ftpConnCache sync.Map

func (a *App) getOrCreateConnection(config FTPConfig) (*ftp.ServerConn, error) {
	cacheKey := config.IP
	value, ok := ftpConnCache.Load(cacheKey)
	if !ok {
		conn, err := a.getConnection(config)
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
		runtime.LogWarning(a.ctx, "Connection NOOP failed! "+config.Name)
		runtime.LogError(a.ctx, err.Error())
		cached.conn.Quit()
		conn, err := a.getConnection(config)
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

func (a *App) getFileInfos(config FTPConfig) ([]FTPEntry, error) {
	var err error
	defer func() {
		if r := recover(); r != nil {
			err = fmt.Errorf("unexpected error occurred while fetching file infos: %v", r)
			runtime.LogError(a.ctx, err.Error())
		}
	}()

	runtime.LogInfo(a.ctx, fmt.Sprintf("FileInfos: %s", config.Name))

	conn, err := a.getOrCreateConnection(config)
	if err != nil {
		err = fmt.Errorf("failed to connect to FTP server: %w", err)
		runtime.LogError(a.ctx, err.Error())
		return nil, err
	}

	err = conn.Login(config.User, config.Password)
	if err != nil {
		err = fmt.Errorf("failed to login to FTP server: %w", err)
		runtime.LogError(a.ctx, err.Error())
		return nil, err
	}

	entries, err := conn.List(".")
	if err != nil {
		err = fmt.Errorf("failed to list files: %w", err)
		runtime.LogError(a.ctx, err.Error())
		return nil, err
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

	a.saveSiteInfoLocally(logFiles, config)

	runtime.LogInfo(a.ctx, fmt.Sprintf("returning %d logs for %s", len(logFiles), config.Name))
	return logFiles, nil
}

func (a *App) saveSiteInfoLocally(files []FTPEntry, config FTPConfig) {
	homeDir, err := os.UserHomeDir()
	if err != nil {
		err = fmt.Errorf("failed to get home directory: %w", err)
		runtime.LogError(a.ctx, err.Error())
		return
	}

	siteInfoPath := filepath.Join(homeDir, "elkdata", config.Name, "site.info")
	file, err := os.Create(siteInfoPath)
	if err != nil {
		err = fmt.Errorf("failed to create site info file: %w", err)
		runtime.LogError(a.ctx, err.Error())
		return
	}
	defer file.Close()

	encoder := json.NewEncoder(file)
	err = encoder.Encode(files)
	if err != nil {
		err = fmt.Errorf("failed to write ftp entries: %w", err)
		runtime.LogError(a.ctx, err.Error())
	}
}

func (a *App) getLocalFileInfos(config FTPConfig) ([]FTPEntry, error) {
	homeDir, err := os.UserHomeDir()
	if err != nil {
		err = fmt.Errorf("failed to get home directory: %w", err)
		runtime.LogError(a.ctx, err.Error())
		return nil, err
	}

	siteInfoPath := filepath.Join(homeDir, "elkdata", config.Name, "site.info")
	file, err := os.Open(siteInfoPath)
	if err != nil {
		err = fmt.Errorf("failed to open site info file: %w", err)
		runtime.LogError(a.ctx, err.Error())
		return nil, err
	}
	defer file.Close()

	var logs []FTPEntry
	encoder := json.NewDecoder(file)
	err = encoder.Decode(&logs)
	if err != nil {
		err = fmt.Errorf("failed to load ftp entries: %w", err)
		runtime.LogError(a.ctx, err.Error())
		return nil, err
	}
	return logs, nil
}

func (a *App) GetLocalFileInfos(config FTPConfig) SiteInfo {
	logs, err := a.getLocalFileInfos(config)
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

func (a *App) GetFileInfos(config FTPConfig) SiteInfo {
	logs, err := a.getFileInfos(config)
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

func (a *App) DownloadLog(site SiteInfo, file *FTPEntry) (*Log, error) {
	var err error
	defer func() {
		if r := recover(); r != nil {
			err = fmt.Errorf("unexpected error occurred while downloading log: %v", r)
			runtime.LogError(a.ctx, err.Error())
		}
	}()

	runtime.LogInfo(a.ctx, fmt.Sprintf("DownloadLog: %s", file.Name))

	homeDir, err := os.UserHomeDir()
	if err != nil {
		err = fmt.Errorf("failed to get home directory: %w", err)
		runtime.LogError(a.ctx, err.Error())
		return nil, err
	}

	appDataPath := filepath.Join(homeDir, "elkdata", site.Name, "logs")
	err = os.MkdirAll(appDataPath, os.ModePerm)
	if err != nil {
		err = fmt.Errorf("failed to create logs directory: %w", err)
		runtime.LogError(a.ctx, err.Error())
		return nil, err
	}

	localPath := filepath.Join(appDataPath, file.Name)
	localSize := uint64(0)
	since := 100 * time.Hour

	stat, staterr := os.Stat(localPath)
	if staterr == nil {
		localSize = uint64(stat.Size())
		modTime := stat.ModTime()
		since = time.Since(modTime)
	}

	if since.Hours() < 24 && localSize >= file.Size {
		runtime.LogInfo(a.ctx, fmt.Sprintf("File %s already exists and size fine (%d >= %d). No need to fetch...", file.Name, localSize, file.Size))
		return a.parseLog(localPath, nil)
	}

	conn, err := a.getConnection(site.Config)
	if err != nil {
		err = fmt.Errorf("failed to connect to FTP server: %w", err)
		runtime.LogError(a.ctx, err.Error())
		return nil, err
	}
	defer conn.Quit()

	runtime.LogInfo(a.ctx, fmt.Sprintf("analyzing %s: localSize: %d, fileSize: %d, since: %.2f", file.Name, localSize, file.Size, since.Hours()))
	if since.Hours() < 24 && localSize > 1000 {
		runtime.LogInfo(a.ctx, fmt.Sprintf("Downloading additional part for file %s...", file.Name))

		localFile, err := os.OpenFile(localPath, os.O_APPEND|os.O_WRONLY, os.ModePerm)
		if err != nil {
			return nil, fmt.Errorf("failed to open local file %s: %w", localPath, err)
		}
		defer localFile.Close()

		r, err := conn.RetrFrom(file.Name, localSize)
		if err != nil {
			return nil, fmt.Errorf("failed to download part for file %s: %w", file.Name, err)
		}
		defer r.Close()

		_, err = localFile.ReadFrom(r)
		if err != nil {
			return nil, fmt.Errorf("failed to append to file %s: %w", localPath, err)
		}

		runtime.LogInfo(a.ctx, fmt.Sprintf("Completed part download for file %s successfully", file.Name))
		return a.parseLog(localPath, nil)

	} else {

		runtime.LogInfo(a.ctx, fmt.Sprintf("Downloading file %s to %s...", file.Name, localPath))
		r, err := conn.Retr(file.Name)
		if err != nil {
			err = fmt.Errorf("failed to download file %s: %w", file.Name, err)
			runtime.LogError(a.ctx, err.Error())
			return nil, err
		}
		defer r.Close()

		localFile, err := os.Create(localPath)
		if err != nil {
			err = fmt.Errorf("failed to create local file %s: %w", localPath, err)
			runtime.LogError(a.ctx, err.Error())
			return nil, err
		}
		defer localFile.Close()

		_, err = localFile.ReadFrom(r)
		if err != nil {
			err = fmt.Errorf("failed to save file %s: %w", localPath, err)
			runtime.LogError(a.ctx, err.Error())
			return nil, err
		}

		runtime.LogInfo(a.ctx, fmt.Sprintf("Downloaded file %s successfully", file.Name))
		return a.parseLog(localPath, nil)
	}
}

func (a *App) FetchLocalLog(sitename string, filename string) (*Log, error) {
	var err error
	defer func() {
		if r := recover(); r != nil {
			err = fmt.Errorf("unexpected error occurred while fetching log data: %v", r)
			runtime.LogError(a.ctx, err.Error())
		}
	}()

	homeDir, err := os.UserHomeDir()
	if err != nil {
		err = fmt.Errorf("failed to get home directory: %w", err)
		runtime.LogError(a.ctx, err.Error())
		return nil, err
	}

	localPath := filepath.Join(homeDir, "elkdata", sitename, "logs", filename)
	log, err := a.parseLog(localPath, nil)
	if err != nil {
		err = fmt.Errorf("failed to get local log data for %s: %w", filename, err)
		runtime.LogError(a.ctx, err.Error())
		return nil, err
	}
	runtime.LogInfo(a.ctx, fmt.Sprintf("returning local data for log %s", filename))
	return log, nil
}

func (a *App) parseLog(logfile string, transformers []LogTransform) (*Log, error) {
	log, err := ParseLog(logfile, transformers)
	if err != nil {
		err = fmt.Errorf("failed parsing log %s: %w", logfile, err)
		runtime.LogError(a.ctx, err.Error())
	} else {
		runtime.LogInfo(a.ctx, fmt.Sprintf("returning %d parsed lines from :%s", len(log.Lines), logfile))
	}
	return log, err
}
