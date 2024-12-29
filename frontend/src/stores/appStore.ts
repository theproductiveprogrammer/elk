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
