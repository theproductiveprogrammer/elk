export type FTPConfig = {
	name: string;
	ip: string;
	user: string;
	password: string;
};
export type FTPEntry = {
	name: string;
	size: number;
	time: number;
};
export type SiteInfo = {
	name: string;
	ftpConfig: FTPConfig;
	logs: FTPEntry[];
};

export function emptyFTPConfig() {
	return {
		name: "",
		ip: "",
		user: "",
		password: "",
	}
}
