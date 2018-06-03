const fs = require('fs');

const imgsDir = 'public/img';

if(!fs.existsSync(imgsDir)) fs.mkdirSync(imgsDir);

const toolSets = {
	'ed6sc': require('./ed6sc-tools'),
	'ed6t3': require('./ed6t3-tools'),
	'ed7z': require('./ed7zero-tools'),
	'woff': require('./woff-tools')
}

module.exports.tryStoreVoiceFile = (metadata) => {
	if(!metadata.game) {
		console.log('no game in metadata');
		return null;
	}
	
	if(!toolSets[metadata.game]){
		console.log('no toolset for ', metadata.game);
		return null;
	}
	const tools = toolSets[metadata.game];
	if(!tools.storeVoiceFile){
		console.log('toolset does not have store voice method ', metadata.game);
		return null;
	}
	return tools.storeVoiceFile(metadata.voice);
}

module.exports.tryStoreImageFile = (metadata) => {
	if(!metadata.img) return null;
	if(!metadata.game) return null;

	const sourceFilename =  `screenshotimgs/${metadata.img}.png`;

	if(!fs.existsSync(sourceFilename)) {
		console.log('f', sourceFilename);
		console.log(sourceFilename, 'does not exist');
		return null;
	}

	if(!fs.existsSync(`${imgsDir}/${metadata.game}`)) fs.mkdirSync(`${imgsDir}/${metadata.game}`);

	const destFilename = `${imgsDir}/${metadata.game}/${metadata.img}.png`;

	fs.createReadStream(sourceFilename).pipe(fs.createWriteStream(destFilename));

	return destFilename.replace('public', '');
}