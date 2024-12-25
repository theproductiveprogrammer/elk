package main

import (
	"encoding/json"
	"fmt"
	"io/ioutil"
	"os"
	"path/filepath"
)

type FTPConfig struct {
	Name     string `json:"name"`
	IP       string `json:"ip"`
	User     string `json:"user"`
	Password string `json:"password"`
}

func (a *App) SaveFTPConfig(config FTPConfig) error {
	homeDir, err := os.UserHomeDir()
	if err != nil {
		return fmt.Errorf("failed to get home directory: %w", err)
	}
	appDataPath := filepath.Join(homeDir, "elkdata", config.Name)
	err = os.MkdirAll(appDataPath, os.ModePerm)
	if err != nil {
		return fmt.Errorf("failed to get create directory: %w", err)
	}
	configPath := filepath.Join(appDataPath, "ftpinfo.config")
	file, err := os.Create(configPath)
	if err != nil {
		return fmt.Errorf("failed to create config file: %w", err)
	}
	defer file.Close()

	encoder := json.NewEncoder(file)
	err = encoder.Encode(config)
	if err != nil {
		return fmt.Errorf("failed to write config: %w", err)
	}
	return nil
}

func (a *App) GetFTPConfig(name string) (*FTPConfig, error) {
	homeDir, err := os.UserHomeDir()
	if err != nil {
		return nil, fmt.Errorf("failed to get home directory: %w", err)
	}

	configPath := filepath.Join(homeDir, "elkdata", name, "ftpinfo.config")
	file, err := os.Open(configPath)
	if err != nil {
		return nil, fmt.Errorf("failed to open config file: %w", err)
	}
	defer file.Close()

	var config FTPConfig
	decoder := json.NewDecoder(file)
	err = decoder.Decode(&config)
	if err != nil {
		return nil, fmt.Errorf("failed to read config: %w", err)
	}

	return &config, nil
}

func (a *App) ListFTPConfigs() ([]string, error) {
	homeDir, err := os.UserHomeDir()
	if err != nil {
		return nil, fmt.Errorf("failed to get home directory: %w", err)
	}

	appDataPath := filepath.Join(homeDir, "elkdata")
	entries, err := ioutil.ReadDir(appDataPath)
	if err != nil {
		return nil, fmt.Errorf("failed to read app data directory: %w", err)
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
		return fmt.Errorf("failed to get home directory: %w", err)
	}

	configPath := filepath.Join(homeDir, "elkdata", name)
	err = os.RemoveAll(configPath)
	if err != nil {
		return fmt.Errorf("failed to delete ftp directory: %w", err)
	}

	return nil
}
