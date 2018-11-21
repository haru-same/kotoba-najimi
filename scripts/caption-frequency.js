const fs = require('fs');
const parseSRT = require('parse-srt');
const glob = require('glob');

glob("data/srt/Netflix SRT Subs/Terrace House/*Japanese.srt", null, (er, files) => {
	console.log(files);
	const allCaptionText = [];
	for (const file of files) {
		const fileText = fs.readFileSync(file, 'utf-8');
		const captions = parseSRT(fileText);
		for(const caption of captions){
			allCaptionText.push(caption.text);
		}
	}
	fs.writeFileSync('th-all-captions.json', JSON.stringify(allCaptionText, null, '\t'));
});