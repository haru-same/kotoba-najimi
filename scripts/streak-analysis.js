const fs = require('fs');
const logging = require('../libs/review-logging');
const decks = require('../libs/review-data');
const jaTools = require('../libs/ja-tools');
const jaDictionary = require('../libs/ja-dictionary');

let reviewEntries = logging.getLog();
const facts = decks.getDeck('kanji').getAllFacts();
const states = decks.getDeck('kanji').getAllStates();

const types = [ 'speaking1', 'typing', 'speaking2', 'listening' ];

const getStreakAccuracies = (nameSuffix, dates, skipFiles) => {
	if(!nameSuffix) nameSuffix = "";

	const streakAccuracies = {};
	for(const t of types){
		const arr = {};
		for(let i = -1; i < 10; i++){
			arr[i] = { correct: 0, total: 0 };
		}
		streakAccuracies[t] = arr;
	}

	const countAccuracies = {};
	for(const t of types){
		countAccuracies[t] = [];
	}

	const idToCount = {};

	let maxCount = 0;
	const addResultToCount = (id, t, result) =>{
		if(!idToCount[id]) idToCount[id] = 0;

		while(countAccuracies[t].length <= idToCount[id]){
			countAccuracies[t].push({ correct: 0, total: 0 });
		}

		countAccuracies[t][idToCount[id]].total++;
		countAccuracies[t][idToCount[id]].correct += result;

		idToCount[id]++;
		if(idToCount[id] > maxCount) maxCount = idToCount[id];
	}


	const known = {};
	for(const t of types) known[t] = 0;
	let firstTime = 1516352445527;
	if(dates && dates.start) firstTime = dates.start;
	console.log(firstTime);

	// const endAddTime = firstTime + (1000*60*60*24* 68);

	const triedIds = {};

	for(const entry of reviewEntries){
		if(!entry.message.time) continue;
		if(entry.message.time && parseInt(entry.message.time) < firstTime) continue;
		if(entry.message.time && dates && parseInt(entry.message.time) > dates.end) break;

		if(!entry.message.id || !facts[entry.message.id]) continue;

		const fact = facts[entry.message.id];
		const state = states[entry.message.id];

		// if(fact.created > endAddTime) continue;

		let result = 0;
		if(entry.message.score == 1 || entry.message.result == 1) result = 1;
		if(entry.message.tries == '1' && result == 0) continue;
		
		const streak = entry.message.streak;
		if(streak == null) continue;
		// if(streak == -1) continue;

		if(fact.type == 1){
			// console.log(state.condition);
			if(state.condition == 0){
				streakAccuracies['typing'][streak].total++;
				streakAccuracies['typing'][streak].correct += result;
				addResultToCount(entry.message.id, 'typing', result);

				if(streak == 3 && result) known['typing']++;
				if(streak > 3 && !result) known['typing']--;
			}
			if(state.condition == 1){
				streakAccuracies['speaking1'][streak].total++;
				streakAccuracies['speaking1'][streak].correct += result;
				addResultToCount(entry.message.id, 'speaking1', result);

				if(streak == 3 && result) known['speaking1']++;
				if(streak > 3 && !result) known['speaking1']--;
			}
		} else if(fact.type == 3){
			if(streak == 3) {
				if(triedIds[fact.id]) continue;
				else triedIds[fact.id] = true;
			}

			if(streak != 3) continue;

			if(state.condition == 1){
				streakAccuracies['speaking2'][streak].total++;
				streakAccuracies['speaking2'][streak].correct += result;
				addResultToCount(entry.message.id, 'speaking2', result);

				if(streak == 3 && result) known['speaking2']++;
				if(streak > 3 && !result) known['speaking2']--;
			}
			if(state.condition == 0){
				streakAccuracies['listening'][streak].total++;
				streakAccuracies['listening'][streak].correct += result;
				addResultToCount(entry.message.id, 'listening', result);

				if(streak == 3 && result) known['listening']++;
				if(streak > 3 && !result) known['listening']--;
			}
		}
	}

	const streakLines = [['', '']];
	for(const t of types) streakLines[0].push(t);
	streakLines[0] = streakLines[0].join('\t');
	console.log(streakLines);
	for(let i = 0; i <10; i++){
		const row = [ i, i == 0 ? i : Math.pow(2, i - 1) ];
		for(const t of types){
			if(streakAccuracies[t][i].total == 0) row.push(0);
			else row.push(streakAccuracies[t][i].correct/streakAccuracies[t][i].total);
		}
		for(const t of types){
			row.push(streakAccuracies[t][i].total);
		}
		streakLines.push(row.join('\t'));
	}
	if(!skipFiles) fs.writeFileSync(`output/streaks${nameSuffix}.txt`, streakLines.join('\n'));

	const countLines = [['']];
	for(const t of types) countLines[0].push(t);
	for(let i = 0; i < maxCount; i++){
		const row = [];
		for(const t of types){
			if(!countAccuracies[t][i]) row.push(0);
			else row.push(countAccuracies[t][i].correct/countAccuracies[t][i].total);
		}
		countLines.push(row.join('\t'));
	}
	if(!skipFiles) fs.writeFileSync(`output/count-acc${nameSuffix}.txt`, countLines.join('\n'));



	const overallAccuracy = {};
	for(let i = -1; i < 10; i++){
		const row = [ i, i == 0 ? i : Math.pow(2, i - 1) ];
		for(const t of types){
			if(!overallAccuracy[t]) overallAccuracy[t] = { correct: 0, total: 0 };

			overallAccuracy[t].correct += streakAccuracies[t][i].correct;
			overallAccuracy[t].total += streakAccuracies[t][i].total;
		}
	} 
	for(const t in overallAccuracy) overallAccuracy[t] = overallAccuracy[t].correct / overallAccuracy[t].total;
	return { acc: overallAccuracy, known: known };
}

getStreakAccuracies();
// getStreakAccuracies('-1day', 1000*60*60*24);
// getStreakAccuracies('-2day', 1000*60*60*24 * 2);
// getStreakAccuracies('-4day', 1000*60*60*24 * 2);
// getStreakAccuracies('-1week', 1000*60*60*24 * 7);
// getStreakAccuracies('-2week', 1000*60*60*24 * 14);
// getStreakAccuracies('-4week', 1000*60*60*24 * 28);
// getStreakAccuracies('-8week', 1000*60*60*24 * 28 * 2);
// 

const startDate = 1516352445527;
const dayAccRows = [['', '']];
for(const t of types) dayAccRows[0].push(t);
dayAccRows[0] = dayAccRows[0].join('\t');
for(let i = 0; i < 100; i++){
	const _start = startDate + 1000*60*60*24 * 5;
	const start = startDate + 1000*60*60*24 * i;
	const end = start + 1000*60*60*24 * 4;
	const result = getStreakAccuracies(null, { start: start, end: end }, true);
	const row = [i, i-61 ];
	for(const t of types) {
		row.push(result.acc[t]);
			//overallAcc[t]);
	}
	dayAccRows.push(row.join('\t'));
}
fs.writeFileSync(`output/day-acc.txt`, dayAccRows.join('\n'));