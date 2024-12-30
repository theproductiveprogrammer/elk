import FTPEditPage from "./FTPEditPage";
import LogViewer from "./LogViewer";
import SitePage from "./SitePage";
import StartPage from "./StartPage";
import useViewStore from "./stores/viewStore";

export default function Viewer() {
	const { showing } = useViewStore();

	switch (showing) {
		case "start":
			return <StartPage />;
		case "ftpedit":
			return <FTPEditPage />;
		case "site":
			return <SitePage />;
		case "log":
			return <LogViewer />;
		default:
			return <Error404 notFound={showing + " page"} />;
	}
}

function Error404({ notFound }: { notFound: string }) {
	return <div className="">Could not find: {notFound}</div>;
}
