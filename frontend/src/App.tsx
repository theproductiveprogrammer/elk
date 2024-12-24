import "./App.css";
import Sidebar from "./Sidebar";
import Viewer from "./Viewer";

function App() {
	return (
		<div className="flex flex-row">
			<Sidebar />
			<Viewer />
		</div>
	);
}

export default App;
