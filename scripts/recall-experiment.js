const fs = require('fs');
const decks = require('../libs/review-data');
const logging = require('../libs/review-logging');

const facts = decks.getDeck('recall').getAllFacts();
let reviewEntries = logging.getLog();

const lastScores = {};

let textSum = 0;
let textTotal = 0;
let textImprovement = 0;
let textImprovementTotal = 0;

let speechSum = 0;
let speechTotal = 0;
let speechImprovement = 0;
let speechImprovementTotal = 0;

for(const entry of reviewEntries){
	if('type' in entry.message && entry.message.type == "recall" && entry.message.id && entry.message.id in facts && facts[entry.message.id].type == 2){
		if(entry.message.condition == '1'){
			speechSum += entry.message.score;
			speechTotal += 1;

			if(lastScores[entry.message.id]){
				speechImprovement += entry.message.score - lastScores[entry.message.id];
				speechImprovementTotal += 1;
			}
			lastScores[entry.message.id] = entry.message.score;
		} else {
			textSum += entry.message.score;
			textTotal += 1;

			if(lastScores[entry.message.id]){
				textImprovement += entry.message.score - lastScores[entry.message.id];
				textImprovementTotal += 1;
			}
			lastScores[entry.message.id] = entry.message.score;
		}
	}
}

console.log(`text: ${textTotal}, speech: ${speechTotal}`)
console.log("text: " + (textSum / textTotal));
console.log("speech: " + (speechSum / speechTotal));
console.log("text improvement: " + (textImprovement / textImprovementTotal));
console.log("speech improvement: " + (speechImprovement / speechImprovementTotal));