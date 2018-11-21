const fs = require('fs');
const parseSRT = require('parse-srt');
const recommendCaptions = require('../libs/recommend-captions');
const jaTools = require('../libs/ja-tools');

const fileText = fs.readFileSync('data/srt/th-s01e01-test.srt', 'utf-8');
const captions = parseSRT(fileText).map(c => c.text);

jaTools.afterInit(() => {
	// const decks = [ 'kanji', 'video' ];
	// const decks = [];

	const scoreWithDecks = (decks, name) => {
		const scoredLines = recommendCaptions.scoreLines(captions, decks);

		const explainData = [];
		for(let i = 0; i < 10; i++){
			const scoreInfo = { words: [] };
			const score = recommendCaptions.scoreText(scoredLines[i].text, decks, scoreInfo.words);
			scoreInfo.score = score;
			explainData.push(scoreInfo);
		}
		fs.writeFileSync(name, JSON.stringify(explainData, null, '\t'));
	}

	scoreWithDecks([ 'kanji', 'video' ], 'tmp/explain-scores-deck.json');
	scoreWithDecks([  ], 'tmp/explain-scores-fresh.json');
});