const fs = require('fs');
const glob = require('glob');
const path = require('path');
const encoding = require('encoding-japanese');

const baseDirectory = 'C:/Users/gabeculbertson/Documents/GitHub/ZeroAoVoiceScripts/ZeroAoVoiceScripts/jp.ao/out.evo/';
const convertedDirectory = 'C:/Users/gabeculbertson/Documents/GitHub/ZeroAoVoiceScripts/ZeroAoVoiceScripts/jp.ao/out.evo.utf8/';

const convertToUtf8 = (inFile) => {
	const utf8Array = encoding.convert(fs.readFileSync(inFile), 'UTF8', 'SJIS');
	const baseName = path.basename(inFile);
	const outFile = convertedDirectory + baseName;
	fs.writeFileSync(outFile, new Buffer(utf8Array));
	return outFile;
}

const isNumber = (char) => {
	return char >= '0' && char <= '9';
};

const getVoice = (text) => {
	for(i = 0; i < text.length; i++){
		if (text[i] == 'V') {
			// console.log('found V');
			let voiceString = '';
			for(let j = i - 1; j >= 0; j--) {
				if (text[j] == '#') {
					return voiceString;
				} else if (!isNumber(text[j])) {
					// console.log('not number', text[j]);
					break;
				}
				voiceString = text[j] + voiceString;
			}
		}
	}
	return null;
}

const isContinuedText = (text) => {
	return text.substring(text.length - 4) == '\\x01';
}

const cleanEDContentText = (text) => {
	let cleanedText = '';
	let isContent = true;
	let inTag = false;
	let textPointer = 0;
	for (let i = 0; i < text.length; i++){
		if (text[i] == '#'){
			inTag = true;
			isContent = false;
		} else if (inTag && !isNumber(text[i])) {
			inTag = false;
			isContent = true;
			continue;
		} else if (text[i] == '\\' && text[i+1] == 'x') {
			i += 3;
			continue;
		}

		if (isContent) cleanedText += text[i];
	}
	return cleanedText;
}

// console.log(cleanEDContentText('#530020025V#1B#20Z#39B#111Z#00206F#0E#5Pどうやら、あれからずっと\\x01\nここで暮らしていたみたいで……\\x02\\x03'));

const processFiles = () => {
	glob(baseDirectory + '/*', null, (error, files) => {
		let voiceCount = 0;
		const outJson = [];
		for (const file of files) {
			const filePath = convertToUtf8(file);

			const fileText = fs.readFileSync(filePath, 'utf8');
			const lines = fileText.split('\r\n');

			let currentElement = null;
			let hasContinuation = false;
			for (let line of lines) {
				line = line.replace('\r\n', '');
				if (line.length == 0) continue;
				if (line[0] == '#') continue;
				const parts = line.split(',');
				if (parts.length < 4) continue;
				const contentText = parts[3];

				const voice = getVoice(contentText);
				if (voice) {
					hasContinuation = isContinuedText(contentText);
					currentElement = {voice: voice, text: cleanEDContentText(contentText)};
					outJson.push(currentElement);

					voiceCount++;
				} else if (hasContinuation) {
					currentElement.text += '\n' + cleanEDContentText(contentText);
					hasContinuation = isContinuedText(contentText);
				}
				// console.log(parts[3]);
			}

			// if (voiceCount > 1000) {
			// 	console.log(file);
			// 	break;
			// }
		}
		fs.writeFileSync('ocr_data/ao_lines.json', JSON.stringify(outJson, null, '\t'));
		console.log('voice count:', voiceCount);
	});
}
processFiles();