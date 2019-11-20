const fs = require('fs');
const winston = require('winston');
const config = require('./config');
const userdata = require('./userdata');

const loggers = {};

module.exports.getLogger = (user) => {
	if (!user) {
		console.trace();
		throw "invalid user: " + user;
	}

	if (!loggers[user]) {
		const logPath = userdata.getDir(user, 'review') + '/reviews.log';
		const logger = winston.createLogger({
			level: 'info',
			format: winston.format.json(),
			transports: [
				new winston.transports.File({ filename: logPath })
			]
		});
		loggers[user] = logger;
	}

	return loggers[user];
};

module.exports.getLog = (user) => {
	const logPath = userdata.getDir(user, 'review') + '/reviews.log';
	
	const reviewHistory = [];
	const logStrings = fs.readFileSync(logPath, 'utf8').split('\n');
	for(const logString of logStrings){
		if(logString != "")
			try {
				reviewHistory.push(JSON.parse(logString));
			} catch(e){
				console.log('Unable to parse: ', logString);
			}
	}
	return reviewHistory;
};

module.exports.log = (user, message) => {
	for(const key in message){
		if(typeof message[key] == 'string'){
			message[key] = message[key].replace(/(?:\r\n|\r|\n)/g, '');
		}
	}
	message.time = new Date().getTime();
	const logger = module.exports.getLogger(user);
	logger.log({ level: 'info', message: message });
};