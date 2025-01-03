package main

import (
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"

	"github.com/wailsapp/wails/v2/pkg/runtime"
)

type FTPConfig struct {
	Name         string         `json:"name"`
	IP           string         `json:"ip"`
	User         string         `json:"user"`
	Password     string         `json:"password"`
	Transformers []LogTransform `json:"transformers"`
}

func (a *App) SaveFTPConfig(config FTPConfig) error {
	homeDir, err := os.UserHomeDir()
	if err != nil {
		err = fmt.Errorf("failed to get home directory: %w", err)
		runtime.LogError(a.ctx, err.Error())
		return err
	}
	appDataPath := filepath.Join(homeDir, "elkdata", config.Name)
	err = os.MkdirAll(appDataPath, os.ModePerm)
	if err != nil {
		err = fmt.Errorf("failed to get create directory: %w", err)
		runtime.LogError(a.ctx, err.Error())
		return err
	}
	configPath := filepath.Join(appDataPath, "ftpinfo.config")
	file, err := os.Create(configPath)
	if err != nil {
		err = fmt.Errorf("failed to create config file: %w", err)
		runtime.LogError(a.ctx, err.Error())
		return err
	}
	defer file.Close()

	encoder := json.NewEncoder(file)
	err = encoder.Encode(config)
	if err != nil {
		err = fmt.Errorf("failed to write config: %w", err)
		runtime.LogError(a.ctx, err.Error())
		return err
	}
	return nil
}

func (a *App) GetFTPConfig(name string) (*FTPConfig, error) {
	homeDir, err := os.UserHomeDir()
	if err != nil {
		err = fmt.Errorf("failed to get home directory: %w", err)
		runtime.LogError(a.ctx, err.Error())
		return nil, err
	}

	configPath := filepath.Join(homeDir, "elkdata", name, "ftpinfo.config")
	file, err := os.Open(configPath)
	if err != nil {
		err = fmt.Errorf("failed to open config file: %w", err)
		runtime.LogError(a.ctx, err.Error())
		return nil, err
	}
	defer file.Close()

	var config FTPConfig
	decoder := json.NewDecoder(file)
	err = decoder.Decode(&config)
	if err != nil {
		err = fmt.Errorf("failed to read config: %w", err)
		runtime.LogError(a.ctx, err.Error())
		return nil, err
	}

	return &config, nil
}

func (a *App) ListFTPConfigs() ([]string, error) {
	homeDir, err := os.UserHomeDir()
	if err != nil {
		err = fmt.Errorf("failed to get home directory: %w", err)
		runtime.LogError(a.ctx, err.Error())
		return nil, err
	}

	appDataPath := filepath.Join(homeDir, "elkdata")
	entries, err := os.ReadDir(appDataPath)
	if err != nil {
		err = fmt.Errorf("failed to read app data directory: %w", err)
		runtime.LogError(a.ctx, err.Error())
		return nil, err
	}

	var configNames []string
	for _, entry := range entries {
		if entry.IsDir() {
			configNames = append(configNames, entry.Name())
		}
	}

	return configNames, nil
}

func (a *App) DeleteFTPConfig(name string) error {
	homeDir, err := os.UserHomeDir()
	if err != nil {
		err = fmt.Errorf("failed to get home directory: %w", err)
		runtime.LogError(a.ctx, err.Error())
		return err
	}

	configPath := filepath.Join(homeDir, "elkdata", name)
	err = os.RemoveAll(configPath)
	if err != nil {
		err = fmt.Errorf("failed to delete ftp directory: %w", err)
		runtime.LogError(a.ctx, err.Error())
		return err
	}

	return nil
}
