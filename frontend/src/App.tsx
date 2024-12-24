import "./App.css";
import Sidebar from "./Sidebar";

function App() {
	return (
		<div className="flex flex-row">
			<Sidebar />
			<div className="w-3/4 bg-white h-svh overflow-scroll"></div>
		</div>
	);
}

export default App;
