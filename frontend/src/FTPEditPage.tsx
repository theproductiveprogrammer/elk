import { FormEvent, useState } from "react";
import { SaveFTPConfig } from "../wailsjs/go/main/App";
import useViewStore from "./stores/viewStore";

export default function FTPEditPage() {
	const { showStartPage } = useViewStore();
	const [disable, setDisable] = useState(false);
	const [err, setErr_] = useState("");
	const [timer, setTimer] = useState<number | null>(null);

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

		const form = e.currentTarget;
		const data = new FormData(form);
		const name_v = data.get("name");
		const ip_v = data.get("ip");
		const user_v = data.get("user");
		const password_v = data.get("password");

		let err: string | null = null;
		if (!name_v) err = `Missing Name`;
		else if (!ip_v) err = `Missing ip`;
		else if (!user_v) err = `Missing user`;
		else if (!password_v) err = `Missing password`;
		if (err) {
			setErr(err);
			setDisable(false);
			return;
		}

		const name = (name_v as FormDataEntryValue).toString();
		const ip = (ip_v as FormDataEntryValue).toString();
		const user = (user_v as FormDataEntryValue).toString();
		const password = (password_v as FormDataEntryValue).toString();

		try {
			const resp = await SaveFTPConfig({
				name,
				ip,
				user,
				password,
			});
			console.log(resp);
		} catch (err: any) {
			setErr(err.message || "Error: " + err);
		}
		setDisable(false);
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
						className="border p-1 rounded"
					/>
				</div>

				<div className="grid grid-cols-dialog items-center mb-2">
					<label className="text-right pr-4">IP</label>
					<input
						type="text"
						name="ip"
						placeholder="211.211.211.211"
						className="border p-1 rounded"
					/>
				</div>

				<div className="grid grid-cols-dialog items-center mb-2">
					<label className="text-right pr-4">User</label>
					<input type="text" name="user" className="border p-1 rounded" />
				</div>

				<div className="grid grid-cols-dialog items-center mb-2">
					<label className="text-right pr-4">Password</label>
					<input
						type="password"
						name="password"
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
			</form>
		</div>
	);
}
