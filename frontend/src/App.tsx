import { useEffect } from "react";
import "./App.css";
import Sidebar from "./Sidebar";
import Viewer from "./Viewer";
import useAppStore from "./stores/appStore";

function App() {
	const { setFTPConfigs } = useAppStore();

	useEffect(() => {
		setFTPConfigs();
	}, []);

	return (
		<div className="flex flex-row">
			<Sidebar />
			<Viewer />
		</div>
	);
}

export default App;
