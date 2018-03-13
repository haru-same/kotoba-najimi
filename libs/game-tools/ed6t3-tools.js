const edTools = require('./ed-tools');

const gameKey = 'ed6t3';
const defaultAudioDirectory = 'C:/Program Files (x86)/Steam/SteamApps/common/Trails in the Sky the 3rd/voice/ogg';
const ed6scSettings = new edTools.EDSettings(gameKey, defaultAudioDirectory, (key) =>  `/ch${key}.ogg`);

module.exports.storeVoiceFile = (key) => {
	return edTools.storeVoiceFile(ed6scSettings, key)
};