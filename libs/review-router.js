const ejs = require('ejs');
const fs = require('fs');
const pathUtil = require('path');
const mediaserver = require('mediaserver');

const reviewTools = require('./review-tools');
const decks = require('./review-data');
const wanakana = require('./wanakana');
const furigana = require('./furigana');
const renderFurigana = require('./render-furigana');
const experiments = require('./experiments');
const kanjiReviews = require('./kanji-reviews');
const clozeReviews = require('./cloze-reviews');
const reviewLogging = require('./review-logging');
const clean = require('./clean');
const gameTools = require('./game-tools/game-tools');
const util = require('./util');
const jaTools = require('./ja-tools');
const jaDictionary = require('./ja-dictionary');
const videoConfig = require('./video-tools/video-config');
const videoUtil = require('./video-tools/video-util');

const dictionaryAudio = require('./dictionary-audio');

const KanjiType = 1;
const RecallType = 2;
const WordRecallType = 3;

const DailyRecallCount = 4;
const DailyDictionaryListeningCount = 25;
const DailyClozeCount = 10;
const DailyRecallMinLength = 18;

const DECK_TO_ICON = {
	kanji: "estelle",
	recall: "joshua"
};

const AUDIO_CLOZE = 0;
const SPEECH_WORD = 1;
const TEXT_CLOZE = 2;
const TEXT_WORD = 3;
const RANDOM_AUDIO_CLOZE = 4;
const SENTENCE_READING = 5;
const HIDDEN_SENTENCE_READING = 6;

const setUpdatedDue = (state, result) => {
	if(result == 1){
		if(state["disable-reset"] && state.streak > 0) {
			if(state["max-streak"] == null) state["max-streak"] = -1;
			if(state.streak > state["max-streak"]) state["max-streak"] = state.streak;
			state["max-streak"]++;
			state.streak = state["max-streak"];
		} else {
			state.streak++;
		}
	} else if(result == -1) {
		state.streak = -1;
	} else {
		state.streak = 0;
	}
	state.due = new Date().getTime() + (reviewTools.streakToInterval(state.streak) * (0.5 + Math.random()));
};

const resetFact = (deckName, id) => {
	const deck = decks.getDeck(deckName);
	const state = deck.findState(id);
	setUpdatedDue(state, -1);
	deck.updateState(state);
}

const createAudioWordFact = (data, state) => {
	let type = decks.AUDIO_WORD_TYPE;
	const deck = decks.getDeck('kanji');
	const fact = decks.createFact('kanji', type, data);
	if (state && state.condition) {
		console.log('adding 1 state for ');
		console.log(fact);
		deck.addState(fact.id, parseInt(state.condition));
	} else {
		console.log('adding 4 states for ');
		console.log(fact);
		const day = 1000 * 60 * 60 * 24;
		// if (data.audio) {
		// 	deck.addState(fact.id, AUDIO_CLOZE);
		// } else {
			deck.addState(fact.id, SENTENCE_READING);
		// }
		deck.addState(fact.id, SPEECH_WORD, 2*day);
		deck.addState(fact.id, TEXT_WORD, 4*day);
		deck.addState(fact.id, TEXT_CLOZE, 6*day);
	}
	return data;
};

const renderNoReviews = (res, deckName) => {
	const deck = decks.getDeck(deckName);
	const reviewData = {
		facts: deck.getAllFacts(),
		states: deck.getAllStates(),
		icon: DECK_TO_ICON[deckName] || 'estelle',
		params: {}
	};
	res.render('no-reviews', reviewData);
};

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
};

const getFullRecallReview = () => {
	const now = new Date().getTime();
	let beginningOfToday = new Date();
	beginningOfToday.setHours(0,0,0,0);
	beginningOfToday = beginningOfToday.getTime();
	const reviewHistory = reviewLogging.getLog();
	const fourDaysAgo = new Date().getTime() - 4 * 24 * 60 * 60 * 1000;

	let todaysCount = 0;
	const newToday = {};
	const idToTypeLastReview = {};
	const dailyRecall = [];
	const streaks = {};
	for(const item of reviewHistory){
		if(item.message.source == 'daily-recall'){
			dailyRecall.push(item.message.id);
		}

		if(item.message.source == 'full-recall'){
			if(item.message.time > beginningOfToday && !idToTypeLastReview[item.message.id]) {
				todaysCount++;
			}

			idToTypeLastReview[item.message.id] = parseInt(item.message.time);

			if(!(item.message.id in streaks)){
				streaks[item.message.id] = -2;
			}

			if(streaks[item.message.id] == -2 && item.message.score > 0.99){
				streaks[item.message.id] = -1;
			}

			if(streaks[item.message.id] >= -1){
				streaks[item.message.id]++;
			}
		}
	}

	console.log(todaysCount, streaks);

	const available = [];

	let count = 0;
	while(count < 2 - todaysCount){
		const id = util.randomFromArray(dailyRecall);
		if(!(id in streaks)){
			console.log(count, DailyRecallCount - todaysCount);
			available.push(id);
			count++;
		}
	}

	for(const id in streaks){
		const expiration = idToTypeLastReview[id] + reviewTools.streakToInterval(streaks[id]);
		if(expiration < now){
			available.push(id);
		}
	}

	if(available.length == 0) return null;

	console.log(available);
	return util.randomFromArray(available);
};

const getTieredFullRecallReview = (options) => {
	options = options || {};
	options.count = options.count || 2;

	const now = new Date().getTime();
	let beginningOfToday = new Date();
	beginningOfToday.setHours(0,0,0,0);
	beginningOfToday = beginningOfToday.getTime();
	const reviewHistory = reviewLogging.getLog();
	const fourDaysAgo = new Date().getTime() - 4 * 24 * 60 * 60 * 1000;

	let todaysCount = 0;
	const newToday = {};
	const idToTypeLastReview = {};
	const dailyRecall = [];
	const streaks = {};
	const facts = kanjiReviews.getAllFacts();
	for(const item of reviewHistory){
		if(item.message.source == 'daily-recall'){
			dailyRecall.push(item.message.id);
		}

		if(item.message.source == 'tiered-full-recall'){
			if(item.message.time > beginningOfToday && !idToTypeLastReview[item.message.id]) {
				todaysCount++;
			}

			idToTypeLastReview[item.message.id] = parseInt(item.message.time);

			if(!(item.message.id in streaks)){
				streaks[item.message.id] = -2;
			} else if(item.message.score < 0.99 && item.message.tries == "0"){
				streaks[item.message.id]--;
			} else {
				streaks[item.message.id]++;
			}
		}
	}

	console.log(todaysCount, streaks);

	const available = [];

	let count = 0;
	while(count < options.count - todaysCount){
		const id = util.randomFromArray(dailyRecall);
		if(!(id in streaks) && id in facts){
			console.log(count, DailyRecallCount - todaysCount);
			available.push(id);
			count++;
		}
	}

	for(const id in streaks){
		const expiration = idToTypeLastReview[id] + reviewTools.streakToInterval(streaks[id]);
		if(expiration < now && id in facts){
			available.push(id);
		}
	}

	if(available.length == 0) return null;

	console.log(available);
	const review = { id: util.randomFromArray(available) };
	review.streak = streaks[review.id] || 0;
	review.maxWords = 1;
	review.remainingToday = available.length;
	if(review.streak >= 1) review.maxWords = review.streak + 1;
	return review;
};

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
		console.log(facts[id].type, factType, facts[id].type == factType, !clozeReviews.getRandomClozeSentence(id));
		if(external && !clozeReviews.getRandomClozeSentence(id)) continue;

		// console.log(id, reviewInfo.idToAnyLastReview[id], reviewInfo.fourDaysAgo, reviewInfo.idToAnyLastReview[id] < reviewInfo.fourDaysAgo);
		console.log(facts[id].type, factType, facts[id].type == factType);
		if(facts[id].type == factType && reviewInfo.idToAnyLastReview[id] < reviewInfo.fourDaysAgo) {
			console.log(id, reviewInfo.idToTypeLastReview[id]);
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

	console.log(factType, 'inverted cloze count:', available.length);

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

const getSimpleCloze = (text, word, blankLength=2) => {
	return clean.replaceNewlinesWithBreaks(text.replace(word, "＿".repeat(blankLength)));
}

const getRandomSentenceJsonCloze = (fact) => {
	const availableWords = [];
	for (let i = 0; i < fact['sentence-json'].length; i++) {
		const jsonPart = fact['sentence-json'][i];
		if (jsonPart.isContent) {
			availableWords.push(i);
		}
	}
	const targetWordIndex = util.randomFromArray(availableWords);
	let text = '';
	for (let i = 0; i < fact['sentence-json'].length; i++) {
		const jsonPart = fact['sentence-json'][i];
		if (i == targetWordIndex) {
			let kanjiReference = '';
			let readingReference = '';
			for (const item of jsonPart.text) {
				for (const c of item[0]) {
					text += '＿';
				}

				kanjiReference += item[0];
				readingReference += item[1] || item[0];
			}
			fact.reading = readingReference;
			fact.word = readingReference;
			fact.references = [kanjiReference, readingReference];
		} else {
			for (const item of jsonPart.text) {
				text += item[0];
			}
		}
	}
	return clean.replaceNewlinesWithBreaks(text);
}

const getSimpleHighlight = (text, word) => {
	return clean.replaceNewlinesWithBreaks(text.replace(word, `<b>${word}</b>`));
}

const getExternalClozeReview = (req, options) => {
	options = options || {};
	options.count = options.count || 3;
	options.logType = options.logType || 'external-cloze';
	options.dailyCount = options.dailyCount || DailyClozeCount;
	options.factType = options.factType || 3;

	const reviewInfo = getDailyReviewInfo('type', options.logType);

	console.log(options.logType, "today's count:", reviewInfo.todaysCount);

	if(reviewInfo.todaysCount >= options.dailyCount && !req.query.dbg) return null;

	return getClozeChoices(reviewInfo, options.factType, options.count, true);
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

const getChunksForReviewData = (reviewData) => {
	const sentence = reviewData.fact.sentence || reviewData.fact.context;
	if(reviewData.options.kanjiRandomWord){
		reviewData.options.chunks = jaTools.splitKanjiWithReadingString(sentence, reviewData.fact['sentence-chunks']);

		let chunkToReading = {};
		let readingChunks = reviewData.fact['sentence-chunks'].split(' ');
		for(let i = 0; i < reviewData.options.chunks.length; i++){
			chunkToReading[reviewData.options.chunks[i]] = readingChunks[i];
		}
		reviewData.options.chunkToReading = chunkToReading;
	} else {
		reviewData.options.chunks = reviewData.fact['sentence-chunks'].split(' ');
	}
};

const setRandomCloze = (reviewData) => {
	console.log('use kanji?',  reviewData.options.kanjiRandomWord);
	const available = reviewData.options.chunks;
	console.log(available);
	if(reviewData.options.maxRandomWords){
		let index = util.randomInt(available.length);
		index = Math.max(0, Math.min(available.length - reviewData.options.maxRandomWords, index));
		const length = Math.min(available.length, reviewData.options.maxRandomWords);
		const words = [];

		reviewData.options.reviewPrompt = "";
		for(let i = 0; i < index; i++){
			reviewData.options.reviewPrompt += available[i] + " ";
		}

		for(let i = index; i < index + length; i++) {
			words.push(available[i]);
			reviewData.options.reviewPrompt += "____ ";
		}

		for(let i = index + length; i < available.length; i++){
			reviewData.options.reviewPrompt += available[i] + " ";
		}

		const randomWord = words.join(' ');
		reviewData.options.clozeWord = randomWord;
		reviewData.fact.word = randomWord;
		reviewData.fact.reading = randomWord;
		reviewData.fact.clozeSentence = reviewData.fact['sentence-chunks'];
		console.log('random words:', reviewData.options.maxRandomWords, available, randomWord, reviewData.options.randomWord);
	} else {
		const randomWord = util.randomFromArray(available);
		reviewData.options.clozeWord = randomWord;
		reviewData.fact.word = randomWord;
		reviewData.fact.reading = randomWord;
		reviewData.fact.clozeSentence = reviewData.fact['sentence-chunks'];
		console.log(available, reviewData.options.randomWord);
	}
};

const sentenceJsonToFurigana = (sentenceJson) => {
	let elements = [];
	for (const word of sentenceJson) {
		for (const part of word.text) {
			const element = {s: part[0]};
			if (part[1]) {
				element.r = part[1];
			}
			elements.push(element);
		}
	}
	return elements;
};

const needsSentenceJson = (reviewData) => {
	if (reviewData.fact['sentence-json']) {
		return false;
	}
	const condition = reviewData.state.condition;
	return condition == SENTENCE_READING || condition == HIDDEN_SENTENCE_READING;
}

const renderReview = (res, deckName, id, options, debugData) => {
	const deck = decks.getDeck(deckName);
	if(!deck) {
		res.send("deck not found: " + deckName);
		return;
	}

	const reviewData = { params: {} };
	reviewData.state = deck.findState(id);
	reviewData.stateId = id;
	reviewData.fact = deck.find(reviewData.state.id);

	if(reviewData.fact['linked-fact']){
		const split = reviewData.fact['linked-fact'].split(':');
		const linkedDeckName = split[0];
		const linkedId = split[1];
		const linkedDeck = decks.getDeck('kanji');
		const linkedFact = linkedDeck.find(linkedId);
		for(const propName in linkedFact){
			if(!reviewData.fact[propName]){
				reviewData.fact[propName] = linkedFact[propName];
			}
		}
	}

	if(!reviewData.fact){
		res.send("fact not found: " + id + "; " + reviewData.state.id);
		return;
	}

	console.log('reviewData needs sentence json?', reviewData.state.type, reviewData.fact['sentence-json']);
	// if (reviewData.state.condition == SENTENCE_READING && !reviewData.fact['sentence-json']) {
	if (needsSentenceJson(reviewData)) {
		renderSentenceJsonEditor({ query: { id: reviewData.fact.id } }, res);
		return;
	}

	reviewData.fact.sentence = reviewData.fact.sentence || reviewData.fact.context;
	reviewData.fact.word = reviewData.fact.word || reviewData.fact.target;

	reviewData.deck = deckName;

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

	options = options || {};
	reviewData.options = options;
	reviewData.params = reviewData.options;

	let type = options.type == null ? reviewData.fact.type : options.type;

	console.log(reviewData.fact);

	const template = fs.readFileSync('./views/furigana.ejs', 'utf-8');
	const sentence = reviewData.fact.sentence || reviewData.fact.context;
	let furiganaHtml = "";
	if (reviewData.fact['sentence-json']) {
		furiganaHtml = ejs.render(template, { elements: sentenceJsonToFurigana(reviewData.fact['sentence-json']) });
	} else if (reviewData.fact['sentence-reading']){
		furiganaHtml = ejs.render(template, { elements: renderFurigana(sentence, reviewData.fact['sentence-reading']) });
	} else {
		furiganaHtml = ejs.render(template, { elements: furigana(sentence) });
	}
	reviewData.furiganaHtml = furiganaHtml;

	if(reviewData.fact['sentence-chunks']){
		getChunksForReviewData(reviewData);

		if(reviewData.params.randomWord){
			setRandomCloze(reviewData);
		}
	}

	if(reviewData.fact['video-id'] && reviewData.fact.type != 8){
		reviewData.params.videoInfo = videoConfig.getVideoDataForId(reviewData.fact['video-id']);
	}

	reviewData.params.boldedFuriganaHtml = ejs.render(template, { 
		elements: renderFurigana(
			sentence, 
			reviewData.fact['sentence-reading'] || furigana(sentence, { onlyFurigana: true }),
			{
				tagString: options.clozeWord || reviewData.fact.target || reviewData.fact.word,
				getTaggedPair: (p) => { return { r: p.r, s: `<b>${p.s}</b>` }; }
			})
	});
	reviewData.params.displayText = reviewData.params.displayText || {};
	reviewData.params.displayText['response-complete'] = reviewData.params.boldedFuriganaHtml;

	// if(type == 3 && reviewData.state.streak > 2 && util.mod(reviewData.state.streak + 1, 4) == 0){
	// 	reviewData.params.onlyKanji = true;
	// 	reviewData.params.noImage = true;
	// 	reviewData.params.useTextInput = true;
	// 	reviewData.params.useCloze = false;
	// 	type = 1;
	// 	console.log('kanji only review');

	// 	reviewData.params.promptRoute = 'partial/text-prompt';
	// 	reviewData.params.responseRoute = 'partial/typed-response';
	// 	reviewData.params.promptType = 'typed-reading';
	// 	reviewData.params.playAudioOnComplete = true;

	// 	reviewData.params.displayText['initial'] = reviewData.fact.word;
	// 	res.render('review-base', reviewData);
	// 	return;
	// }
	console.log('streak:', reviewData.state.streak, '; mod:', util.mod(reviewData.state.streak + 1, 4), '; reviewData.options:', reviewData.params);
	console.log("type:" + type);

	reviewData.fact.references = [reviewData.fact.word, reviewData.fact.reading];

	let condition = 0;
	switch(type){
	case 0:
		const renderRoute = options.renderRoute || 'recall-review';
		res.render(renderRoute, reviewData);
		break;
	case 1:
		condition = reviewData.state.condition || condition;

		if(options.cyclePromptTypes && !reviewData.params.onlyKanji){
			const maxStreak = reviewData.state['max-streak'] || 0;
			const streakHash = util.mod(condition + reviewData.state.streak + maxStreak, 4);
			if (streakHash % 2 == 0){
				condition = 2;
			} else if (streakHash == 1){
				condition = 0;
			} else {
				condition = 1;
			}
			console.log('cycled silent condition: ', condition, ';x', reviewData.fact.id.hashCode(), 'x,', reviewData.state.streak);
		}

		if(options.noSpeech && condition == 1) {
			condition = 0;
			console.log('overwriting speech condition with typing');
		}

		reviewData.params.promptRoute = 'partial/text-prompt';
		reviewData.params.playAudioOnComplete = true;

		console.log(`rendering type ${type} condition ${condition}`);
		switch (condition){
			case 0: // Typed word
				reviewData.params.promptType = 'typed-reading';
				reviewData.params.responseRoute = 'partial/typed-response';

				reviewData.params.displayText['initial'] = reviewData.params.promptText || getSimpleHighlight(reviewData.fact.sentence, reviewData.fact.word);
				reviewData.params.displayText['response-started'] = getSimpleCloze(reviewData.fact.sentence, reviewData.fact.word, reviewData.fact.word.length);
				res.render('review-base', reviewData);
				return;
			case 1: // Spoken word
				reviewData.params.promptType = 'spoken-reading';
				reviewData.params.responseRoute = 'partial/voice-response';

				reviewData.params.displayText['initial'] = reviewData.params.promptText || getSimpleHighlight(reviewData.fact.sentence, reviewData.fact.word);
				reviewData.params.displayText['response-started'] = getSimpleCloze(reviewData.fact.sentence, reviewData.fact.word, reviewData.fact.word.length);

				res.render('review-base', reviewData);
				return;
			case 2: // Typed cloze
				reviewData.params.promptType = 'typed-cloze';
				reviewData.params.responseRoute = 'partial/typed-response';

				reviewData.params.displayText['initial'] = getSimpleCloze(reviewData.fact.sentence, reviewData.fact.word);
				res.render('review-base', reviewData);
				return;
		}

		res.render('kanji-review', reviewData);
		break;
	case 2:
		if(!reviewData.params.promptType){
			reviewData.params.promptType = reviewData.state.condition == 0 ? 'text' : 'audio';
		}

		res.render('recall-review', reviewData);
		break;
	case 3:
		condition = 0;

		if(reviewData.state.condition) condition = reviewData.state.condition;
		// if(reviewData.state.experiments && reviewData.state.experiments['listen-speak-cloze']) condition = reviewData.state.experiments['listen-speak-cloze'];

		if(options.cyclePromptTypes) {
			const maxStreak = reviewData.state['max-streak'] || 0;
			condition = util.mod(condition + reviewData.state.streak + maxStreak, 3);
			if(condition == 0 && !reviewData.fact.audio) condition = 2;
			console.log('cycled audio condition is ', condition);
		}

		console.log('COND: ' + condition);
		switch (condition){
			case AUDIO_CLOZE:
				reviewData.params.promptType = 'audio-cloze';

				reviewData.params.promptRoute = 'partial/audio-prompt';
				reviewData.params.responseRoute = 'partial/typed-response';

				reviewData.params.backgroundRoute = 'partial/image-background';
				reviewData.params.noImage = true;

				reviewData.params.displayText['initial'] = "";
				reviewData.params.displayText['prompt-complete'] = getSimpleCloze(reviewData.fact.sentence, reviewData.fact.word, reviewData.fact.word.length);

				res.render('review-base', reviewData);

				// res.render('recall-review', reviewData);
				break;
			case SPEECH_WORD:
				reviewData.params.promptType = 'spoken-reading';

				reviewData.params.promptRoute = 'partial/text-prompt';
				reviewData.params.responseRoute = 'partial/voice-response';

				reviewData.params.backgroundRoute = 'partial/image-background';
				reviewData.params.playAudioOnComplete = true;

				reviewData.params.displayText['initial'] = reviewData.params.promptText || getSimpleHighlight(reviewData.fact.sentence, reviewData.fact.word, reviewData.fact.word.length);
				reviewData.params.displayText['response-started'] = getSimpleCloze(reviewData.fact.sentence, reviewData.fact.word, reviewData.fact.word.length);

				res.render('review-base', reviewData);
				return;
			case TEXT_CLOZE:
				reviewData.params.promptType = 'typed-cloze';
				
				reviewData.params.promptRoute = 'partial/text-prompt';
				reviewData.params.responseRoute = 'partial/typed-response';

				reviewData.params.playAudioOnComplete = true;
				reviewData.params.backgroundRoute = 'partial/image-background';
				reviewData.params.noImage = true;

				reviewData.params.displayText['initial'] = getSimpleCloze(reviewData.fact.sentence, reviewData.fact.word);
				// reviewData.params.displayText['response-started'] = getSimpleCloze(reviewData.fact.sentence, reviewData.fact.word);

				res.render('review-base', reviewData);
				return;
			case TEXT_WORD:
				reviewData.params.onlyKanji = true;
				reviewData.params.useTextInput = true;
				reviewData.params.useCloze = false;
				type = 1;
				console.log('kanji only review');

				reviewData.params.promptRoute = 'partial/text-prompt';
				reviewData.params.responseRoute = 'partial/typed-response';
				reviewData.params.promptType = 'typed-reading';
				reviewData.params.playAudioOnComplete = true;

				reviewData.params.backgroundRoute = 'partial/image-background';
				reviewData.params.noImage = true;

				reviewData.params.displayText['initial'] = reviewData.fact.word;
				res.render('review-base', reviewData);
				return;
			case RANDOM_AUDIO_CLOZE:
				reviewData.params.promptType = 'audio-cloze';

				reviewData.params.promptRoute = 'partial/audio-prompt';
				reviewData.params.promptButtonContent = '<i class="fas fa-random"></i>';
				reviewData.params.responseRoute = 'partial/typed-response';

				reviewData.params.backgroundRoute = 'partial/image-background';
				reviewData.params.noImage = true;

				reviewData.params.displayText['initial'] = "";
				reviewData.params.displayText['prompt-complete'] = getRandomSentenceJsonCloze(reviewData.fact);

				reviewData.params.boldedFuriganaHtml = ejs.render(template, { 
					elements: renderFurigana(
						sentence, 
						reviewData.fact['sentence-reading'] || furigana(sentence, { onlyFurigana: true }),
						{
							tagString: options.clozeWord || reviewData.fact.target || reviewData.fact.word,
							getTaggedPair: (p) => { return { r: p.r, s: `<b>${p.s}</b>` }; }
						})
				});
				reviewData.params.displayText = reviewData.params.displayText || {};
				reviewData.params.displayText['response-complete'] = reviewData.params.boldedFuriganaHtml;

				res.render('review-base', reviewData);
				return;
			case SENTENCE_READING:
				reviewData.fact.references = [
					jaTools.sentenceJsonToKanjiContentString(reviewData.fact['sentence-json']),
					jaTools.sentenceJsonToKanaContentString(reviewData.fact['sentence-json'])
				];

				reviewData.params.promptType = 'spoken-reading';

				reviewData.params.promptRoute = 'partial/text-prompt';
				reviewData.params.responseRoute = 'partial/self-check-voice-response';

				reviewData.params.backgroundRoute = 'partial/image-background';
				reviewData.params.playAudioOnLoad = true;
				// reviewData.params.playAudioOnComplete = true;

				reviewData.params.displayText['initial'] = reviewData.params.promptText || clean.replaceNewlinesWithBreaks(reviewData.fact.sentence);
				reviewData.params.displayText['response-complete'] = ejs.render(template, { elements: sentenceJsonToFurigana(reviewData.fact['sentence-json']) });

				res.render('review-base', reviewData);

				return;
			case HIDDEN_SENTENCE_READING:
				reviewData.fact.references = [
					jaTools.sentenceJsonToKanjiContentString(reviewData.fact['sentence-json']),
					jaTools.sentenceJsonToKanaContentString(reviewData.fact['sentence-json'])
				];

				reviewData.params.promptType = 'spoken-reading';

				reviewData.params.promptRoute = 'partial/text-prompt';
				reviewData.params.responseRoute = 'partial/self-check-voice-response';

				reviewData.params.backgroundRoute = 'partial/image-background';
				reviewData.params.playAudioOnComplete = true;

				reviewData.params.displayText['initial'] = reviewData.params.promptText || clean.replaceNewlinesWithBreaks(reviewData.fact.sentence);
				reviewData.params.displayText['response-started'] = getSimpleCloze(reviewData.fact.sentence, reviewData.fact.sentence, reviewData.fact.sentence.length);
				reviewData.params.displayText['response-complete'] = ejs.render(template, { elements: sentenceJsonToFurigana(reviewData.fact['sentence-json']) });

				res.render('review-base', reviewData);

				return;
			default:
				console.log('unknown type! ' + condition);
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
		reviewData.params.promptType = 'text';
		if(util.randomInt(2) == 1) reviewData.params.promptType = 'audio';
		reviewData.params.clozeChoices = options.clozeChoices;
		for(const choice of reviewData.params.clozeChoices){
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
	case 7: // respeak
		reviewData.params.blankLength = reviewData.fact.word.length;
		reviewData.params.promptType = 'audio-cloze';
		reviewData.params.useSpeechInput = true;
		reviewData.furiganaHtml = ejs.render(template, { 
			elements: renderFurigana(
				sentence, 
				reviewData.fact['sentence-reading'] || furigana(sentence, { onlyFurigana: true }),
				{
					tagString: reviewData.fact.target || reviewData.fact.word,
					getTaggedPair: (p) => { return { r: p.r, s: `<b>${p.s}</b>` }; }
				})
		});


		reviewData.params.backgroundRoute = 'partial/image-background';
		reviewData.params.promptRoute = 'partial/audio-prompt';
		reviewData.params.responseRoute = 'partial/voice-response';
		reviewData.params.displayText['initial'] = reviewData.furiganaHtml;
		reviewData.params.displayText['response-started'] = getSimpleCloze(reviewData.fact.sentence, reviewData.fact.word, reviewData.fact.word.length);
		res.render('review-base', reviewData);

		// res.render('recall-review', reviewData);
		break;
	case 8: // video
		reviewData.params.videoInfo = { path: `/video-stream?file=${encodeURIComponent(videoUtil.tryGetVideoFile(reviewData.fact['video-id']))}` };
		reviewData.params.source = 'video';
		reviewData.params.responseRoute = 'partial/typed-response';

		reviewData.params.backgroundRoute = 'partial/video-background';
		reviewData.params.noImage = true;
		reviewData.params.playAudioOnComplete = true;

		switch (reviewData.state.condition) {
		case 0:
			reviewData.params.promptType = 'video-audio-cloze';
			reviewData.params.promptRoute = 'partial/video-prompt';

			reviewData.params.displayText['initial'] = "";
			reviewData.params.displayText['prompt-complete'] = getSimpleCloze(reviewData.fact.sentence, reviewData.fact.word, reviewData.fact.word.length);
			res.render('review-base', reviewData);
			return;
		case 2:
			reviewData.params.promptType = 'video-typed-cloze';
			reviewData.params.promptRoute = 'partial/text-prompt';

			reviewData.params.displayText['initial'] = getSimpleCloze(reviewData.fact.sentence, reviewData.fact.word);
			res.render('review-base', reviewData);
			return;
		case 3: // Kanji reading only
			reviewData.params.promptRoute = 'partial/text-prompt';
			reviewData.params.promptType = 'typed-reading';

			reviewData.params.displayText['initial'] = reviewData.fact.word;
			res.render('review-base', reviewData);
			return;
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
		logMessage.inputType = 't';
		const input = req.body.input;
		if(reading == input || wanakana._katakanaToHiragana(reading) == wanakana.toKana(input)){
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
		logMessage.inputType = 's';
		logMessage.result = 0;
		const originalHiragana = wanakana._katakanaToHiragana(original);
		const readingHiragana = wanakana._katakanaToHiragana(reading);
		for(let i = 0; i < req.body.results.length; i++){
			let transcript = req.body.results[i].replace(/ /g, '');
			console.log('t', i, ':', transcript, original, '; ', reading, '; ', transcript == reading);
			transcriptHiragana = wanakana._katakanaToHiragana(transcript);
			if(transcript == original || transcript == reading || transcriptHiragana == originalHiragana || transcriptHiragana == readingHiragana){
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
	let originalFact = deck.find('id', req.body.id);
	if(!originalFact){
		const input = req.body.input.replace(/ /g,'');
		const testOriginal = wanakana._katakanaToHiragana(furigana(req.body.original, { onlyFurigana: true })).replace(/ /g,'');
		const testScoreInfo = reviewTools.scoreReview(testOriginal, input);
		testScoreInfo.error = "Not a valid fact (id missing or not found) [id: " + req.body.id + "]. No data recorded.";
		res.json(testScoreInfo);
		return;
	}

	let source = "normal";
	if(req.body.source) source = req.body.source;

	let originalText = null;
	switch(req.body.scoringMethod){
	case 'sentence-reading':
		originalText = originalFact['sentence-reading'];
		break;
	case 'cloze-word':
		originalText = req.body.clozeWord;
		break;
	case 'reading':
		originalText = originalFact.reading;
		break;
	}
	if(!originalText){
		console.log('unkown scoring method: ', req.body.scoringMethod);
		return;
	}
	const state = deck.findState('id', req.body.id);
	const preStreak = state.streak;

	let scoreInfo = null;
	let responseInput = null;
	if(req.body.scoreType == 'speech'){
		const word = req.body.word || originalFact.word;
		const reading = req.body.reading || originalFact.reading;
		scoreInfo = reviewTools.scoreSpeechReview(word, reading, req.body.speechResults);
		responseInput = req.body.speechResults[0];
	} else {
		const original = wanakana._katakanaToHiragana(originalText).replace(/ /g,'');
		const input = req.body.input.replace(/ /g,'');
		scoreInfo = reviewTools.scoreReview(original, input);
		responseInput = input;
	}
	
	let doUpdateDue = true;
	if(req.body.skipStreakUpdate == 'true') {
		doUpdateDue = false;
	}
	if(req.body.tries == '1' && scoreInfo.score < 0.99) {
		scoreInfo.hasTries = true;
		doUpdateDue = false;
	}

	console.log('doUpdateDue', doUpdateDue);
	if(doUpdateDue){
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
	}

	

	if(req.body.debug == 'true') {
		console.log('debug is on, no data recorded');
	} else {
		if(source != 'daily-recall') deck.updateState(state);

		reviewLogging.log({ 
			id: req.body.id, 
			type: "recall", 
			condition: state.condition,
			promptType: req.body.promptType,
			input: responseInput, 
			score: scoreInfo.score, 
			duration: parseInt(req.body.duration),
			streak: preStreak,
			source: source, 
			tries: req.body.tries,
			clozeWord: req.body.clozeWord,
		});
	}

	res.json(scoreInfo);
}

const handleBaseReviewPost = (req, res) => {
	console.log('posting:');
	console.log(req.body);

	const deck = decks.getDeck(req.body.deck);
	const source = req.body.source || "default";
	const hasTries = parseInt(req.body.tries) > 0;
	const skipScheduling = req.body.options.skipScheduling == 'true';
	const skipLogging = req.body.options.skipLogging == 'true';
	const state = deck.findState(req.body.id);
	if (!state) {
		console.log('state not found');
		return;
	}
	const originalFact = deck.find('id', state.id);
	if(!originalFact){
		const input = req.body.input.replace(/ /g,'');
		const testOriginal = wanakana._katakanaToHiragana(furigana(req.body.original, { onlyFurigana: true })).replace(/ /g,'');
		const testScoreInfo = reviewTools.scoreReview(testOriginal, input);
		testScoreInfo.error = "Not a valid fact (id missing or not found) [id: " + req.body.id + "]. No data recorded.";
		res.json(testScoreInfo);
		return;
	}
	
	let scoreInfo = {};
	if (req.body.selfScore != null) {
		console.log('using self score');
		scoreInfo.score = parseFloat(req.body.selfScore);
	} else {
		console.log('using auto score');
		scoreInfo = reviewTools.scoreReviewWithMatching(req.body.inputs, req.body.references);
	}
	console.log('score:', scoreInfo, req.body.inputs, req.body.references);
	scoreInfo.hasTries = hasTries;

	const preStreak = state.streak;

	console.log('skip scheduling:', skipScheduling);
	console.log('has tries:', parseInt(req.body.tries), hasTries);
	if(!skipScheduling){
		console.log(state);
		if(scoreInfo.score == 0 && !hasTries){
			console.log('reseting');
			setUpdatedDue(state, -1);
		} else if(scoreInfo.score > 0.9){
			console.log('moving up');
		 	setUpdatedDue(state, 1);
		}
	}

	if(skipLogging) {
		console.log('No data logged.');
	} else {
		deck.updateState(state);

		const logEntry = req.body;
		if(logEntry.options) delete logEntry.options;
		logEntry.score = scoreInfo.score;
		logEntry.streak = preStreak;

		reviewLogging.log(logEntry);
	}

	scoreInfo.nextTime = state.due;
	res.json(scoreInfo);
}

const handleSelfCheckReviewPost = (req, res) => {
	const scoreInfo = reviewTools.scoreReviewWithFuzzyMatching(req.body.inputs, req.body.references);
	console.log('score:', scoreInfo, req.body.inputs, req.body.references);

	res.json(scoreInfo);
};

const getDeckFromRequest = (req) => {
	let deckName = 'kanji';
	if(req.query.deck) deckName = req.query.deck;
	if(req.body.deck) deckName = req.body.deck;

	const deck = decks.getDeck(deckName);
	if(!deck) {
		res.send("deck not found: " + deckName);
		return null;
	}
	// deck.syncStates();
	return deck;
};

const renderReviewOrNoReviews = (res, deckName, id, options, debug) => {
	if(id == null){
		renderNoReviews(res, deckName);
	} else {
		renderReview(res, deckName, id, options, debug);
	}
}

const handleRenderReviewRequest = (req, res, getReviewData) => {
	const deck = getDeckFromRequest(req);
	if(!deck) return;
	const reviewData = getReviewData();
	console.log('reviewData:', reviewData);
	renderReviewOrNoReviews(res, deck.name, reviewData.id, reviewData.options, reviewData.debug);
};

const getTodayNewRandomClozeCount = () => {
	const states = decks.getDeck('kanji').getAllStates();
	const beginningOfToday = new Date();
	beginningOfToday.setHours(0,0,0,0);
	let newRandomClozeCount = 0;
	for (const stateId in states){
		if (states[stateId].created > beginningOfToday) {
			newRandomClozeCount++;
		}
	}
	return newRandomClozeCount;
}

const renderSentenceJsonEditor = (req, res) => {
	const deck = decks.getDeck('kanji');
	let fact = null;
	if(req.query.id){
		fact = deck.find(req.query.id);
	} else {
		fact = clozeReviews.getNewClozeFact();
	}

	let stateAdded = false;
	if (deck.findState({id: fact.id, condition: 4})) {
		stateAdded = true;
	}

	if (!fact['sentence-json']) {
		fact['sentence-json'] = jaTools.getDefaultSentenceJson(fact.sentence);
	}

	const furiganaTemplate = fs.readFileSync('./views/furigana.ejs', 'utf-8');
	console.log(sentenceJsonToFurigana(fact['sentence-json']));
	const furiganaHtml = ejs.render(furiganaTemplate, { elements: sentenceJsonToFurigana(fact['sentence-json']) });

	res.render('sentence-json-editor', {furiganaHtml: furiganaHtml, fact: fact, stateAdded: stateAdded });
};

const falseSet = {
	'0': true,
	'f': true,
	'false': true
};

const isFlagSet = (query, val) => {
	if(val in query){
		return !(query[val].toLowerCase() in falseSet);
	}

	if(val.toLowerCase() in query){
		const key = val.toLowerCase();
		return !(query[key].toLowerCase() in falseSet);
	}

	return null;
}

const reviewQueryFlags = [
	'noSpeech',
	'noImage',
	'cyclePromptTypes'
];

const getOptionsForReviewQuery = (query) => {
	const options = {};

	for(const flag of reviewQueryFlags){
		options[flag] = isFlagSet(query, flag);
	}

	return options;
}

module.exports.init = (app) => {
	app.get('/review', (req, res) => {
		 console.log('query:', req.query);

		const deck = getDeckFromRequest(req);
		if(!deck) return;

		if(req.query.dbg && req.query.id) {
			const dbgData = { debug: true };
			for(const key in req.query){
				if(key.includes('__'))
					dbgData[key] = req.query[key];
			}
			const options = getOptionsForReviewQuery(req.query);
			renderReview(res, deck.name, req.query.id, options, dbgData);
			return;
		}

		let newRandomCloze = req.query.newRandomCloze || 3;
		newRandomCloze = parseInt(newRandomCloze);

		const expiredReview = deck.getExpiredReview();

		if(expiredReview == null){
			let recallReview = null;
			if(!isFlagSet(req.query, 'skipRecall')) recallReview = getRecallReview();
			if(deck.name == 'kanji' && recallReview) {
				// console.log(recallReview);
				renderReview(res, 'kanji', recallReview, { type: 2, promptType: 'audio', noImage: true, source: 'daily-recall' });
			} else if(getTodayNewRandomClozeCount() < newRandomCloze) {
				renderSentenceJsonEditor(req, res);
			} else {
				renderNoReviews(res, deck.name);
			}
		} else {
			const expiredReviewId = req.query.id || expiredReview.id;
			const options = getOptionsForReviewQuery(req.query);
			options.remainingReviews = expiredReview.count;
			renderReview(res, deck.name, expiredReviewId, options);
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
			let factType = req.query.factType || 3;
			factType = parseInt(factType);
			let dailyCount = req.query.dailyCount || DailyClozeCount;
			dailyCount = parseInt(dailyCount);
			const clozeReview = getExternalClozeReview(req, { factType: factType, count: 1, dailyCount: dailyCount, logType: 'binary-external-cloze' }) || {};
			return {
				id: clozeReview.targetId,
				options: { type: 6, clozeChoices: clozeReview.choices, binary: true, logType: 'binary-external-cloze' }
			};
		});
	});

	app.get('/full-recall-review', (req, res) => {
		handleRenderReviewRequest(req, res, () => {
			const review = getFullRecallReview();
			console.log(review);
			return {
				id: review,
				options: { type: 2, promptType: 'audio-cloze', source: 'full-recall', noImage: true, skipStreakUpdate: true, randomWord: true, requireChunks: true }
			};
		});
	});

	app.get('/tiered-full-recall-review', (req, res) => {
		handleRenderReviewRequest(req, res, () => {
			const options = {};
			if(req.query.count) options.count = parseInt(req.query.count);
			const review = getTieredFullRecallReview(options);
			if(req.query.maxWords) review.maxWords = parseInt(req.query.maxWords);
			console.log('tiered-full-recall review:', review);
			return {
				id: review ? review.id : null,
				options: { 
					type: 2, 
					promptType: 'audio-cloze', 
					source: 'tiered-full-recall', 
					tries: 1,
					noImage: true, 
					skipStreakUpdate: true, 
					randomWord: true, 
					maxRandomWords: review ? review.maxWords : null,
					remainingToday: review ? review.remainingToday : null
				}
			};
		});
	});

	app.get('/recall-review', (req, res) => {
		res.redirect('/review?deck=recall');
	});

	app.get('/respeak-review', (req, res) => {
		req.query.deck = req.query.deck || 'respeak';

		handleRenderReviewRequest(req, res, () => {
			const deck = getDeckFromRequest(req);
			const expiredReview = deck.getExpiredReview();
			const expiredReviewId = expiredReview.id;
			const respeakFact = expiredReviewId ? deck.find(expiredReviewId) : {};
			console.log('rs fact', respeakFact);

			return {
				id: respeakFact.id,
				options: { 
					type: 7,
					// skipStreakUpdate: true,
					phrase: respeakFact.phrase,
					source: 'respeak',
					showDuringPlay: true,
					scoringMethod: 'reading'
				}
			};
		});
	});

	app.get('/reading-speed-review', (req, res) => {
		const deck = getDeckFromRequest(req);
		if(!deck) return;

		handleRenderReviewRequest(req, res, () => {
			const deck = decks.getDeck("kanji");
			const facts = deck.getAllFacts();
			const factList = [];
			for(const id in facts){
				if(facts[id]['sentence-chunks']) factList.push(id);
			}
			const factId = util.randomFromArray(factList);
			console.log(factId);

			return {
				id: factId,
				options: { 
					type: 0,
					promptType: 'word-by-word', 
					noImage: true, 
					source: 'reading-speed',
					giveFeedback: true,
					requireChunks: true,
					skipStreakUpdate: true, 
					randomWord: true, 
					kanjiRandomWord: true,
					scoringMethod: 'cloze-word',
				},
				debug: {
					debug: true 
				}
			};
		});
	});


	app.get('/video-review', (req, res) => {
		const deck = getDeckFromRequest(req);
		if(!deck) return;

		handleRenderReviewRequest(req, res, () => {
			const expiredReview = deck.getExpiredReview();
			const factId = expiredReview.id;
			const facts = deck.getAllFacts();
			const reviewData = {
				id: factId,
				options: {
					renderRoute: 'review-base',
					backgroundRoute: 'partial/video-background',
					promptRoute: 'partial/video-prompt',
					responseRoute: 'partial/typed-response',
					type: 0,
					promptType: 'video',
					source: 'video',
				},
				debug: {
					debug: true 
				}
			};

			if(factId){
				reviewData.options.displayText = {'initial': getSimpleCloze(facts[factId].sentence, facts[factId].word)};
			}

			return reviewData;
		});
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

	app.post('/score-review', (req, res) => {
		handleBaseReviewPost(req, res);
	});

	app.post('/score-self-check-review', (req, res) => {
		handleSelfCheckReviewPost(req, res);
	});

	app.post('/delete-review', (req, res) => {
		const deck = getDeckFromRequest(req, res);
		console.log('delete', req.body, deck);
		if(deck){
			const id = req.body.id;
			if(id){
				console.log(deck);
				const state = deck.findState(id);
				reviewLogging.log({ type: 'delete-state', state: state });
				deck.deleteState(id);
			}
			res.send('done');	
		}
	});

	app.post('/set-disable-reset', (req, res) => {
		const deck = getDeckFromRequest(req, res);
		if(deck){
			const id = req.body.id;
			if(id){
				// const fact = deck.find(id);
				const state = deck.findState(id);
				const val = req.body.value == null ? !state["disable-reset"] : util.isTrueString(req.body.value);
				if(val){
					state["disable-reset"] = val;
				} else {
					delete state["disable-reset"];
				}
				deck.updateState(state);
				// reviewLogging.log({ type: 'delete-fact', fact: fact, state: state });
				// deck.delete(id);
			}
			res.send('done');	
		}
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
		let voice = null;
		let img = null;
		if (req.body.metadata) {
			voice = gameTools.tryStoreVoiceFile(req.body.metadata);
			img = gameTools.tryStoreImageFile(req.body.metadata);
			if(!voice){
				console.log('Audio file could not be found.');
			}
		}
		createAudioWordFact(
			{ sentence: req.body.text, word: req.body.word, reading: req.body.reading, audio: voice, image: img }, 
			{ condition: req.body.condition });
		res.json({ success: true });
	});

	app.post('/create-cloze-fact', (req, res) => {
		console.log("creating fact", req.body);
		let fact = { sentence: req.body.sentence.replace(/\n/g, ''), word: req.body.word, reading: req.body.reading, type: 3 };
		if(req.body.metadata){
			fact.audio = gameTools.tryStoreVoiceFile(req.body.metadata);
			fact.image = gameTools.tryStoreImageFile(req.body.metadata);
		}

		const deck = decks.getDeck('kanji');
		fact = deck.add(fact);
		deck.assignState(fact.id, { "experiments": { "listen-speak-cloze": 2 } });
		res.json({ success: true });
	});

	app.post('/create-respeak-fact', (req, res) => {
		console.log("creating respeak fact", req.body);
		let fact = null;
		if(req.body.id){
			fact = { 
				'linked-fact': `${req.body.deck}:${req.body.id}`,
				word: req.body.word,
				reading: req.body.reading,
			};
		} else {
			console.log("creating fact", req.body);
			const voice = gameTools.tryStoreVoiceFile(req.body.metadata);
			const img = gameTools.tryStoreImageFile(req.body.metadata);
			if(!voice){
				console.log('Audio file could not be found.');
				res.json({ success: false, error: 'Audio file could not be found. See server log.' });
				return;
			}

			fact = { 
				sentence: req.body.text.replace(/\n/g, ''), 
				word: req.body.word, 
				reading: req.body.reading, 
				audio: voice, 
				image: img 
			};
		}
		decks.createFact('respeak', decks.RESPEAK_TYPE, fact);
		res.json({ success: true });
	});

	app.post('/create-video-fact', (req, res) => {
		console.log("creating video fact", req.body);
		const deck = req.body.deck || 'video';
		const fact = decks.createFact(deck, decks.FILE_VIDEO_TYPE, { 
			sentence: req.body.text.replace(/\n/g, ''), 
			word: req.body.word, 
			reading: req.body.reading, 
			start: parseFloat(req.body.start),
			end: parseFloat(req.body.end),
			'video-id': req.body.videoId,
		});

		const deckData = decks.getDeck(deck);
		const day = 1000 * 60 * 60 * 24;
		deckData.addState(fact.id, 0);
		deckData.addState(fact.id, 2, day);
		deckData.addState(fact.id, 3, 2 * day);

		res.json({ success: true });
	});

	app.post('/update-respeak-fact', (req, res) => {
		console.log('updating fact: ' + req.body.id);
		const deck = decks.getDeck('respeak');
		const fact = deck.find(req.body.id);
		fact['word'] = req.body.word;
		fact['reading'] = req.body.word;
		deck.updateFact(fact);

		const state = deck.findState(req.body.id);
		state.streak--;
		state.due = new Date().getTime() + 1000 * 60;
		console.log('new due is ' + state.due);
		deck.updateState(state);
	});

	app.get('/test-media', (req, res) => {
		mediaserver.pipe(req, res, 'C:/Users/Gabriel Culbertson/Documents/GitHub/kotoba-najimi/public/audio/ed6sc/ch0010190368.ogg');
	});

	app.get('/test-img', (req, res) => {
		res.send(`<img src="/img?path=/img/ed8i/2dc15210-798b-11e9-8fbe-0239f62f5ea8.jpg"></img>`);
	});

	app.get('/img', (req, res) => {
		const path = req.query.path;
		if (path) {
			console.log(pathUtil.join('data', path));
			mediaserver.pipe(req, res, pathUtil.join('data', path));
		} else {
			console.log("no path for image: ");
			console.log(req.query);
		}
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

	app.get('/youtube-review', (req, res) => {
		res.render('youtube-review');
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
			// resetFact('kanji', req.body.id);
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

	app.get('/sentence-chunks', (req, res) => {
		if(req.query.id){
			const deck = decks.getDeck("kanji");
			const fact = deck.find(req.query.id);
			if(fact['sentence-chunks']){
				res.send(fact['sentence-chunks'].replace( /\s\s+/g, ' '));
				return;
			} else {
				req.query.text = fact.sentence;
			}
		}

		const tokens = jaTools.getTokensSync(req.query.text);
		const available = [];
		for(const t of tokens){
			if(!clean.containsPunctuation(t.s)){
				available.push(t.s);
			}
		}
		res.send(available.join(' ').replace( /\s\s+/g, ' '));
	});

	app.post('/sentence-chunks', (req, res) => {
		const deck = decks.getDeck("kanji");
		const fact = deck.find(req.body.id);
		fact['sentence-chunks'] = req.body.sentenceChunks;
		deck.updateFact(fact);
		res.send('done');
	});

	app.post('/log-note', (req, res) => {
		reviewLogging.log({ note: req.body.note });
		res.send('done');
	});

	app.get('/edit-distance', (req, res) => {
		if(req.query.id){
			const deck = decks.getDeck("kanji");
			const fact = deck.find(req.query.id);
			req.query.input = fact['sentence-chunks'];
			req.query.reference = fact.context || fact.sentence;
		}
		const testScoreInfo = reviewTools.scoreReview(req.query.reference, req.query.input);
		testScoreInfo.error = "Not a valid fact (id missing or not found) [id: " + req.query.id + "]. No data recorded.";
		res.json(testScoreInfo);
	});

	app.get('/fact-furigana', (req, res) => {
		// 946c487d-6665-466d-a941-1e16c9a67fd1
		const deck = getDeckFromRequest(req);
		const fact = deck.find(req.query.id);

		const template = fs.readFileSync('./views/furigana.ejs', 'utf-8');
		let sentence = fact.sentence || fact.context;
		sentence = clean.replaceBreaksWithNewlines(sentence);
		const furiganaHtml = ejs.render(template, { 
			elements: renderFurigana(
				sentence, 
				furigana(sentence, { onlyFurigana: true }),
				{
					tagString: fact.word,
					getTaggedPair: (p) => { return { r: p.r, s: `<b>${p.s}</b>` }; }
				})
		});

		res.send(furiganaHtml);
	});

	app.get('/sentence-json-editor', (req, res) => {
		renderSentenceJsonEditor(req, res);
	});

	app.post('/sentence-json', (req, res) => {
		if(!req.body.id){
			return;
		}

		const deck = decks.getDeck('kanji');
		const fact = deck.find(req.body.id);
		if (!fact) {
			return;
		}

		fact['sentence-json'] = req.body['sentence-json'];
		for (const jsonPart of fact['sentence-json']) {
			if (jsonPart.text.length == 1 && jsonPart.text[0] == '\n'){
				jsonPart.isContent = false;	
			} else {
				jsonPart.isContent = jsonPart.isContent == 'true';
			}
		}

		console.log(fact);
		deck.updateFact(fact);

		if (fact.audio) {
			const state = deck.findState({id: fact.id, condition: 4});
			if (!state) {
				deck.addState(fact.id, 4);
			}
			console.log('Added state.');
		} else {
			console.log('Not adding state because no audio.');
		}

		res.send('success');
	});

	app.get('/full-respeak', (req, res) => {
		res.render('full-respeak-demo');
	});

	app.get('/add-hidden-sentence-reading', (req, res) => {
		if (!req.query.fact || !req.query.fact.split('|').length == 2) {
			res.send('Unable to parse fact. Include fact param with the format &fact=sentence|reading');
			return;
		}

		const facts = decks.getDeck('kanji').getAllFacts();
		const addedSentences = {};
		for (const factId in facts) {
			addedSentences[facts[factId].sentence] = true;
		}

		const factParts = req.query.fact.split('|');
		res.render('add-hidden-sentence-reading', { fact: { sentence: factParts[0], reading: factParts[1], added: factParts[0] in addedSentences } });
	});

	app.get('/view-japanese-sentences', (req, res) => {
		const facts = decks.getDeck('kanji').getAllFacts();
		const addedSentences = {};
		for (const factId in facts) {
			addedSentences[facts[factId].sentence] = true;
		}

		const japaneseSentences = fs.readFileSync('scripts/japanese_memory_sentences/japanese_sentences_parsed_remaining.txt', 'utf8').split('\n');
		const sentenceData = [];
		for (const japaneseSentence of japaneseSentences) {
			const split = japaneseSentence.split('|');
			if (split.length < 2) continue;

			sentenceData.push({ added: addedSentences[split[0]], link: `/add-hidden-sentence-reading?fact=${japaneseSentence}`, sentence: split[0] });
		}

		res.render('view-japanese-sentences', { facts: sentenceData.slice(0, 1000) });
	});
};