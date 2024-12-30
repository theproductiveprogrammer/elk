import { useEffect, useState } from "react";
import useViewStore from "./stores/viewStore";
import { DownloadLog } from "../wailsjs/go/main/App";
import { main } from "../wailsjs/go/models";

export default function LogViewer() {
	const { currSite, currFile } = useViewStore();
	const [data, setData] = useState("");
	const [loading, setLoading] = useState(false);

	useEffect(() => {
		(async function () {
			if (!currSite || !currFile) return;
			setLoading(true);
			const data = await DownloadLog(currSite, currFile);
			setData(data);
			setLoading(false);
		})();
	}, [currFile]);

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
