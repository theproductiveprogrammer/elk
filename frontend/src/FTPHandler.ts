import {
	GetFTPConfig,
	ListFTPConfigs,
	GetFileInfos,
	DownloadLogs,
	DownloadLog,
} from "../wailsjs/go/main/App";

import { main } from "../wailsjs/go/models";
import { LogError, LogInfo, LogWarning } from "./logger";

interface FetchInfo {
	fetching: boolean;
	at: number;
}

interface FetchedInfo {
	fileInfo: FetchInfo;
	fileData: FetchInfo;
}

interface CachedSite {
	fi: FetchedInfo;
	site: main.SiteInfo;
}

type CachedSites = Record<string, CachedSite>;

const CACHE: CachedSites = {};

export async function loadFTPInfos(): Promise<main.SiteInfo[]> {
	const names = await ListFTPConfigs();
	const infos = [];
	for (const name of names) {
		const info = await GetFTPConfig(name);
		infos.push(info);
	}

	infos.forEach((i) => {
		if (!CACHE[i.name]) {
			const site = main.SiteInfo.createFrom({
				name: i.name,
				ftpConfig: i,
			});
			CACHE[i.name] = {
				site,
				fi: {
					fileInfo: { fetching: false, at: 0 },
					fileData: { fetching: false, at: 0 },
				},
			};
		} else {
			CACHE[i.name].site.ftpConfig = i;
		}
	});

	const ret: main.SiteInfo[] = [];
	Object.keys(CACHE)
		.sort()
		.map((k) => ret.push(CACHE[k].site));

	return ret;
}

let downloadingLog = false;
export async function downloadLog(
	sitename: string,
	logname: string
): Promise<string> {
	while (downloadingLog) {
		await new Promise((resolve) => setTimeout(resolve, 500));
	}
	downloadingLog = true;

	try {
		const cached = CACHE[sitename];
		if (!cached) {
			throw `Failed to get site info for: "${sitename}"`;
		}
		cached.fi.fileInfo.at = 0;
		const log = cached.site.logs.filter((log) => log.name === logname)[0];
		if (!log) throw `UNEXPECTED ERROR: 77778 ${logname} info not found`;
		const data = await DownloadLog(cached.site, log);
		downloadingLog = false;
		return data;
	} catch (err) {
		downloadingLog = false;
		throw err;
	}
}

const FETCH_CYCLE_TIME = 40 * 1000;
const FETCH_ERR_CYCLE_TIME = 120 * 1000;
const WAIT_TIME = 500;

export async function loadFileInfos(n: string): Promise<main.SiteInfo> {
	const entry = CACHE[n];
	if (!entry.fi.fileInfo.at) {
		while (!entry.fi.fileInfo.at) {
			await new Promise((resolve) => setTimeout(resolve, WAIT_TIME));
		}
	}
	return entry.site;
}

function backgroundLoadFileInfos() {
	Object.keys(CACHE).forEach(bgLoadFileInfos);
}
async function bgLoadFileInfos(name: string) {
	const entry = CACHE[name];
	if (entry.fi.fileInfo.fetching) return;
	const s = Date.now();
	if (entry.site.error && s - entry.fi.fileInfo.at < FETCH_ERR_CYCLE_TIME)
		return;
	if (s - entry.fi.fileInfo.at < FETCH_CYCLE_TIME) return;
	entry.fi.fileInfo.fetching = true;
	entry.site = await GetFileInfos(entry.site.ftpConfig);
	entry.fi.fileInfo.at = Date.now();
	entry.fi.fileInfo.fetching = false;
	if (entry.site.error) {
		LogWarning(`error loading ${name}: ${entry.site.error}`);
	} else {
		LogInfo(
			`loaded file info for: ${name} in ${Math.round((entry.fi.fileInfo.at - s) / 1000)}s`
		);
	}
}

function backgroundDownload() {
	Object.keys(CACHE).forEach(bgDownload);
}
async function bgDownload(name: string) {
	const entry = CACHE[name];
	if (entry.site.error) return;

	if (entry.fi.fileData.fetching) return;

	const s = Date.now();
	if (s - entry.fi.fileData.at < FETCH_CYCLE_TIME) return;
	LogInfo(`downloading files for: ${name}`);
	entry.fi.fileData.fetching = true;
	const errors = await DownloadLogs(entry.site);
	entry.fi.fileData.at = Date.now();
	entry.fi.fileData.fetching = false;
	if (errors && errors.length) {
		LogError(`Failed downloading files in ${name}`);
		errors.forEach((err) => {
			if (err.toString) LogError(err.toString());
			else LogError(JSON.stringify(err));
		});
	} else {
		LogInfo(
			`downloaded files for: ${name} in ${Math.round((entry.fi.fileInfo.at - s) / 1000)}s`
		);
	}
}

async function backgroundLoad() {
	while (true) {
		const keys = Object.keys(CACHE);
		if (!keys.length) {
			await new Promise((resolve) => setTimeout(resolve, WAIT_TIME));
			continue;
		}
		await new Promise((resolve) => setTimeout(resolve, WAIT_TIME));
		backgroundLoadFileInfos();
		if (0) backgroundDownload();
	}
}
backgroundLoad();
