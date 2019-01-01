const kanjiReviews = require('../libs/kanji-reviews');
const userdata = require('../libs/userdata');
const uuidv4 = require('uuid/v4');

const inputFile = 'kanji-review-states';
const facts = kanjiReviews.getAllFacts();

const table = userdata.getTable(inputFile);

const makeReviewState = (originalState, condition) => {
	const stateCopy = JSON.parse(JSON.stringify(originalState));
	stateCopy.condition = condition;
	return stateCopy;
};

const copyState = (tableData, originalState, count) => {
	if (originalState.condition == null) {
		originalState.condition = 0;
	}

	for (let i = 0; i < count; i++) {
		if (i == originalState.condition){
			continue;
		}

		const guid = uuidv4();
		console.log(guid);
		tableData[guid] = makeReviewState(originalState, i);
	}
}

for(const key in table.data){
	if (key in facts) {
		if (facts[key].type == 1) {
			copyState(table.data, table.data[key], 3);
		} else if(facts[key].type == 3) {
			copyState(table.data, table.data[key], 4);
		}
	}
}

table.name = 'kanji-review-states_';
userdata.saveTable(table);