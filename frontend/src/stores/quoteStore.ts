import { create } from "zustand";

const quotes = [
	"Rejoice always.",
	"Let all that you do be done in love.",
	"Do to others as you would have them do to you.",
	"Give thanks in all circumstances.",
	"Your word is a lamp for my feet, a light on my path.",
	"You are the light of the world.",
	"Give thanks to the Lord, for he is good. His love endures forever.",
	"Be joyful in hope, patient in affliction, faithful in prayer.",
	"For nothing will be impossible for God.",
	"Anxiety weighs down the heart, but a kind word cheers it up.",
	"Love is patient, love is kind.",
	"Let us not love with words or speech but with actions and in truth.",
	"Let love and faithfulness never leave you.",
	"Everything should be done in love.",
	"Goodness and love will follow me all the days of my life.",
	"For we walk by faith, not by sight.",
	"Rivers of living water will flow from within them.",
	"Do not be anxious about anything.",
	"Everything is possible for one who believes.",
	"Take heart!",
	"I have fought the good fight.",
	"I fear no evil.",
	"The Lord bless you and keep you.",
	"The Lord turn his face toward you and give you peace.",
	"Trust in the Lord and do good.",
	"Greater love has no one than this, that someone lay down his life for his friends.",
	"As iron sharpens iron, so one person sharpens another.",
	"Be kind and compassionate to one another.",
	"One who forgives an affront fosters friendship.",
	"Walk with the wise and become wise.",
	"The sweetness of a friend comes from his earnest counsel.",
	"Carry each other’s burdens.",
	"Live at peace with everyone.",
	"Whoever loves God must also love his brother.",
	"Be courageous. Be strong.",
	"The Lord is my strength and my shield.",
	"Look to the Lord and his strength; seek his face always.",
	"Be strong and take heart.",
];

interface QuoteData {
	quotes: string[];
	currQuote: number;
}
interface QuoteState extends QuoteData {
	nextRandomQuote: () => void;
}

function randomIndex() {
	return Math.floor(Math.random() * quotes.length);
}

const useQuoteStore = create<QuoteState>((set) => ({
	quotes,
	currQuote: randomIndex(),
	nextRandomQuote: () => set({ currQuote: randomIndex() }),
}));

export default useQuoteStore;
