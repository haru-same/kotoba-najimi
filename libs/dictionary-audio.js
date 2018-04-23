const fs = require('fs');
const path = require('path');
const request = require('request');
const uuidv4 = require('uuid/v4');

const jaDictionary = require('./ja-dictionary');

const audioCacheDirectory = 'cache';
const dictionaryAudioTableFile = 'dictionary-audio.json';

if(!fs.existsSync(audioCacheDirectory)){
	fs.mkdirSync(audioCacheDirectory);
}

let dictionaryAudioTable = {};
const dictionaryAudioTablePath = path.join(audioCacheDirectory, dictionaryAudioTableFile);
if(fs.existsSync(dictionaryAudioTablePath)){
	dictionaryAudioTable = JSON.parse(fs.readFileSync(dictionaryAudioTablePath, 'utf8'));
}

const saveAudio = (word, url, callback) => {
	const guid = uuidv4();
	dictionaryAudioTable[word] = guid;
	fs.writeFileSync(dictionaryAudioTablePath, JSON.stringify(dictionaryAudioTable, null, '\t'));

	if(url){
		request(url).pipe(fs.createWriteStream(path.join(audioCacheDirectory, guid + '.mp3'))).on('finish', () => callback(guid));
	} else {
		callback(null);
	}
};

const isFileValid = (word, kana, kanji, callback) => {
	kana = encodeURIComponent(kana);
	kanji = encodeURIComponent(kanji);
	const url = `http://assets.languagepod101.com/dictionary/japanese/audiomp3.php?kana=${kana}&kanji=${kanji}`; 
	request(url, function (error, response, body) {
		if(response.headers['content-length'] != 52288){
			saveAudio(word, url, callback);
		} else {
			saveAudio(word, null, callback);
		}
	});
};

module.exports.getAudioFilePath = (word, callback) => {
	if(word in dictionaryAudioTable){
		callback(path.join(audioCacheDirectory, dictionaryAudioTable[word] + '.mp3'));
	} else {
		const response = jaDictionary.wordSearch(word, false).data[0];
		console.log(response[0]);
		const kanji = response[0].split(' ')[0];
		const kana = response[0].split('[')[1].split(']')[0];
		console.log(kanji, kanji.length, kana, kana.length);

		isFileValid(word, kana, kanji, (result) => {
			if(result){
				callback(path.join(audioCacheDirectory, result + '.mp3'));
			} else {
				callback(null);
			}
		});
	}
};

module.exports.getAudioFilePath('取り繕われて', (result) => console.log('r:', result));