const fs = require('fs');
const logging = require('../libs/review-logging');
const decks = require('../libs/review-data');
const jaTools = require('../libs/ja-tools');
const jaDictionary = require('../libs/ja-dictionary');

let reviewEntries = logging.getLog();
const facts = decks.getDeck('kanji').getAllFacts();
const states = decks.getDeck('kanji').getAllStates();

const ed6fcText = fs.readFileSync('data/alllines-fc.txt', 'utf8').split('\n');
const ed6scText = fs.readFileSync('data/alllines-sc.txt', 'utf8').split('\n');
let ed6fcTokens = [];
let ed6scTokens = [];

const getCount = (set, word) => {
	let out = [];
	for(const sentence of set){
		if(sentence.includes(word)) {
			// console.log(sentence);
			out.push(sentence);
		}
	}
	return out;
}

const isEmbedded = (tokens, left, right) => {
	for(let i = 0; i < tokens.length - 2; i++){
		if(tokens[i].s == left && tokens[i+2].s == right) return true;
		if(i < tokens.length - 3 && tokens[i].s == left && tokens[i+2].s + tokens[i+3].s == right) return true;
	}
	return false;
}

const getEmbeddingCount = (set, left, right) => {
	let count = 0;
	for(const sentence of set){
		if(isEmbedded(sentence, left, right)) {
			// console.log(sentence);
			count++;
		}
	}
	return count;
}

jaTools.afterInit(() => {
	if(fs.existsSync('data/alllines-fc-tokens.txt')){
		ed6fcTokens = JSON.parse(fs.readFileSync('data/alllines-fc-tokens.txt', 'utf8'));
	} else {
		for(const line of ed6fcText){
			ed6fcTokens.push(jaTools.getTokensSync(line)); 
		}
		fs.writeFileSync('data/alllines-fc-tokens.txt', JSON.stringify(ed6fcTokens, null, '\t'));
	}

	if(fs.existsSync('data/alllines-sc-tokens.txt')){
		ed6scTokens = JSON.parse(fs.readFileSync('data/alllines-sc-tokens.txt', 'utf8'));
	} else {
		for(const line of ed6scText){
			ed6scTokens.push(jaTools.getTokensSync(line)); 
		}
		fs.writeFileSync('data/alllines-sc-tokens.txt', JSON.stringify(ed6scTokens, null, '\t'));
	}

	const lines = [];
	const clozeSentences = [];
	for(const id in facts){
		const fact = facts[id];
		if(fact.type == 3){
			const tokens = jaTools.getTokensSync(fact.sentence);
			// console.log(fact.word);
			// console.log(tokens);

			for(let i = 0; i < tokens.length; i++){
				const token = tokens[i];

				if(!tokens[i-1] || !tokens[i+1]) continue;

				if(fact.word.includes(token.s)){
					const embeddedWord = tokens[i-1].s + tokens[i].s + tokens[i+1].s;
					// console.log(token, embeddedWord);
					const exactSentences = getCount(ed6fcText, embeddedWord);
					for(const s in getCount(ed6scText, embeddedWord)) exactSentences.push(s);
					if(exactSentences.length > 10){
						const clozeSentence = exactSentences[Math.floor(Math.random()*exactSentences.length)].replace(tokens[i].s, '____');
						console.log(clozeSentence, tokens[i].s);
						clozeSentences.push(clozeSentence);
					}
					const exactCount = exactSentences.length;
					const embeddingCount = getEmbeddingCount(ed6fcTokens, tokens[i-1].s, tokens[i+1].s) + getEmbeddingCount(ed6scTokens, tokens[i-1].s, tokens[i+1].s);
					lines.push(`${fact.word}\t${exactCount}\t${embeddingCount}`);
					break;
				}
			}
		}
	}
	fs.writeFileSync('output/embedding.txt', lines.join('\n'));
	fs.writeFileSync('output/embedding-cloze.txt', clozeSentences.join('\n'));
});