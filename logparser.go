package main

import (
	"fmt"
	"os"
	"path/filepath"
	"strings"
)

type Log struct {
	name  string
	lines []LogLine
}

type LogLine struct {
	full string
}

func ParseLog(logfile string) (*Log, error) {
	data, err := os.ReadFile(logfile)
	if err != nil {
		return nil, err
	}
	lines := strings.FieldsFunc(string(data), func(c rune) bool { return c == '\n' || c == '\r' })
	log := Log{
		name:  filepath.Base(logfile),
		lines: []LogLine{},
	}
	for _, line := range lines {
		log.lines = append(log.lines, LogLine{full: line})
	}
	return &log, nil
}

func main() {
	logfile := "/Users/charleslobo/elkdata/sandbox.vpn/logs/sandbox_proc_tracker.log"
	log, err := ParseLog(logfile)
	if err != nil {
		fmt.Println(err)
	} else {
		fmt.Println(log.name)
		for _, l := range log.lines {
			fmt.Println(l.full)
		}
	}
}
