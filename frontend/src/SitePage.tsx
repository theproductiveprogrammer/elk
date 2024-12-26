import useViewStore from "./stores/viewStore";

export default function SitePage() {
	const { currSite, showFTPEditPage } = useViewStore();

	if (!currSite) return <div>UNEXPECTED ERROR: 10101</div>;

	return (
		<div className="w-3/4 border-b border-elk-green h-9 leading-9 text-center relative">
			<span className="font-bold">{currSite.name}</span>
			<div
				className="inline-block absolute right-0 pr-2 text-xs top-0 pt-2 font-thin text-gray-400 cursor-pointer hover:text-black hover:underline"
				onClick={() => showFTPEditPage(currSite)}
			>
				edit
			</div>
			{currSite.error && (
				<div className="text-center text-red-600">{currSite.error}</div>
			)}
			<table>
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
						<tr>
							<td>{log.name}</td>
							<td>{log.time}</td>
							<td>{log.size}</td>
						</tr>
					))}
			</table>
		</div>
	);
}
