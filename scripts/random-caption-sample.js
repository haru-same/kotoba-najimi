const fs = require('fs');
const parseSRT = require('parse-srt');

const fileText = fs.readFileSync('data/srt/th-s01e01-test.srt', 'utf-8');
const captions = parseSRT(fileText);

function shuffle(a) {
    for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
}

const cleanBrackets = (text) => {
	text = text.replace(/\<.*?\>/g, ' ');
	text = text.replace(/（.*?）/g, ' ');
	text = text.replace(/\(.*?\)/g, ' ');
	text = text.replace(/\s\s+/g, ' ');
	return text.trim();
};

const added = {};
const captionLines = [];
for(const line of captions){
	const lineText = cleanBrackets(line.text);
	if(!added[lineText]){
		added[lineText] = true;
		captionLines.push(lineText);
	}
}

shuffle(captionLines);
fs.writeFileSync('sample-caption.json', JSON.stringify(captionLines.slice(0, 100), null, '\t'));