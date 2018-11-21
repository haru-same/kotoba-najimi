const jaTools = require('../libs/ja-tools');
const clean = require('../libs/clean');
const reviewTools = require('../libs/review-tools');

const tryMatch = (ref, hyp) => {
	ref = clean.cleanPunctuation(ref);
	hyp = clean.cleanPunctuation(hyp);
	console.log('ref:', ref);
	console.log('hyp:', hyp);
	const score = reviewTools.scoreReview(ref, hyp);
	console.log(score);

	const wordPairs = [['','']];
	for(const pair of score.pairs){
		console.log(pair);

		if(pair[1] == null || pair[1] == ' '){
			if(wordPairs[wordPairs.length - 1][0].length > 0){
				wordPairs.push(['','']);
				console.log('new pair');
			}
		} else {
			wordPairs[wordPairs.length - 1][0] += pair[1];
		}

		if(pair[0] != null && pair[0] != ' '){
			wordPairs[wordPairs.length - 1][1] += pair[0];
		}
	}

	if(wordPairs[wordPairs.length - 1][0] == ''){
		wordPairs.pop();
	}

	console.log(wordPairs);
}

const base = '現実の世界を反映しながらも万華鏡のように変化しうる独自の法則で動く影絵の世界……';
const hyp = 'げんじつ の せかい を はんえい しながら も まんげきょう の よう に へんか しうる どくじ の ほうそく で うごく かげえ の せかい';
tryMatch(base, hyp);