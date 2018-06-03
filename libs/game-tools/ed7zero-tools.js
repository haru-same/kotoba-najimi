const edTools = require('./ed-tools');

const gameKey = 'ed7z';
const defaultAudioDirectory = 'E:/Downloads/The Legend of Heroes - Zero no Kiseki [PC - English Beta v0.4]/voice/ogg';
const ed7zeroSettings = new edTools.EDSettings(gameKey, defaultAudioDirectory, (key) =>  `/v${key}.ogg`);

module.exports.storeVoiceFile = (key) => {
	return edTools.storeVoiceFile(ed7zeroSettings, key)
};