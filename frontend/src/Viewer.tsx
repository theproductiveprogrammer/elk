import FTPEditPage from "./FTPEditPage";
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
			return <SitePage />
		default:
			return <Error404 notFound={showing + " page"} />;
	}
}

function Error404({ notFound }: { notFound: string }) {
	return <div className="">Could not find: {notFound}</div>;
}
