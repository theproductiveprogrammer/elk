import { Dispatch, SetStateAction, useEffect, useState } from "react";
import useViewStore from "./stores/viewStore";
import { main } from "../wailsjs/go/models";
import { downloadLog, fetchLocalLog } from "./FTPHandler";
import Loader from "./Loader";
import clsx from "clsx";
import JSON5 from "json5";
import { LogError, LogInfo, LogWarning } from "./logger";
import { isLogEq } from "./stores/appStore";

class LogLine_ extends main.LogLine {
	on?: Date;
	constructor(source: any = {}) {
		super(source);
		this.on = source["on_str"] ? new Date(source["on_str"]) : undefined;
	}
}

export default function LogViewer() {
	const { currSite, currFile, handleNewDataLoaded } = useViewStore();
	const [log, setLog] = useState<main.Log | null>(null);
	const [loading, setLoading] = useState(false);
	const [filterIn, setFilterIn] = useState("");

	useEffect(() => {
		let lastFetched = 0;
		let fetching = false;
		setLoading(true);
		fetchLocalLog(currSite?.name, currFile?.name)
			.then((log) => {
				if (!lastFetched) {
					LogInfo(`fetched local log: ${currFile?.name}`);
					setLog(log);
					lastFetched = 1;
					setLoading(false);
				}
			})
			.catch((err) => {
				LogWarning(`failed to fetch local log: ${currFile?.name}`);
				LogWarning(err);
				getLatestLog(lastFetched === 0)
					.then(() => {
						fetching = false;
						lastFetched = Date.now();
					})
					.catch((err) => {
						fetching = false;
						console.error(err);
					});
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
					LogError(`failed to get latest log`);
				});
		}, 1000);

		return () => clearInterval(timer);
	}, [currFile?.name]);

	async function getLatestLog(initial: boolean) {
		if (!currSite || !currFile) return;
		if (initial) setLoading(true);
		LogInfo(`getting latest log ${currSite.name}/${currFile.name}`);
		const latest_log = await downloadLog(currSite.name, currFile.name);
		LogInfo(`got latest log: ${currSite.name}/${currFile.name}`);
		if (!isLogEq(log, latest_log)) {
			handleNewDataLoaded();
			setLog(latest_log);
		}
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
		loglines.push(new LogLine_(line));
	});

	let prevDay: string = "";
	const dispLines: ShowLogLineData[] = [];
	for (let i = 0; i < loglines.length; i++) {
		const prev = loglines[i - 1];
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
			<Header
				currSite={currSite}
				currFile={currFile}
				dispLines={dispLines}
				filterIn={filterIn}
				setFilterIn={setFilterIn}
			/>
			<div
				className="overflow-scroll flex-grow relative"
				id="logviewer_container"
			>
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
	const { setLineRef } = useViewStore();
	const [raw, setRaw] = useState(false);
	if (data.type === "day") {
		return (
			<div
				ref={(node) => setLineRef(data.key, node)}
				className="text-center text-xs font-bold m-2"
			>
				{data.day}
			</div>
		);
	}

	if (raw) {
		return (
			<div
				ref={(node) => setLineRef(data.key, node)}
				onDoubleClick={() => setRaw((r) => !r)}
				className="whitespace-pre-wrap font-mono text-sm"
			>
				{data.line.raw}
			</div>
		);
	}

	return (
		<div
			ref={(node) => setLineRef(data.key, node)}
			className="my-2"
			onDoubleClick={() => setRaw((r) => !r)}
		>
			<div className="grid grid-cols-logview">
				<div>
					<span className="inline-block text-xxs w-10 text-gray-400">
						{data.after}
					</span>
				</div>
				<div className="w-full">
					<span className="text-xs text-gray-400 mr-2">{data.tm}</span>
					<span className={colorOf(data.line.level)}>{data.line.msg}</span>
					<JSONView
						json={data.line.json}
						className={colorOf(data.line.level)}
					/>
				</div>
			</div>
			<StackView stack={data.line.stack} className={colorOf(data.line.level)} />
		</div>
	);
}

function colorOf(level?: string): string {
	switch (stdLevel(level)) {
		case "T":
			return "text-slate-400";
		case "D":
			return "text-gray-700";
		case "I":
			return "text-gray-700";
		case "W":
			return "text-orange-700";
		case "E":
			return "text-red-600";
		default:
			return "text-blue-500";
	}
}

interface JSONViewProps {
	json: any;
	className: string;
}
function JSONView({ json, className }: JSONViewProps) {
	const [xpand, setXpand] = useState(false);
	if (!json) return <span></span>;

	if (xpand) {
		return (
			<span
				onClick={() => setXpand((x) => !x)}
				className={clsx(
					"text-xs font-mono whitespace-pre-wrap cursor-pointer",
					className
				)}
			>
				{JSON5.stringify(json, { space: 1 })}
			</span>
		);
	} else {
		return (
			<span
				onClick={() => setXpand((x) => !x)}
				className={clsx(
					"text-xs font-mono whitespace-pre-wrap cursor-pointer",
					className
				)}
			>
				{JSON5.stringify(json)}
			</span>
		);
	}
}

interface StackViewProps {
	stack: string[];
	className: string;
}
function StackView({ stack, className }: StackViewProps) {
	if (!stack) return <div></div>;
	return (
		<div className="grid grid-cols-logview">
			{stack.map((l) => (
				<>
					<div></div>
					<div
						className={clsx(
							className,
							is_important_1(l) || "text-xxs opacity-50"
						)}
					>
						{l}
					</div>
				</>
			))}
		</div>
	);

	function is_important_1(l: string): boolean {
		const stdpkgs = [
			"java.lang.",
			"java.util.",
			"java.io.",
			"javax.servlet.",
			"javax.swing.",
			"org.apache.",
			"org.springframework.",
			"com.fasterxml.jackson.",
			"org.hibernate.",
			"org.jboss.",
			"org.eclipse.",
			"org.slf4j.",
			"ch.qos.logback.",
			"org.aspectj.",
			"org.mockito.",
			"org.junit.",
			"org.gradle.",
			"org.maven.",
			"org.apache.maven.",
			"org.thymeleaf.",
			"com.vaadin.",
			"org.zkoss.",
			"com.google.gwt.",
			"javax.persistence.",
			"com.zaxxer.hikari.",
			"org.postgresql.",
			"com.mysql.",
			"org.apache.http.",
			"io.netty.",
			"com.squareup.okhttp3.",
			"com.amazonaws.",
			"com.google.cloud.",
			"org.apache.commons.",
			"com.google.common.",
			"org.testng.",
			"org.apache.kafka.",
			"io.micronaut.",
			"io.quarkus.",
		];
		for (let i = 0; i < stdpkgs.length; i++) {
			if (l.indexOf(stdpkgs[i]) !== -1) return false;
		}
		return true;
	}
}

function afterTime(curr?: Date, prev?: Date): string {
	if (!prev || !curr) return "-";
	let diff = curr.getTime() - prev.getTime();
	if (diff < 0) return "-";
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

type StdLevel = "T" | "D" | "I" | "W" | "E";

function stdLevel(level?: string): StdLevel {
	if (!level) return "I";
	if (level[0] === "T" || level[0] === "t") return "T";
	if (level[0] === "D" || level[0] === "d") return "D";
	if (level[0] === "I" || level[0] === "i") return "I";
	if (level[0] === "W" || level[0] === "w") return "W";
	if (level[0] === "E" || level[0] === "e") return "E";
	return "I";
}

interface HeaderParams {
	currSite: main.SiteInfo;
	currFile: main.FTPEntry;
	dispLines?: ShowLogLineData[];
	filterIn?: string;
	setFilterIn?: Dispatch<SetStateAction<string>>;
}
function Header({
	currSite,
	currFile,
	dispLines,
	filterIn,
	setFilterIn,
}: HeaderParams) {
	const { scrollToLine } = useViewStore();

	function scrollToBottom() {
		if (!dispLines) return;
		const lastline = dispLines[dispLines.length - 1];
		scrollToLine(lastline.key, true);
	}

	return (
		<div className="w-full border-b border-elk-green relative">
			<div className="text-center">
				<span className="">{currSite.name} : </span>
				<span className="font-bold">{currFile.name}</span>
			</div>
			<div className="flex flex-row justify-between items-center mx-2 mt-2 mb-3">
				<div>
					<input
						type="search"
						placeholder="filter in"
						disabled={!setFilterIn}
						value={filterIn}
						onChange={(e) => setFilterIn && setFilterIn(e.target.value)}
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
			{dispLines && (
				<div
					className="absolute text-xxs opacity-30 cursor-pointer hover:opacity-100 hover:text-blue-800 hover:underline z-20"
					onClick={() => scrollToBottom()}
					style={{
						bottom: "-16px",
						right: "8px",
					}}
				>
					to bottom
				</div>
			)}
		</div>
	);
}
