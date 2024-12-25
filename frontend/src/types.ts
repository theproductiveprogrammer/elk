export type FTPInfo = {
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
	ftpInfo: FTPInfo;
	logs: FTPEntry[];
};
