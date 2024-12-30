package main

import (
	"fmt"
	"os"
	"path/filepath"
	"regexp"
	"strings"
)

type Log struct {
	name  string
	lines []LogLine
}

type LogLine struct {
	full string
}

type LogTransform struct {
	FileNames string `json:"filenames"`
	Match     string `json:"match"`
	Find      string `json:"find"`
	Replace   string `json:"replace"`
}

type CompiledTransformer struct {
	FileNames *regexp.Regexp
	Match     *regexp.Regexp
	Find      *regexp.Regexp
	Replace   string
}

func ParseLog(logfile string, transformers []LogTransform) (*Log, error) {
	data, err := os.ReadFile(logfile)
	if err != nil {
		return nil, err
	}
	name := filepath.Base(logfile)
	lines := strings.FieldsFunc(string(data), func(c rune) bool { return c == '\n' || c == '\r' })
	lines, transformerError := applyTransformers(transformers, name, lines)

	log := Log{
		name:  name,
		lines: []LogLine{},
	}
	for _, line := range lines {
		log.lines = append(log.lines, LogLine{full: line})
	}

	return &log, transformerError
}

func applyTransformers(transformers []LogTransform, name string, lines []string) ([]string, error) {
	if transformers == nil {
		return lines, nil
	}

	trs := []*CompiledTransformer{}
	errs := []error{}
	for _, transformer := range transformers {
		ct, err := compile(transformer)
		if err != nil {
			errs = append(errs, err)
		} else {
			trs = append(trs, ct)
		}
	}

	for _, tr := range trs {
		lines = applyTransformer(tr, name, lines)
	}

	if len(errs) > 0 {
		return nil, errs[0]
	}
	return lines, nil
}

func compile(t LogTransform) (*CompiledTransformer, error) {
	ret := CompiledTransformer{}
	if t.FileNames != "" {
		r, err := regexp.Compile(t.FileNames)
		if err != nil {
			return nil, fmt.Errorf("Failed to compile transformer: %s", t.FileNames)
		}
		ret.FileNames = r
	}
	if t.Match != "" {
		r, err := regexp.Compile(t.Match)
		if err != nil {
			return nil, fmt.Errorf("Failed to compile transformer: %s", t.Match)
		}
		ret.Match = r
	}
	if t.Find != "" {
		r, err := regexp.Compile(t.Find)
		if err != nil {
			return nil, fmt.Errorf("Failed to compile transformer: %s", t.Find)
		}
		ret.Find = r
	}

	ret.Replace = t.Replace

	return &ret, nil
}

func applyTransformer(transformer *CompiledTransformer, name string, lines []string) []string {

	if transformer.FileNames != nil && transformer.FileNames.FindStringIndex(name) == nil {
		return lines
	}

	ret := []string{}
	for _, line := range lines {

		if transformer.Match != nil && transformer.Match.FindStringIndex(line) == nil {
			ret = append(ret, line)
			continue
		}

		if transformer.Find != nil {
			line = transformer.Find.ReplaceAllString(line, transformer.Replace)
			ret = append(ret, line)
		} else {
			if transformer.Replace != "" {
				ret = append(ret, transformer.Replace)
			}
		}
	}
	return ret
}

func main() {
	logfile := "/Users/charleslobo/elkdata/Test/logs/test.log"
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
	if err != nil {
		fmt.Println(err)
	} else {
		fmt.Println(log.name)
		for _, l := range log.lines {
			fmt.Println(l)
		}
	}
}
