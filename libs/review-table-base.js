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
		for(let id in factsTable.data){
			const fact = factsTable.data[id];
			if(fact[varName] == value){
				return fact;
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

	add(newFact){
		const factsTable = userdata.getTable(this.factTableName);
		const guid = uuidv4();
		newFact.id = guid;
		newFact.created = new Date().getTime();
		factsTable.data[guid] = newFact;
		userdata.saveTable(factsTable);
	}

	assignCondition(fact, counts){
		if(counts[0] < counts[1]) return 0;
		if(counts[1] < counts[0]) return 1;
		return Math.floor(Math.random() * 2);
	}

	syncStates(){
		const factsTable = userdata.getTable(this.factTableName);
		const statesTable = userdata.getTable(this.stateTableName);

		let counts = { 0: 0, 1: 0 };
		for(const id in statesTable.data){
			if(statesTable.data[id].condition == 0) counts[0]++;
			if(statesTable.data[id].condition == 1) counts[1]++;
		}

		for(const id in factsTable.data){
			if(!statesTable.data[id]){
				const condition = this.assignCondition(factsTable.data[id], counts);
				if(!counts[condition]) counts[condition] = 0;
				counts[condition]++;

				statesTable.data[id] = { id: id, condition: condition, streak: 0, due: new Date().getTime() };
			}
		}

		userdata.saveTable(statesTable);
	}

	findState(varName, value){
		const statesTable = userdata.getTable(this.stateTableName);
		for(let id in statesTable.data){
			const state = statesTable.data[id];
			if(state[varName] == value){
				return state;
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

	sortReviews(factList){
		shuffle(factList);
	}

	getExpiredReview(){
		const factsTable = userdata.getTable(this.factTableName);
		const statesTable = userdata.getTable(this.stateTableName);

		const now = new Date().getTime();
		let firstReview = null;
		let factList = [];
		let dayFromNow = new Date().getTime() + 1000 * 60 * 60 * 24;
		let next24hourReviews = 0;
		for(const id in factsTable.data){
			if(statesTable.data[id].due < now){
				const fact = factsTable.data[id];
				factList.push(fact);
			} else {
				if(firstReview == null || statesTable.data[id].due < firstReview){
					firstReview = statesTable.data[id].due;
				}
			}

			if(statesTable.data[id].due < dayFromNow){
				next24hourReviews++;
			}
		}

		this.sortReviews(factList);
		const output = { fact: null, time: firstReview, remaining: factList.length, next24hourReviews: next24hourReviews };
		if(factList.length > 0) {
			output.fact = factList[0];
			output.condition = statesTable.data[factList[0].id].condition;
		}
		return output;
	}
}

module.exports = ReviewTable;