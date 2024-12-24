import logo from "./assets/images/elk-logo.svg";
import logoText from "./assets/images/elk-text.svg";
export default function Sidebar() {
	return (
		<div
			className="w-1/4 h-svh overflow-scroll"
			style={{ backgroundColor: "rgb(130 144 134)" }}
		>
			<div className="flex flex-col items-center pt-4 border-b pb-7 bg-gray-100 border-green-50">
				<img src={logo} alt="logo" className="w-10" />
				<img src={logoText} alt="Elk" className="w-12 mt-2" />
				<span className="mt-2 text-xs opacity-55">
					The world's best log viewer
				</span>
			</div>
			<div>
				<ul className="m-4">
					<li className="mb-8">
						<div className="text-white/80 text-center uppercase text-xs font-semibold">
							Source 1
						</div>
						<ul>
							<li className="text-white/40 text-right hover:text-white/90 cursor-pointer">
								log 1
							</li>
							<li className="text-white/40 text-right hover:text-white/90 cursor-pointer">
								log 2
							</li>
							<li className="text-white/40 text-right hover:text-white/90 cursor-pointer">
								log 3
							</li>
							<li className="text-white/40 text-right hover:text-white/90 cursor-pointer">
								log 5
							</li>
							<li className="text-white/40 text-right hover:text-white/90 cursor-pointer">
								log 6
							</li>
							<li className="text-white/40 text-right hover:text-white/90 cursor-pointer">
								log 7
							</li>
							<li className="text-white/40 text-right hover:text-white/90 cursor-pointer">
								log 8
							</li>
							<li className="text-white/40 text-right hover:text-white/90 cursor-pointer">
								log 9
							</li>
							<li className="text-white/40 text-right hover:text-white/90 cursor-pointer">
								log 10
							</li>
						</ul>
					</li>
					<li className="text-white/80 text-center uppercase text-xs font-semibold mb-2">
						Source 2
					</li>
					<li className="text-white/80 text-center uppercase text-xs font-semibold mb-2">
						Source 3
					</li>
				</ul>
			</div>
		</div>
	);
}
