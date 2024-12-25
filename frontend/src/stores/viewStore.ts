import { create } from "zustand";
import { FTPConfig, SiteInfo } from "../types";

type Page = "start" | "ftpedit" | "site";
interface ViewData {
	showing: Page;
	startVideoLoaded: boolean;
	editingFTP: FTPConfig | null;
	currSite: SiteInfo | null;
}
interface ViewState extends ViewData {
	showFTPEditPage: (ftpConfig: FTPConfig | null) => void;
	showStartPage: () => void;
	showSite: (site: SiteInfo | null) => void;
	setStartVideoLoaded: () => void;
}

const useViewStore = create<ViewState>((set) => ({
	showing: "start",
	startVideoLoaded: false,
	editingFTP: null,
	currSite: null,
	showFTPEditPage: (ftpConfig: FTPConfig | null) => {
		set({ editingFTP: ftpConfig, showing: "ftpedit" });
	},
	showStartPage: () => set({ startVideoLoaded: false, showing: "start" }),
	showSite: (site: SiteInfo | null) => set({ currSite: site, showing: "site" }),
	setStartVideoLoaded: () => set({ startVideoLoaded: true }),
}));

export default useViewStore;
