package main

import (
	"encoding/json"
	"fmt"
	"strings"
	"testing"
	"time"
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
			json, _ := json.MarshalIndent(l, "", "  ")
			fmt.Println(string(json))
		}
	}
}

func TestDateParser(testing *testing.T) {
	tests := []string{
		"2022-04-17 11:25:12.345 This is a test",
		"17/Apr/2022 11:25:12.345 Another test",
		"17/Apr/2022:11:25:12.345 Some other test",
		"04/17/2022, 11:25:12.345 More test",
		"17 Apr 2022 11:25:12.345 Yet another test",
		"2022 Apr 17 11:25:12.345 Example again",
		"2022-04-17 11:25:12.345 ISO 8601 format",
	}

	std := time.Date(2022, 04, 17, 11, 25, 12, 345*1e6, time.UTC)

	for _, line := range tests {
		tokens := strings.Fields(line)
		t, _, _ := popDatetime(tokens)
		if t == nil {
			testing.Errorf("Failed test \"%s\"", line)
		} else if !t.Equal(std) {
			testing.Errorf("Date incorrect: \"%s\" => %s", line, t.Format(time.RFC3339Nano))
		}
	}

	std = time.Date(2022, 04, 17, 11, 25, 12, 345*1e6, time.FixedZone("Custom", -10*60*60))
	line := "2022-04-17T11:25:12.345-10:00 RFC 3339 format"
	tokens := strings.Fields(line)
	t, _, _ := popDatetime(tokens)
	if t == nil || !t.Equal(std) {
		testing.Errorf("Failed test \"%s\"", line)
	}

	std = time.Date(2022, 04, 17, 11, 25, 12, 345*1e6, time.FixedZone("Custom", 10*60*60))
	line = "2022-04-17T11:25:12.345+1000 RFC 3339 format"
	tokens = strings.Fields(line)
	t, _, _ = popDatetime(tokens)
	if t == nil || !t.Equal(std) {
		testing.Errorf("Failed test \"%s\" => %s", line, t.Format(time.RFC3339Nano))
	}

	std = time.Date(time.Now().Year(), 04, 17, 11, 25, 12, 0, time.UTC)
	line = "Apr 17 11:25:12 Default year"
	tokens = strings.Fields(line)
	t, _, _ = popDatetime(tokens)
	if t == nil || !t.Equal(std) {
		testing.Errorf("Failed test \"%s\" => %s", line, t.Format(time.RFC3339Nano))
	}

	std = time.Date(2022, 05, 17, 11, 25, 12, 114*1e6, time.FixedZone("Custom", -3*60*60))
	line = "2022-05-17-11.25.12.114000-0300 Db2 format"
	tokens = strings.Fields(line)
	t, _, _ = popDatetime(tokens)
	if t == nil || !t.Equal(std) {
		testing.Errorf("Failed test \"%s\" => %s", line, t.Format(time.RFC3339Nano))
	}

}

func TestJsonExtractor(testing *testing.T) {
	tests := []string{
		`abc def ghi hkl mno abc def ghi hkl mno abc def ghi hkl mno`,
		`123 456 789 {"this":"is","json":{"valid":1}}`,
		`9828823 {"this":"should be ignored"}, but not {"this":"json"}`,
		`and more strings`,
		`and more {"json":1,"more":{"json":3},"here":true}`,
	}
	for _, test := range tests {
		xtract := xtractJSON(test)
		json, _ := json.MarshalIndent(xtract, "", "  ")
		fmt.Println(string(json))
	}
}
