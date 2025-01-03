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

export function isLogEq(l1: main.Log | null, l2: main.Log | null): boolean {
	if (l1 && !l2) return false;
	if (!l1 && l2) return false;
	if (!l1 || !l2) return true;
	if (l1.name !== l2.name) return false;
	if (l1.lines.length !== l2.lines.length) return false;
	if (l1.lines.length > 0 && l1.lines[0] !== l2.lines[0]) return false;
	if (
		l1.lines.length > 1 &&
		l1.lines[l1.lines.length - 1] !== l2.lines[l2.lines.length - 1]
	) {
		return false;
	}
	return true;
}
