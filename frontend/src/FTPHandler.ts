import {
	GetFTPConfig,
	ListFTPConfigs,
	GetFileInfos,
} from "../wailsjs/go/main/App";

import { main } from "../wailsjs/go/models";

interface FetchedInfo {
	fileInfoFetching: boolean;
	fileInfoAt: number;
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
			CACHE[i.name] = { site, fi: { fileInfoFetching: false, fileInfoAt: 0 } };
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
	if (!entry.fi.fileInfoAt) {
		while (!entry.fi.fileInfoAt) {
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
	if (entry.fi.fileInfoFetching) return;
	const s = Date.now();
	if (entry.site.error && s - entry.fi.fileInfoAt < FETCH_ERR_CYCLE_TIME)
		return;
	if (s - entry.fi.fileInfoAt < FETCH_CYCLE_TIME) return;
	console.log(`loading file info for: ${name}`);
	entry.fi.fileInfoFetching = true;
	entry.site = await GetFileInfos(entry.site.ftpConfig);
	entry.fi.fileInfoAt = Date.now();
	entry.fi.fileInfoFetching = false;
	if (entry.site.error) {
		console.warn(`error loading ${name}`, entry.site.error);
	} else {
		console.log(
			`loaded file info for: ${name} in ${Math.round((entry.fi.fileInfoAt - s) / 1000)}s`
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
