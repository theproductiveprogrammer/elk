import { useEffect, useState } from "react";
import useViewStore from "./stores/viewStore";
import { main } from "../wailsjs/go/models";
import { downloadLog } from "./FTPHandler";
import Loader from "./Loader";

class LogLine_ extends main.LogLine {
	on?: Date;
	constructor(source: any = {}) {
		super(source);
		this.on = source["on_str"] ? new Date(source["on_str"]) : undefined;
	}
}

export default function LogViewer() {
	const { currSite, currFile } = useViewStore();
	const [log, setLog] = useState<main.Log | null>(null);
	const [loading, setLoading] = useState(false);

	useEffect(() => {
		let lastFetched = 0;
		let fetching = true;
		getLatestLog(lastFetched === 0)
			.then(() => {
				fetching = false;
				lastFetched = Date.now();
			})
			.catch((err) => {
				fetching = false;
				console.error(err);
			});
		const timer = setInterval(() => {
			if (fetching || Date.now() - lastFetched < 10 * 1000) return;
			fetching = true;
			getLatestLog(lastFetched === 0)
				.then(() => {
					fetching = false;
					lastFetched = Date.now();
				})
				.catch((err) => {
					fetching = false;
					console.error(err);
				});
		}, 1000);

		return () => clearInterval(timer);
	}, [currFile]);

	async function getLatestLog(initial: boolean) {
		if (!currSite || !currFile) return;
		if (initial) setLoading(true);
		const log = await downloadLog(currSite.name, currFile.name);
		setLog(log);
		if (initial) setLoading(false);
	}

	if (!currFile || !currSite) return <div>UNEXPECTED ERROR: 8989898</div>;

	if (loading) {
		return (
			<div className="w-3/4 h-svh overflow-scroll">
				<Header currSite={currSite} currFile={currFile} />
				<Loader />
			</div>
		);
	}

	const loglines: LogLine_[] = [];
	log?.lines.forEach((line) => {
		loglines.unshift(new LogLine_(line));
	});

	let prevDay: string = "";
	const dispLines: ShowLogLineData[] = [];
	for (let i = 0; i < loglines.length; i++) {
		const prev = loglines[i + 1];
		const curr = loglines[i];
		const [currDay, currTime] = fmtDay(curr.on);
		if (prevDay !== currDay) {
			dispLines.push({ type: "day", day: currDay, key: curr.num + "-day" });
		}
		prevDay = currDay;

		dispLines.push({
			type: "logline",
			after: afterTime(curr.on, prev?.on),
			line: curr,
			tm: currTime,
			key: curr.num + "",
		});
	}

	return (
		<div className="w-3/4 h-svh overflow-scroll flex flex-col">
			<Header currSite={currSite} currFile={currFile} />
			<div className="overflow-scroll flex-grow">
				{dispLines.map((d) => (
					<ShowLogLine data={d} />
				))}
			</div>
		</div>
	);
}

type ShowLogLineData = L_LogLine | L_DayLine;
type L_DayLine = {
	type: "day";
	key: string;
	day: string;
};
type L_LogLine = {
	type: "logline";
	key: string;
	line: LogLine_;
	after: string;
	tm: string;
};

interface ShowLogLineParams {
	data: ShowLogLineData;
}

function ShowLogLine({ data }: ShowLogLineParams) {
	if (data.type === "day") {
		return <div className="text-center text-xs font-bold">{data.day}</div>;
	}
	return (
		<div>
			<div className="flex flex-row items-baseline">
				<div className="text-xxs w-12 text-gray-600">{data.after}</div>
				<div className="text-xxs text-gray-400 mr-1 hover:text-gray-800 cursor-pointer">
					▶
				</div>
				<div className="text-xs mr-3">{data.tm}:</div>
				<div className="">{data.line.msg}</div>
			</div>
		</div>
	);
}

function afterTime(curr?: Date, prev?: Date): string {
	if (!prev || !curr) return "";
	let diff = curr.getTime() - prev.getTime();
	if (diff < 1000) return `+${diff}ms`;
	diff = Math.round(diff / 1000);
	if (diff < 60) return `+${diff}secs`;
	diff = Math.round(diff / 60);
	if (!diff) return `+1min`;
	const hrs = Math.floor(diff / 60);
	const mins = diff % 60;
	if (hrs > 9) return "+++!";
	return `${hrs}h${mins}m`;
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

function fmtDay(d?: Date): [string, string] {
	if (!d) return ["", ""];
	return [
		`${d.getFullYear()}/${MON[d.getMonth()]}/${p2(d.getDay())}`,
		`${p2(d.getHours())}:${p2(d.getMinutes())}:${p2(d.getSeconds())}`,
	];
}

function p2(n: number): string {
	if (n < 10) return "0" + n;
	return "" + n;
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
