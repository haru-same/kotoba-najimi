const fs = require('fs');
const winston = require('winston');
const config = require('./config');

const folderName = config.userdataPath + '/review';
if(!fs.existsSync(folderName)) fs.mkdirSync(folderName);

const logPath = folderName + '/reviews.log';

const logger = winston.createLogger({
	level: 'info',
	format: winston.format.json(),
	transports: [
		new winston.transports.File({ filename: logPath })
	]
});

module.exports.getLogger = () => {
	return logger;
};

module.exports.getLog = () => {
	const reviewHistory = [];
	const logStrings = fs.readFileSync(logPath, 'utf8').split('\n');
	for(const logString of logStrings){
		if(logString != "")
			reviewHistory.push(JSON.parse(logString));
	}
	return reviewHistory;
};

module.exports.log = (message) => {
	for(const key in message){
		if(typeof message[key] == 'string'){
			message[key] = message[key].replace(/(?:\r\n|\r|\n)/g, '');
		}
	}
	message.time = new Date().getTime();
	logger.log({ level: 'info', message: message });
};