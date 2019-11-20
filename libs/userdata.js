const fs = require('fs');
const config = require('./config');

const folderName = config.userdataPath + '/review';
const JsonExtension = '.json';

if(!fs.existsSync(folderName)){
	fs.mkdirSync(folderName);
}

const nameToFilename = (user, name) => {
	if (!user || !name) {
		console.trace();
		throw "invalid user, filename: " + user + "; " + name;
	}

	const userDir = folderName + '/' + user;
	if(!fs.existsSync(userDir)){
		fs.mkdirSync(userDir);
	}

	return userDir + '/' + name + JsonExtension;
}

module.exports.getDir = (user, name) => {
	if (!user || !name) {
		throw "invalid user, filename: " + user + "; " + name;
	}

	const userDir = config.userdataPath + '/' + name + '/' + user;
	if(!fs.existsSync(userDir)){
		fs.mkdirSync(userDir);
	}

	return userDir;
}

module.exports.getTable = (user, name) => {
	const filename = nameToFilename(user, name);
	const table = { name: name, data: {} };
	if(fs.existsSync(filename)){
		table.data = JSON.parse(fs.readFileSync(filename));
	} 
	return table;
};

module.exports.saveTable = (user, table) => {
	if(!table.name || !table.data){
		console.error("Table not valid. Unable to save.");
		return;
	}

	const filename = nameToFilename(user, table.name);
	fs.writeFileSync(filename, JSON.stringify(table.data, null, '\t'));
};

module.exports.deleteTable = (user, name) => {
	const filename = nameToFilename(user, name);
	if(fs.existsSync(filename)){
		fs.unlink(filename);
	}
}