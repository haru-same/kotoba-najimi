const punctuation = '.,\'!?。…、！？、“”"♪～';

const breaks = [
	'<br />',
	'<br>',
	'<br/>',
	'<BR>'
];

const punctuationTable = {};
for(var i in punctuation){
	punctuationTable[punctuation[i]] = true;
}

function addSpace(textArray){
	if(textArray[textArray.length - 1] != ' '){
		textArray.push(' ');
	}
}

module.exports.punctuation = punctuation;

module.exports.cleanPunctuation = function(text){
	var punctuationFreeText = [];
	// remove pronunciation
	for(let i = 0; i < text.length; i++){
		if(text[i] in punctuationTable){
			addSpace(punctuationFreeText);
		} else if(text[i] == ' '){
			addSpace(punctuationFreeText);
		} else {
			punctuationFreeText.push(text[i]);
		}
	}
	return punctuationFreeText.join('').trim();
}

module.exports.containsPunctuation = (text) => {
	for(var i in text){
		if(text[i] in punctuationTable){
			return true;
		} 
	}
	return false;
};

module.exports.replaceBreaksWithNewlines = (text) => {
	for (const b of breaks){
		text = text.replace(new RegExp(b, 'g'), '\n');
	}
	return text;
};

module.exports.replaceNewlinesWithBreaks = (text) => {
	if (!text) {
		return text;
	}
	return text.replace(/\n/g, '<br>');
};