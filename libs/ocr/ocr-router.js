// Imports the Google Cloud client libraries
const vision = require('@google-cloud/vision').v1p3beta1;
const fs = require('fs');
const glob = require('glob');

const util = require('../util');

// Creates a client
const client = new vision.ImageAnnotatorClient();

const stateFileName = 'ocr_data/state.json';
let ocrState = {
  handled: {}
};
if (fs.existsSync(stateFileName)) {
  ocrState = JSON.parse(fs.readFileSync(stateFileName, 'utf8'));
}
console.log(ocrState);

const getOcrForFile = (fileName) => {
  return new Promise((resolve) => {
    const request = {
      image: {
        content: fs.readFileSync(fileName),
      },
      feature: {
        languageHints: ['ja'],
      },
    };
    client
      .documentTextDetection(request)
      .then(results => {
        const fullTextAnnotation = results[0].fullTextAnnotation;
        console.log(results);
        console.log(`Full text: ${fullTextAnnotation.text}`);
        fs.writeFileSync(fileName + '.json', JSON.stringify(results, null, '\t'));
        resolve();
      })
      .catch(err => {
        console.error('ERROR:', err);
      });
  });
};

const updateOcr = () => {
  return new Promise((resolve) => {
    glob("ocr_data/*.jpg", null, (error, files) => {
      const promises = [];
      for (const file of files){
        if (!(file in ocrState.handled)) {
          ocrState.handled[file] = false;
        }

        if (!fs.existsSync(file + '.json')) {
          ocrState.handled[file] = false;
          promises.push(getOcrForFile(file));
        }
      }

      fs.writeFileSync(stateFileName, JSON.stringify(ocrState, null, '\t'));

      console.log('will resolve');
      if (promises.length > 0) {
        Promise.all(promises).then(() => {
          resolve();
        });
      } else {
        resolve();
      }
    });
  });
};

const shouldPreFilter = (text1, text2) => {
  return Math.abs(text1.length - text2.length) > 10;
}

const stripTrailingNewline = (text) => {
  if(text[text.length - 1] == '\n') {
    return text.substring(0, text.length - 1);
  }
  return text;
}

const getShortElementsFilteredCandidate = (text) => {
  const candidateLines = [];
  const lines = text.split('\n');
  for(const line of lines) {
    if (line.length > 5) {
      candidateLines.push(line);
    }
  }
  return candidateLines.join('\n');
}

const getBestMatches = (text) => {
  text =  stripTrailingNewline(text);
  const linesJson = JSON.parse(fs.readFileSync('ocr_data/ao_lines.json', 'utf8'));
  
  const firstNewLineIndex = text.indexOf('\n');
  const textWithoutFirstLine = text.slice(firstNewLineIndex + 1);
  const candidates = [text, textWithoutFirstLine];
  const shortElementsFilteredCandidate = getShortElementsFilteredCandidate(text);
  if (shortElementsFilteredCandidate != textWithoutFirstLine) {
    candidates.push(shortElementsFilteredCandidate);
  }

  console.log(candidates[0].length);
  console.log(candidates[1].length);
  console.log(candidates);
  let count = 0;
  console.log('starting edit distance');
  for (const lineJson of linesJson) {
    for (const candidate of candidates) {
      lineJson.distance = 1000;
      lineJson.length = lineJson.text.length;
      if (!shouldPreFilter(lineJson.text, candidate)) {
        // console.log(lineJson.text);
        // console.log(candidate);
        lineJson.distance = util.getEditDistance(lineJson.text, candidate);
      }
    }
    count++;
  }
  linesJson.sort((a, b) => {return a.distance - b.distance});
  return linesJson.slice(0, 10);
};

updateOcr();

module.exports.init = (app) => {
  app.get('/ocr/create-review', (req, res) => {
    updateOcr().then(() => {
      const unhandledFiles = [];
      for(const file in ocrState.handled){
        if (!ocrState.handled[file]) {
          unhandledFiles.push(file);
        }
      }

      if(unhandledFiles.length == 0) {
        res.render('ocr-no-unhandled');
        return;
      }

      console.log(ocrState.handled);
      console.log(unhandledFiles);
      const imageFilename = unhandledFiles[0];
      const ocrJson = JSON.parse(fs.readFileSync(imageFilename + '.json'));

      const bestMatches = getBestMatches(ocrJson[0].fullTextAnnotation.text);
      for (const match of bestMatches) {
        match.metadata = {
          game: 'ed7a',
          voice: match.voice,
          img: imageFilename
        }
      }

      res.render('ocr-create-review', { imageFilename: imageFilename, ocrData: ocrJson, bestMatches: bestMatches });
    });
  });

  app.get('/ocr/image', (req, res) => {
    const stream = fs.createReadStream(req.query.file);
    stream.on('open', () => {
      res.set('Content-Type', 'image/jpeg');
      stream.pipe(res);
    });
  });

  app.get('/ocr/audio', (req, res) => {
    const file = `G:/FALCOM/ao/ogg/v${req.query.id}.ogg`;
    const stream = fs.createReadStream(file);
    stream.on('open', () => {
      res.set('Content-Type', 'audio/ogg');
      stream.pipe(res);
    });
  });

  app.post('/ocr/handled', (req, res) => {
    ocrState.handled[req.body.imageFilename] = true;
    fs.writeFileSync(stateFileName, JSON.stringify(ocrState, null, '\t'));
    res.send('success');
  });
};