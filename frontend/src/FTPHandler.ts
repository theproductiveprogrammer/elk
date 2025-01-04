import {
	GetFTPConfig,
	ListFTPConfigs,
	GetFileInfos,
	GetLocalFileInfos,
	DownloadLog,
	FetchLocalLog,
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
		const site = await loadFileInfos(sitename);
		const log = site.logs.filter((log) => log.name === logname)[0];
		if (!log) throw `UNEXPECTED ERROR: 77778 ${logname} info not found`;
		const data = await DownloadLog(site, log);
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
	else LogInfo(`Got local file info for ${name}`);
	return localSite;
}

export async function fetchLocalLog(
	sitename?: string,
	logname?: string
): Promise<main.Log> {
	if (!sitename) throw `cannot fetchLocalLog: sitename null`;
	if (!logname) throw `cannot fetchLocalLog: logname null`;
	return await FetchLocalLog(sitename, logname);
}

const WAIT_TIME = 500;

export async function loadFileInfos(n: string): Promise<main.SiteInfo> {
	const entry = CACHE[n];
	if (!entry) throw `unexpected error! did not find ${n} in cache`;
	if (entry.fi.fileInfo.fetching) {
		while (entry.fi.fileInfo.fetching) {
			await new Promise((resolve) => setTimeout(resolve, WAIT_TIME));
		}
		if (entry.site) return entry.site;
	}
	entry.fi.fileInfo.fetching = true;
	entry.site = await GetFileInfos(entry.site.ftpConfig);
	entry.fi.fileInfo.at = Date.now();
	entry.fi.fileInfo.fetching = false;
	if (entry.site.error) {
		LogWarning(`error loading ${n}: ${entry.site.error}`);
	}

	return entry.site;
}
