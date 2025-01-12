package main

import (
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
	"regexp"
	"strings"
	"time"
	"unicode"
)

type Log struct {
	Name  string    `json:"name"`
	Lines []LogLine `json:"lines"`
}

type LogLine struct {
	Num   int             `json:"num"`
	Level *string         `json:"level"`
	On    *time.Time      `json:"on_str"` // time gets converted to ISO string
	Src   *string         `json:"src"`
	Msg   string          `json:"msg"`
	JSON  json.RawMessage `json:"json"`
	Stack []string        `json:"stack"`
	Raw   string          `json:"raw"`
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

type jsonX struct {
	Line string          `json:"line"`
	JSON json.RawMessage `json:"json"`
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
		Name:  name,
		Lines: []LogLine{},
	}
	for _, line := range lines {
		ll := parseLogLine(line)

		if ll.Msg == "" && ll.Src == nil && ll.On == nil && ll.Raw != "" {

			if len(log.Lines) > 0 {
				last := &log.Lines[len(log.Lines)-1]
				addOverflowLine(&ll, last)
			} else {
				addOverflowLine(&ll, &ll)
				log.Lines = append(log.Lines, ll)
			}

		} else if len(log.Lines) > 0 {

			last := &log.Lines[len(log.Lines)-1]
			if (ll.On == nil && ll.Level == nil) && (last.On != nil || last.Level != nil) {
				addOverflowLine(&ll, last)
			} else {
				log.Lines = append(log.Lines, ll)
			}

		} else {
			log.Lines = append(log.Lines, ll)
		}
	}

	for i := 0; i < len(log.Lines); i++ {
		ll := &log.Lines[i]
		ll.Num = i + 1
		xtract := xtractJSON(ll.Msg)
		ll.Msg = xtract.Line
		ll.JSON = xtract.JSON
	}

	return &log, transformerError
}

func addOverflowLine(fromLL *LogLine, toLL *LogLine) {
	if len(toLL.Stack) > 0 || isStackLine(fromLL.Raw) {
		toLL.Stack = append(toLL.Stack, fromLL.Raw)
		return
	}

	if fromLL == toLL {
		return
	}

	if len(toLL.Msg) > 0 {
		toLL.Msg += "\n" + fromLL.Raw
	} else {
		toLL.Msg = fromLL.Raw
	}
	toLL.Raw += "\n" + fromLL.Raw
}

var stackRxx []*regexp.Regexp = []*regexp.Regexp{
	regexp.MustCompile(`[.][A-Za-z0-9]*Exception:`),
	regexp.MustCompile(`^\t+at\s`),
	regexp.MustCompile(`^\s*Exception in`),
	regexp.MustCompile(`^\s*Exception:`),
	regexp.MustCompile(`^\s*Traceback\s`),
	regexp.MustCompile(`^\s*Error\s.*:`),
	regexp.MustCompile(`^\s*error\s.*:`),
}

func isStackLine(msg string) bool {
	for _, rx := range stackRxx {
		if rx.MatchString(msg) {
			return true
		}
	}
	return false
}

var splitRx *regexp.Regexp = regexp.MustCompile(`\s`)

func parseLogLine(line string) LogLine {
	ll := LogLine{Raw: line}

	if line[0] == ' ' || line[0] == '\t' || line[0] == '}' {
		return ll
	}

	tokens := splitRx.Split(line, 10)

	src_count := 0
	eaten := 0

	for len(tokens) > 0 {

		if len(tokens[0]) == 0 {
			tokens = tokens[1:]
			eaten++
			continue

		}

		if len(tokens) > 0 && isSpecialChar(tokens[0]) {
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
			var pos int
			v, tokens, eaten_, pos = popLevel(tokens, ll.On == nil)
			eaten += eaten_
			ll.Level = v
			if ll.Level != nil {
				if pos > 0 {
					tkns := []string{}
					for _, tkn := range tokens[:pos] {
						if !isSpecialChar(tkn) {
							tkns = append(tkns, tkn)
							eaten += len(tkn) + 1
							src_count++
						} else {
							eaten += 2
						}
					}
					src := strings.Join(tkns, " ")
					if ll.Src == nil {
						ll.Src = &src
					} else {
						s := (*ll.Src) + " " + src
						ll.Src = &s
					}
					tokens = tokens[pos:]
				}
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
var alphaNumRx *regexp.Regexp = regexp.MustCompile(`^[A-Za-z0-9]`)
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
	if numdots > 2 && numdots < 5 {
		return true
	}

	// Check for thread-like or module-like patterns (e.g., [main])
	if strings.HasPrefix(token, "[") && strings.HasSuffix(token, "]") && strings.Index(token, "\"") == -1 {
		return true
	}

	if !alphaNumRx.MatchString(token) {
		return false
	}

	// Check if it's just a number
	if numRx.MatchString(token) {
		return true
	}

	return false
}

func popLevel(tokens []string, onlyfirst bool) (*string, []string, int, int) {
	levels := []string{"ERROR", "WARN", "DEBUG", "INFO", "TRACE", "INF", "ERR"}
	if len(tokens) == 0 {
		return nil, tokens, 0, 0
	}
	lookahead := 3
	if onlyfirst {
		lookahead = 1
	}
	for _, v := range levels {
		for i := 0; i < lookahead; i++ {

			if v == tokens[i] {
				return &v, append(tokens[:i], tokens[i+1:]...), len(v) + 1, i
			}
		}
	}
	return nil, tokens, 0, 0
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

func xtractJSON(line string) jsonX {
	x := jsonX{}
	if len(line) == 0 {
		return x
	}
	line = strings.TrimSpace(line)
	var startRune rune = rune(0)
	if strings.HasSuffix(line, "}") {
		startRune = '{'
	}
	if strings.HasSuffix(line, "]") {
		startRune = '['
	}
	if strings.HasSuffix(line, "\"") {
		startRune = '"'
	}
	if startRune == rune(0) {
		x.Line = line
		return x
	}
	for i, c := range line {
		if c == startRune {

			if c == '"' {
				var asString string
				err := json.Unmarshal([]byte(line[i:]), &asString)
				if err == nil {

					var parsedJSON json.RawMessage
					err = json.Unmarshal([]byte(asString), &parsedJSON)
					if err == nil {
						x.Line = line[:i]
						x.JSON = parsedJSON
						return x
					} else {
						json.Unmarshal([]byte(line[i:]), &parsedJSON)
						x.Line = line[:i]
						x.JSON = parsedJSON
					}

				}
			} else {

				var parsedJSON json.RawMessage
				err := json.Unmarshal([]byte(line[i:]), &parsedJSON)
				if err == nil {
					x.Line = line[:i]
					x.JSON = parsedJSON
					return x
				}
			}
		}
	}
	x.Line = line
	return x
}

func isSpecialChar(s string) bool {
	return len(s) == 1 &&
		!unicode.IsLetter(rune(s[0])) && !unicode.IsNumber(rune(s[0]))
}
