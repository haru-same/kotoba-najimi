const fs = require('fs');
const parseSRT = require('parse-srt');
const decks = require('../libs/review-data');
const frequencyTable = require('../libs/frequency-table');
const jaTools = require('../libs/ja-tools');
const clean = require('../libs/clean');

const cleanBrackets = (text) => {
	text = text.replace(/\<.*?\>/g, ' ');
	text = text.replace(/（.*?）/g, ' ');
	text = text.replace(/\(.*?\)/g, ' ');
	text = text.replace(/\s\s+/g, ' ');
	return text.trim();
};

const allFrequencyTable = JSON.parse(fs.readFileSync('cache/frequencies.json'));
// const allFrequencyTable = frequencyTable.getFrequencies(JSON.parse(fs.readFileSync('th-all-captions.json')).map(c => cleanBrackets(c)), true);

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

const scoreText = (text) => {
	const textParts = text.split(' ');
	let score = 0;
	let length = 0;
	let minScore = Number.MAX_SAFE_INTEGER;
	let minWord = '';
	for(const part of textParts){
		const tokens = jaTools.getTokensSync(clean.cleanPunctuation(part));
		for(const token of tokens){
			// console.log(token, allFrequencyTable[token.s]);
			if(allFrequencyTable[token.s] && allFrequencyTable[token.s] < minScore){
				minScore = allFrequencyTable[token.s];
				minWord = token.s;
			}
		}
	}
	if(minScore == Number.MAX_SAFE_INTEGER) minScore = 1;

	if(deckFrequencies[minWord]) minScore = 0;

	return { text: text, score: minScore, word: minWord };
}

const _scoreText = (text) => {
	const textParts = text.split(' ');
	let score = 0;
	let length = 0;
	let minScore = 1;
	let minWord = '';
	let count = 0;
	for(const part of textParts){
		const tokens = jaTools.getTokensSync(clean.cleanPunctuation(part));
		for(const token of tokens){
			// console.log(token, allFrequencyTable[token.s]);
			if(allFrequencyTable[token.s]){
				if(allFrequencyTable[token.s] < minScore) minWord = token.s;

				minScore *= allFrequencyTable[token.s];
				count++;
			}
		}
	}

	minScore = Math.pow(minScore, 1 / count);

	// if(deckFrequencies[minWord]) minScore = 0;

	return { text: text, score: minScore, word: minWord };
}

// console.log(scoreText(cleanBrackets(testText)));

const scoreCaptions = () => {
	const scoredCaptions = [];
	for(const caption of captions){
		const text = cleanBrackets(caption.text);
		
		scoredCaptions.push(scoreText(text));
	}
	scoredCaptions.sort((a, b) => { return b.score - a.score; });

	fs.writeFileSync('tmp/word-scored-captions-ed.json', JSON.stringify(scoredCaptions, null, '\t'));
}

jaTools.afterInit(() => {
	console.log(scoreText('寝よう'));

	scoreCaptions();
});