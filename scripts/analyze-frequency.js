const fs = require('fs');
const parseSRT = require('parse-srt');
const decks = require('../libs/review-data');
const frequencyTable = require('../libs/frequency-table');

const cleanBrackets = (text) => {
	text = text.replace(/\<.*?\>/g, ' ');
	text = text.replace(/（.*?）/g, ' ');
	text = text.replace(/\(.*?\)/g, ' ');
	text = text.replace(/\s\s+/g, ' ');
	return text.trim();
};

// const allFrequencyTable = JSON.parse(fs.readFileSync('cache/frequencies.json'));
const allFrequencyTable = frequencyTable.getFrequencies(JSON.parse(fs.readFileSync('th-all-captions.json')).map(c => cleanBrackets(c)));

const allFacts = decks.getDeck("kanji").getAllFacts();
const easySet = JSON.parse(fs.readFileSync('easy-set.json'));

const reviewDeckLines = [];
for(const factId in allFacts){
	const fact = allFacts[factId];
	const sentence = fact.sentence || fact.context;
	reviewDeckLines.push(sentence);
}
for(const sentence of easySet){
	for(let i = 0; i < 10; i++){
		reviewDeckLines.push(sentence);	
	}
}
const deckFrequencies = frequencyTable.getFrequencies(reviewDeckLines, true);
fs.writeFileSync('deck-frequencies.json', JSON.stringify(deckFrequencies, null, '\t'));

const fileText = fs.readFileSync('data/srt/th-s01e01-test.srt', 'utf-8');
const captions = parseSRT(fileText);

const testText = "（ﾄﾘﾝﾄﾞﾙ）こんばんは<br />（一同）こんばんは";
console.log(testText);
console.log(cleanBrackets(testText));

const scoreText = (text) => {
	let score = 0;
	for(let i = 0; i < text.length - 1; i++){
		for(let j = i + 1; j < text.length; j++){
			const substring = text.substring(i, j);
			const thisScore = allFrequencyTable[substring];
			if(!thisScore) break;
			score += Math.log(thisScore * substring.length);
		}
	}
	return score;
}

const scoreTextWithFacts = (text) => {
	let score = 0;
	for(let i = 0; i < text.length - 1; i++){
		for(let j = i + 1; j < text.length; j++){
			const substring = text.substring(i, j);

			// const inversePower = deckFrequencies[substring] || 1;

			let thisScore = allFrequencyTable[substring];
			if(!thisScore) break;
			// thisScore = Math.pow(Math.log(thisScore), 1/inversePower);
			thisScore = (thisScore / thisScore) / (deckFrequencies[substring] || 1);
			score += thisScore * substring.length;
		}
	}
	return score;
}

console.log(scoreText(cleanBrackets(testText)));

const scoreCaptions = () => {
	const scoredCaptions = [];
	for(const caption of captions){
		const text = cleanBrackets(caption.text);
		const textParts = text.split(' ');
		let score = 0;
		let length = 0;
		for(const part of textParts){
			score += scoreText(part);
			length += part.length;
		}
		score /= length;
		scoredCaptions.push({ text: text, score: score });
	}
	scoredCaptions.sort((a, b) => { return b.score - a.score; });

	fs.writeFileSync('scored-captions.json', JSON.stringify(scoredCaptions, null, '\t'));
}

scoreCaptions();