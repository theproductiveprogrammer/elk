package main

import (
	"fmt"
	"testing"
)

func TestLogParser(t *testing.T) {
	logfile := "sample_test.log"
	transformers := []LogTransform{
		LogTransform{
			FileNames: "test",
			Find:      "[a-z.]*Platform",
			Replace:   "PlatformService",
		},
		LogTransform{
			FileNames: "notfound",
			Match:     "https",
			Find:      "PlatformService",
			Replace:   "QuickService",
		},
		LogTransform{
			Match:   "77",
			Replace: "Seventy Seven",
		},
		LogTransform{
			Match: "78",
		},
	}
	log, err := ParseLog(logfile, transformers)
	log, err = ParseLog(logfile, nil)
	if err != nil {
		fmt.Println(err)
	} else {
		fmt.Println(log.name)
		for _, l := range log.lines {
			fmt.Println(l.raw)
		}
	}
}
