import { useEffect } from "react";
import useQuoteStore from "./stores/quoteStore";
import background from "./assets/videos/elk-start.mp4";
import useViewStore from "./stores/viewStore";
import clsx from "clsx";

export default function StartPage() {
	const { quotes, currQuote, nextRandomQuote } = useQuoteStore();
	const { startVideoLoaded, setStartVideoLoaded } = useViewStore();

	useEffect(() => {
		const interval = setInterval(() => {
			nextRandomQuote();
		}, 30000);

		return () => clearInterval(interval);
	}, [quotes]);

	return (
		<div
			className={clsx(
				"sm:w-3/4 md:w-10/12 bg-gray-50 h-svh overflow-scroll border-r relative",
				startVideoLoaded || "hidden"
			)}
		>
			<video
				src={background}
				autoPlay
				loop
				muted
				onLoadedData={() => setTimeout(() => setStartVideoLoaded(), 50)}
				className="absolute top-0 left-0 w-full h-full object-cover"
			/>
			<div className="absolute mt-32 text-center w-full">
				<div>Elk</div>
				<div className="text-xs hover:underline cursor-pointer">
					{quotes[currQuote]}
				</div>
			</div>
		</div>
	);
}
