import logo from "./assets/images/elk-logo.svg";
import logoText from "./assets/images/elk-text.svg";
export default function Sidebar() {
	return (
		<div className="w-1/4 bg-gray-50 h-svh overflow-scroll border-r">
			<div className="flex flex-col items-center mt-4 border-b pb-7">
				<img src={logo} alt="logo" className="w-10" />
				<img src={logoText} alt="Elk" className="w-12 mt-2" />
				<span className="mt-2 text-xs opacity-55">
					The world's best log viewer
				</span>
			</div>
		</div>
	);
}
