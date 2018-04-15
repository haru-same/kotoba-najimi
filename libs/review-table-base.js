const uuidv4 = require('uuid/v4');

const shuffle = require('./shuffle');
const userdata = require('./userdata');

class ReviewTable {
	constructor(factTableName, stateTableName){
		this.factTableName = factTableName;
		this.stateTableName = stateTableName;
	}

	getAllFacts(){
		return userdata.getTable(this.factTableName).data;
	}

	getAllStates(){
		return userdata.getTable(this.stateTableName).data;
	}

	find(varName, value){
		const factsTable = userdata.getTable(this.factTableName);
		if(value == null){
			return factsTable.data[varName];
		} else {
			for(let id in factsTable.data){
				const fact = factsTable.data[id];
				if(fact[varName] == value){
					return fact;
				}
			}
		}
		return null;
	}

	delete(id){
		if(!id) return; 

		console.log('deleting ' + id);
		const factsTable = userdata.getTable(this.factTableName);
		const statesTable = userdata.getTable(this.stateTableName);

		if(factsTable.data[id]) delete factsTable.data[id];
		if(statesTable.data[id]) delete statesTable.data[id];
		
		userdata.saveTable(factsTable);
		userdata.saveTable(statesTable);
	}

	deleteAll(){
		userdata.deleteTable(this.factTableName);
		userdata.deleteTable(this.stateTableName);
	}

	add(newFact){
		const factsTable = userdata.getTable(this.factTableName);
		const guid = uuidv4();
		newFact.id = guid;
		newFact.created = new Date().getTime();
		factsTable.data[guid] = newFact;
		userdata.saveTable(factsTable);
	}

	updateFact(item){
		if(!item.id){
			console.error("not valid:");
			console.error(item);
			return;
		}

		const factsTable = userdata.getTable(this.factTableName);
		factsTable.data[item.id] = item;
		userdata.saveTable(factsTable);
	}

	assignCondition(fact, counts){
		if(counts[fact.type][0] < counts[fact.type][1]) return 0;
		if(counts[fact.type][1] < counts[fact.type][0]) return 1;
		return Math.floor(Math.random() * 2);
	}

	syncStates(){
		const factsTable = userdata.getTable(this.factTableName);
		const statesTable = userdata.getTable(this.stateTableName);

		let counts = {};// { 0: 0, 1: 0 };
		for(const id in statesTable.data){
			if(!counts[factsTable.data[id].type]) counts[factsTable.data[id].type] = { 0: 0, 1: 0 };

			if(statesTable.data[id].condition == 0) counts[factsTable.data[id].type][0]++;
			if(statesTable.data[id].condition == 1) counts[factsTable.data[id].type][1]++;
		}

		for(const id in factsTable.data){
			if(!statesTable.data[id]){
				const condition = this.assignCondition(factsTable.data[id], counts);
				if(!counts[factsTable.data[id].type][condition]) counts[factsTable.data[id].type][condition] = 0;
				counts[factsTable.data[id].type][condition]++;

				statesTable.data[id] = { id: id, condition: condition, streak: 0, due: new Date().getTime() };
			}
		}

		userdata.saveTable(statesTable);
	}

	findState(varName, value){
		const statesTable = userdata.getTable(this.stateTableName);
		if(value == null){
			return statesTable.data[varName];
		} else {
			for(let id in statesTable.data){
				const state = statesTable.data[id];
				if(state[varName] == value){
					return state;
				}
			}
		}
		return null;
	}

	updateState(item){
		if(!item.id){
			console.error("not valid:");
			console.error(item);
			return;
		}

		const statesTable = userdata.getTable(this.stateTableName);
		statesTable.data[item.id] = item;
		userdata.saveTable(statesTable);
	}

	sortReviews(expiredList){
		shuffle(expiredList);
	}

	getExpiredReview(){
		// const factsTable = userdata.getTable(this.factTableName);
		// const statesTable = userdata.getTable(this.stateTableName);

		// const now = new Date().getTime();
		// let firstReview = null;
		// let factList = [];
		// let dayFromNow = new Date().getTime() + 1000 * 60 * 60 * 24;
		// let next24hourReviews = 0;
		// for(const id in factsTable.data){
		// 	if(statesTable.data[id].due < now){
		// 		const fact = factsTable.data[id];
		// 		factList.push(fact);
		// 	} else {
		// 		if(firstReview == null || statesTable.data[id].due < firstReview){
		// 			firstReview = statesTable.data[id].due;
		// 		}
		// 	}

		// 	if(statesTable.data[id].due < dayFromNow){
		// 		next24hourReviews++;
		// 	}
		// }

		// this.sortReviews(factList);
		// const output = { fact: null, time: firstReview, remaining: factList.length, next24hourReviews: next24hourReviews };
		// if(factList.length > 0) {
		// 	output.fact = factList[0];
		// 	output.condition = statesTable.data[factList[0].id].condition;
		// }
		// return output;

		const statesTable = userdata.getTable(this.stateTableName);
		const now = new Date().getTime();
		const expiredList = [];
		for(const id in statesTable.data){
			if(statesTable.data[id].due < now){
				const state = statesTable.data[id];
				expiredList.push(state);
			}
		}

		if(expiredList.length == 0) {
			return null;
		}
		this.sortReviews(expiredList);
		return expiredList[0].id;
	}
}

module.exports = ReviewTable;