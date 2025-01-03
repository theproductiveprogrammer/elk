import {
	GetFTPConfig,
	ListFTPConfigs,
	GetFileInfos,
	GetLocalFileInfos,
	DownloadLog,
} from "../wailsjs/go/main/App";

import { main } from "../wailsjs/go/models";
import { LogInfo, LogWarning } from "./logger";

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
): Promise<main.Log> {
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

export async function loadLocalFileInfos(name: string): Promise<main.SiteInfo> {
	const entry = CACHE[name];
	LogInfo(`getting local site info for ${name}`);
	const localSite = await GetLocalFileInfos(entry.site.ftpConfig);
	if (!localSite) LogInfo(`Did not get any local site info...`);
	else LogInfo(`Got local file info ${JSON.stringify(localSite)}`);
	return localSite;
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

async function backgroundLoad() {
	while (true) {
		const keys = Object.keys(CACHE);
		if (!keys.length) {
			await new Promise((resolve) => setTimeout(resolve, WAIT_TIME));
			continue;
		}
		await new Promise((resolve) => setTimeout(resolve, WAIT_TIME));
		backgroundLoadFileInfos();
	}
}
backgroundLoad();
