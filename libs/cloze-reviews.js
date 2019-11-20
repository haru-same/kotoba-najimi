const fs = require('fs');
const logging = require('../libs/review-logging');
const decks = require('../libs/review-data');
const jaTools = require('../libs/ja-tools');
const jaDictionary = require('../libs/ja-dictionary');
const util = require('../libs/util');
const clean = require('../libs/clean');
const userdata = require('./userdata');

const clozeSources = [
	'data/alllines-fc.txt',
	'data/alllines-sc.txt'
];

let userWordClozes = {};

const init = (user) => {
	let reviewEntries = logging.getLog(user);
	const facts = decks.getDeck(user, 'kanji').getAllFacts();
	const states = decks.getDeck(user, 'kanji').getAllStates();

	let count = 0;
	let foundCount = 0;
	const wordStates = [];

	let wordClozes = {};
	userWordClozes[user] = wordClozes;

	for(const source of clozeSources){
		const lines = fs.readFileSync(source, 'utf8').split('\n');

		for(const id in facts){
			const word = facts[id].word || facts[id].target;
			for(const sentence of lines){
				if(sentence.includes(word) && sentence.length > 8) {
					if(!wordClozes[id]) wordClozes[id] = [];
					wordClozes[id].push(sentence.replace('\r', ''));
				}
			}
		}
	}
}

const maybeInitializeUserClozes = (user) => {
	if (userWordClozes[user]) return;

	const cachePath = userdata.getDir(user, 'cache');
	const dataPath = cachePath + '/cloze-sentences.json';

	if(fs.existsSync(dataPath)){
		userWordClozes[user] = JSON.parse(fs.readFileSync('cloze-sentences.json', 'utf8'));
	} else {
		init(user);
		fs.writeFileSync(dataPath, JSON.stringify(userWordClozes[user], null, '\t'));
	}
};

module.exports.getRandomClozeSentence = (user, id) => {
	maybeInitializeUserClozes(user);

	const list = userWordClozes[user][id];
	if(!list) return null;
	return list[Math.floor(Math.random() * list.length)];
};

module.exports.getNewClozeFact = (user) => {
	const deck = decks.getDeck(user, 'kanji');
	const facts = deck.getAllFacts();
	const availableFactIds = [];
	for (const factId in facts) {
		if (facts[factId].audio) {
			availableFactIds.push(factId);
		}
	}
	return facts[util.randomFromArray(availableFactIds)];
};