import { Dispatch, Fragment, SetStateAction, useEffect, useState } from "react";
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
	const {
		currSite,
		currFile,
		handleNewDataLoaded,
		fromLine,
		setFromLine,
		setFromLineIfNeeded,
	} = useViewStore();
	const [log, setLog_] = useState<main.Log | null>(null);
	const [loading, setLoading] = useState(false);
	const [filterIn, setFilterIn] = useState("");
	const [dispLines, setDispLines] = useState<LogLine_[]>([]);

	useEffect(() => {
		const displayLines: LogLine_[] = [];

		log?.lines.forEach((line) => {
			if (line.num >= fromLine) {
				displayLines.push(new LogLine_(line));
			}
		});
		LogInfo(`setting display lines from: ${log?.lines.length} to: ${fromLine}`);

		setDispLines(displayLines);
	}, [log, fromLine]);

	useEffect(() => {
		let lastFetched = 0;
		let fetching = false;
		setLoading(true);
		setFromLine(0);

		(async () => {
			try {
				LogInfo(`fetching local log: ${currFile?.name}`);
				const local_log = await fetchLocalLog(currSite?.name, currFile?.name);
				LogInfo(`fetched local log: ${currFile?.name}`);
				if (lastFetched) {
					LogInfo(`ignoring local log - already fetched latest log`);
					return;
				}
				setLog(local_log);
				setLoading(false);
			} catch (err) {
				LogWarning(`failed to fetch local log: ${currFile?.name}`);
				console.warn(err);
			}
		})();

		const timer = setInterval(async () => {
			if (!currSite || !currFile) return;
			if (fetching || Date.now() - lastFetched < 40 * 1000) return;
			fetching = true;
			try {
				LogInfo(`getting latest log ${currSite.name}/${currFile.name}`);
				const latest_log = await downloadLog(currSite.name, currFile.name);
				LogInfo(`got latest log: ${currSite.name}/${currFile.name}`);
				lastFetched = Date.now();
				setLog(latest_log);
				setLoading(false);
			} catch (err) {
				console.error(err);
				LogError(`failed to get latest log`);
			}
			fetching = false;
		}, 1000);

		return () => clearInterval(timer);
	}, [currFile?.name]);

	function setLog(log_: main.Log | null) {
		if (!log_) {
			console.log(`setting log to NULL`);
			setFromLine(0);
			setLog(null);
			return;
		}

		if (isLogEq(log_, log)) return;

		console.log(`setting new log (${log_.lines.length} lines) `);
		setFromLineIfNeeded(log_);
		handleNewDataLoaded();
		setLog_(log_);
	}

	function showMore(loglines?: main.LogLine[]) {
		if (!loglines || !loglines.length) return;
		let more = 0;
		for (let i = loglines.length - 1; i >= 0; i--) {
			const ll = loglines[i];
			if (ll.num < fromLine) more++;
			if (more === 999) {
				setFromLine(ll.num);
				return;
			}
		}
		setFromLine(loglines[0].num);
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

	return (
		<div className="w-3/4 h-svh overflow-scroll flex flex-col">
			<Header
				currSite={currSite}
				currFile={currFile}
				filterIn={filterIn}
				setFilterIn={setFilterIn}
			/>
			<LogLinesView
				full={log?.lines}
				disp={dispLines}
				fromLine={fromLine}
				showMore={() => showMore(log?.lines)}
			/>
		</div>
	);
}

interface LogLinesViewParams {
	full?: main.LogLine[];
	disp: LogLine_[];
	fromLine: number;
	showMore: () => void;
}

function LogLinesView({ full, disp, showMore }: LogLinesViewParams) {
	const { scrollToLine } = useViewStore();
	const [dispLines, setDispLines] = useState<ShowLogLineData[]>([]);

	useEffect(() => {
		const dls: ShowLogLineData[] = [];
		const hasMore = full && disp.length && disp.length < full.length;

		if (hasMore) {
			dls.push({
				type: "more",
				key: disp[0].num + "-more",
				left: full.length - disp.length,
			});
		}

		let prevDay: string = "";
		for (let i = hasMore ? 1 : 0; i < disp.length; i++) {
			const prev = disp[i - 1];
			const curr = disp[i];
			const [currDay, currTime] = fmtDay(curr.on);
			if (prevDay !== currDay) {
				dls.push({ type: "day", day: currDay, key: curr.num + "-day" });
			}
			prevDay = currDay;

			dls.push({
				type: "logline",
				after: afterTime(curr.on, prev?.on),
				line: curr,
				tm: currTime,
				key: curr.num + "",
			});
		}

		LogInfo(`drawing ${dls.length} lines`);
		setDispLines(dls);
	}, [disp]);

	function scrollToBottom() {
		if (!dispLines) return;
		const lastline = dispLines[dispLines.length - 1];
		scrollToLine(lastline.key, true);
	}

	return (
		<div
			className="overflow-scroll flex-grow relative"
			id="logviewer_container"
		>
			{dispLines.map((d) => (
				<ShowLogLine key={d.key} data={d} showMore={showMore} />
			))}
			<div
				className="absolute text-xs opacity-30 cursor-pointer hover:opacity-100 hover:text-blue-800 hover:underline z-20 top-0 right-0 p-2"
				onClick={() => scrollToBottom()}
			>
				to bottom↓
			</div>
		</div>
	);
}

type ShowLogLineData = L_LogLine | L_DayLine | L_MoreLine;
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
type L_MoreLine = {
	type: "more";
	key: string;
	left: number;
};

interface ShowLogLineParams {
	data: ShowLogLineData;
	showMore: () => void;
}

function ShowLogLine({ data, showMore }: ShowLogLineParams) {
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

	if (data.type === "more") {
		return (
			<div
				ref={(node) => setLineRef(data.key, node)}
				onClick={() => showMore()}
				className="text-xs m-2 hover:underline hover:text-blue-800 cursor-pointer"
			>
				↑{data.left} more...
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
			{stack.map((l, ndx) => (
				<Fragment key={ndx}>
					<div></div>
					<div
						className={clsx(
							className,
							is_important_1(l) || "text-xxs opacity-50"
						)}
					>
						{l}
					</div>
				</Fragment>
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
	filterIn?: string;
	setFilterIn?: Dispatch<SetStateAction<string>>;
}
function Header({ currSite, currFile, filterIn, setFilterIn }: HeaderParams) {
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
						value={filterIn || ""}
						onChange={(e) => setFilterIn && setFilterIn(e.target.value || "")}
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
