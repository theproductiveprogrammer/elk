import {
	GetFTPConfig,
	ListFTPConfigs,
	GetFileInfos,
} from "../wailsjs/go/main/App";

import { main } from "../wailsjs/go/models";

interface CachedSite {
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
			CACHE[i.name] = { site };
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

export async function loadFileInfos(
	site: main.SiteInfo | null
): Promise<main.SiteInfo | null> {
	if (!site) return site;
	return await GetFileInfos(site.ftpConfig);
}
