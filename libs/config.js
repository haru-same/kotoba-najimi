const fs = require('fs');

const config = {
	"openChrome": true,
	"chromePath": "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
	"userdataPath": "userdata"
};

if(fs.existsSync('./config.json')){
	const tempConfig = JSON.parse(fs.readFileSync("./config.json"));
	for(var key in tempConfig){
		config[key] = tempConfig[key];
	}
	fs.writeFileSync('./config.json', JSON.stringify(config, null, '\t'));
}

module.exports = config;