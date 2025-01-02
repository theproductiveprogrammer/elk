import { useEffect, useState } from "react";
import useViewStore from "./stores/viewStore";
import { main } from "../wailsjs/go/models";
import { downloadLog } from "./FTPHandler";

export default function LogViewer() {
	const { currSite, currFile } = useViewStore();
	const [data, setData] = useState("");
	const [loading, setLoading] = useState(false);

	useEffect(() => {
		let lastFetched = 0;
		let fetching = false;
		const timer = setInterval(() => {
			if (fetching || Date.now() - lastFetched < 10 * 1000) return;
			fetching = true;
			getLatestLog(lastFetched === 0)
				.then(() => {
					fetching = false;
					lastFetched = Date.now();
				})
				.catch((err) => console.error(err));
		}, 1000);

		return () => clearInterval(timer);
	}, [currFile]);

	async function getLatestLog(initial: boolean) {
		if (!currSite || !currFile) return;
		if (initial) setLoading(true);
		const data = await downloadLog(currSite.name, currFile.name);
		setData(data);
		if (initial) setLoading(false);
	}

	if (!currFile || !currSite) return <div>UNEXPECTED ERROR: 8989898</div>;

	if (loading) {
		return (
			<div className="w-3/4 h-svh overflow-scroll">
				<Header currSite={currSite} currFile={currFile} />
				<div>Loading...</div>
			</div>
		);
	}

	return (
		<div className="w-3/4 h-svh overflow-scroll">
			<Header currSite={currSite} currFile={currFile} />
			<div>{data}</div>
		</div>
	);
}

interface HeaderParams {
	currSite: main.SiteInfo;
	currFile: main.FTPEntry;
}
function Header({ currSite, currFile }: HeaderParams) {
	return (
		<div className="w-full border-b border-elk-green h-9 leading-9 text-center relative">
			<span className="">{currSite.name} : </span>
			<span className="font-bold">{currFile.name}</span>
		</div>
	);
}
