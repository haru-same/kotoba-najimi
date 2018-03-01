const fs = require('fs');
const config = require('../config');

const folderName = config.userdataPath + '/config';

const getConfigFilename = (name) => {
	return folderName + '/' + name + '-config.json';
}

module.exports.getConfig = (name) => {
	const filename = getConfigFilename(name);
	if(fs.existsSync(filename)){
		return JSON.parse(fs.readFileSync(filename, 'utf8'));
	}
	return {};
};

module.exports.writeConfig = (gameName, config) => {
	if(!fs.existsSync(folderName)){
		fs.mkdirSync(folderName);
	}
	fs.writeFileSync(getConfigFilename(gameName), JSON.stringify(config, null, '\t'));
}

module.exports.getValue = (gameName, key, defaultValue) => {
	const config = module.exports.getConfig(gameName);

	if(config[key] != null){
		return config[key];
	} else if(defaultValue != null){
		config[key] = defaultValue;
		module.exports.writeConfig(gameName, config);
	}
	return defaultValue;
};