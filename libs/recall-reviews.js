const shuffle = require('./shuffle');

const ReviewTable = require('./review-table-base');

const factTableName = "recall-facts";
const stateTableName = "recall-review-states";

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
}

module.exports = new RecallReviewTable(factTableName, stateTableName);