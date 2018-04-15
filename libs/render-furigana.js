const ed = require('edit-distance');

const ignore = "、…。！？～";
const _levInsert = (node) => { return 1; };
const _levRemove = (node) => { return 1; };
const _levUpdate = (stringA, stringB) => { return stringA !== stringB ? 1 : 0; };

module.exports = (surface, reading) => {
	const lev = ed.levenshtein(surface, reading, _levInsert, _levRemove, _levUpdate);
	const pairs = lev.pairs().reverse();

	const output = [];
	let wasEqual = pairs[0][0] != pairs[0][1];
	for(const pair of pairs){
		if((pair[0] == pair[1]) != wasEqual) output.push({s:"",r:""});
		wasEqual = pair[0] == pair[1];

		if(pair[0]) output[output.length - 1].s += pair[0];
		if(pair[1] && pair[0] != pair[1]) output[output.length - 1].r += pair[1];
	}
	return output;
}