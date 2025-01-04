import { Fragment, KeyboardEvent, useEffect, useState } from "react";
import useViewStore, {
	calcNewFromLine,
	emptyFilters,
	filtered,
	hasActiveFilters,
	LogFilters,
	stdLevel,
} from "./stores/viewStore";
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
		fromFilteredLine,
		setFromFilteredLine,
	} = useViewStore();
	const [log, setLog_] = useState<main.Log | null>(null);
	const [loading, setLoading] = useState(false);
	const [filters, setFilters_] = useState<LogFilters>(emptyFilters());

	useEffect(() => {
		const loglines: main.LogLine[] = filtered(filters, log?.lines);
		setFromFilteredLine(calcNewFromLine(loglines));
	}, [filters]);

	useEffect(() => {
		let lastFetched = 0;
		let fetching = false;
		setLoading(true);
		setFromLine(0);
		setFromFilteredLine(0);

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
			setLog_(null);
			return;
		}

		if (isLogEq(log_, log)) return;

		setFromLine(calcNewFromLine(log_?.lines));
		handleNewDataLoaded();
		setLog_(log_);
	}

	function getMoreNum(fromnum: number, loglines?: main.LogLine[]): number {
		if (!loglines || !loglines.length) return -1;
		let more = 0;
		for (let i = loglines.length - 1; i >= 0; i--) {
			const ll = loglines[i];
			if (ll.num < fromnum) more++;
			if (more === 999) {
				return ll.num;
			}
		}
		return loglines[0].num;
	}

	function setFilters(filters: LogFilters) {
		setFilters_(filters);
	}

	if (!currFile || !currSite) return <div>UNEXPECTED ERROR: 8989898</div>;

	if (loading) {
		return (
			<div className="w-3/4 md:w-10/12 h-svh overflow-scroll">
				<Header currSite={currSite} currFile={currFile} />
				<Loader />
			</div>
		);
	}

	if (hasActiveFilters(filters)) {
		const loglines: main.LogLine[] = filtered(filters, log?.lines);

		const displayLines: LogLine_[] = [];

		loglines.forEach((line) => {
			if (line.num >= fromFilteredLine) {
				displayLines.push(new LogLine_(line));
			}
		});
		LogInfo(
			`setting filtered lines from: ${loglines.length} to: ${fromFilteredLine}`
		);

		function showMore(loglines?: main.LogLine[]) {
			const n = getMoreNum(fromFilteredLine, loglines);
			if (n < 0) return;
			setFromFilteredLine(n);
		}

		return (
			<div className="w-3/4 md:w-10/12 h-svh overflow-scroll flex flex-col">
				<Header
					currSite={currSite}
					currFile={currFile}
					setFilters={setFilters}
				/>
				<LogLinesView
					full={loglines}
					disp={displayLines}
					fromLine={fromLine}
					showMore={() => showMore(loglines)}
				/>
			</div>
		);
	} else {
		const displayLines: LogLine_[] = [];

		log?.lines.forEach((line) => {
			if (line.num >= fromLine) {
				displayLines.push(new LogLine_(line));
			}
		});
		LogInfo(`setting display lines from: ${log?.lines.length} to: ${fromLine}`);

		function showMore(loglines?: main.LogLine[]) {
			const n = getMoreNum(fromLine, loglines);
			if (n < 0) return;
			setFromLine(n);
		}

		return (
			<div className="w-3/4 md:w-10/12 h-svh overflow-scroll flex flex-col">
				<Header
					currSite={currSite}
					currFile={currFile}
					setFilters={setFilters}
				/>
				<LogLinesView
					full={log?.lines}
					disp={displayLines}
					fromLine={fromLine}
					showMore={() => showMore(log?.lines)}
				/>
			</div>
		);
	}
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
				className="fixed text-xs opacity-30 cursor-pointer hover:opacity-100 hover:text-blue-800 hover:underline z-20 top-0 right-0 p-2 mt-16"
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

	if (raw || !data.line.msg) {
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
					<span className={colorOf(data.line.level)}>
						<LimitMsg s={data.line.msg} />
					</span>
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

function LimitMsg({ s }: { s: string }) {
	if (!s || s.length < 1024) return <span>{s}</span>;

	return (
		<span>
			<span>{s.substring(0, 256)}</span>
			<span className="text-sm text-gray-400">{s.substring(256, 512)}</span>
			<span className="text-yellow-500 italic">
				... ✂ ✂ ✂ (snipped large message) ✂ ✂ ✂ ...
			</span>
			<span className="text-sm text-gray-400">
				{s.substring(s.length - 512, s.length - 256)}
			</span>
			<span>{s.substring(s.length - 256)}</span>
		</span>
	);
}

function colorOf(level?: string): string {
	switch (stdLevel(level)) {
		case "T":
			return "text-slate-400 text-sm";
		case "D":
			return "text-gray-700 text-sm";
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
					"text-xs font-mono whitespace-pre-wrap cursor-pointer text-green-900",
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
					"text-xs font-mono whitespace-pre-wrap cursor-pointer text-green-800 opacity-80 hover:opacity-100",
					className
				)}
			>
				{JSON5.stringify(json).replace(/,/g, ", ")}
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
			"java.base.",
			"java.util.",
			"java.io.",
			"javax.servlet.",
			"javax.swing.",
			"jdk.internal.",
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
			"sun.net.",
			"sun.reflect.",
			"com.mchange.",
			"com.mysql.",
			"cj.jdbc.",
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

interface HeaderParams {
	currSite: main.SiteInfo;
	currFile: main.FTPEntry;
	setFilters?: (filters: LogFilters) => void;
}
function Header({ currSite, currFile, setFilters }: HeaderParams) {
	const [filterIn, setFilterIn] = useState("");
	const [filterOut, setFilterOut] = useState("");
	const [findStr, setFindStr] = useState("");

	function onKeydown(e: KeyboardEvent) {
		if (setFilters && e.key === "Enter") {
			e.preventDefault();
			e.stopPropagation();
			setFilters({ filterIn, filterOut, findStr });
		}
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
						disabled={!setFilters}
						onKeyDown={onKeydown}
						value={filterIn}
						onChange={(e) => setFilterIn(e.target.value || "")}
						className="text-sm p-0 m-0 rounded-sm border border-gray-300 px-1 w-32 mr-4"
					/>
					<input
						type="search"
						placeholder="filter out"
						disabled={!setFilters}
						onKeyDown={onKeydown}
						value={filterOut}
						onChange={(e) => setFilterOut(e.target.value || "")}
						className="text-sm p-0 m-0 rounded-sm border border-gray-300 px-1 w-32"
					/>
				</div>
				<div>
					<input
						type="search"
						placeholder="find"
						disabled={true}
						onKeyDown={onKeydown}
						value={findStr}
						onChange={(e) => setFindStr(e.target.value || "")}
						className="text-sm p-0 m-0 rounded-sm border border-gray-300 px-1"
					/>
				</div>
			</div>
		</div>
	);
}
