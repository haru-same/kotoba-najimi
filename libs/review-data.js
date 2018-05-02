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

const decks = {};
module.exports.getDeck = (deckName) => {
	if(!decks[deckName]){
		decks[deckName] = new ReviewTable(deckName, deckName + '-facts', deckName + '-review-states');
	}
	return decks[deckName];
};

module.exports.deleteDeck = (deckName) => {
	const deck = module.exports.getDeck(deckName);
	deck.deleteAll();
};

/**
 * @param  {string}
 * @param  {number}
 * @param  {Object}
 */
module.exports.createFact = (deckName, type, data) => {
	if(!TYPE_TO_TEMPLATE[type]) {
		throw type + " is not a valid type";
	}

	for(const key in TYPE_TO_TEMPLATE[type]){
		if(!(key in data)){
			throw key + " in not in provided data. Unable to create fact.";
		}
	}

	data.type = type;
	const deck = module.exports.getDeck(deckName);
	deck.add(data);
};

module.exports.KANJI_TYPE = KANJI_TYPE;
module.exports.AUDIO_SENTENCE_TYPE = AUDIO_SENTENCE_TYPE;
module.exports.AUDIO_WORD_TYPE = AUDIO_WORD_TYPE;