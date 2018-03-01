const fs = require('fs');
const gameConfig = require('./game-config');

const gameKey = 'ed6sc';
const audioDirectoryKey = 'audioDirectory';
const defaultAudioDirectory = 'C:/Program Files (x86)/Steam/SteamApps/common/Trails in the Sky SC/voice/ogg';
const serverAudioDirectory = './public/audio/';

module.exports.storeVoiceFile = (key) => {
	const audioDir = gameConfig.getValue(gameKey, audioDirectoryKey, defaultAudioDirectory);
	const filename = 'ch' + key + '.ogg'
	const sourceFilename = defaultAudioDirectory + '/ch' + key + '.ogg';
	const destFilename = serverAudioDirectory + filename;
	if(fs.existsSync(sourceFilename)){
		if(!fs.existsSync(destFilename)){
			console.log("copying");
			fs.createReadStream(sourceFilename).pipe(fs.createWriteStream(destFilename));
		} else {
			console.log("already copied");
		}
	} else {
		console.log("source file does not exist");
	}
};