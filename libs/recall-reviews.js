const ed = require('edit-distance');
const shuffle = require('./shuffle');

const ReviewTable = require('./review-table-base');

const factTableName = "recall-facts";
const stateTableName = "recall-review-states";

const ignore = "、…。！？～";
const _levInsert = (node) => { return 1; };
const _levRemove = (node) => { return 1; };
const _levUpdate = (stringA, stringB) => { return stringA !== stringB ? 1 : 0; };

class RecallReviewTable extends ReviewTable {
	assignCondition(fact, counts){
		if(!fact.word){
			if(counts[0] < counts[1]) return 0;
			if(counts[1] < counts[0]) return 1;
			return Math.floor(Math.random() * 2);
		} else {
			return 2;
		}
	}

	sortReviews(factList){
		shuffle(factList);
		factList.sort((a, b) => {
			let aScore = 0;
			if(a.word) aScore = 1;
			let bScore = 0;
			if(b.word) bScore = 1;
			return aScore - bScore;
		});
		console.log(factList[0]);
	}

	scoreReview(original, input){
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
	}
}

module.exports = new RecallReviewTable(factTableName, stateTableName);