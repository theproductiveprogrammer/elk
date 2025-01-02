import { create } from "zustand";

import { main } from "../../wailsjs/go/models";
import { loadFTPInfos } from "../FTPHandler";

interface AppData {
	sites: main.SiteInfo[];
}
interface AppState extends AppData {
	setFTPConfigs: () => Promise<void>;
}

const useAppStore = create<AppState>((set) => ({
	sites: [],
	setFTPConfigs: async () => set({ sites: await loadFTPInfos() }),
}));

export default useAppStore;

const capsrx = /[A-Z]/;
export function filter_In(filterIn: string, s: string): boolean {
	if (!filterIn) return true;
	const fs = filterIn.split(/\s/g);
	for (let i = 0; i < fs.length; i++) {
		try {
			const rx = new RegExp(fs[i], capsrx.test(fs[i]) ? "" : "i");
			if (!rx.test(s)) return false;
		} catch (e) {
			/* ignore */
		}
	}
	return true;
}
