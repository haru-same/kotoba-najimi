const edTools = require('./ed-tools');

const gameKey = 'ed8i';
const defaultAudioDirectory = 'C:/Program Files (x86)/Steam/SteamApps/common/Trails of Cold Steel/data/voice/wav_jp';
const ed8iSettings = new edTools.EDSettings(gameKey, defaultAudioDirectory, (key) =>  `/e8v${key}.wav`);

module.exports.storeVoiceFile = (key) => {
	return edTools.storeVoiceFile(ed8iSettings, key)
};