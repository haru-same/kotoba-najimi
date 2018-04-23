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

const getCount = (set, word) => {
	let count = 0;
	for(const sentence of set){
		if(sentence.includes(word)) count++;
	}
	return count;
}

let count = 0;
let foundCount = 0;
const wordStates = [];
for(const id in facts){
	const fact = facts[id];
	if(fact.word){
		console.log(fact.word + '...');
		const inEd6fc = getCount(ed6fcText, fact.word);
		const inEd6sc = getCount(ed6scText, fact.word);
		wordStates.push([ fact.word, inEd6fc, inEd6sc ]);
		count++;
		if(inEd6fc || inEd6sc) foundCount++;
	}
}
console.log(`${foundCount}/${count}`);

fs.writeFileSync('output/word-found.txt', wordStates.join('\n'));