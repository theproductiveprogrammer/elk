import { useEffect, useState } from "react";
import useViewStore from "./stores/viewStore";
import { main } from "../wailsjs/go/models";
import { loadFileInfos } from "./FTPHandler";
import Loader from "./Loader";

export default function SitePage() {
	const { currSite, setCurrSite, showLogFile } = useViewStore();
	const [loading, setLoading] = useState(false);

	useEffect(() => {
		if (currSite) refresh();
	}, [currSite?.name]);

	async function refresh() {
		if (!currSite) return;
		setLoading(true);
		const site = await loadFileInfos(currSite.name);
		console.log(site);
		setCurrSite(site);
		setLoading(false);
	}

	async function showlog(log: main.FTPEntry) {
		showLogFile(log);
	}

	if (!currSite) return <div>UNEXPECTED ERROR: 10101</div>;

	if (loading) {
		return (
			<div className="w-3/4 h-svh overflow-scroll">
				<Header currSite={currSite} />
				<Loader />
			</div>
		);
	}
	if (currSite.error) {
		return (
			<div className="w-3/4 h-svh overflow-scroll">
				<Header currSite={currSite} />
				{currSite.error && (
					<div className="text-center text-red-600">{currSite.error}</div>
				)}
			</div>
		);
	}

	const logs = currSite.logs || [];

	return (
		<div className="w-3/4 h-svh flex flex-col">
			<Header currSite={currSite} />
			<table className="m-2 flex-grow overflow-scroll">
				<thead>
					<tr>
						<th className="text-left">Name</th>
						<th className="min-w-48 text-left">Modified</th>
						<th className="min-w-24 text-left">Size</th>
					</tr>
				</thead>
				<tbody>
					{logs.map((log) => (
						<tr
							key={log.name}
							className="cursor-pointer hover:underline"
							onClick={() => showlog(log)}
						>
							<td className="text-left">{log.name}</td>
							<td>{fmtTime(log.time)}</td>
							<td>{log.size}</td>
						</tr>
					))}
				</tbody>
			</table>
		</div>
	);
}

interface HeaderParams {
	currSite: main.SiteInfo;
}

function Header({ currSite }: HeaderParams) {
	const { showFTPEditPage } = useViewStore();
	return (
		<div className="w-full border-b border-elk-green text-center relative">
			<div>
				<span className="font-bold">{currSite.name}</span>
				<span
					className="inline-block absolute right-0 pr-2 text-xs top-0 pt-2 font-thin text-gray-400 cursor-pointer hover:text-black hover:underline"
					onClick={() => showFTPEditPage(currSite)}
				>
					edit
				</span>
			</div>
			<div className="flex flex-row justify-between items-center m-2 mb-3">
				<div>
					<input
						type="search"
						placeholder="filter in"
						className="text-sm p-0 m-0 rounded-sm border border-gray-300 px-1 w-32 mr-4"
					/>
					<input
						type="search"
						placeholder="filter out"
						className="text-sm p-0 m-0 rounded-sm border border-gray-300 px-1 w-32"
					/>
				</div>
				<div>
					<input
						type="search"
						placeholder="find"
						className="text-sm p-0 m-0 rounded-sm border border-gray-300 px-1"
					/>
				</div>
			</div>
		</div>
	);
}

const MON = [
	"Jan",
	"Feb",
	"Mar",
	"Apr",
	"May",
	"Jun",
	"Jul",
	"Aug",
	"Sep",
	"Oct",
	"Nov",
	"Dec",
];

function fmtTime(tm: number): string {
	const date = new Date(tm);
	const now = new Date();
	const year = date.getFullYear();
	const month = MON[date.getMonth()];
	const day = date.getDate();
	const hour = p2(date.getHours());
	const min = p2(date.getMinutes());
	if (year !== now.getFullYear()) {
		return `${year}-${month}-${day} ${hour}:${min}`;
	} else {
		return `${month}-${day} ${hour}:${min}`;
	}
}

function p2(a: number): string {
	if (a < 10) return "0" + a;
	return "" + a;
}
