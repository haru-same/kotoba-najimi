const uuidv4 = require('uuid/v4');

const userdata = require('./userdata');
const experiments = require('./experiments');
const util = require('./util');

class ReviewTable {
	constructor(name, factTableName, stateTableName){
		this.name = name;
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

	deleteState(id){
		if(!id) return; 

		const statesTable = userdata.getTable(this.stateTableName);

		if(statesTable.data[id]) delete statesTable.data[id];
		
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
		return newFact;
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

	assignState(id, state){
		const statesTable = userdata.getTable(this.stateTableName);
		state = state || { };
		state.id = id;
		state.streak = 0;
		state.due = new Date().getTime();
		state['ignore-experiment'] = true;
		statesTable.data[id] = state;
		userdata.saveTable(statesTable);
	}

	syncStates(){
		const factsTable = userdata.getTable(this.factTableName);
		const statesTable = userdata.getTable(this.stateTableName);

		let counts = {};// { 0: 0, 1: 0 };
		for(const id in statesTable.data){
			if(!factsTable.data[id]) continue;

			if(!counts[factsTable.data[id].type]) counts[factsTable.data[id].type] = { 0: 0, 1: 0 };

			if(statesTable.data[id].condition == 0) counts[factsTable.data[id].type][0]++;
			if(statesTable.data[id].condition == 1) counts[factsTable.data[id].type][1]++;
		}

		for(const id in factsTable.data){
			if(!statesTable.data[id]){
				const state = { id: id, streak: 0, due: new Date().getTime() }; //condition: condition, 
				experiments.assignExperimentConditions(factsTable.data[id].type, statesTable.data, state);
				statesTable.data[id] = state;
			}
		}

		userdata.saveTable(statesTable);
	}

	addState(factId, condition, delay) {
		delay = delay || 0;
		console.log('delay: ' + delay);
		const newState = {
			key_: uuidv4(),
			id: factId,
			created: new Date().getTime(),
			streak: 0,
			due: new Date().getTime() + delay,
			condition: condition
		};
		this.updateState(newState);
	}

	isMatch_ (obj, query) {
		for (const key in query) {
			if (query[key] != obj[key]) {
				return false;
			}
		}
		return true;
	}

	findState(varName, value){
		const statesTable = userdata.getTable(this.stateTableName);
		if(value == null && typeof varName === 'string'){
			const state = statesTable.data[varName];
			state.key_ = varName;
			return state;
		} else if(value == null) {
			for(const id in statesTable.data){
				const state = statesTable.data[id];
				if(this.isMatch_(state, varName)){
					state.key_ = id;
					return state;
				}
			}
		} else {
			for(const id in statesTable.data){
				const state = statesTable.data[id];
				if(state[varName] == value){
					state.key_ = id;
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

		const key = item.key_;
		delete item['key_'];

		const statesTable = userdata.getTable(this.stateTableName);
		statesTable.data[key] = item;
		userdata.saveTable(statesTable);
	}

	sortReviews(expiredList){
		util.shuffle(expiredList);
	}

	getExpiredReview(){
		const statesTable = userdata.getTable(this.stateTableName);
		const now = new Date().getTime();

		let next12HourSet = new Date();
		if (new Date().getHours() < 12) {
			next12HourSet.setHours(12, 0, 0, 0);
		} else {
			next12HourSet.setHours(24, 0, 0, 0);
		}
		console.log(next12HourSet);
		next12HourSet = next12HourSet.getTime();

		const expiredList = [];
		for(const id in statesTable.data){
			if (statesTable.data[id].streak <= 0) {
				if(statesTable.data[id].due < now){
					const state = statesTable.data[id];
					state.key_ = id;
					expiredList.push(state);
				}
			} else {
				if(statesTable.data[id].due < next12HourSet){
					const state = statesTable.data[id];
					state.key_ = id;
					expiredList.push(state);
				}
			}
		}

		// Temporary hack to ensure hardest (reading cloze) is displayed first.

		if(expiredList.length == 0) {
			return null;
		}
		this.sortReviews(expiredList);

		let key = expiredList[0].key_;

		for(const state of expiredList){
			if (expiredList[0].id == state.id && state.condition == 2) {
				console.log('replacing with cloze review');
				key = state.key_;
				break;
			}
		}

		return { count: expiredList.length, id: key };
	}
}

module.exports = ReviewTable;