import useViewStore from "./stores/viewStore";

export default function SitePage() {
	const { currSite, showFTPEditPage } = useViewStore();

	if (!currSite) return <div>UNEXPECTED ERROR: 10101</div>;

	return (
		<div className="w-3/4 h-svh overflow-scroll">
			<div className="w-full border-b border-elk-green h-9 leading-9 text-center relative">
				<span className="font-bold">{currSite.name}</span>
				<div
					className="inline-block absolute right-0 pr-2 text-xs top-0 pt-2 font-thin text-gray-400 cursor-pointer hover:text-black hover:underline"
					onClick={() => showFTPEditPage(currSite)}
				>
					edit
				</div>
			</div>
			{currSite.error && (
				<div className="text-center text-red-600">{currSite.error}</div>
			)}
			<table className="mx-2">
				<thead>
					<tr>
						<th>Name</th>
						<th className="w-64">&nbsp;</th>
						<th className="w-64">&nbsp;</th>
					</tr>
				</thead>
				<tbody></tbody>
				{currSite.logs &&
					currSite.logs.map((log) => (
						<tr key={log.name}>
							<td className="text-left">{log.name}</td>
							<td>{fmtTime(log.time)}</td>
							<td>{log.size}</td>
						</tr>
					))}
			</table>
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
