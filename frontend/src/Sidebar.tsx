import logo from "./assets/images/elk-logo.svg";
import logoText from "./assets/images/elk-text.svg";
import useAppStore from "./stores/appStore";
import useViewStore from "./stores/viewStore";

export default function Sidebar() {
	const { sites } = useAppStore();
	const { showFTPEditPage, showSite } = useViewStore();

	return (
		<div className="w-1/4 h-svh overflow-scroll bg-elk-green">
			<div className="flex flex-col items-center pt-4 border-b pb-7 bg-gray-100 border-green-50">
				<img src={logo} alt="logo" className="w-10" />
				<img src={logoText} alt="Elk" className="w-12 mt-2" />
				<span className="mt-2 text-xs opacity-55">
					The world's best log viewer
				</span>
			</div>
			<div className="text-white/80 font-bold m-4 text-center uppercase">
				Sites
			</div>
			<div>
				<ul className="m-4">
					{sites.map((site) => (
						<li
							key={site.name}
							className="text-white/80 text-right mb-2 text-sm font-thin cursor-pointer"
							onClick={() => showSite(site)}
						>
							{site.name}
						</li>
					))}
					<li
						className="text-white/80 text-right mb-2 text-sm font-thin cursor-pointer"
						onClick={() => showFTPEditPage(null)}
					>
						( + )
					</li>
				</ul>
			</div>
		</div>
	);
}
