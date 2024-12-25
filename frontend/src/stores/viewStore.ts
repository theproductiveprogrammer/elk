import { create } from "zustand";
import { SiteInfo } from "../types";

type Page = "start" | "ftpedit" | "site";
interface ViewData {
	showing: Page;
	startVideoLoaded: boolean;
	currSite: SiteInfo | null;
}
interface ViewState extends ViewData {
	showFTPEditPage: (site: SiteInfo | null) => void;
	showStartPage: () => void;
	showSite: (site: SiteInfo | null) => void;
	setCurrSite: (site: SiteInfo | null) => void;
	setStartVideoLoaded: () => void;
}

const useViewStore = create<ViewState>((set) => ({
	showing: "start",
	startVideoLoaded: false,
	currSite: null,
	showFTPEditPage: (site: SiteInfo | null) => {
		set({ currSite: site, showing: "ftpedit" });
	},
	showStartPage: () => set({ startVideoLoaded: false, showing: "start" }),
	showSite: (site: SiteInfo | null) => set({ currSite: site, showing: "site" }),
	setCurrSite: (site: SiteInfo |null) => set({currSite: site}),
	setStartVideoLoaded: () => set({ startVideoLoaded: true }),
}));

export default useViewStore;
