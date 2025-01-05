package main

import (
	"fmt"
)

func (a *App) ProcessFile(fileName string, fileContent []byte) string {
	fmt.Printf("Processing file: %s\n", fileName)
	fmt.Printf("File size: %d bytes\n", len(fileContent))

	return fmt.Sprintf("File '%s' processed successfully. Size: %d bytes", fileName, len(fileContent))
}
