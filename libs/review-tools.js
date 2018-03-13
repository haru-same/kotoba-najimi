const ed = require('edit-distance');

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

			if(pair[1] != null){
				correctCount--;
			}
		} else {
			correctCount++;
			totalCount++;
		}
	}

	return { pairs: pairs, score: correctCount / totalCount };
};

module.exports.streakToInterval = (streak) => {
	const minute = 1000 * 60;
	const hour = minute * 60;
	const day = hour * 24;
	switch(streak){
		case -1:
			return 0;
		case 0:
			return 5 * minute;
		default:
			return day * Math.pow(2, streak - 1) - 12 * hour;
	}
};