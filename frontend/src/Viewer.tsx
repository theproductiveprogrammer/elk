import background from "./assets/videos/elk-start.mp4";
import FTPEditPage from "./FTPEditPage";
import useViewStore from "./stores/viewStore";

export default function Viewer() {
	const { showing } = useViewStore();

	switch (showing) {
		case "start":
			return <StartPage />;
		case "ftpedit":
			return <FTPEditPage />;
		default:
			return <Error404 notFound={showing + " page"} />;
	}
}

function Error404({ notFound }: { notFound: string }) {
	return <div className="">Could not find: {notFound}</div>;
}

function StartPage() {
	const { showFTPEditPage } = useViewStore();

	return (
		<div className="w-3/4 bg-gray-50 h-svh overflow-scroll border-r relative">
			<video
				src={background}
				autoPlay
				loop
				muted
				className="absolute top-0 left-0 w-full h-full object-cover"
			/>
			<div
				className="absolute mt-32 text-center w-full"
				onClick={() => showFTPEditPage(null)}
			>
				<div>Elk</div>
				<div className="text-xs hover:underline cursor-pointer">
					Click to add logs
				</div>
			</div>
		</div>
	);
}
