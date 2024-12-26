import { create } from "zustand";
import {
	GetFTPConfig,
	GetSiteInfos,
	ListFTPConfigs,
} from "../../wailsjs/go/main/App";

import { main } from "../../wailsjs/go/models";

interface AppData {
	sites: main.SiteInfo[];
}
interface AppState extends AppData {
	setFTPConfigs: () => Promise<void>;
}

const useAppStore = create<AppState>((set) => ({
	sites: [],
	setFTPConfigs: async () => {
		const names = await ListFTPConfigs();
		const infos = [];
		for (const name of names) {
			const info = await GetFTPConfig(name);
			infos.push(info);
		}
		const sites = infos.map((i) => main.SiteInfo.createFrom(i));
		set({ sites });
		//GetSiteInfos(sites).then((updated) => set({ sites: updated }));
		GetSiteInfos(sites).then((updated) => {
			console.log(`got`, updated);
			set({ sites: updated });
		});
	},
}));

export default useAppStore;
