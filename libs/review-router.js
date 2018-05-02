const ejs = require('ejs');
const fs = require('fs');
const mediaserver = require('mediaserver');

const reviewTools = require('./review-tools');
const decks = require('./review-data');
const wanakana = require('./wanakana');
const furigana = require('./furigana');
const experiments = require('./experiments');
const kanjiReviews = require('./kanji-reviews');
const clozeReviews = require('./cloze-reviews');
const reviewLogging = require('./review-logging');
const clean = require('./clean');
const gameTools = require('./game-tools/game-tools');
const util = require('./util');
const jaDictionary = require('./ja-dictionary');

const dictionaryAudio = require('./dictionary-audio');

const KanjiType = 1;
const RecallType = 2;
const WordRecallType = 3;

const DailyRecallCount = 4;
const DailyDictionaryListeningCount = 25;
const DailyClozeCount = 20;
const DailyRecallMinLength = 18;

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

const resetFact = (deckName, id) => {
	const deck = decks.getDeck(deckName);
	const state = deck.findState(id);
	setUpdatedDue(state, -1);
	deck.updateState(state);
}

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

const getDailyReviewInfo = (logTypeKey, logType) => {
	let beginningOfToday = new Date();
	beginningOfToday.setHours(0,0,0,0);
	beginningOfToday = beginningOfToday.getTime();
	const reviewHistory = reviewLogging.getLog();
	const fourDaysAgo = new Date().getTime() - 4 * 24 * 60 * 60 * 1000;

	let todaysCount = 0;
	const idToTypeLastReview = {};
	const idToAnyLastReview = {};
	for(const item of reviewHistory){
		if(item.message.id && item.message.time){
			const time = parseInt(item.message.time);
			idToAnyLastReview[item.message.id] = time;
			if(item.message[logTypeKey] == logType){
				idToTypeLastReview[item.message.id] = time;
			}
		} 

		if(item.message[logTypeKey] == logType && item.message.time > beginningOfToday) {
			todaysCount++;
		}
	}

	return {
		beginningOfToday: beginningOfToday,
		fourDaysAgo: fourDaysAgo,
		todaysCount: todaysCount,
		idToAnyLastReview: idToAnyLastReview,
		idToTypeLastReview: idToTypeLastReview
	};
};

const getRecallReview = () => {
	const reviewInfo = getDailyReviewInfo('source', 'daily-recall');

	console.log("today's recall", reviewInfo.todaysCount);

	const deck = decks.getDeck("kanji");
	const facts = deck.getAllFacts();
	const states = deck.getAllStates();
	const available = [];
	for(const id in facts){
		if(!facts[id] || !facts[id].audio) continue;
		if(reviewInfo.idToTypeLastReview[id]) continue;
		if(reviewInfo.idToAnyLastReview[id] > reviewInfo.fourDaysAgo) continue;
		if(clean.cleanPunctuation(facts[id].sentence).replace(/ /g, "").length < DailyRecallMinLength) continue;
		
		available.push(id);
	}
	console.log('available for recall', available.length);
	if(reviewInfo.todaysCount >= DailyRecallCount) return null;

	return available[util.randomInt(available.length)];
}

const getListenMeaningReview = () => {
	const reviewInfo = getDailyReviewInfo('type', 'listening-meaning');

	let fifteenMinutesAgo = new Date().getTime() - 15 * 60 * 1000;
	let fourDaysAgo = new Date().getTime() - 24 * 60 * 60 * 1000;

	console.log("listen for meaning today's count:", reviewInfo.todaysCount);

	const deck = decks.getDeck("kanji");
	const facts = deck.getAllFacts();
	const states = deck.getAllStates();
	const available = [];
	const newAvailable = [];
	for(const id in facts){
		if(!reviewInfo.idToTypeLastReview[id] && facts[id].audio && parseInt(states[id].streak) > 3 && reviewInfo.idToAnyLastReview[id] < fourDaysAgo) 
			available.push(id);
		if(!reviewInfo.idToTypeLastReview[id] && facts[id].audio && facts[id].created > reviewInfo.beginningOfToday && reviewInfo.idToAnyLastReview[id] < fifteenMinutesAgo) 
			newAvailable.push(id);
	}
	console.log('listen for meaning old available:', available.length);
	console.log('listen for meaning new available:', newAvailable.length);
	if(reviewInfo.todaysCount >= DailyDictionaryListeningCount && newAvailable.length == 0) return null;

	let finalAvailable = [];
	if(available.length > 0) finalAvailable.push(available[util.randomInt(available.length)]);
	if(newAvailable.length > 0) finalAvailable.push(newAvailable[util.randomInt(newAvailable.length)])

	if(finalAvailable.length == 0) return null;

	return finalAvailable[util.randomInt(finalAvailable.length)];
}

const getClozeChoices = (reviewInfo, factType, count, external) => {
	const deck = decks.getDeck("kanji");
	const facts = deck.getAllFacts();
	const states = deck.getAllStates();

	const available = [];
	let allChoiceIds = [];
	const posToChoiceIds = {};
	for(const id in facts){
		if(external && !clozeReviews.getRandomClozeSentence(id)) continue;

		// console.log(id, reviewInfo.idToAnyLastReview[id], fourDaysAgo, reviewInfo.idToAnyLastReview[id] < reviewInfo.fourDaysAgo);
		if(facts[id].type == factType && reviewInfo.idToAnyLastReview[id] < reviewInfo.fourDaysAgo) {
			if(!reviewInfo.idToTypeLastReview[id]) available.push(id);

			allChoiceIds.push(id);
			const word = facts[id].word || facts[id].target;
			const partsOfSpeech = jaDictionary.getPartsOfSpeech(word);
			for(const pos of partsOfSpeech){
				if(!posToChoiceIds[pos]) posToChoiceIds[pos] = [];
				posToChoiceIds[pos].push(id);
			}
		}
	}

	console.log('inverted cloze count:', available.length);

	const targetId = util.randomFromArray(available);

	console.log(targetId, reviewInfo.idToAnyLastReview[targetId], reviewInfo.fourDaysAgo, reviewInfo.idToAnyLastReview[targetId] < reviewInfo.fourDaysAgo);

	const targetWord = facts[targetId].word || facts[targetId].target;
	const usedIdForChoices = {};
	const posChoices = {};
	const choices = [ facts[targetId] ];
	console.log(targetWord);
	for(const pos of jaDictionary.getPartsOfSpeech(targetWord)){
		console.log(pos);
		for(const id of posToChoiceIds[pos]){
			if(id != targetId) posChoices[id] = true;
		}
	}

	if(Object.keys(posChoices).length > 10){
		console.log('using only same pos');
		allChoiceIds = Object.keys(posChoices);
	} else {
		console.log('not enough pos');
	}

	util.shuffle(allChoiceIds);
	for(let i = 0; i < count; i++){
		choices.push(facts[allChoiceIds[i]]);
	}

	if(external){
		for(const choice of choices) {
			const externalSentence = clozeReviews.getRandomClozeSentence(choice.id);
			console.log(choice.sentence == externalSentence, choice.sentence, externalSentence);
			choice.sentence = choice.context = externalSentence;
		}
	}

	util.shuffle(choices);

	console.log('external', external);
	console.log('choices', choices);

	return {
		targetId: targetId,
		choices: choices
	};
};

const getExternalClozeReview = (req, options) => {
	options = options || {};
	options.count = options.count || 3;
	options.logType = options.logType || 'external-cloze';

	const reviewInfo = getDailyReviewInfo('type', options.logType);

	console.log(options.logType, "today's count:", reviewInfo.todaysCount);

	if(reviewInfo.todaysCount >= DailyClozeCount && !req.query.dbg) return null;

	return getClozeChoices(reviewInfo, 3, options.count, true);
}

const getInternalClozeReview = (req, options) => {
	options = options || {};
	options.count = options.count || 3;
	options.factType = options.factType || 1;
	options.logType = options.logType || 'inverted-cloze';

	const reviewInfo = getDailyReviewInfo('type', options.logType);

	console.log(options.logType, "today's count:", reviewInfo.todaysCount);

	if(reviewInfo.todaysCount >= DailyClozeCount && !req.query.dbg) return null;

	return getClozeChoices(reviewInfo, options.factType, options.count);
}

const getImageCondition = () => {
	const states = decks.getDeck('kanji').getAllStates();
	let withImage = 0;
	let withoutImage = 0;
	for(const id in states){
		const state = states[id];
		if(state['image-condition'] == 1) withImage++;
		else if(state['image-condition'] == 0) withoutImage++;
	}

	if(withImage > withoutImage) return 0;
	if(withoutImage > withImage) return 1;
	return util.randomInt(2);
}

const renderReview = (res, deckName, id, options, debugData) => {
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

	if(reviewData.fact.image && !('image-condition' in reviewData.state)){
		reviewData.state['image-condition'] = getImageCondition();
		deck.updateState(reviewData.state);
	}

	for(const key in debugData){
		const split = key.split('__');
		if(split.length == 2){
			reviewData[split[0]][split[1]] = debugData[key];
		}
	}
	reviewData.debug = false;
	if(debugData) reviewData.debug = debugData.debug;

	reviewData.facts = deck.getAllFacts();
	reviewData.states = deck.getAllStates();

	reviewData.options = options || {};

	let type = reviewData.fact.type;

	if(reviewData.fact.type == 3 && reviewData.state.streak == 3){
		reviewData.options.onlyKanji = true;
		type = 1;
	}

	if(options && options.type) type = options.type;
	console.log("type:" + type);
	// console.log(reviewData.fact);

	const template = fs.readFileSync('./views/furigana.ejs', 'utf-8');
	const sentence = reviewData.fact.sentence || reviewData.fact.context;
	const furiganaHtml = ejs.render(template, { elements: furigana(sentence) });
	reviewData.furiganaHtml = furiganaHtml;

	switch(type){
	case 1:
		res.render('kanji-review', reviewData);
		break;
	case 2:
		res.render('recall-review', reviewData);
		break;
	case 3:
		let condition = 0;
		if(reviewData.state.condition) condition = reviewData.state.condition;
		if(reviewData.state.experiments && reviewData.state.experiments['listen-speak-cloze']) condition = reviewData.state.experiments['listen-speak-cloze'];
		switch (condition){
			case 0:
				res.render('recall-review', reviewData);
				break;
			case 1:
				reviewData.options.useTextInput = false;
				res.render('kanji-review', reviewData);
				break;
			case 2:
				console.log('is cloze');
				reviewData.options.useTextInput = true;
				reviewData.options.useCloze = true;
				res.render('kanji-review', reviewData);
				break;
		}
		break;
	case 4:
		res.render('listen-meaning-review', reviewData);
		break;
	case 5:
		reviewData.clozeSentence = options.clozeSentence;
		reviewData.clozeSentenceHtml = ejs.render(template, { elements: furigana(options.clozeSentence.replace(reviewData.fact.word, '____')) });
		reviewData.clozeChoices = options.clozeChoices;
		res.render('cloze-review', reviewData);
		break;
	case 6:
		reviewData.options.promptType = 'text';
		if(util.randomInt(2) == 1) reviewData.options.promptType = 'audio';
		reviewData.options.clozeChoices = options.clozeChoices;
		for(const choice of reviewData.options.clozeChoices){
			const sentence = choice.sentence || choice.context;
			const word = choice.word || choice.target;
			choice.clozeSentenceHtml = ejs.render(template, { elements: furigana(sentence.replace(word, '____')) });
		}
		if(options.binary){
			res.render('binary-cloze-review', reviewData);
		} else {
			res.render('inverted-cloze-review', reviewData);
		}
		break;
	default:
		res.send("unhandled type: " + type);
		break;
	}

	for(const key in reviewData){
		if(key == 'facts') continue;
		if(key == 'states') continue;
		console.log(`reviewData[${key}]`, reviewData[key]);
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

	let source = "normal";
	if(req.body.source) source = req.body.source;

	const logMessage = { 
		id: req.body.id, 
		input: req.body.input, 
		duration: req.body.duration, 
		streak: state.streak, 
		tries: req.body.tries, 
		type: 'kanji',
		source: source,
		cloze: req.body.cloze
	};

	const original =  originalFact.target || originalFact.word;
	const reading = originalFact.reading;
	let result = { correct: 0, reading: reading };

	console.log('streak was:', state.streak);

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

		res.json(result);
	} else {
		res.json(result);
	}

	console.log('streak is:', state.streak);

	if(req.body.debug == 'true') {
		console.log('debug is on, no data recorded');
	} else {
		reviewLogging.log(logMessage);
		deck.updateState(state);
	}
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

	let source = "normal";
	if(req.body.source) source = req.body.source;

	let originalText = originalFact.reading;
	if(source == 'daily-recall') originalText = originalFact['sentence-reading']
	const original = wanakana._katakanaToHiragana(originalText).replace(/ /g,'');
	const state = deck.findState('id', req.body.id);
	const preStreak = state.streak;
	const scoreInfo = reviewTools.scoreReview(original, input);
	
	if(req.body.type == 'rw'){
		result = 0;
		if(scoreInfo.score > 0.95) {
			setUpdatedDue(state, 1);
		} else {
			setUpdatedDue(state, -1);
		}
	} else {
		setUpdatedDue(state, 1);
	}

	

	if(req.body.debug == 'true') {
		console.log('debug is on, no data recorded');
	} else {
		if(source != 'daily-recall') deck.updateState(state);

		reviewLogging.log({ 
			id: req.body.id, 
			type: "recall", 
			condition: state.condition,
			input: req.body.input, 
			score: scoreInfo.score, 
			duration: parseInt(req.body.duration),
			streak: preStreak,
			source: source
		});
	}

	res.json(scoreInfo);
}

const getDeckFromRequest = (req) => {
	let deckName = 'kanji';
	if(req.query.deck) deckName = req.query.deck;

	const deck = decks.getDeck(deckName);
	if(!deck) {
		res.send("deck not found: " + deckName);
		return null;
	}
	deck.syncStates();
	return deck;
};

const renderReviewOrNoReviews = (res, deckName, id, options) => {
	if(id == null){
		renderNoReviews(res, deckName);
	} else {
		renderReview(res, deckName, id, options);
	}
}

const handleRenderReviewRequest = (req, res, getReviewData) => {
	const deck = getDeckFromRequest(req);
	if(!deck) return;
	const reviewData = getReviewData();
	renderReviewOrNoReviews(res, deck.name, reviewData.id, reviewData.options);
};

module.exports.init = (app) => {
	app.get('/review', (req, res) => {
		const deck = getDeckFromRequest(req);
		if(!deck) return;

		if(req.query.dbg && req.query.id) {
			const dbgData = { debug: true };
			for(const key in req.query){
				if(key.includes('__'))
					dbgData[key] = req.query[key];
			}
			renderReview(res, deck.name, req.query.id, null, dbgData);
			return;
		}

		const expiredReviewId = deck.getExpiredReview();
		if(expiredReviewId == null){
			const recallReview = getRecallReview();
			if(deck.name == 'kanji' && recallReview) {
				// console.log(recallReview);
				renderReview(res, 'kanji', recallReview, { type: 2, overrideMode: 1, source: 'daily-recall' });
			} else {
				renderNoReviews(res, deck.name);
			}
		} else {
			renderReview(res, deck.name, expiredReviewId);
		}
	});

	app.get('/listen-meaning-review', (req, res) => {
		handleRenderReviewRequest(req, res, () => {
			const expiredReviewId = getListenMeaningReview();
			return {
				id: expiredReviewId,
				options: { type: 4 }
			};
		});
	});

	app.get('/cloze-review', (req, res) => {
		handleRenderReviewRequest(req, res, () => {
			const clozeReview = getExternalClozeReview(req) || {};
			const clozeSentence = clozeReviews.getRandomClozeSentence(clozeReview.targetId);
			return {
				id: clozeReview.targetId,
				options:  { type: 5, clozeSentence: clozeSentence, clozeChoices: clozeReview.choices }
			};
		});
	});

	app.get('/inverted-internal-cloze-review', (req, res) => {
		handleRenderReviewRequest(req, res, () => {
			const invertedClozeReview = getInternalClozeReview(req, { factType: 1 }) || {};
			return {
				id: invertedClozeReview.targetId,
				options: { type: 6, clozeChoices: invertedClozeReview.choices }
			};
		});
	});

	app.get('/binary-internal-cloze-review', (req, res) => {
		handleRenderReviewRequest(req, res, () => {
			const clozeReview = getInternalClozeReview(req, { factType: 3, count: 1, logType: 'binary-internal-cloze' }) || {};
			return {
				id: clozeReview.targetId,
				options: { type: 6, clozeChoices: clozeReview.choices, binary: true, logType: 'binary-internal-cloze' }
			};
		});
	});

	app.get('/binary-external-cloze-review', (req, res) => {
		handleRenderReviewRequest(req, res, () => {
			const clozeReview = getExternalClozeReview(req, { factType: 3, count: 1, logType: 'binary-external-cloze' }) || {};
			return {
				id: clozeReview.targetId,
				options: { type: 6, clozeChoices: clozeReview.choices, binary: true, logType: 'binary-external-cloze' }
			};
		});
	});

	app.get('/recall-review', (req, res) => {
		res.redirect('/review?deck=recall');
	});

	app.post('/create-kanji-fact', (req, res) => {
		const data = req.body;
		data.type = KanjiType;
		kanjiReviews.add(data);
		console.log("fact saved: ", data);
		res.send('success: ' + data.target);
	});

	app.post('/review', (req, res) => {
		const deck = decks.getDeck(req.body.deck);
		const fact = deck.find(req.body.id);
		const state = deck.findState(req.body.id);

		console.log('posting review: ', req.body);

		switch(req.body.type){
		case 't': case 's':
			handleKanjiReviewResponse(req, res);
			break;
		case 'rw': case 'rs':
			handleRecallReviewResponse(req, res);
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
		const img = gameTools.tryStoreImageFile(req.body.metadata);
		if(voice){
			createAudioWordFact({ sentence: req.body.text.replace(/\n/g, ''), word: req.body.word, reading: req.body.reading, audio: voice, image: img });
			res.json({ success: true });
		} else {
			res.json({ success: false, error: 'Audio file could not be found. See server log.' });
		}
	});

	app.get('/test-media', (req, res) => {
		mediaserver.pipe(req, res, 'C:/Users/Gabriel Culbertson/Documents/GitHub/kotoba-najimi/public/audio/ed6sc/ch0010190368.ogg');
	});

	app.get('/dictionary-word-audio', (req, res) => {
		const word = req.query.word;
		console.log(word);
		dictionaryAudio.getAudioFilePath(word, (file) => {
			if(file){
				mediaserver.pipe(req, res, file);
			} else {
				console.log('no audio found for: ' + word);
				res.send('failed');
			}
		});
	});

	app.post('/log-meaning-assessment', (req, res) => {
		// console.log(req.body);
		const logMessage = { 
			id: req.body.id,
			word: req.body.word,
			result: req.body.result,
			input: req.body.input,
			time: new Date().getTime(), 
			type: req.body.type || 'meaning',
			duration: req.body.duration,
			streak: req.body.streak,
			duration: req.body.duration,
		};
		reviewLogging.log(logMessage);

		if(req.body.result == 0 && !req.body.skipReset){
			resetFact('kanji', req.body.id);
		}
		res.send('done');
	});

	app.post('/log-cloze', (req, res) => {
		// console.log(req.body);
		const logMessage = { 
			id: req.body.id,
			word: req.body.word,
			result: req.body.result,
			input: req.body.input,
			choices: req.body.choices,
			clozeSentence: req.body.clozeSentence,
			clozeWord: req.body.clozeWord,
			type: req.body.type || 'cloze',
			duration: req.body.duration,
			promptType: req.body.promptType,
			leadDuration: req.body.leadDuration,
		};
		reviewLogging.log(logMessage);
		res.send('done');
	});

	app.post('/sentence-reading', (req, res) => {
		const deck = decks.getDeck("kanji");
		const fact = deck.find(req.body.id);
		fact['sentence-reading'] = req.body.sentenceReading;
		deck.updateFact(fact);
		res.send('done');
	});

	app.post('/log-note', (req, res) => {
		reviewLogging.log({ note: req.body.note });
		res.send('done');
	});
};