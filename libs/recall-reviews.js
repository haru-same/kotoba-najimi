const ed = require('edit-distance');

const ReviewTable = require('./review-table-base');

const factTableName = "recall-facts";
const stateTableName = "recall-review-states";

const ignore = "、…。！？～";
const _levInsert = (node) => { return 1; };
const _levRemove = (node) => { return 1; };
const _levUpdate = (stringA, stringB) => { return stringA !== stringB ? 1 : 0; };

class RecallReviewTable extends ReviewTable {
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

// const uuidv4 = require('uuid/v4');
// const ed = require('edit-distance');

// const shuffle = require('./shuffle');
// const userdata = require('./userdata');

// const factTableName = "recall-facts";
// const stateTableName = "recall-review-states";

// let insert, remove, update;
// insert = remove = (node) => { return 1; };
// update = (stringA, stringB) => { return stringA !== stringB ? 1 : 0; };
// const ignore = "、…。！？～";

// module.exports = {
// 	findAllFacts: () => {
// 		return userdata.getTable(factTableName).data;
// 	},
// 	find: (varName, value) => {
// 		const factsTable = userdata.getTable(factTableName);
// 		for(let id in factsTable.data){
// 			const fact = factsTable.data[id];
// 			if(fact[varName] == value){
// 				return fact;
// 			}
// 		}
// 		return null;
// 	},
// 	add: (newFact) => {
// 		const factsTable = userdata.getTable(factTableName);
// 		const guid = uuidv4();
// 		newFact.id = guid;
// 		newFact.created = new Date().getTime();
// 		factsTable.data[guid] = newFact;
// 		userdata.saveTable(factsTable);
// 	},
// 	syncStates: () => {
// 		const factsTable = userdata.getTable(factTableName);
// 		const statesTable = userdata.getTable(stateTableName);

// 		let counts = [ 0, 0 ];
// 		for(const id in statesTable.data){
// 			if(statesTable.data[id].condition == 0) counts[0]++;
// 			if(statesTable.data[id].condition == 1) counts[1]++;
// 		}

// 		for(const id in factsTable.data){
// 			if(!statesTable.data[id]){
// 				let condition = Math.floor(Math.random() * 2);
// 				if(counts[0] < counts[1]) condition = 0;
// 				if(counts[1] < counts[0]) condition = 1;
// 				counts[condition]++;

// 				statesTable.data[id] = { id: id, condition: condition, streak: 0, due: new Date().getTime() };
// 			}
// 		}

// 		userdata.saveTable(statesTable);
// 	},
// 	findState: (varName, value) => {
// 		const statesTable = userdata.getTable(stateTableName);
// 		for(let id in statesTable.data){
// 			const state = statesTable.data[id];
// 			if(state[varName] == value){
// 				return state;
// 			}
// 		}
// 		return null;
// 	},
// 	updateState: (item) => {
// 		if(!item.id){
// 			console.error("not valid:");
// 			console.error(item);
// 			return;
// 		}

// 		const statesTable = userdata.getTable(stateTableName);
// 		statesTable.data[item.id] = item;
// 		// console.log(item);
// 		// console.log(statesTable);
// 		userdata.saveTable(statesTable);
// 	},
// 	getExpiredReview: () => {
// 		const factsTable = userdata.getTable(factTableName);
// 		const statesTable = userdata.getTable(stateTableName);

// 		const now = new Date().getTime();
// 		let firstReview = null;
// 		let factList = [];
// 		let dayFromNow = new Date().getTime() + 1000 * 60 * 60 * 24;
// 		let next24hourReviews = 0;
// 		for(const id in factsTable.data){
// 			if(statesTable.data[id].due < now){
// 				const fact = factsTable.data[id];
// 				factList.push(fact);
// 			} else {
// 				if(firstReview == null || statesTable.data[id].due < firstReview){
// 					firstReview = statesTable.data[id].due;
// 				}
// 			}

// 			if(statesTable.data[id].due < dayFromNow){
// 				next24hourReviews++;
// 			}
// 		}

// 		shuffle(factList);
// 		const output = { fact: null, firstReview: firstReview, remaining: factList.length, next24hourReviews: next24hourReviews };
// 		if(factList.length > 0) {
// 			output.fact = factList[0];
// 			output.condition = statesTable.data[factList[0].id].condition;
// 		}
// 		return output;
// 	},
// 	scoreReview: (original, input) => {
// 		const lev = ed.levenshtein(original, input, insert, remove, update);
// 		const pairs = lev.pairs();
// 		console.log('Levenshtein', lev.distance, pairs, lev.alignment());

// 		let totalCount = 0;
// 		let correctCount = 0;
// 		for(const pair of pairs){
// 			const isMissingPunctuation = pair[1] == null && ignore.includes(pair[0]);
// 			if(pair[0] != pair[1] && !isMissingPunctuation){
// 				if(pair[0] != null){
// 					totalCount++;
// 				} 

// 				if(pair[1] != null){
// 					correctCount--;
// 				}
// 			} else {
// 				correctCount++;
// 				totalCount++;
// 			}
// 		}

// 		return { pairs: pairs, score: correctCount / totalCount };
// 	}
// }