const fs = require('fs');
const path = require('path');
const parseSRT = require('parse-srt');
const uuidv4 = require('uuid/v4');
const mediaConfig = require('../media-config');

const videoConfigKey = 'videos';

const getVideoId = (filename) => {
	const basePath = path.basename(filename);
	const videosConfig = mediaConfig.getConfig(videoConfigKey);

	videosConfig.videos = videosConfig.videos || {};
	for(const videoId in videosConfig.videos) {
		if(!videosConfig.videos[videoId].filenames) continue;

		for(const videoFilename of videosConfig.videos[videoId].filenames) {
			if (videoFilename == basePath) {
				return videoId;
			}
		}
	}

	const newVideoId = uuidv4();
	videosConfig.videos[newVideoId] = {filenames: [basePath], filepaths: [filename]};
	console.log(videosConfig);
	videosConfig.save();
	return newVideoId;
}

const getCaptionsForFile = (filename, initialCaptionsFile) => {
	const videoId = getVideoId(filename);
	const videosConfig = mediaConfig.getConfig(videoConfigKey);

	if (videosConfig.videos[videoId].captionFile && fs.existsSync(videosConfig.videos[videoId].captionFile)) {
		return JSON.parse(fs.readFileSync(videosConfig.videos[videoId].captionFile, 'utf8'));
	}

	let captionData = [];
	if (initialCaptionsFile) {
		captionData = parseSRT(fs.readFileSync(initialCaptionsFile, 'utf8'));
	}
	const captionFile = videosConfig.videos[videoId].captionFile || 'video_data/' + uuidv4() + '.json';
	fs.writeFileSync(captionFile, JSON.stringify(captionData, null, '\t'));

	videosConfig.videos[videoId].captionFile = captionFile;
	videosConfig.save();

	return captionData;
};

const updateCaptionsFile = (filename, captionData) => {
	getCaptionsForFile(filename);
	const videoId = getVideoId(filename);
	const videosConfig = mediaConfig.getConfig(videoConfigKey);
	
	const captionFile = videosConfig.videos[videoId].captionFile;
	console.log(captionFile);

	fs.writeFileSync(captionFile, JSON.stringify(captionData, null, '\t'));
};

const tryGetVideoFile = (videoId) => {
	const videosConfig = mediaConfig.getConfig(videoConfigKey);
	if(!videosConfig.videos[videoId]) return null;
	if(!videosConfig.videos[videoId].filepaths) return null;

	return videosConfig.videos[videoId].filepaths[0];
};

module.exports.getVideoId = getVideoId;
module.exports.getCaptionsForFile = getCaptionsForFile;
module.exports.updateCaptionsFile = updateCaptionsFile;
module.exports.tryGetVideoFile = tryGetVideoFile;