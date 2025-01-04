import { create } from "zustand";
import { main } from "../../wailsjs/go/models";

type Page = "start" | "ftpedit" | "site" | "log";
interface ViewData {
	showing: Page;
	startVideoLoaded: boolean;
	currSite: main.SiteInfo | null;
	currFile: main.FTPEntry | null;
	fromLine: number;
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
	handleNewDataLoaded: () => void;
	setFromLine: (num: number) => void;
}

const useViewStore = create<ViewState>((set) => {
	const lineRefs: Record<string, HTMLDivElement | null> = {};

	return {
		showing: "start",
		startVideoLoaded: false,
		currSite: null,
		currFile: null,
		fromLine: 0,

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

		handleNewDataLoaded: () => {
			const scrollContainer = document.getElementById("logviewer_container");
			if (!scrollContainer) {
				console.error("Scroll container not found!");
				return;
			}

			if (isUserAtBottom(scrollContainer)) {
				setTimeout(() => scrollToBottom(scrollContainer, true), 500);
			}
		},

		setFromLine: (num: number) => set({ fromLine: num }),
	};
});

const isUserAtBottom = (container: HTMLElement): boolean => {
	const { scrollTop, scrollHeight, clientHeight } = container;
	// Allow for a small buffer (e.g., 5px) to account for rounding errors
	return scrollTop + clientHeight >= scrollHeight - 5;
};

const scrollToBottom = (container: HTMLElement, animate: boolean) => {
	const offsetPosition = container.scrollHeight; // New bottom position
	if (animate) {
		container.scrollTo({
			top: offsetPosition,
			behavior: "smooth",
		});
	} else {
		container.scrollTop = offsetPosition;
	}
};

export default useViewStore;

const MAX_LOG_LINES = 5_000;
export function calcNewFromLine(loglines?: main.LogLine[]): number {
	if (!loglines) return 0;
	if (loglines.length > MAX_LOG_LINES) {
		return loglines[loglines.length - MAX_LOG_LINES].num;
	} else {
		return loglines[0].num;
	}
}
