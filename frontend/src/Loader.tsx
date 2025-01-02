import logo from "./assets/images/elk-logo.svg";

export default function Loader() {
	return (
		<div className="flex flex-col justify-center items-center mt-8 animate-pulse">
			<img src={logo} alt="logo" className="w-16 opacity-30" />
			<span className="mt-2 opacity-60">Loading...</span>
		</div>
	);
}
