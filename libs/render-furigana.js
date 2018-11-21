const clean = require('./clean');
const ed = require('edit-distance');

const ignore = "、…。！？～";
const _levInsert = (node) => { return 1; };
const _levRemove = (node) => { return 1; };
const _levUpdate = (stringA, stringB) => { return stringA !== stringB ? 1 : 0; };

const matchSegments = (surface, reading, options) => {

};

module.exports = (surface, reading, options) => {
	options = options || {};

	surface = clean.replaceBreaksWithNewlines(surface);
	reading = clean.replaceBreaksWithNewlines(reading);

	const lev = ed.levenshtein(surface, reading, _levInsert, _levRemove, _levUpdate);
	const pairs = lev.pairs().reverse();

	let output = [];
	let wasEqual = pairs[0][0] != pairs[0][1];
	for(const pair of pairs){
		if((pair[0] == pair[1]) != wasEqual) output.push({s:"",r:""});
		wasEqual = pair[0] == pair[1];

		if(pair[0]) output[output.length - 1].s += pair[0];
		if(pair[1] && pair[0] != pair[1]) output[output.length - 1].r += pair[1];
	}

	if(options.tagString && options.getTaggedPair){
		const startIndex = surface.indexOf(options.tagString);
		if(startIndex == -1){
			console.log('Failed to find ', options.tagString, ' in ', surface);
			return output;
		}

		let currentIndex = 0;
		const endIndex = startIndex + options.tagString.length;
		console.log('start', startIndex, 'endIndex', endIndex);
		const taggedOutput = [];
		for(const pair of output){
			if(currentIndex >= startIndex && currentIndex < endIndex){
				if(currentIndex + pair.s.length > endIndex){
					taggedOutput.push(options.getTaggedPair({ s: pair.s.substring(0, endIndex - currentIndex) }));
					taggedOutput.push({ s: pair.s.substring(endIndex - currentIndex, pair.s.length) });
				} else {
					taggedOutput.push(options.getTaggedPair(pair));
				}
			} else if(currentIndex + pair.s.length > startIndex){
				taggedOutput.push({ s: pair.s.substring(0, startIndex - currentIndex) });
				taggedOutput.push(options.getTaggedPair({ s: pair.s.substring(startIndex - currentIndex, endIndex - currentIndex) }));
				if(currentIndex + pair.s.length > endIndex){
					taggedOutput.push({ s: pair.s.substring(endIndex - currentIndex, pair.s.length) });
				}
			} else {
				taggedOutput.push(pair);
			}
			currentIndex += pair.s.length;
		}

		const finalTaggedOutput = [];
		for (const pair of taggedOutput){
			if (!pair.s){
				continue;
			}

			let r = pair.r || '';
			if(pair.s.includes('\n')){
				const split = pair.s.split('\n');
				finalTaggedOutput.push({ s: split[0] });
				finalTaggedOutput.push({ s: '\n' });
				finalTaggedOutput.push({ s: split[1] });
				// console.log('pair', finalTaggedOutput[finalTaggedOutput.length - 1]);
				// finalTaggedOutput.push({ s: pair.s.replace('\n', ''), r: r.replace('\n', '') });
				// console.log('pair', finalTaggedOutput[finalTaggedOutput.length - 1]);
			} else if(pair.s != '') {
				finalTaggedOutput.push(pair);
				console.log('pair', finalTaggedOutput[finalTaggedOutput.length - 1]);
			}
		}

		output = finalTaggedOutput;
	}

	return output;
}