const fs = require('fs');
const parseSRT = require('parse-srt');
const decks = require('../libs/review-data');
const frequencyTable = require('../libs/frequency-table');

const cleanBrackets = (text) => {
	text = text.replace(/\<.*?\>/g, ' ');
	text = text.replace(/（.*?）/g, ' ');
	text = text.replace(/\(.*?\)/g, ' ');
	text = text.replace(/\s\s+/g, ' ');
	return text.trim();
};

const merge = (freq1, freq2) => {
	for(const key in freq2){
		if(key in freq1){
			freq1[key] += freq2[key];
		} else {
			freq1[key] = freq2[key];
		}
	}
	return freq1;
};

const edFrequencies = JSON.parse(fs.readFileSync('cache/frequencies.json'));
const thFrequencies = frequencyTable.getFrequencies(JSON.parse(fs.readFileSync('th-all-captions.json')).map(c => cleanBrackets(c)));

const merged = merge(edFrequencies, thFrequencies);

fs.writeFileSync('tmp/working-frequency-table.json', JSON.stringify(merged, null, '\t'));