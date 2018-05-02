const fs = require('fs');
const logging = require('../libs/review-logging');
const decks = require('../libs/review-data');
const jaTools = require('../libs/ja-tools');
const jaDictionary = require('../libs/ja-dictionary');

const clozeSources = [
	'data/alllines-fc.txt',
	'data/alllines-sc.txt'
];

let wordClozes = {};

const init = () => {
	let reviewEntries = logging.getLog();
	const facts = decks.getDeck('kanji').getAllFacts();
	const states = decks.getDeck('kanji').getAllStates();

	let count = 0;
	let foundCount = 0;
	const wordStates = [];

	for(const source of clozeSources){
		const lines = fs.readFileSync(source, 'utf8').split('\n');

		for(const id in facts){
			const word = facts[id].word;
			for(const sentence of lines){
				if(sentence.includes(word) && sentence.length > 8) {
					if(!wordClozes[id]) wordClozes[id] = [];
					wordClozes[id].push(sentence.replace('\r', ''));
				}
			}
		}
	}
}

if(fs.existsSync('cache/cloze-sentences.json')){
	wordClozes = JSON.parse(fs.readFileSync('cache/cloze-sentences.json', 'utf8'));
} else {
	init();
	fs.writeFileSync('cache/cloze-sentences.json', JSON.stringify(wordClozes, null, '\t'));
}

module.exports.getRandomClozeSentence = (id) => {
	const list = wordClozes[id];
	if(!list) return null;
	return list[Math.floor(Math.random() * list.length)];
};