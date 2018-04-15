const fs = require('fs');
const logging = require('../libs/review-logging');
const decks = require('../libs/review-data');

const averageRecallLengths = (arr) => {
	let sum = 0;
	for(const review of arr) sum += review.message.input.length;
	return sum / arr.length;
};

const averageRecallCorrect = (arr) => {
	let sum = 0;
	for(const review of arr) sum += review.message.score * facts[review.message.id].sentence.length;
	return sum / arr.length;
};

const averageRecallScores = (arr) => {
	let sum = 0;
	for(const review of arr) sum += review.message.score;
	return sum / arr.length;
};

let reviewEntries = logging.getLog();

const facts = decks.getDeck('kanji').getAllFacts();

const dayToReviews = [];
let lastTime = 0;
for(const entry of reviewEntries){
	if(entry.message.source == 'daily-recall'){
		const time = new Date(entry.message.time);
		time.setHours(0, 0, 0, 0);

		if(time.getTime() != lastTime){
			lastTime = time.getTime();
			dayToReviews.push([]);
		}

		console.log(time);
		dayToReviews[dayToReviews.length - 1].push(entry);
	}
}

for(const i in dayToReviews) console.log(averageRecallLengths(dayToReviews[i]));
console.log();
for(const i in dayToReviews) console.log(averageRecallScores(dayToReviews[i]));
console.log();
for(const i in dayToReviews) console.log(averageRecallCorrect(dayToReviews[i]));