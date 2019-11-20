const ReviewTable = require('./review-table-base');

const TYPE_TO_TEMPLATE = {};

const KANJI_TYPE = 1;
TYPE_TO_TEMPLATE[KANJI_TYPE] = {
	target: String,
	context: String,
	reading: String
};

const AUDIO_SENTENCE_TYPE = 2;
TYPE_TO_TEMPLATE[AUDIO_SENTENCE_TYPE] = {
	sentence: String,
	reading: String,
	audio: String
}

const AUDIO_WORD_TYPE = 3;
TYPE_TO_TEMPLATE[AUDIO_WORD_TYPE] = {
	sentence: String,
	word: String,
	reading: String,
	audio: String
};

const RESPEAK_TYPE = 4;
TYPE_TO_TEMPLATE[RESPEAK_TYPE] = {
	word: String,
	reading: String
};

const VIDEO_TYPE = 5;
TYPE_TO_TEMPLATE[VIDEO_TYPE] = {
	sentence: String,
	word: String, 
	reading: String, 
	start: Number,
	end: Number,
	'video-id': String
}

const FILE_VIDEO_TYPE = 8;
TYPE_TO_TEMPLATE[FILE_VIDEO_TYPE] = {
	sentence: String,
	word: String, 
	reading: String, 
	start: Number,
	end: Number,
	'video-id': String
}

const decks = {};
module.exports.getDeck = (user, deckName) => {
	if (!user || !deckName) {
		console.trace();
		throw "Invalid user, deck: " + user + "; " + deckName;
	}

	if (!decks[user]) {
		decks[user] = {};
	}

	if(!decks[user][deckName]){
		decks[user][deckName] = new ReviewTable(user, deckName, deckName + '-facts', deckName + '-review-states');
	}
	return decks[user][deckName];
};

module.exports.deleteDeck = (user, deckName) => {
	const deck = module.exports.getDeck(user, deckName);
	deck.deleteAll();
};

/**
 * @param  {string}
 * @param  {number}
 * @param  {Object}
 */
module.exports.createFact = (user, deckName, type, data) => {
	if(!TYPE_TO_TEMPLATE[type]) {
		throw type + " is not a valid type";
	}

	for(const key in TYPE_TO_TEMPLATE[type]){
		if(!(key in data)){
			throw key + " in not in provided data. Unable to create fact.";
		}
	}

	data.type = type;
	const deck = module.exports.getDeck(user, deckName);
	return deck.add(data);
};

module.exports.KANJI_TYPE = KANJI_TYPE;
module.exports.AUDIO_SENTENCE_TYPE = AUDIO_SENTENCE_TYPE;
module.exports.AUDIO_WORD_TYPE = AUDIO_WORD_TYPE;
module.exports.RESPEAK_TYPE = RESPEAK_TYPE;
module.exports.VIDEO_TYPE = VIDEO_TYPE;
module.exports.FILE_VIDEO_TYPE = FILE_VIDEO_TYPE;