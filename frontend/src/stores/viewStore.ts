import { create } from "zustand";
import { FTPConfig } from "../types";

type Page = "start" | "ftpedit";
interface ViewData {
	showing: Page;
	startVideoLoaded: boolean;
	editingFTP: FTPConfig | null;
}
interface ViewState extends ViewData {
	showFTPEditPage: (ftpConfig: FTPConfig | null) => void;
	showStartPage: () => void;
	setStartVideoLoaded: () => void;
}

const useViewStore = create<ViewState>((set) => ({
	showing: "start",
	startVideoLoaded: false,
	editingFTP: null,
	showFTPEditPage: (ftpConfig: FTPConfig | null) => {
		set({ editingFTP: ftpConfig, showing: "ftpedit" });
	},
	showStartPage: () => set({ startVideoLoaded: false, showing: "start" }),
	setStartVideoLoaded: () => set({ startVideoLoaded: true }),
}));

export default useViewStore;
