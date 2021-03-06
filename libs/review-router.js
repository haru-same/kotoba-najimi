const wanakana = require('./wanakana');
const furigana = require('./furigana');
const recallReviews = require('./recall-reviews');
const kanjiReviews = require('./kanji-reviews');
const shuffle = require('./shuffle');
const reviewLogging = require('./review-logging');

const KanjiCondition = 1;
const RecallCondition = 2;
const reviewLogger = reviewLogging.getLogger();

const streakToInterval = (streak) => {
	const minute = 1000 * 60;
	const hour = minute * 60;
	const day = hour * 24;
	switch(streak){
		case -1:
			return 0;
		case 0:
			return 5 * minute;
		default:
			return day * Math.pow(2, streak - 1) - 6 * hour;
	}
};

const setUpdatedDue = (state, result) => {
	if(result == 1){
		state.streak++;
	} else {
		state.streak = -1;
	}
	state.due = new Date().getTime() + streakToInterval(state.streak);
}

module.exports.init = (app) => {
	app.get('/review', (req, res) => {
		let reviewData = { fact: {}, condition: 0, remaining: -1 };
		kanjiReviews.syncStates();
		reviewData = kanjiReviews.getExpiredReview();

		const facts = kanjiReviews.getAllFacts();
		if(reviewData.fact == null){
			res.render('no-reviews', { time: reviewData.time, cards: Object.keys(facts).length, next24hourReviews: reviewData.next24hourReviews, facts: facts, icon: 'estelle' });
		} else {
			reviewData.facts = facts;
			res.render('kanji-review', reviewData);
		}
	});

	app.post('/create-kanji-fact', (req, res) => {
		const data = req.body;
		data.type = KanjiCondition;
		const result = recallReviews.find("sentence", data.sentence);
		if(result){
			console.log("fact already recorded: ");
			console.log(result.sentence);
			res.json({ error: "fact already recorded: " + result.sentence })
			return;
		}

		kanjiReviews.add(data);

		console.log("fact saved: ", data);
		res.send('success: ' + data.target);
	});

	app.post('/review', (req, res) => {
		const originalFact = kanjiReviews.find('id', req.body.id);
		if(!originalFact){
			console.log("failed, no data changed");
			res.send("failed, no data changed");
			return;
		}

		const state = kanjiReviews.findState('id', req.body.id);

		const logMessage = { 
			id: req.body.id, 
			input: req.body.input, 
			duration: req.body.duration, 
			streak: state.streak, 
			time: new Date().getTime(), 
			tries: req.body.tries, 
			type: 'kanji'
		};

		const original =  originalFact.target;
		const reading = originalFact.reading;
		let result = { correct: 0, reading: reading };

		if(req.body.type == 't') {
			const input = req.body.input;
			if(reading == input || reading == wanakana.toKana(input)){
				logMessage.result = 1;
				result.correct = 1;
				setUpdatedDue(state, 1);
			} else {
				logMessage.result = 0;
				if(req.body.tries == 0) {
					console.log('reseting card: ' + reading);
					setUpdatedDue(state, 0);
				}
			}

			reviewLogger.log({ level: 'info', message: logMessage });
			res.json(result);
		} else if(req.body.type == 's'){
			logMessage.result = 0;
			for(let i = 0; i < req.body.results.length; i++){
				let transcript = req.body.results[i];
				if(transcript == original || transcript == reading){
					logMessage.result = 1;
					result.correct = 1;
					setUpdatedDue(state, 1);
					break;
				}
			}

			if(result.correct == 0 && req.body.tries == 0){
				console.log('reseting card: ' + reading);
				setUpdatedDue(state, 0);
			}

			logMessage.results = req.body.results;

			reviewLogger.log({ level: 'info', message: logMessage });
			res.json(result);
		} else {
			res.json(result);
		}

		kanjiReviews.updateState(state);
	});

	app.post('/delete-review', (req, res) => {
		const id = req.body.id;
		if(id){
			kanjiReviews.delete(id);
		}
		res.send('done');
	});

	app.get('/review-stats', (req, res) => {
		const facts = kanjiReviews.getAllFacts();
		const states = kanjiReviews.getAllStates();
		const reviewHistory = reviewLogging.getLog();
		res.render('review-stats', { facts: facts, reviewStates: states, reviewLogs: reviewHistory });
	});

	app.get('/recall-review', (req, res) => {
		let reviewData = { fact: {}, condition: 0, remaining: -1 };
		if(req.query.test){
			reviewData.fact = {
				sentence: "じゃあ、あたしが遊撃士として魔法使いの企みを阻止できたら……",
				reading: "じゃあ、あたしがゆうげきしとしてまほうつかいのたくらみをそしできたら……",
				audio: "ch0010190369.ogg",
				type: RecallCondition
			};
		} else {
			recallReviews.syncStates();
			reviewData = recallReviews.getExpiredReview();
		}

		if(reviewData.fact == null){
			const facts = recallReviews.getAllFacts();
			res.render('no-reviews', { time: reviewData.firstReview, cards: Object.keys(facts).length, next24hourReviews: reviewData.next24hourReviews, facts: facts, icon: 'joshua' });
		} else {
			res.render('recall-review', reviewData);
		}
	});

	app.post('/recall-review', (req, res) => {
		const input = req.body.input.replace(/ /g,'');
		let originalFact = recallReviews.find('id', req.body.id);
		if(!originalFact){
			const testOriginal = wanakana._katakanaToHiragana(furigana(req.body.original, { onlyFurigana: true })).replace(/ /g,'');
			const testScoreInfo = recallReviews.scoreReview(testOriginal, input);
			testScoreInfo.error = "Not a valid fact (id missing or not found) [id: " + req.body.id + "]. No data recorded.";
			res.json(testScoreInfo);
			return;
		}

		const original = wanakana._katakanaToHiragana(originalFact.reading).replace(/ /g,'');
		const state = recallReviews.findState('id', req.body.id);
		setUpdatedDue(state, 1);
		recallReviews.updateState(state);
		const scoreInfo = recallReviews.scoreReview(original, input);

		reviewLogger.log({ level: 'info', message: { 
			id: req.body.id, 
			type: "recall", 
			condition: state.condition,
			input: req.body.input, 
			score: scoreInfo.score, 
			duration: parseInt(req.body.duration)
		} });

		res.json(scoreInfo);
	});

	app.get('/create-fact', (req, res) => {
		res.render('create-fact');
	});

	app.post('/create-recall-fact', (req, res) => {
		const data = { sentence: req.body.sentence, reading: req.body.reading, audio: req.body.audio, type: RecallCondition };
		const result = recallReviews.find("sentence", data.sentence);
		if(result){
			console.log("fact already recorded: ");
			console.log(result.sentence);
			res.json({ error: "fact already recorded: " + result.sentence })
			return;
		}

		recallReviews.add(data);

		console.log("fact saved: ", data);
		res.send('success: ' + data.sentence);
	});
};