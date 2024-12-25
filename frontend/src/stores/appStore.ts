import { create } from "zustand";
import { SiteInfo } from "../types";
import { GetFTPConfig, ListFTPConfigs } from "../../wailsjs/go/main/App";

interface AppData {
	sites: SiteInfo[];
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
		const sites = infos.map((i) => ({
			name: i.name,
			ftpConfig: i,
			logs: [],
		}));
		set({ sites });
	},
}));

export default useAppStore;
