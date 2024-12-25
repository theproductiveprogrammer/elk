import { create } from "zustand";
import { FTPInfo } from "../types";

type Page = "start" | "ftpedit";
interface ViewData {
	showing: Page;
	editingFTP: FTPInfo | null;
}
interface ViewState extends ViewData {
	showFTPEditPage: (ftpInfo: FTPInfo | null) => void;
}

const useViewStore = create<ViewState>((set) => ({
	showing: "start",
	editingFTP: null,
	showFTPEditPage: (ftpInfo: FTPInfo | null) => {
		set({ editingFTP: ftpInfo, showing: "ftpedit" });
	},
}));

export default useViewStore;
