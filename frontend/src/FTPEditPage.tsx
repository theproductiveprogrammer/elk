import { FormEvent, useEffect, useState } from "react";
import { DeleteFTPConfig, SaveFTPConfig } from "../wailsjs/go/main/App";
import { main } from "../wailsjs/go/models";
import useViewStore from "./stores/viewStore";
import clsx from "clsx";
import useAppStore from "./stores/appStore";

export default function FTPEditPage() {
	const { showStartPage, currSite, setCurrSite } = useViewStore();
	const { setFTPConfigs } = useAppStore();
	const [disable, setDisable] = useState(false);
	const [err, setErr_] = useState("");
	const [timer, setTimer] = useState<number | null>(null);
	const [editingFTP, setEditingFTP] =
		useState<main.FTPConfig>(emptyFTPConfig());

	useEffect(() => {
		setEditingFTP(main.FTPConfig.createFrom(currSite?.ftpConfig));
	}, [currSite]);

	function setErr(err: string) {
		setErr_(err);
		if (timer) clearTimeout(timer);
		setTimer(
			setTimeout(() => {
				setTimer(null);
				setErr("");
			}, 5000)
		);
	}

	async function onSubmit(e: FormEvent<HTMLFormElement>) {
		e.preventDefault();
		setDisable(true);

		let err: string | null = null;
		if (!editingFTP.name) err = `Missing Name`;
		else if (!editingFTP.ip) err = `Missing ip`;
		else if (!editingFTP.user) err = `Missing user`;
		else if (!editingFTP.password) err = `Missing password`;
		if (err) {
			setErr(err);
			setDisable(false);
			return;
		}

		try {
			const resp = await SaveFTPConfig(editingFTP);
			console.log(resp);
		} catch (err: any) {
			setErr(err.message || "Error: " + err);
		}
		setDisable(false);
		await setFTPConfigs();
		showStartPage();
	}

	function set(key: string, val: string) {
		const updated: any = { ...editingFTP };
		updated[key] = val;
		setEditingFTP(updated);
	}

	async function deleteCurr() {
		if (!currSite) {
			setErr("nothing to delete");
			return;
		}
		await DeleteFTPConfig(currSite.name);
		await setFTPConfigs();
		setCurrSite(null);
	}

	return (
		<div className="m-8">
			<div className="text-lg font-bold mb-6">Edit Site Details</div>
			<div className="text-center text-red-600 mb-2">{err || "\u00A0"}</div>
			<form onSubmit={onSubmit}>
				<div className="grid grid-cols-dialog items-center mb-2">
					<label className="text-right pr-4">Name</label>
					<input
						type="text"
						name="name"
						placeholder="Name"
						value={editingFTP.name}
						onChange={(e) => set("name", e.target.value)}
						className="border p-1 rounded"
					/>
				</div>

				<div className="grid grid-cols-dialog items-center mb-2">
					<label className="text-right pr-4">IP</label>
					<input
						type="text"
						name="ip"
						placeholder="211.211.211.211"
						value={editingFTP.ip}
						onChange={(e) => set("ip", e.target.value)}
						className="border p-1 rounded"
					/>
				</div>

				<div className="grid grid-cols-dialog items-center mb-2">
					<label className="text-right pr-4">User</label>
					<input
						type="text"
						name="user"
						value={editingFTP.user}
						onChange={(e) => set("user", e.target.value)}
						className="border p-1 rounded"
					/>
				</div>

				<div className="grid grid-cols-dialog items-center mb-2">
					<label className="text-right pr-4">Password</label>
					<input
						type="password"
						name="password"
						value={editingFTP.password}
						onChange={(e) => set("password", e.target.value)}
						className="border p-1 rounded"
					/>
				</div>

				<div className="mt-8 flex flex-row justify-around">
					<button type="submit" disabled={disable} className="btn-primary">
						Submit
					</button>
					<button
						disabled={disable}
						className="btn-secondary"
						onClick={() => showStartPage()}
					>
						Cancel
					</button>
				</div>

				<div
					className={clsx(
						"text-red-500 text-xs mt-8 text-right cursor-pointer hover:underline",
						editingFTP || "hidden"
					)}
					onClick={deleteCurr}
				>
					DELETE
				</div>
			</form>
		</div>
	);
}

function emptyFTPConfig(): main.FTPConfig {
	return main.FTPConfig.createFrom();
}
