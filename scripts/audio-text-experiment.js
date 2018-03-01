const fs = require('fs');
const logging = require('../libs/review-logging');

let reviewEntries = logging.getLog();

const data = {
	text: {},
	speech: {}
};

for(const entry of reviewEntries){
	if('streak' in entry.message){
		const streak = parseInt(entry.message.streak);
		if(entry.message.input){
			data.text[streak] = data.text[streak] || { correct: 0, total: 0 };
			data.text[streak].total++;
			if(entry.message.result == 1){
				data.text[streak].correct++;
			}
		} else {
			data.speech[streak] = data.speech[streak] || { correct: 0, total: 0 };
			data.speech[streak].total++;
			if(entry.message.result == 1){
				data.speech[streak].correct++;
			}
		}
	}
}

const strings = [];
for(const streak in data.text){
	strings.push("S" + streak + '\t' + (data.text[streak].correct / data.text[streak].total));
	console.log("S" + streak + '\t' + (data.text[streak].correct / data.text[streak].total));
}

for(const streak in data.speech){
	strings.push("S" + streak + '\t' + (data.speech[streak].correct / data.speech[streak].total));
	console.log("S" + streak + '\t' + (data.speech[streak].correct / data.speech[streak].total));
}

fs.writeFileSync('tmp.txt', strings.join('\n'));

console.log(data);