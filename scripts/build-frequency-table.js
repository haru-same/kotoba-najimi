const fs = require('fs');

const clozeSources = [
	'data/alllines-ed6-fc.txt',
	'data/alllines-ed6-sc.txt',
	'data/alllines-ed6-3rd.txt',
	'data/alllines-ed7-z.txt',
];

let frequencies = {};
let added = {};
let cleanThreshold = 1000000;

const punctuation = '、。…！？『』・#《》～　（）♪';
const includesPunctuation = (text) => {
	for(const c of text){
		if(punctuation.includes(c)) return true;
	}
	return false;
}

const cleanFrequencies = () => {
	const keys = Object.keys(frequencies);
	for(const key of keys){
		if(frequencies[key] <= 1) {
			delete frequencies[key];
		}
	}
}

const init = () => {
	for(const source of clozeSources){
		console.log('source:', source);

		const lines = fs.readFileSync(source, 'utf8').split('\n');

		let count = 0;
		for(const line of lines){
			if(line in added) continue;
			added[line] = true;

			for(let i = 0; i < line.length; i++){
				for(let j = i+1; j < line.length+1; j++){
					if(j - i > 10) break;

					const substring = line.substring(i, j);
					if(includesPunctuation(substring)) continue;

					if(!frequencies[substring]){
						frequencies[substring] = 0;
					}
					frequencies[substring]++;
				}
			}

			count++;
			if(count % 1000 == 0) {
				const keyCount = Object.keys(frequencies).length;
				console.log('lines:', count, '; keys:', Object.keys(frequencies).length);
				if(keyCount > cleanThreshold){
					cleanFrequencies();
					const postCleanKeyCount = Object.keys(frequencies).length;
					console.log('post clean:', postCleanKeyCount);
					cleanThreshold = 1000000 + postCleanKeyCount;
				}
			}
			// if(count > 100) break;
		}
	}
}


init();

const frequencyShort = {};
const frequencyList = [];
for(let key in frequencies){
	if(frequencies[key] > 2 && !includesPunctuation(key)){
		frequencyList.push(`${key}\t${frequencies[key]}`);
		frequencyShort[key] = frequencies[key];
	}
}
fs.writeFileSync('cache/frequencies.json', JSON.stringify(frequencyShort)); //frequencyList.join('\n'));