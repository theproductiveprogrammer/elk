package main

import (
	"fmt"
	"os"
	"path/filepath"
	"regexp"
	"strings"
	"time"
	"unicode"
)

type Log struct {
	name  string
	lines []LogLine
}

type LogLine struct {
	Level *string    `json:"level"`
	On    *time.Time `json:"on"`
	Src   *string    `json:"src"`
	Msg   string     `json:msg""`
	Raw   string     `json:"raw"`
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
		log.lines = append(log.lines, parseLogLine(line))
	}

	return &log, transformerError
}

var splitRx *regexp.Regexp = regexp.MustCompile(`\s`)

func parseLogLine(line string) LogLine {
	ll := LogLine{Raw: line}

	tokens := splitRx.Split(line, 10)

	src_count := 0
	eaten := 0

	for len(tokens) > 0 {

		if len(tokens[0]) == 0 {
			tokens = tokens[1:]
			eaten++
			continue

		}

		if len(tokens) > 0 &&
			len(tokens[0]) == 1 &&
			!unicode.IsLetter(rune(tokens[0][0])) && !unicode.IsNumber(rune(tokens[0][0])) {

			tokens = tokens[1:]
			eaten += 2
			continue
		}

		if ll.On == nil {
			var v *time.Time
			var eaten_ int
			v, tokens, eaten_ = popDatetime(tokens)
			eaten += eaten_
			ll.On = v
			if ll.On != nil {
				continue
			}
		}

		if ll.Level == nil {
			var v *string
			var eaten_ int
			v, tokens, eaten_ = popLevel(tokens)
			eaten += eaten_
			ll.Level = v
			if ll.Level != nil {
				continue
			}
		}

		if src_count < 3 {
			var src *string
			var eaten_ int
			src, tokens, eaten_ = popSource(tokens)
			eaten += eaten_
			if src != nil {
				src_count++
				if ll.Src == nil {
					ll.Src = src
				} else {
					s := (*ll.Src) + " " + *src
					ll.Src = &s
				}
				continue
			}
		}

		ll.Msg = line[eaten:]
		return ll

	}

	return ll
}

func popSource(tokens []string) (*string, []string, int) {
	if len(tokens) == 0 {
		return nil, tokens, 0
	}
	if isSource(tokens[0]) {
		return &tokens[0], tokens[1:], len(tokens[0]) + 1
	}
	return nil, tokens, 0
}

var numRx *regexp.Regexp = regexp.MustCompile(`^\d+$`)
var ipRx *regexp.Regexp = regexp.MustCompile(`^\d{1,3}(\.\d{1,3}){3}$`)

func isSource(token string) bool {
	// Check if it's an IP address
	if ipRx.MatchString(token) {
		return true
	}

	// Check if it's a file or class name (e.g., "file.py" or "myModule")
	exts := []string{
		".py", ".java", ".js",
	}
	for _, ext := range exts {
		if strings.HasSuffix(token, ext) {
			return true
		}
	}

	// Check if it is a java package name
	numdots := 0
	for _, c := range token {
		if c == '.' {
			numdots++
		}
	}
	if numdots > 2 {
		return true
	}

	// Check for thread-like or module-like patterns (e.g., [main])
	if strings.HasPrefix(token, "[") && strings.HasSuffix(token, "]") {
		return true
	}

	// Check if it's just a number
	if numRx.MatchString(token) {
		return true
	}

	return false
}

func popLevel(tokens []string) (*string, []string, int) {
	levels := []string{"ERROR", "WARN", "DEBUG", "INFO", "TRACE", "INF", "ERR"}
	if len(tokens) == 0 {
		return nil, tokens, 0
	}
	for _, v := range levels {
		if v == tokens[0] {
			return &tokens[0], tokens[1:], len(tokens[0]) + 1
		}
	}
	return nil, tokens, 0
}

var cleanRx *regexp.Regexp = regexp.MustCompile("[^0-9:]")

func popDatetime(tokens []string) (*time.Time, []string, int) {

	formats := []struct {
		format     string
		tokenCount int
	}{
		// W3C format: %Y-%m-%d %H:%M:%S
		{"2006-01-02 15:04:05", 2},
		// Standard golang formats
		{"2006-01-02T15:04:05Z0700", 1},
		{time.RFC3339, 1},
		{time.RFC1123Z, 6},
		{time.RFC1123, 6},
		{time.RFC850, 4},
		{time.RFC822Z, 5},
		{time.RFC822, 5},
		{time.RubyDate, 6},
		{time.UnixDate, 6},
		{time.ANSIC, 5},
		// Common format 1: %d/%b/%Y %H:%M:%S
		{"02/Jan/2006 15:04:05", 2},
		// Less common format: %d/%b/%Y:%H:%M:%S
		{"02/Jan/2006:15:04:05", 1},
		// IIS format: %m/%d/%Y, %H:%M:%S
		{"01/02/2006, 15:04:05", 2},
		// Common format 2: %d %b %Y %H:%M:%S
		{"02 Jan 2006 15:04:05", 4},
		// Common format 3: %Y %b %d %H:%M:%S
		{"2006 Jan 02 15:04:05", 4},
		// ISO 8601 format: %Y-%m-%d %H:%M:%S
		{"2006-01-02 15:04:05", 2},
		// RFC 3164 format: %b %d %H:%M:%S (default current year)
		{"Jan 02 15:04:05", 3},
		// Db2 format: %Y-%m-%d-%H.%M.%S
		{"2006-01-02-15.04.05Z07:00", 1},
		{"2006-01-02-15.04.05Z0700", 1},
	}

	for _, f := range formats {

		if len(tokens) > f.tokenCount {
			p := strings.Join(tokens[:f.tokenCount], " ")
			op := p
			if strings.HasPrefix(p, "[") && strings.HasSuffix(p, "]") {
				p = p[1 : len(p)-1]
			}
			t, err := time.Parse(f.format, p)
			if err == nil {
				if t.Year() < 1900 {
					t = time.Date(time.Now().Year(), t.Month(), t.Day(), t.Hour(), t.Minute(), t.Second(), t.Nanosecond(), t.Location())
				}
				return &t, tokens[f.tokenCount:], len(op) + 1
			}
		}
	}

	return nil, tokens, 0
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
