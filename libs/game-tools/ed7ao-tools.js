const edTools = require('./ed-tools');

const gameKey = 'ed7a';
const defaultAudioDirectory = 'G:/FALCOM/ao/ogg';
const ed7aoSettings = new edTools.EDSettings(gameKey, defaultAudioDirectory, (key) =>  `/v${key}.ogg`);

module.exports.storeVoiceFile = (key) => {
	return edTools.storeVoiceFile(ed7aoSettings, key)
};