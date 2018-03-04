const toolSets = {
	'ed6sc': require('./ed6sc-tools'),
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