import {
	GetFTPConfig,
	ListFTPConfigs,
	GetFileInfos,
	DownloadLogs,
	DownloadLog,
} from "../wailsjs/go/main/App";

import { main } from "../wailsjs/go/models";

let downloadingLog = false;
export async function downloadLog(
	site: main.SiteInfo,
	log: main.FTPEntry
): Promise<string> {
	while (downloadingLog) {
		await new Promise((resolve) => setTimeout(resolve, 500));
	}
	downloadingLog = true;

	try {
		const data = await DownloadLog(site, log);
		downloadingLog = false;
		return data;
	} catch (err) {
		downloadingLog = false;
		throw err;
	}
}

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
	console.log(`loading file info for: ${name}`);
	entry.fi.fileInfo.fetching = true;
	entry.site = await GetFileInfos(entry.site.ftpConfig);
	entry.fi.fileInfo.at = Date.now();
	entry.fi.fileInfo.fetching = false;
	if (entry.site.error) {
		console.warn(`error loading ${name}`, entry.site.error);
	} else {
		console.log(
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
	console.log(`downloading files for: ${name}`);
	console.log({ entry });
	entry.fi.fileData.fetching = true;
	const errors = await DownloadLogs(entry.site);
	entry.fi.fileData.at = Date.now();
	entry.fi.fileData.fetching = false;
	if (errors && errors.length) {
		console.error(`Failed downloading files in ${name}`);
		errors.forEach((err) => console.error(err));
	} else {
		console.log(
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
