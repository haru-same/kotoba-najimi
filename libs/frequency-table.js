const cleanThreshold = 1000000;

const punctuation = '、。…！？『』・#《》～　（）♪1234567890“”';
const punctuationRegexes = [];
for(let i = 0; i < punctuation.length; i++){
	punctuationRegexes.push(new RegExp(punctuation[i], 'g'));
}

const includesPunctuation = (text) => {
	for(const c of text){
		if(punctuation.includes(c)) return true;
	}
	return false;
}

const cleanPunctuation = (text) => {
	for(pRegex of punctuationRegexes){
		text = text.replace(pRegex, ' ');
	}
	text = text.replace(/\s\s+/g, ' ');
	return text.trim();
}

const cleanFrequencies = (frequencies) => {
	const keys = Object.keys(frequencies);
	for(const key of keys){
		if(frequencies[key] <= 1) {
			delete frequencies[key];
		}
	}
}

module.exports.getFrequencies = (lines, readDuplicates, skipCleanFrequencies) => {
	let frequencies = {};
	let count = 0;
	let added = {};
	for(const line of lines){
		if(!readDuplicates && line in added) continue;
		added[line] = true;

		const cleanedLine = cleanPunctuation(line);
		const lineParts = cleanedLine.split(' ');

		for(const part of lineParts){
			for(let i = 0; i < part.length; i++){
				for(let j = i+1; j < part.length+1; j++){
					if(j - i > 10) break;

					const substring = part.substring(i, j);

					if(!frequencies[substring]){
						frequencies[substring] = 0;
					}
					frequencies[substring]++;
				}
			}
		}

		count++;
		if(count % 1000 == 0) {
			const keyCount = Object.keys(frequencies).length;
			console.log('lines:', count, '; keys:', Object.keys(frequencies).length);
			if(keyCount > cleanThreshold){
				cleanFrequencies(frequencies);
				const postCleanKeyCount = Object.keys(frequencies).length;
				console.log('post clean:', postCleanKeyCount);
				cleanThreshold = 1000000 + postCleanKeyCount;
			}
		}
	}

	if(!skipCleanFrequencies) cleanFrequencies(frequencies);

	return frequencies;
}