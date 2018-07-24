const fs = require('fs');

const clozeSources = [
	'data/alllines-fc.txt',
	'data/alllines-sc.txt'
];

let frequencies = {};
let added = {};

const init = () => {
	for(const source of clozeSources){
		const lines = fs.readFileSync(source, 'utf8').split('\n');

		let count = 0;
		for(const line of lines){
			if(line in added) continue;
			added[line] = true;

			for(let i = 0; i < line.length; i++){
				for(let j = i+1; j < line.length+1; j++){
					if(j - i > 10) break;

					const substring = line.substring(i, j);
					if(!frequencies[substring]){
						frequencies[substring] = 0;
					}
					frequencies[substring]++;
				}
			}

			count++;
			if(count % 1000 == 0) console.log('lines:', count);
			// if(count > 100) break;
		}
	}
}


init();

const punctuation = '、。…！？『』・#《》～　（）♪';
const includesPunctuation = (text) => {
	for(const c of text){
		if(punctuation.includes(c)) return true;
	}
	return false;
}

const frequencyShort = {};
const frequencyList = [];
for(let key in frequencies){
	if(frequencies[key] > 2 && !includesPunctuation(key)){
		frequencyList.push(`${key}\t${frequencies[key]}`);
		frequencyShort[key] = frequencies[key];
	}
}
fs.writeFileSync('cache/frequencies.json', JSON.stringify(frequencyShort)); //frequencyList.join('\n'));