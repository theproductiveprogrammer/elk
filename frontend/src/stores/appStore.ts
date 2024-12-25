import { create } from "zustand";
import { SiteInfo } from "../types";

interface AppData {
	sites: SiteInfo[];
}
interface AppState extends AppData {
	setSiteInfo: (site: SiteInfo) => void;
}

const useAppStore = create<AppState>((set, get) => ({
	sites: [],
	setSiteInfo: (site: SiteInfo) => {
		const { sites } = get();
		let found = false;
		const updated = sites.map((s) => {
			if (site.name === s.name) {
				found = true;
				return { ...site };
			}
			return s;
		});
		if (!found) updated.push({ ...site });
		set({ sites: updated });
	},
}));

export default useAppStore;
