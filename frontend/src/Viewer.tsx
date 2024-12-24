import background from "./assets/videos/elk-start.mp4";

export default function Viewer() {
	return (
		<div className="w-3/4 bg-gray-50 h-svh overflow-scroll border-r relative">
			<video
				src={background}
				autoPlay
				loop
				muted
				className="absolute top-0 left-0 w-full h-full object-cover"
			/>
			<div className="absolute mt-32 text-center w-full">
				<div>Elk</div>
				<div className="text-xs hover:underline cursor-pointer">
					Click to add logs
				</div>
			</div>
		</div>
	);
}
