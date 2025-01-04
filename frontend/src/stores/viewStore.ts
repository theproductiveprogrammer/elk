import { create } from "zustand";
import { main } from "../../wailsjs/go/models";

type Page = "start" | "ftpedit" | "site" | "log";
interface ViewData {
	showing: Page;
	startVideoLoaded: boolean;
	currSite: main.SiteInfo | null;
	currFile: main.FTPEntry | null;
	fromLine: number;
	fromFilteredLine: number;
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
	setFromFilteredLine: (num: number) => void;
}

export interface LogFilters {
	filterIn: string;
	filterOut: string;
	findStr: string;
}

const useViewStore = create<ViewState>((set) => {
	const lineRefs: Record<string, HTMLDivElement | null> = {};

	return {
		showing: "start",
		startVideoLoaded: false,
		currSite: null,
		currFile: null,
		fromLine: 0,
		fromFilteredLine: 0,

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
				console.warn("Scroll container not found!");
				return;
			}

			if (isUserAtBottom(scrollContainer)) {
				setTimeout(() => scrollToBottom(scrollContainer, true), 500);
			}
		},

		setFromLine: (num: number) => set({ fromLine: num }),
		setFromFilteredLine: (num: number) => set({ fromFilteredLine: num }),
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
	if (!loglines || !loglines.length) return 0;
	if (loglines.length > MAX_LOG_LINES) {
		return loglines[loglines.length - MAX_LOG_LINES].num;
	} else {
		return loglines[0].num;
	}
}

type StdLevel = "T" | "D" | "I" | "W" | "E" | "x";

export function stdLevel(level?: string): StdLevel {
	if (!level) return "I";
	if (level[0] === "T" || level[0] === "t") return "T";
	if (level[0] === "D" || level[0] === "d") return "D";
	if (level[0] === "I" || level[0] === "i") return "I";
	if (level[0] === "W" || level[0] === "w") return "W";
	if (level[0] === "E" || level[0] === "e") return "E";
	return "x";
}

export function getLevel(s: string): StdLevel {
	s = s.toLowerCase();
	if (s === "trace") return "T";
	if (s === "debug") return "D";
	if (s === "info") return "I";
	if (s === "warn") return "W";
	if (s === "error") return "E";
	return "x";
}

const capsrx = /[A-Z]/;
export function filter_In(
	filterIn: string,
	s: string,
	level?: string
): boolean {
	if (!filterIn) return true;
	const fs = filterIn.split(/\s/g);
	for (let i = 0; i < fs.length; i++) {
		const filt = fs[i];

		if (level) {
			const lvl = getLevel(filt);
			if (lvl !== "x") {
				return level?.toUpperCase()[0] === lvl;
			}
		}

		try {
			const rx = new RegExp(filt, capsrx.test(filt) ? "" : "i");
			if (!rx.test(s)) return false;
		} catch (e) {
			/* ignore */
		}
	}
	return true;
}

export function filter_Out(
	filterOut: string,
	s: string,
	level?: string
): boolean {
	if (!filterOut) return true;
	const fs = filterOut.split(/\s/g);
	for (let i = 0; i < fs.length; i++) {
		const filt = fs[i];

		if (level) {
			const lvl = getLevel(filt);
			if (lvl !== "x") {
				return level?.toUpperCase()[0] !== lvl;
			}
		}

		try {
			const rx = new RegExp(filt, capsrx.test(filt) ? "" : "i");
			if (rx.test(s)) return false;
		} catch (e) {
			/* ignore */
		}
	}
	return true;
}

export function emptyFilters(): LogFilters {
	return {
		filterIn: "",
		filterOut: "",
		findStr: "",
	};
}

export function hasActiveFilters(filters: LogFilters): boolean {
	if (filters.filterIn || filters.filterOut) return true;
	else return false;
}

export function filtered(
	filters: LogFilters,
	loglines?: main.LogLine[]
): main.LogLine[] {
	if (!loglines) return [];
	const ret: main.LogLine[] = [];
	loglines.forEach((line) => {
		if (passesFilter(filters, line)) {
			ret.push(line);
		}
	});
	return ret;
}

function passesFilter(filters: LogFilters, line: main.LogLine) {
	if (filters.filterIn) {
		return filter_In(filters.filterIn, line.raw, line.level);
	}
	if (filters.filterOut) {
		return filter_Out(filters.filterOut, line.raw, line.level);
	}
}
