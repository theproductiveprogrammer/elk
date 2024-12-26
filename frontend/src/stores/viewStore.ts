import { create } from "zustand";
import { main } from "../../wailsjs/go/models";

type Page = "start" | "ftpedit" | "site";
interface ViewData {
	showing: Page;
	startVideoLoaded: boolean;
	currSite: main.SiteInfo | null;
}
interface ViewState extends ViewData {
	showFTPEditPage: (site: main.SiteInfo | null) => void;
	showStartPage: () => void;
	showSite: (site: main.SiteInfo | null) => void;
	setCurrSite: (site: main.SiteInfo | null) => void;
	setStartVideoLoaded: () => void;
}

const useViewStore = create<ViewState>((set) => ({
	showing: "start",
	startVideoLoaded: false,
	currSite: null,
	showFTPEditPage: (site: main.SiteInfo | null) => {
		set({ currSite: site, showing: "ftpedit" });
	},
	showStartPage: () => set({ startVideoLoaded: false, showing: "start" }),
	showSite: (site: main.SiteInfo | null) =>
		set({ currSite: site, showing: "site" }),
	setCurrSite: (site: main.SiteInfo | null) => set({ currSite: site }),
	setStartVideoLoaded: () => set({ startVideoLoaded: true }),
}));

export default useViewStore;
