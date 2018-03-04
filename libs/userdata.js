const fs = require('fs');
const config = require('./config');

const folderName = config.userdataPath + '/review';
const JsonExtension = '.json';

if(!fs.existsSync(folderName)){
	fs.mkdirSync(folderName);
}

const nameToFilename = (name) => {
	return folderName + '/' + name + JsonExtension;
}

module.exports.getTable = (name) => {
	const filename = nameToFilename(name);
	const table = { name: name, data: {} };
	if(fs.existsSync(filename)){
		table.data = JSON.parse(fs.readFileSync(filename));
	} 
	return table;
};

module.exports.saveTable = (table) => {
	if(!table.name || !table.data){
		console.error("Table not valid. Unable to save.");
		return;
	}

	const filename = nameToFilename(table.name);
	fs.writeFileSync(filename, JSON.stringify(table.data, null, '\t'));
};