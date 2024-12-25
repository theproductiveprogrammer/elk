import logo from "./assets/images/elk-logo.svg";
import logoText from "./assets/images/elk-text.svg";
import useAppStore from "./stores/appStore";

export default function Sidebar() {
	const { sites } = useAppStore();

	return (
		<div className="w-1/4 h-svh overflow-scroll bg-elk-green">
			<div className="flex flex-col items-center pt-4 border-b pb-7 bg-gray-100 border-green-50">
				<img src={logo} alt="logo" className="w-10" />
				<img src={logoText} alt="Elk" className="w-12 mt-2" />
				<span className="mt-2 text-xs opacity-55">
					The world's best log viewer
				</span>
			</div>
			<div>
				<ul className="m-4">
					{sites.map((site) => (
						<li className="mb-8">
							<div className="text-white/80 text-center uppercase text-xs font-semibold">
								{site.name}
							</div>
							<ul>
								{site.logs.map((log) => (
									<li className="text-white/40 text-right hover:text-white/90 cursor-pointer">
										{log.name}
									</li>
								))}
							</ul>
						</li>
					))}
				</ul>
			</div>
		</div>
	);
}
