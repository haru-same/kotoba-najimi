const fs = require('fs');
const mediaConfig = require('../media-config');

const audioDirectoryKey = 'audioDirectory';
const serverAudioDirectory = './public/audio/';

module.exports.EDSettings = class EDSettings {
	constructor(gameKey, defaultAudioDirectory, keyToFilename){
		this.gameKey = gameKey;
		this.defaultAudioDirectory = defaultAudioDirectory;
		this.keyToFilename = keyToFilename;
	}
};

module.exports.storeVoiceFile = (edSettings, key) => {
	const audioDir = mediaConfig.getValue(edSettings.gameKey, audioDirectoryKey, edSettings.defaultAudioDirectory);
	const filename = edSettings.keyToFilename(key);
	const destDir = `${serverAudioDirectory}${edSettings.gameKey}`;
	const sourceFilename = `${audioDir}/${filename}`;
	const destFilename = `${destDir}/${filename}`;
	if(fs.existsSync(sourceFilename)){
		if(!fs.existsSync(destDir)){
			fs.mkdirSync(destDir);
		}

		if(!fs.existsSync(destFilename)){
			console.log("copying");
			fs.createReadStream(sourceFilename).pipe(fs.createWriteStream(destFilename));
		} else {
			console.log("already copied");
		}
		return `${edSettings.gameKey}/${filename}`;
	} else {
		console.log("source file does not exist: ", sourceFilename);
		return null;
	}
};