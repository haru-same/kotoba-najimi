const ejs = require('ejs');
const fs = require('fs');

const reviewTools = require('./review-tools');
const decks = require('./review-data');
const wanakana = require('./wanakana');
const furigana = require('./furigana');
// const recallReviews = require('./recall-reviews');
const kanjiReviews = require('./kanji-reviews');
const shuffle = require('./shuffle');
const reviewLogging = require('./review-logging');
const gameTools = require('./game-tools/game-tools');

const reviewLogger = reviewLogging.getLogger();

const KanjiType = 1;
const RecallType = 2;
const WordRecallType = 3;

const DECK_TO_ICON = {
	kanji: "estelle",
	recall: "joshua"
};

const setUpdatedDue = (state, result) => {
	if(result == 1){
		state.streak++;
	} else if(result == -1) {
		state.streak = -1;
	} else {
		state.streak = 0;
	}
	state.due = new Date().getTime() + reviewTools.streakToInterval(state.streak);
};

// const createRecallFact = (sentence, reading, audio, word) => {
// 	let type = RecallType;
// 	const data = { sentence: sentence, reading: reading, audio: audio, word: word, type: RecallType };
	
// 	const result = recallReviews.find("sentence", data.sentence);
// 	if(!word && result){
// 		console.log("fact already recorded: ");
// 		console.log(result.sentence);
// 		res.json({ error: "fact already recorded: " + result.sentence });
// 		return null;
// 	}

// 	recallReviews.add(data);

// 	console.log("fact saved: ", data);
// 	return data;
// };

const createAudioWordFact = (data) => {
	let type = decks.AUDIO_WORD_TYPE;
	decks.createFact('kanji', type, data);
	return data;
};

const renderNoReviews = (res, deckName) => {
	const deck = decks.getDeck(deckName);
	const reviewData = {
		facts: deck.getAllFacts(),
		states: deck.getAllStates(),
		icon: DECK_TO_ICON[deckName] || 'estelle'
	};
	res.render('no-reviews', reviewData);
}

const renderReview = (res, deckName, id, debugData) => {
	const deck = decks.getDeck(deckName);
	if(!deck) {
		res.send("deck not found: " + deckName);
		return;
	}

	const reviewData = { };
	reviewData.fact = deck.find(id);
	if(!reviewData.fact){
		res.send("fact not found: " + id);
		return;
	}

	reviewData.deck = deckName;
	reviewData.state = deck.findState(id);
	reviewData.facts = deck.getAllFacts();
	reviewData.states = deck.getAllStates();

	switch(reviewData.fact.type){
	case 1:
		res.render('kanji-review', reviewData);
		break;
	case 2:
		const template = fs.readFileSync('./views/furigana.ejs', 'utf-8');
		const furiganaHtml = ejs.render(template, { elements: furigana(reviewData.fact.sentence) });
		reviewData.furiganaHtml = furiganaHtml;
		res.render('recall-review', reviewData);
		break;
	case 3:
		if(reviewData.state.condition == 1){
			res.render('kanji-review', reviewData);
		} else {
			const template = fs.readFileSync('./views/furigana.ejs', 'utf-8');
			const furiganaHtml = ejs.render(template, { elements: furigana(reviewData.fact.sentence) });
			reviewData.furiganaHtml = furiganaHtml;
			res.render('recall-review', reviewData);
		}
		break;
	default:
		res.send("unhandled type: " + reviewData.fact.type);
		break;
	}
};

const handleKanjiReviewResponse = (req, res) => {
	const deck = decks.getDeck(req.body.deck);

	const originalFact = deck.find('id', req.body.id);
	if(!originalFact){
		console.log("failed, no data changed");
		res.send("failed, no data changed");
		return;
	}

	const state = deck.findState('id', req.body.id);

	const logMessage = { 
		id: req.body.id, 
		input: req.body.input, 
		duration: req.body.duration, 
		streak: state.streak, 
		time: new Date().getTime(), 
		tries: req.body.tries, 
		type: 'kanji'
	};

	const original =  originalFact.target || originalFact.word;
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
				setUpdatedDue(state, -1);
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
			setUpdatedDue(state, -1);
		}

		logMessage.results = req.body.results;

		reviewLogger.log({ level: 'info', message: logMessage });
		res.json(result);
	} else {
		res.json(result);
	}

	deck.updateState(state);
};

const handleRecallReviewResponse = (req, res) => {
	const deck = decks.getDeck(req.body.deck);

	const input = req.body.input.replace(/ /g,'');
	let originalFact = deck.find('id', req.body.id);
	if(!originalFact){
		const testOriginal = wanakana._katakanaToHiragana(furigana(req.body.original, { onlyFurigana: true })).replace(/ /g,'');
		const testScoreInfo = reviewTools.scoreReview(testOriginal, input);
		testScoreInfo.error = "Not a valid fact (id missing or not found) [id: " + req.body.id + "]. No data recorded.";
		res.json(testScoreInfo);
		return;
	}

	const original = wanakana._katakanaToHiragana(originalFact.reading).replace(/ /g,'');
	const state = deck.findState('id', req.body.id);
	const scoreInfo = reviewTools.scoreReview(original, input);
	if(state.condition == 2){
		result = 0;
		if(scoreInfo.score > 0.95) {
			setUpdatedDue(state, 1);
		} else {
			setUpdatedDue(state, -1);
		}
	} else {
		setUpdatedDue(state, 1);
	}
	deck.updateState(state);

	reviewLogger.log({ level: 'info', message: { 
		id: req.body.id, 
		type: "recall", 
		condition: state.condition,
		input: req.body.input, 
		score: scoreInfo.score, 
		duration: parseInt(req.body.duration)
	} });

	res.json(scoreInfo);
}

module.exports.init = (app) => {
	app.get('/review', (req, res) => {
		let deckName = 'kanji';
		if(req.query.deck) deckName = req.query.deck;

		const deck = decks.getDeck(deckName);
		if(!deck) {
			res.send("deck not found: " + deckName);
			return;
		}

		deck.syncStates();
		if(req.query.dbg && req.query.id) {
			renderReview(res, deckName, req.query.id);
			return;
		}

		const expiredReviewId = deck.getExpiredReview();
		if(expiredReviewId == null){
			renderNoReviews(res, deckName);
		} else {
			renderReview(res, deckName, expiredReviewId);
		}
	});

	app.get('/recall-review', (req, res) => {
		res.redirect('/review?deck=recall');
	});

	app.post('/create-kanji-fact', (req, res) => {
		const data = req.body;
		data.type = KanjiType;

		// const result = kanjiReviews.find("sentence", data.sentence);
		// if(result){
		// 	console.log("fact already recorded: ");
		// 	console.log(result.sentence);
		// 	res.json({ error: "fact already recorded: " + result.sentence })
		// 	return;
		// }

		kanjiReviews.add(data);

		console.log("fact saved: ", data);
		res.send('success: ' + data.target);
	});

	app.post('/review', (req, res) => {
		const deck = decks.getDeck(req.body.deck);
		const fact = deck.find(req.body.id);
		const state = deck.findState(req.body.id);
		switch(fact.type){
		case 1:
			handleKanjiReviewResponse(req, res);
			break;
		case 2:
			handleRecallReviewResponse(req, res);
			break;
		case 3:
			if(state.condition == 0) handleRecallReviewResponse(req, res);
			else handleKanjiReviewResponse(req, res);
			break;
		default:
			res.send("type not handled: " + fact.type);
		}
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

	app.post('/recall-review', (req, res) => {
		const input = req.body.input.replace(/ /g,'');
		let originalFact = recallReviews.find('id', req.body.id);
		if(!originalFact){
			const testOriginal = wanakana._katakanaToHiragana(furigana(req.body.original, { onlyFurigana: true })).replace(/ /g,'');
			const testScoreInfo = reviewTools.scoreReview(testOriginal, input);
			testScoreInfo.error = "Not a valid fact (id missing or not found) [id: " + req.body.id + "]. No data recorded.";
			res.json(testScoreInfo);
			return;
		}

		const original = wanakana._katakanaToHiragana(originalFact.reading).replace(/ /g,'');
		const state = recallReviews.findState('id', req.body.id);
		const scoreInfo = reviewTools.scoreReview(original, input);
		if(state.condition == 2){
			result = 0;
			if(scoreInfo.score > 0.95) {
				setUpdatedDue(state, 1);
			} else {
				setUpdatedDue(state, -1);
			}
		} else {
			setUpdatedDue(state, 1);
		}
		recallReviews.updateState(state);

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
		const data = createRecallFact(req.body.sentence, req.body.reading, req.body.audio, req.body.word);
		if(data){
			res.send('success: ' + data.sentence);
			return;
		}
		res.send('failed');
	});

	app.post('/try-create-recall-fact', (req, res) => {
		console.log(req.body);
		const voice = gameTools.tryStoreVoiceFile(req.body.metadata);
		if(voice){
			createRecallFact(req.body.text.replace(/\n/g, ''), req.body.reading, voice, req.body.word);
			res.json({ success: true });
		} else {
			res.json({ success: false, error: 'Audio file could not be found. See server log.' });
		}
	});

	app.post('/create-audio-word-fact', (req, res) => {
		console.log("creating fact", req.body);
		const voice = gameTools.tryStoreVoiceFile(req.body.metadata);
		if(voice){
			createAudioWordFact({ sentence: req.body.text.replace(/\n/g, ''), word: req.body.word, reading: req.body.reading, audio: voice });
			res.json({ success: true });
		} else {
			res.json({ success: false, error: 'Audio file could not be found. See server log.' });
		}
	});
};