const fs = require('fs');
const parseSRT = require('parse-srt');
const decks = require('./review-data');
const frequencyTable = require('./frequency-table');
const jaTools = require('./ja-tools');
const clean = require('./clean');

const cleanBrackets = (text) => {
	text = text.replace(/\<.*?\>/g, ' ');
	text = text.replace(/（.*?）/g, ' ');
	text = text.replace(/\(.*?\)/g, ' ');
	text = text.replace(/\s\s+/g, ' ');
	return text.trim();
};

const allFrequencyTable = JSON.parse(fs.readFileSync('tmp/working-frequency-table.json'));
const getCorpusFrequencies = () =>{
	return allFrequencyTable;
}

const cache = {};
const getDeckFrequencies = (targetDecks) => {
	const key = JSON.stringify(targetDecks);
	// if(key in cache){
	// 	return cache[key];
	// }

	const reviewDeckLines = [];
	for (const deck of targetDecks){
		const allFacts = decks.getDeck(deck).getAllFacts();

		for(const factId in allFacts){
			const fact = allFacts[factId];
			const sentence = fact.sentence || fact.context;
			reviewDeckLines.push(sentence);
			// console.log(sentence);
		}
	}

	// const easySet = JSON.parse(fs.readFileSync('easy-set.json'));
	// for(const sentence of easySet){
	// 	for(let i = 0; i < 10; i++){
	// 		reviewDeckLines.push(sentence);	
	// 	}
	// }

	const deckFrequencies = frequencyTable.getFrequencies(reviewDeckLines, true, true);
	fs.writeFileSync('tmp/deck-frequencies.json', JSON.stringify(deckFrequencies, null, '\t'));

	cache[key] = deckFrequencies;

	return deckFrequencies;
}

const getAverageKnowledge = (tokens, corpusFrequency, deckFrequency) => {
	// let sum = 0;
	// for(const token of tokens){
	// 	const deckScore = deckFrequency[token.s] ? deckFrequency[token.s] + 1 : 1;
	// 	sum += Math.sqrt(deckScore);
	// }
	// return sum / tokens.length;
	let sum = 1;
	for(const token of tokens){
		const deckScore = deckFrequency[token.s] || 0;
		if(deckScore == 0){
			sum *= 0.5;
		} else {
			sum *= 1 + Math.log(deckScore)/100;
		}
	}
	return sum;//Math.pow(sum, 1/tokens.length);
};

const getUsefulness = (tokens, corpusFrequency, deckFrequency) => {
	// let score = 1;
	// let length = 0;
	// for(const token of tokens){
	// 	const corpusScore = corpusFrequency[token.s] || 1;
	// 	const deckScore = deckFrequency[token.s] ? deckFrequency[token.s] + 1 : 1;
	// 	const tokenScore = Math.pow(Math.log(corpusScore) + 1, 1 / deckScore);
	// 	score *= 1 / tokenScore;
	// 	length++;
	// }
	// return 1 / Math.pow(score, 1 / length);
	
	let score = 0;
	for(const token of tokens){
		const corpusScore = corpusFrequency[token.s] || 1;
		const deckScore = deckFrequency[token.s] ? deckFrequency[token.s] + 1 : 1;
		const innerScore = Math.pow(Math.sqrt(corpusScore + 1) + 1, 1 / deckScore);
		if(innerScore > score){
			score = innerScore;
		}
	}
	return score;
};

const scoreText = (text, corpusFrequency, deckFrequency, words=null) => {
	const textParts = cleanBrackets(text).split(' ');
	let length = 0;

	const usedTokens = {};

	const allTokens = [];
	for(const part of textParts){
		const tokens = jaTools.getTokensSync(clean.cleanPunctuation(part));
		for(const token of tokens){
			if(usedTokens[token.s]) continue;
			usedTokens[token.s] = true;
			allTokens.push(token);

			if(words){
				const usefulness = getUsefulness([token], corpusFrequency, deckFrequency);
				const knowledge = getAverageKnowledge([token], corpusFrequency, deckFrequency);
				words.push({ word: token.s, usefulness: usefulness, knowledge: knowledge });
			}
		}
	}
	const allKnowledge = getAverageKnowledge(allTokens, corpusFrequency, deckFrequency);
	const allUsefulness = getUsefulness(allTokens, corpusFrequency, deckFrequency);
	const allContext = 1;//Math.log(allTokens.length) + 1;
	return { text: text, score: allContext * allUsefulness * allKnowledge, knowledge: allKnowledge, usefulness: allUsefulness };
};

const _scoreText = (text, corpusFrequency, deckFrequency, words=null) => {
	const textParts = cleanBrackets(text).split(' ');
	let score = 1;
	let length = 0;

	const usedTokens = {};
	for(const part of textParts){
		const tokens = jaTools.getTokensSync(clean.cleanPunctuation(part));
		for(const token of tokens){
			if(usedTokens[token.s]) continue;
			usedTokens[token.s] = true;

			const corpusScore = corpusFrequency[token.s] || 1;
			const deckScore = deckFrequency[token.s] ? deckFrequency[token.s] + 1 : 1;
			const tokenScore = Math.pow(Math.log(corpusScore) + 1, 1 / deckScore);
			score *= 1 / tokenScore;
			length++;

			if(words) {
				words.push({ token: token, score: tokenScore });
			}
		}
	}
	return { text: text, score: 1 / Math.pow(score, 1 / Math.log(length+1)) };
};

module.exports.scoreText = (text, targetDecks, words=null) => {
	const deckFrequency = getDeckFrequencies(targetDecks);
	return scoreText(text, getCorpusFrequencies(), deckFrequency, words);
}

module.exports.scoreLines = (lines, targetDecks) => {
	const corpus = getCorpusFrequencies();
	let deck = {};
	if(targetDecks.length > 0){
		deck = getDeckFrequencies(targetDecks);
	}
	const scoredCaptions = [];
	for(const line of lines){
		scoredCaptions.push(scoreText(line, corpus, deck));
	}
	scoredCaptions.sort((a, b) => { return b.score - a.score; });

	fs.writeFileSync('tmp/scored-captions.json', JSON.stringify(scoredCaptions, null, '\t'));
	return scoredCaptions;
}