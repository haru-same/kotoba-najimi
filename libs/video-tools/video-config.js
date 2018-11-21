const fs = require('fs');
const mediaConfig = require('../media-config');
const uuidv4 = require('uuid/v4');

const name = 'video';

const configDataMatchesMediaData = (configData, mediaData) => {
	// for(const key in mediaData){
	// 	if(configData[key] != mediaData[key]) return false;
	// }
	// return true;
	return configData.path == mediaData.path;
}

module.exports.getConfig = () => {
	return mediaConfig.getConfig(name);
}

module.exports.tryGetVideoIdForMedia = (mediaData) => {
	const config = mediaConfig.getConfig(name);
	for(const mediaId in config){
		if(configDataMatchesMediaData(config[mediaId], mediaData)){
			return mediaId;
		}
	}
	return null;
}

module.exports.getVideoDataForId = (videoId, defaultMediaData) => {
	return mediaConfig.getValue(name, videoId, defaultMediaData);
}

module.exports.getOrCreateVideoIdForMedia = (mediaData) => {
	let id = module.exports.tryGetVideoIdForMedia(mediaData);
	if (!id) {
		id = uuidv4();
		module.exports.getVideoDataForId(uuidv4(), mediaData)
	}
	return id;
}

module.exports.setOffset = (videoId, start, offset) => {
	const videoData = module.exports.getVideoDataForId(videoId);
	videoData.captions = videoData.captions || {};
	videoData.captions.offsets = videoData.captions.offsets || [];

	let found = false;
	for (const offsetInfo of videoData.captions.offsets){
		if (offsetInfo.start == start) {
			offsetInfo.offset = offset;
			found = true;
		}
	}

	if (!found) {
		videoData.captions.offsets.push({ start: start, offset: offset });
		videoData.captions.offsets = videoData.captions.offsets.sort((a, b) => { a.start - b.start;});
	}
	configData = module.exports.getConfig(name);
	configData[videoId] = videoData;
	console.log('saving: ', configData);
	mediaConfig.writeConfig(name, configData);
}