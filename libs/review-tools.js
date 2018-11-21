const ed = require('edit-distance');
const wanakana = require('./wanakana');

const ignore = "、…。！？～";
const _levInsert = (node) => { return 1; };
const _levRemove = (node) => { return 1; };
const _levUpdate = (stringA, stringB) => { return stringA !== stringB ? 1 : 0; };

module.exports.scoreReview = (original, input) => {
	const lev = ed.levenshtein(original, input, _levInsert, _levRemove, _levUpdate);
	const pairs = lev.pairs();
	console.log('Levenshtein', lev.distance, pairs, lev.alignment());

	let totalCount = 0;
	let correctCount = 0;
	for(const pair of pairs){
		const isMissingPunctuation = pair[1] == null && ignore.includes(pair[0]);
		if(pair[0] != pair[1] && !isMissingPunctuation){
			if(pair[0] != null){
				totalCount++;
			} 

			if(pair[0] == null && pair[1] != null){
				correctCount--;
			}
		} else {
			correctCount++;
			totalCount++;
		}
	}

	return { pairs: pairs, score: correctCount / totalCount };
};

module.exports.scoreSpeechReview = (original, reading, speechResults) => {
	const originalHiragana = wanakana._katakanaToHiragana(original);
	const readingHiragana = wanakana._katakanaToHiragana(reading);
	for(let i = 0; i < speechResults.length; i++){
		let transcript = speechResults[i].replace(/ /g, '');
		console.log('t', i, ':', transcript, "; original:", original, '; reading:', reading, '; ', transcript == reading || transcript == original);
		transcriptHiragana = wanakana._katakanaToHiragana(transcript);
		if(transcript == original || transcript == reading || transcriptHiragana == originalHiragana || transcriptHiragana == readingHiragana){
			return { score: 1 };
		}
	}

	return { score: 0 };
};

module.exports.scoreReviewWithMatching = (inputs, references) => {
	inputs = inputs.map(i => wanakana._katakanaToHiragana(i.replace(/\s/g, '')));
	references = references.map(i => wanakana._katakanaToHiragana(i));
	console.log(inputs);
	console.log(references);
	for(const input of inputs){
		for(const reference of references){
			if(input == reference) return { score: 1 };
		}
	}
	return { score: 0 };
};

module.exports.streakToInterval = (streak) => {
	const minute = 1000 * 60;
	const hour = minute * 60;
	const day = hour * 24;
	switch(streak){
		case -2:
			return 0;
		case -1:
			return 0;
		case 0:
			return 5 * minute;
		case 1: case 2: case 3: case 4: case 5:
			return day * Math.pow(2, streak - 1) - 6 * hour;
		default:
			return (16 + 4*(streak - 5)) * day;
	}
};