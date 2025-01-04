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
