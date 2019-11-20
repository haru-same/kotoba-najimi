const edTools = require('./ed-tools');

const gameKey = 'ed6fc';
const defaultAudioDirectory = 'G:/FALCOM/Trails in the Sky FC/voice/ogg';
const ed6fcSettings = new edTools.EDSettings(gameKey, defaultAudioDirectory, (key) =>  `/ch${key}.ogg`);

module.exports.storeVoiceFile = (key) => {
	return edTools.storeVoiceFile(ed6fcSettings, key)
};