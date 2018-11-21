const fs = require('fs');
const medaiConfig = require('../media-config');
const { spawn } = require('child_process');

const audioDirectoryKey = 'audioDirectory';
const serverAudioDirectory = './public/audio/';

const gameKey = 'woff';
const defaultAudioDirectory = 'H:/game hack/vgmtoolbox_bin_r1040/_vgmt_acb_ext_vo/awb/';
const keyToFilename = (key) => `${key}.hca`;

let _testPfx = "";
module.exports._setTestPrefex = (str) => { _testPfx = str; };

module.exports.storeVoiceFile = (key) => {
	const audioDir = medaiConfig.getValue(gameKey, audioDirectoryKey, defaultAudioDirectory);
	const filename = keyToFilename(key);

	const destDir = `${serverAudioDirectory}${gameKey}`;
	const sourceFilename = `${audioDir}/${filename}`;
	console.log('test pfix is ' + _testPfx);
	const destFilename = `${destDir}/${_testPfx + filename}`;
	if(fs.existsSync(sourceFilename)){
		if(!fs.existsSync(destDir)){
			fs.mkdirSync(destDir);
		}

		const wavFile = destFilename.replace(/\.[^/.]+$/, '.wav');
		const oggFile = destFilename.replace(/\.[^/.]+$/, '.ogg');
		const oggPath = `${gameKey}/${filename.replace(/\.[^/.]+$/, '.ogg')}`;

		if(!fs.existsSync(oggFile)){
			console.log("copying");
			const stream = fs.createReadStream(sourceFilename).pipe(fs.createWriteStream(destFilename));
			stream.on('finish', () => {
				const hcaConverter = spawn('./ext/hca.exe', [destFilename]);
				hcaConverter.on('close', (code) => {
					console.log(`converted to wav, code: ${code}`);
					const ffmpeg = spawn('ffmpeg', [ '-i', wavFile, oggFile ]);
					ffmpeg.on('close', (code) => {
						console.log(`ffmpeg converted to ogg, code: ${code}`);
						if(code == 0){
							fs.unlink(destFilename, () => console.log('removed: ' + destFilename));
							fs.unlink(wavFile, () => console.log('removed: ' + wavFile));
						}
					});
				});
			});
		} else {
			console.log("already copied");
		}
		return oggPath;
	} else {
		console.log("source file does not exist");
		return null;
	}
};

const glob = require('glob');
module.exports.test = (key, path) => {
	let audioDir = medaiConfig.getValue(gameKey, audioDirectoryKey, defaultAudioDirectory);
	if(path) audioDir = path;
	const filename = keyToFilename(key);

	const destDir = `${serverAudioDirectory}${gameKey}`;
	const sourceFilename = `${audioDir}/${filename}`;
	const destFilename = `${destDir}/${filename}`;

	glob(audioDir + '/*' + key + '*', (err, files) => {
		console.log(files);
	});
}