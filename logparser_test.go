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
		fmt.Println(log.Name)
		for _, l := range log.Lines {
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
		`2025-01-02 11:44:34,772 4417770 [qtp466002798-101] DEBUG c.salesboxai.platform.api.Platform - api call /suppression-list/by-sql com.salesboxai.platform.dto.SuppressionListParams@1f54c2c2 response: [{"id":31,"created":1694851539000,"modified":1694851539000,"createdBy_id":4670,"deleted":0,"modifiedBy_id":4670,"owner_id":4670,"tenant_id":2151,"name":"account list","type":"Account","count":1},{"id":34,"created":1695203849000,"modified":1695203849000,"createdBy_id":6029,"deleted":0,"modifiedBy_id":6029,"owner_id":6029,"tenant_id":2810,"name":"account tenant one","type":"Account","count":1},{"id":39,"created":1695278181000,"modified":1701064950000,"createdBy_id":4670,"deleted":1,"modifiedBy_id":4670,"owner_id":4670,"tenant_id":2151,"name":"suppression tenat 1","type":"Account","count":4},{"id":69,"created":1697179820000,"modified":1697184148000,"createdBy_id":4670,"deleted":1,"modifiedBy_id":4670,"owner_id":4670,"tenant_id":2151,"name":"account sup dd","type":"Account","count":1},{"id":72,"created":1697183693000,"modified":1697184130000,"createdBy_id":4670,"deleted":1,"modifiedBy_id":4670,"owner_id":4670,"tenant_id":2151,"name":"tenantaccount","type":"Account","count":1},{"id":78,"created":1698133547000,"modified":1698133799000,"createdBy_id":5922,"deleted":0,"modifiedBy_id":5922,"owner_id":5922,"tenant_id":2765,"name":"live suppression list -36152\tGlobalization Partner","type":"Account","count":698681},{"id":79,"created":1698134442000,"modified":1698134442000,"createdBy_id":5922,"deleted":0,"modifiedBy_id":5922,"owner_id":5922,"tenant_id":2765,"name":"live suppression list -36152 Globalization list 2","type":"Account","count":354062},{"id":109,"created":1699344737000,"modified":1701064926000,"createdBy_id":4670,"deleted":1,"modifiedBy_id":4670,"owner_id":4670,"tenant_id":2151,"name":"sbox","type":"Account"},{"id":111,"created":1699432200000,"modified":1699432200000,"createdBy_id":5990,"deleted":0,"modifiedBy_id":5990,"owner_id":5990,"tenant_id":2788,"name":"Acceight","type":"Account","count":2},{"id":112,"created":1699432468000,"modified":1699432468000,"createdBy_id":5990,"deleted":0,"modifiedBy_id":5990,"owner_id":5990,"tenant_id":2788,"name":"tenanteight","type":"Account","count":2},{"id":122,"created":1701070711000,"modified":1701078347000,"createdBy_id":4670,"deleted":1,"modifiedBy_id":4670,"owner_id":4670,"tenant_id":2151,"name":"suppression account list one","type":"Account","count":1},{"id":123,"created":1701070754000,"modified":1701070754000,"createdBy_id":4670,"deleted":0,"modifiedBy_id":4670,"owner_id":4670,"tenant_id":2151,"name":"suppression account list two","type":"Account","count":1},{"id":126,"created":1701082180000,"modified":1701082180000,"createdBy_id":4670,"deleted":0,"modifiedBy_id":4670,"owner_id":4670,"tenant_id":2151,"name":"suppression tenant level account suppression","type":"Account","count":1},{"id":127,"created":1701089041000,"modified":1701089041000,"createdBy_id":2014,"deleted":0,"modifiedBy_id":2014,"owner_id":2014,"tenant_id":1504,"name":"NovDomain","type":"Account","count":3},{"id":129,"created":1701153616000,"modified":1701153616000,"createdBy_id":4666,"deleted":0,"modifiedBy_id":4666,"owner_id":4666,"tenant_id":2149,"name":"account suppression","type":"Account","count":1},{"id":141,"created":1704699190000,"modified":1704699190000,"createdBy_id":2014,"deleted":0,"modifiedBy_id":2014,"owner_id":2014,"tenant_id":1504,"name":"TesAcc","type":"Account","count":4},{"id":144,"created":1704775917000,"modified":1704777374000,"createdBy_id":4670,"deleted":1,"modifiedBy_id":4670,"owner_id":4670,"tenant_id":2151,"name":"account suppression jan 9 1","type":"Account","count":1},{"id":145,"created":1704775974000,"modified":1704775974000,"createdBy_id":4670,"deleted":0,"modifiedBy_id":4670,"owner_id":4670,"tenant_id":2151,"name":"account suppression jan 9 2","type":"Account","count":1},{"id":153,"created":1705390391000,"modified":1706871532000,"createdBy_id":2014,"deleted":0,"modifiedBy_id":2014,"owner_id":2014,"tenant_id":1504,"name":"989","type":"Account"},{"id":186,"created":1707818676000,"modified":1707818676000,"createdBy_id":4670,"deleted":0,"modifiedBy_id":4670,"owner_id":4670,"tenant_id":2151,"name":"sdfsdf","type":"Account"},{"id":189,"created":1707824816000,"modified":1707824816000,"createdBy_id":6016,"deleted":0,"modifiedBy_id":6016,"owner_id":6016,"tenant_id":2803,"name":"suppression","type":"Account","count":3}]`,
		`2025-01-02 11:49:38,107 4721105 [qtp466002798-121] DEBUG c.salesboxai.platform.api.Platform - api call /recommendations/campaign com.r2.dto.RecommendationDTO@6508d930 response: "{\"campaignStatus\":\"Active\",\"campaignStatusMsg\":\"Campaign is **Active**\",\"totalRequired\":10,\"totalPending\":15,\"monthlyRequired\":5,\"monthlyPending\":15,\"requiredMsg\":\"Campaign requires **10** more leads in total, and **5** more leads this month!\",\"message\":\"- Close to the lead goal for the parent \\\"give\\\" for this month -- Discovery paused until some pending leads are accepted or rejected.\"}"`,
		`2025-01-02 11:49:38,107 4721105 [qtp466002798-121] DEBUG c.salesboxai.platform.api.Platform - api call /recommendations/campaign com.r2.dto.RecommendationDTO@6508d930 response: "call rejected"`,
		`2025-01-04 01:24:09,867 118978 [scheduled-executor-thread-1] DEBUG i.m.context.DefaultBeanContext - Finalized bean definitions candidates: [Definition: io.micronaut.management.health.indicator.diskspace.DiskSpaceIndicator, Definition: io.micronaut.management.health.indicator.discovery.DiscoveryClientHealthIndicator, Definition: io.micronaut.management.health.indicator.service.ServiceReadyHealthIndicator]`,
	}
	for _, test := range tests {
		xtract := xtractJSON(test)
		json, _ := json.MarshalIndent(xtract, "", "  ")
		fmt.Println(string(json))
	}
}
