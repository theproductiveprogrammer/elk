/** @type {import('tailwindcss').Config} */
export default {
	content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
	theme: {
		extend: {
			colors: {
				"elk-green": "rgb(130 144 134)",
			},
			gridTemplateColumns: {
				dialog: "repeat(2, 8rem 1fr)",
			},
		},
	},
	plugins: [require("tailwindcss-animate")],
};
