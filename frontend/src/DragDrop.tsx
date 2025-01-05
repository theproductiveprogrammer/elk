import React from "react";
import { ProcessFile } from "../wailsjs/go/main/App";
import { LogWarning } from "./logger";

interface DragDropProps extends React.HTMLAttributes<HTMLDivElement> {}

const DragDrop: React.FC<DragDropProps> = ({ className, children }) => {
	const handleDrop = async (event: React.DragEvent<HTMLDivElement>) => {
		event.preventDefault();
		const files = event.dataTransfer.files;

		if (files.length > 0) {
			const file = files[0];

			const buffer = await file.arrayBuffer();

			const numberArray = Array.from(new Uint8Array(buffer));
			const result = await ProcessFile(file.name, numberArray);
			LogWarning(`TODO: handle result: ${result}`);
		}
	};

	const handleDragOver = (event: React.DragEvent<HTMLDivElement>) => {
		event.preventDefault(); // Necessary to allow dropping
	};

	return (
		<div onDrop={handleDrop} onDragOver={handleDragOver} className={className}>
			{children}
		</div>
	);
};

export default DragDrop;
