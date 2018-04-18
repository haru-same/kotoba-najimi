const fs = require('fs');
const logging = require('../libs/review-logging');
const decks = require('../libs/review-data');
const jaTools = require('../libs/ja-tools');
const jaDictionary = require('../libs/ja-dictionary');

let reviewEntries = logging.getLog();
const facts = decks.getDeck('kanji').getAllFacts();
const states = decks.getDeck('kanji').getAllStates();

const streakAccuracies = {};
const types = [ 'speaking1', 'typing', 'speaking2', 'listening' ];
for(const t of types){
	const arr = [];
	for(let i = 0; i < 10; i++){
		arr.push({ correct: 0, total: 0 });
	}
	streakAccuracies[t] = arr;
}

for(const entry of reviewEntries){
	if(!entry.message.id || !facts[entry.message.id]) continue;

	const fact = facts[entry.message.id];
	const state = states[entry.message.id];

	let result = 0;
	if(entry.message.score == 1 || entry.message.result == 1) result = 1;
	
	const streak = entry.message.streak;
	if(streak == null || streak == -1) continue;

	if(fact.type == 1){
		console.log(state.condition);
		if(state.condition == 0){
			streakAccuracies['typing'][streak].total++;
			streakAccuracies['typing'][streak].correct += result;
		}
		if(state.condition == 1){
			streakAccuracies['speaking1'][streak].total++;
			streakAccuracies['speaking1'][streak].correct += result;
		}
	} else if(fact.type == 3){
		console.log(state.condition);
		if(state.condition == 0){
			streakAccuracies['speaking2'][streak].total++;
			streakAccuracies['speaking2'][streak].correct += result;
		}
		if(state.condition == 1){
			streakAccuracies['listening'][streak].total++;
			streakAccuracies['listening'][streak].correct += result;
		}
	}
}

const streakLines = [];
for(let i = 0; i <10; i++){
	const row = [];
	for(const t of types){
		if(streakAccuracies[t][i].total == 0) row.push(0);
		else row.push(streakAccuracies[t][i].correct/streakAccuracies[t][i].total);
	}
	streakLines.push(row.join('\t'));
}

fs.writeFileSync('output/streaks.txt', streakLines.join('\n'));