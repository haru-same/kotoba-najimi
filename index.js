const fs = require('fs');
const express = require('express');
const app = express();
// const https = require('https');
const server = require('http').Server(app);
// const options = {
// 	pfx: fs.readFileSync('seiyuu.pfx')
// };
// const server = https.createServer(options, app);
// server.listen(443);

const io = require('socket.io')(server);
const bodyParser = require('body-parser');
const opener = require('opener');

const exec = require('child_process').execFile;

const ejs = require('ejs');

const furigana = require('./libs/furigana');
const renderFurigana = require('./libs/render-furigana');
const reviewRouter = require('./libs/review-router');
const ocrRouter = require('./libs/ocr/ocr-router');
const config = require('./libs/config');
const ip = require('./libs/network-ip');
const clean = require('./libs/clean');
const cleanHtml = require('./libs/clean-html');

const videoConfig = require('./libs/video-tools/video-config');
// const recommendCaptions = require('./libs/recommend-captions');
const parseSRT = require('parse-srt');

const videoUtil = require('./libs/video-tools/video-util');

// (() => {
// 	const template = fs.readFileSync('./views/furigana.ejs', 'utf-8');
// 	let furiganaText = "やせおとろえて";
// 	const furiganaHtml = ejs.render(template, { elements: renderFurigana("痩せ衰えて", furiganaText) });
// 	console.log(furiganaHtml);
// })();

let openWindow = true;
let hasUnknownArgv = false;
let defaultUser = null;
let argvHandlers = {
	'nowindow': () => {
		openWindow = false;
	},
	'user=': (flag) => {
		defaultUser = flag.replace('user=', '');
		console.log('default user set to: ' + defaultUser);
	}
}

const getUserFromRequest = (req) => {
	const user = req.query.user || req.body.user;
	if (!user) {
		throw "Invalid user: " + user;
	}
	return user;
};

for(let i = 2; i < process.argv.length; i++){
	const argv = process.argv[i];

	let handlerFound = false;
	for (const handlerKey in argvHandlers) {
		if (!argv.includes(handlerKey)) continue;
		
		argvHandlers[handlerKey](argv);
		handlerFound = true; 
	}

	if (!handlerFound) {
		console.log("Unknown argument: " + argv);
		hasUnknownArgv = true;
	}
}

if(hasUnknownArgv){
	console.log("Possible arguments are:");
	for(const key in argvHandlers){
		console.log(key);
	}
	console.log("");
	process.exit();
}

if (openWindow && !defaultUser) {
	console.log("Must specify a user with user=");
	process.exit();
}

server.listen(1414);

app.use(express.static('public'));
app.set('view engine', 'ejs');

app
	.use(bodyParser.urlencoded({ limit: '5mb', extended: true, parameterLimit: 1000000 }))
	.use(bodyParser.json({ limit: '5mb', extended: true }));

reviewRouter.init(app);
ocrRouter.init(app);

app.get('/', function(req, res){
	res.render('index', { user: getUserFromRequest(req), config: config });
});

app.get('/options', function(req, res){
	res.render('options');
});

const usedKeys = {
	"text": true,
	"trans": true
};
app.get('/new-text', function(req, res){
	console.log(req.query.text);

	req.query.text = req.query.text.replace(/<br>/g, "\n");
	if(req.query.trans){
		req.query.trans = req.query.trans.replace(/<br>/g, "\n");
	}

	console.log(req.query);
	const metadata = {};
	for(const key in req.query){
		if(!usedKeys[key]){
			metadata[key] = req.query[key];
		}
	}

	const template = fs.readFileSync('views/furigana.ejs', 'utf-8');
	const furiOutput = furigana(req.query.text);

 	if(metadata.game == 'ed6fc' || metadata.game == 'ed6t3' || metadata.game == 'ed7z'){
		setTimeout(() => {
			exec('ScreenCapture.exe', [ metadata.game ], (err, data) => {
				let id = "";
			    const lines = data.split('\r\n');
			    for(const line of lines){
			    	if(!line.includes(':')) continue;
			    	const split = line.split(':');
			    	if(split[0] == 'id'){
			    		id = split[1];
			    	}
			    }

			    console.log('id is: ' + id);
			    metadata.img = `screenshotimgs/${id}.png`;
			    io.sockets.emit('new-text', { html: ejs.render(template, { elements: furiOutput }), text: req.query.text, trans: req.query.trans, metadata: metadata });
		    });  
		}, 1000);
	} else {
		io.sockets.emit('new-text', { html: ejs.render(template, { elements: furiOutput }), text: req.query.text, trans: req.query.trans, metadata: metadata });
	}

	res.send('done');
});

app.get('/furigana', (req, res) => {
	console.log('furi-in: ' + req.query.text);
	let furi = furigana(req.query.text, { onlyFurigana: true });
	console.log('furi-out: ', furi);
	res.send(furi);
});

app.get('/render-furigana', (req, res) => {
	const template = fs.readFileSync('./views/furigana.ejs', 'utf-8');
	let furiganaText = req.query.reading;
	if(!req.query.reading){
		furiganaText = furigana(req.query.text, { onlyFurigana: true });
	}
	const furiganaHtml = ejs.render(template, { elements: renderFurigana(req.query.text, furiganaText) });
	res.send(furiganaHtml);
});

app.get('/videos', (req, res) => {
	res.render('videos', { videos:videoConfig.getConfig() });
});

app.post('/set-video-offset', (req, res) => {
	if (!req.body.videoId || !req.body.start || !req.body.offset){
		console.log('Missing required field, unable to update offset.');
		return;
	}
	videoConfig.setOffset(req.body.videoId, parseFloat(req.body.start), parseFloat(req.body.offset));

	const videoMediaInfo = videoConfig.getVideoDataForId(req.body.videoId);
	res.json(videoMediaInfo);
});

app.get('/video-info', (req, res) => {
	const videoId = req.query.videoId;
	const videoMediaInfo = videoConfig.getVideoDataForId(videoId);
	res.json(videoMediaInfo);
});

app.get('/video', (req, res) => {
	// const videoMediaInfo = {
	// 	type: 'file',
	// 	path: 'video/th-s01e01.mkv'
	// };
	let videoMediaInfo = {
		"type": "file",
		"path": "video/[HorribleSubs] One Piece - 696 [1080p].mkv",
		"captions": { 
			"path": "data/srt/th-s01e01-test.srt",
			"offsets": [
				{
					"start": 0,
					"offset": 0
				}
			]
		}
	};
	let videoId = req.query.videoId;
	console.log('watch ', videoId);
	if(videoId) {
		videoMediaInfo = videoConfig.getVideoDataForId(videoId);
	} else {
		videoId = videoConfig.getOrCreateVideoIdForMedia(videoMediaInfo);
	}

	console.log('media id', videoId);
	res.render('video-viewer', { videoId: videoId, videoInfo: videoMediaInfo });
});

app.post('/caption-data', (req, res) => {
	const videoFile = req.body.videoFile;
	if (!videoFile) {
		console.log('No video file');
		return;
	}

	let captionData = req.body.captionData;
	if (!captionData) {
		console.log('No caption data');
		return;
	}

	captionData = JSON.parse(req.body.captionData);

	videoUtil.updateCaptionsFile(videoFile, captionData);
	res.send('success');
});

app.get('/caption-editor-launch', (req, res) => {
	res.render('caption-editor-launch', { user: getUserFromRequest(req) });
});

app.get('/caption-editor', (req, res) => {
	const videoFile = req.query.videoFile || 'G:/One Piece/[HorribleSubs] One Piece - 700 [1080p].mkv';
	console.log('video: ', videoFile);
	const srtFile = req.query.captionFile || "G:/[kitsunekko.net]Japanese_subtitles/One_Piece/One_Piece_700.srt";
	console.log('caption: ', srtFile);
	// const videoFile = 'G:/Downloads/[DHR&Makari][Konosuba S1+S2]/[Konosuba][BDRip][1080P]/[DHR&Makari][Konosuba][05][BDRip][1080P][AVC_P10_FLAC_OPUS].mkv';
	// const srtFile = "G:/[kitsunekko.net]Japanese_subtitles/Kono Subarashii Sekai ni Shukufuku wo !/Kono Subarashii Sekai ni Shukufuku wo! S1 (01-10)/KonoSuba God's Blessing on This Wonderful World.S01E05.JA.srt";
	const srtData = videoUtil.getCaptionsForFile(videoFile, srtFile);
	console.log('srt 0: ' + JSON.stringify(srtData[0]));
	res.render('caption-editor', { user: getUserFromRequest(req), srt: srtData, videoFile: videoFile, videoId: videoUtil.getVideoId(videoFile) });
});

app.get('/video-stream', (req, res) => {
	const file = req.query.file;
	console.log(file);
	fs.stat(file, function(err, stats) {
		var range = req.headers.range || 'bytes=0-';
		// console.log(req.headers);
		if (!range) {
			// 416 Wrong range
			return res.sendStatus(416);
		}
		var positions = range.replace(/bytes=/, "").split("-");
		var start = parseInt(positions[0], 10);
		var total = stats.size;
		var end = positions[1] ? parseInt(positions[1], 10) : total - 1;
		var chunksize = (end - start) + 1;

		res.writeHead(206, {
			"Content-Range": "bytes " + start + "-" + end + "/" + total,
			"Accept-Ranges": "bytes",
			"Content-Length": chunksize,
			// "Content-Type": "video/x-matroska"
		});

		const stream = fs.createReadStream(file, { start: start, end: end })
		.on("open", function() {
			stream.pipe(res);
		}).on("error", function(err) {
			res.end(err);
		});
	});
});

app.get('/new-video', (req, res) => {
	let videoMediaInfo = {
		"type": "file",
		"title": "new_video",
		"path": "video/new_file",
		"captions": { 
			"path": "data/srt/new_srt.srt",
			"offsets": [
				{
					"start": 0,
					"offset": 0
				}
			]
		}
	};
	videoConfig.getOrCreateVideoIdForMedia(videoMediaInfo);
	res.redirect('/videos');
});

app.get('/parse-srt', (req, res) => {
	console.log(req.query.file);
	const fileText = fs.readFileSync(req.query.file, 'utf-8');
	const srtData = parseSRT(fileText);
	const finalSrt = [];
	for (const caption of srtData){
		if (clean.cleanPunctuation(caption.text) == ""){
			continue;
		}
		finalSrt.push(caption);
	}
	res.json(finalSrt);
});

app.get('/recommend-captions', (req, res) => {
	const videoMediaInfo = videoConfig.getVideoDataForId(req.query.videoId);
	const fileText = fs.readFileSync(videoMediaInfo.captions.path, 'utf-8');
	const captions = parseSRT(fileText).map(c => c.text);
	const decks = [ 'kanji', 'video' ];
	const recommended = recommendCaptions.scoreLines(captions, decks);
	res.json(recommended.slice(0, 20));
});

const frequencyTable = JSON.parse(fs.readFileSync('frequencies.json'));
const getFrequency = (text) => {
	const freqs = [];
	for(var i = 0; i < text.length; i++){
		const key = text.substring(0, i+1);
		if(frequencyTable[key]){
			const f = frequencyTable[key];
			if(f >= 100) freqs.push('H');
			else freqs.push(f);
		} else {
			freqs.push('L');
		}
	}
	return freqs.join(' / ');
};

app.get('/frequency', (req, res) => {
	res.send(getFrequency(req.query.text));
});

io.on('connection', function (socket) {
	console.log('socket connected');

	var ips = ip();
	for(let i in ips){
		ips[i] = ips[i] + ":1414";
	}

	if(openWindow){
		socket.emit('new-text', "Connection opened.");
		socket.emit('new-text', `If you only have one monitor and still want to play fullscreen, you can use the tool on other devices on your local network (including a cell phone if needed) by entering one of these IP addresses into Chrome:<br>${ips.join(', ')}`);
		socket.emit('new-text', "[DISCLAIMER] The furigana and dictionary entries may be wrong. You should double check anything that seems weird to avoid learning the wrong thing.");
	}

	socket.on('test-text', () => {
		const text = "やっと返してきやがったわけさ。";
		const template = fs.readFileSync('views/furigana.ejs', 'utf-8');
		const furiOutput = furigana(text);
		io.sockets.emit('new-text', { html: ejs.render(template, { elements: furiOutput }), text: text });
	});
});

console.log('listening on :1414');

if(openWindow){
	opener([ "chrome", "--app=http://localhost:1414/?user=" + defaultUser ]);
}