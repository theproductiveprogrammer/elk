import { create } from "zustand";
import { main } from "../../wailsjs/go/models";

type Page = "start" | "ftpedit" | "site" | "log";
interface ViewData {
	showing: Page;
	startVideoLoaded: boolean;
	currSite: main.SiteInfo | null;
	currFile: main.FTPEntry | null;
}
interface ViewState extends ViewData {
	showFTPEditPage: (site: main.SiteInfo | null) => void;
	showStartPage: () => void;
	showSite: (site: main.SiteInfo) => void;
	setCurrSite: (site: main.SiteInfo | null) => void;
	setStartVideoLoaded: () => void;
	showLogFile: (file: main.FTPEntry) => void;
	getLineRef: (key: string) => HTMLDivElement | null;
	setLineRef: (key: string, node: HTMLDivElement | null) => void;
	scrollToLine: (key: string, animate: boolean) => void;
}

const useViewStore = create<ViewState>((set) => {
	const lineRefs: Record<string, HTMLDivElement | null> = {};

	return {
		showing: "start",
		startVideoLoaded: false,
		currSite: null,
		currFile: null,

		showFTPEditPage: (site: main.SiteInfo | null) => {
			set({ currSite: site, showing: "ftpedit" });
		},
		showStartPage: () => set({ startVideoLoaded: false, showing: "start" }),
		showSite: (site: main.SiteInfo) => {
			set({ currSite: site, showing: "site" });
		},
		setCurrSite: (site: main.SiteInfo | null) => set({ currSite: site }),
		setStartVideoLoaded: () => set({ startVideoLoaded: true }),
		showLogFile: (file: main.FTPEntry) => {
			set({ currFile: { ...file }, showing: "log" });
		},

		getLineRef: (key: string) => lineRefs[key],
		setLineRef: (key: string, node: HTMLDivElement | null) => {
			if (lineRefs[key] === node) return;
			if (node) {
				lineRefs[key] = node;
			} else {
				delete lineRefs[key];
			}
		},

		scrollToLine: (key: string, animate: boolean) => {
			setTimeout(() => {
				const elem = lineRefs[key];
				if (!elem) return;

				const scrollContainer = document.getElementById("logviewer_container");
				if (!scrollContainer) return;

				const elementPosition = elem.offsetTop + scrollContainer.offsetTop;
				const offsetPosition = elementPosition;

				if (animate) {
					scrollContainer.scrollTo({
						top: offsetPosition,
						behavior: "smooth",
					});
				} else {
					scrollContainer.scrollTo(0, offsetPosition);
				}
			}, 10);
		},
	};
});

export default useViewStore;
