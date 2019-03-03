var kuromoji = require('kuromoji');
var hepburn = require("hepburn");
var EventEmitter = require('events').EventEmitter;
const reviewTools = require("./review-tools");
var emitter = new EventEmitter();

var wanakana = require('./wanakana.js');
var clean = require('./clean');

var tokenizer = null;

function getKatakana (text){
	let outText = "";
	for(let i = 0; i < text.length; i++){
		outText += wanakana.toKatakana(text[i]);
	}
	return outText;
}

function getHiragana (text){
	let outText = "";
	for(let i = 0; i < text.length; i++){
		outText += wanakana.toHiragana(text[i]);
	}
	return outText;
}

kuromoji.builder({ dicPath: "node_modules/kuromoji/dist/dict" }).build(function (err, tok) {
    // tokenizer is ready
    //var path = tokenizer.tokenize("彼は新しい仕事できっと成功するだろう。");//"すもももももももものうち");
    //console.log(path);
    console.log('ja tokenizer ready');
    tokenizer = tok;
    emitter.emit('ja-tokenizer-initialized');

 //    console.log(getHiragana('ウーン'));
	// console.log(module.exports.getTokensSync('うーん'));
});

function returnAfterInitialized(callback){
	if(tokenizer){
		callback();
	} else {
		emitter.on('ja-tokenizer-initialized', callback);
	}
}

module.exports.getPronunciation = function(text, callback){
	returnAfterInitialized(function (){
		var tokens = tokenizer.tokenize(text);
		//console.log(tokens);
		var outStr = "";
		for (var i in tokens) {
			outStr += tokens[i].reading + " ";
		}
		outStr = outStr.replace("*", "");
		callback(hepburn.fromKana(outStr));
	});
}

function getPronunciationSync (text, options){
	var convertToCharacters = function(s){
		return wanakana.toRomaji(s).replace(/undefined/g, ""); 
	}
	if(options && options.kana){
		convertToCharacters = function(s){
			return wanakana.toHiragana(wanakana.toRomaji(s).replace(/undefined/g, ""));
		}
	} else if(options && options.katakana){
		convertToCharacters = function(s){
			return s;
		}
	}


	var tokens = tokenizer.tokenize(text);
	// console.log(tokens);
	var outStr = [];
	for (var i in tokens) {
		if(tokens[i].reading){
			outStr.push(tokens[i].reading);
		} else {
			outStr.push(tokens[i].surface_form);
		}
	}
	return convertToCharacters(outStr.join(''));
}

module.exports.afterInit = returnAfterInitialized;

module.exports.getPronunciationSync = getPronunciationSync;

module.exports.getTokens = function(text, callback){
	returnAfterInitialized(function(){
		var tokens = tokenizer.tokenize(text);
		var arr = [];
		for(var i in tokens){
			arr.push(tokens[i].surface_form);
		}
		callback(arr);
	});
}

module.exports.getTokensSync = function(text){
	const tokens = tokenizer.tokenize(text);
	// console.log(tokens);
	const arr = [];
	for(var i in tokens){
		// if(tokens[i].pos_detail_1 == '接尾' || tokens[i].pos == '助動詞'){
		// 	const lastToken = arr[arr.length - 1];
		// 	lastToken.s += tokens[i].surface_form;
		// 	if(lastToken.r) lastToken.r += getHiragana(tokens[i].reading);
		// } else {
			const token = { s: tokens[i].surface_form };
			if(tokens[i].reading && getKatakana(tokens[i].surface_form) != tokens[i].reading){
				token.r = getHiragana(tokens[i].reading);
			}
			arr.push(token);
		// }
	}
	return arr;
}

module.exports.getMinForm = function(text){
	return getPronunciationSync(text);
}

module.exports.getAlignedWords = (ref, hyp) => {
	ref = clean.cleanPunctuation(ref);
	hyp = clean.cleanPunctuation(hyp);
	console.log('ref:', ref);
	console.log('hyp:', hyp);
	const score = reviewTools.scoreReview(ref, hyp);
	console.log(score);

	const wordPairs = [['','']];
	for(const pair of score.pairs){
		console.log(pair);

		if(pair[1] == null || pair[1] == ' '){
			if(wordPairs[wordPairs.length - 1][0].length > 0){
				wordPairs.push(['','']);
				console.log('new pair');
			}
		} else {
			wordPairs[wordPairs.length - 1][0] += pair[1];
		}

		if(pair[0] != null && pair[0] != ' '){
			wordPairs[wordPairs.length - 1][1] += pair[0];
		}
	}

	if(wordPairs[wordPairs.length - 1][0] == ''){
		wordPairs.pop();
	}

	return wordPairs;
}

module.exports.splitKanjiWithReadingString = (ref, hyp) =>{
	const wordPairs = module.exports.getAlignedWords(ref, hyp);
	console.log(wordPairs);
	const words = [];
	for(const pair of wordPairs){
		words.push(pair[1]);
	}
	return words;
};

module.exports.getDefaultIsContent = (text) => {
	if (clean.containsPunctuation(text)) {
		return false;
	}
	return true;
};

module.exports.getDefaultSentenceJson = (text) => {
	const tokens = module.exports.getTokensSync(text);
	const jsonText = [];
	for (const token of tokens) {
		const isContent = module.exports.getDefaultIsContent(token.s);
		const text = [];
		if (token.r && token.r != token.s) {
			let suffix = '';
			for (let i = 0; i < token.r.length; i++) {
				if (token.s[token.s.length - i - 1] != token.r[token.r.length - i - 1]) {
					break;
				}
				suffix = token.s[token.s.length - i - 1] + suffix;
			}
			text.push([
				token.s.substring(0, token.s.length - suffix.length), 
				token.r.substring(0, token.r.length - suffix.length)]);
			if (suffix.length > 0) {
				text.push([suffix]);
			}
		} else {
			text.push([token.s]);
		}
		jsonText.push({text:text, isContent:isContent});
	}
	return jsonText;
};