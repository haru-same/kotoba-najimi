const fs = require('fs');

const imgsDir = 'public/img';

if(!fs.existsSync(imgsDir)) fs.mkdirSync(imgsDir);

const toolSets = {
	'ed6sc': require('./ed6sc-tools'),
	'ed6t3': require('./ed6t3-tools'),
	'ed7zero': require('./ed7zero-tools'),
	'woff': require('./woff-tools')
}

module.exports.tryStoreVoiceFile = (metadata) => {
	if(!toolSets[metadata.game]){
		return null;
	}
	const tools = toolSets[metadata.game];
	if(!tools.storeVoiceFile){
		return null;
	}
	return tools.storeVoiceFile(metadata.voice);
}

module.exports.tryStoreImageFile = (metadata) => {
	if(!metadata.img) return null;
	if(!metadata.game) return null;

	const sourceFilename =  `screenshotimgs/${metadata.img}.png`;

	if(!fs.existsSync(sourceFilename)) return null;
	if(!fs.existsSync(`${imgsDir}/${metadata.game}`)) fs.mkdirSync(`${imgsDir}/${metadata.game}`);

	const destFilename = `${imgsDir}/${metadata.game}/${metadata.img}.png`;

	fs.createReadStream(sourceFilename).pipe(fs.createWriteStream(destFilename));
	return destFilename.replace('public', '');
}