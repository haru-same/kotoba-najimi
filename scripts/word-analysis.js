const fs = require('fs');
const logging = require('../libs/review-logging');
const decks = require('../libs/review-data');
const jaTools = require('../libs/ja-tools');
const jaDictionary = require('../libs/ja-dictionary');

let reviewEntries = logging.getLog();
const facts = decks.getDeck('kanji').getAllFacts();
const states = decks.getDeck('kanji').getAllStates();

const WordReviewCount = 10;

// console.log(jaDictionary.wordSearch());

const wordAccuracy = {};
const firstResult = {};
const wordAccuracy10AfterFirst = {};
const wordAccuracy10 = {};
const wordGraduated = {};
const earlyWordAccuracy = {};
const lateWordAccuracy = {};
for(const entry of reviewEntries){
	if(!entry.message.id || !facts[entry.message.id]) continue;

	const fact = facts[entry.message.id];
	const word = fact.word || fact.target;
	let result = 0;
	if(entry.message.score == 1 || entry.message.result == 1) result = 1;

	if(entry.message.tries == '1' && result == 0){
		continue;
	}
	
	if(!wordAccuracy[word]) wordAccuracy[word] = { total: 0, correct: 0 };
	if(!wordAccuracy10[word]) wordAccuracy10[word] = { total: 0, correct: 0 };
	if(!earlyWordAccuracy[word]) earlyWordAccuracy[word] = { total: 0, correct: 0 };
	if(!lateWordAccuracy[word]) lateWordAccuracy[word] = { total: 0, correct: 0 };
	if(!wordAccuracy10AfterFirst[word]) wordAccuracy10AfterFirst[word] = { total: 0, correct: 0 };

	if(wordAccuracy10[word].total < WordReviewCount) {
		wordAccuracy10[word].total++;
		wordAccuracy10[word].correct += result;
	}
	
	wordAccuracy[word].total++;
	wordAccuracy[word].correct += result;

	if(entry.message.streak && entry.message.streak == 2){
		wordGraduated[word] = true;
	}
	if(wordGraduated[word]){
		lateWordAccuracy[word].total++;
		lateWordAccuracy[word].correct += result;
	} else {
		earlyWordAccuracy[word].total++;
		earlyWordAccuracy[word].correct += result;
	}


	if(entry.message.tries == '1' && result == 0){
		continue;
	}

// wordAccuracy[word].total == 1
	if(wordAccuracy[word].total == 2){ //firstResult[word] == null){
		firstResult[word] = result;
	} else if(wordAccuracy[word].total < 12){
		wordAccuracy10AfterFirst[word].total++;
		wordAccuracy10AfterFirst[word].correct += result;
	}
}

// histograms comparing typing and speaking
const speakingBins = [];
const typingBins = [];
for(let i = 0; i <= 20; i++){
	speakingBins.push(0);
	typingBins.push(0);
}

for(const id in facts){
	const fact = facts[id];
	const state = states[id];
	if(fact.type == null || fact.type == 1){
		const word = fact.word || fact.target;
		if(wordAccuracy[word].total < 12) continue;
		const bin = Math.floor((wordAccuracy[word].correct/wordAccuracy[word].total) / 0.05);
		console.log(bin);
		if(state.condition == 0){
			typingBins[bin]++;
		}
		if(state.condition == 1){
			speakingBins[bin]++;
		}
	}
}

const speakingTypingHistogram = [];
for(let i = 0; i <= 20; i++){
	speakingTypingHistogram.push(`${speakingBins[i]}\t${typingBins[i]}`)
}
fs.writeFileSync('output/speaking-typing.txt', speakingTypingHistogram.join('\n'));

const earlyLateWordsAcc = [];
for(const word in wordGraduated){
	const early = earlyWordAccuracy[word];
	const late = lateWordAccuracy[word];
	if(late.total > 3){
		earlyLateWordsAcc.push(`${early.correct/early.total}\t${late.correct/late.total}`)
	}
}
fs.writeFileSync('output/early-late.txt', earlyLateWordsAcc.join('\n'));

const firstToLongTerm = [];
for(const word in firstResult){
	const longTerm = wordAccuracy10AfterFirst[word];
	if(longTerm.total > 5){
		firstToLongTerm.push(`${firstResult[word]}\t${longTerm.correct/longTerm.total}`)
	}
}
fs.writeFileSync('output/first-longterm.txt', firstToLongTerm.join('\n'));

const wordFrequency = {};
const lines = fs.readFileSync('data/word-frequency.txt', 'utf8').split('\r\n');
for(const line of lines){
	const elements = line.split(' ');
	wordFrequency[elements[2]] = { freq: parseFloat(elements[1]), rank: parseInt(elements[0]) };
}

const ed6lines = fs.readFileSync('data/ed6freq.txt', 'utf8').split('\n');
const ed6WordFrequency = {};
for(const line of ed6lines){
	const elements = line.split('\t');
	ed6WordFrequency[elements[0]] = parseFloat(elements[1]);
}

const freqToEd6FreqLines = [];
for(const word in wordFrequency){
	if(word in wordFrequency && word in ed6WordFrequency) freqToEd6FreqLines.push(`${wordFrequency[word].freq}\t${ed6WordFrequency[word]}`);
}
fs.writeFileSync('output/freq-ed6freq.txt', freqToEd6FreqLines.join('\n'));

const getAccuracy = (word) => {
	if(wordAccuracy[word]){
		if(wordAccuracy[word].total != WordReviewCount) return null;
		return wordAccuracy[word].correct / wordAccuracy[word].total;
	}
	return null;
}

const getFrequency = (word) => {
	if(wordFrequency[word]){
		return wordFrequency[word].freq;
	}
	return null;
};

const getRank = (word) => {
	if(wordFrequency[word]){
		return wordFrequency[word].rank;
	}
	return 15000;
};

// jaTools.afterInit(() => {
let notFoundCount = 0;
let freqAcc = [];
let rlenAcc = [];
let slenAcc = [];
let reviewCountToAcc = [];
let createdToAcc = [];
let ranks = [];

for(const id in facts){
	const fact = facts[id];
	let word = fact.word || fact.target;

	const response = jaDictionary.wordSearch(word, false).data[0];
	const kanji = response[0].split(' ')[0];
	const kana = response[0].split('[')[1].split(']')[0];

	if(!wordFrequency[kanji]){
		// console.log(kanji);
		notFoundCount++;
	}

	if(getFrequency(kanji) && getAccuracy(word) && getFrequency(kanji) > 10){
		freqAcc.push(`${getFrequency(kanji)}\t${getAccuracy(word)}`)
	}

	if(wordAccuracy[word]){
		reviewCountToAcc.push(`${wordAccuracy[word].total}\t${wordAccuracy[word].correct/wordAccuracy[word].total}`);
	}

	if(wordAccuracy[word] && fact.created){
		createdToAcc.push(`${fact.created}\t${wordAccuracy[word].correct/wordAccuracy[word].total}`);
	}

	ranks.push(getRank(word));
}
console.log(notFoundCount);

fs.writeFileSync('output/freq-acc.txt', freqAcc.join('\n'));
fs.writeFileSync('output/rlen-acc.txt', rlenAcc.join('\n'));
fs.writeFileSync('output/slen-acc.txt', slenAcc.join('\n'));
fs.writeFileSync('output/rcount-acc.txt', reviewCountToAcc.join('\n'));
fs.writeFileSync('output/created-acc.txt', createdToAcc.join('\n'));
fs.writeFileSync('output/ranks.txt', ranks.join('\n'));
// });

const correct = [];
const incorrect = [];
for(const entry of reviewEntries){
	if(entry.message.type != 'meaning' || !facts[entry.message.id]) continue;

	const id = entry.message.id;
	const fact = facts[id];
	let word = fact.word || fact.target;
	const response = jaDictionary.wordSearch(word, false).data[0];
	const kanji = response[0].split(' ')[0];

	let freq = getFrequency(kanji);
	if(!freq) freq = 2;

	if(entry.message.result == 0) incorrect.push(freq);
	if(entry.message.result == 1) correct.push(freq);
}
fs.writeFileSync('output/meaning-correct-freq.txt', correct.join('\n'));
fs.writeFileSync('output/meaning-incorrect-freq.txt', incorrect.join('\n'));