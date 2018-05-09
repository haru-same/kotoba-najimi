const express = require('express');
const app = express();
const server = require('http').Server(app);
const io = require('socket.io')(server);
const bodyParser = require('body-parser');
const fs = require('fs');
const opener = require('opener');

const exec = require('child_process').execFile;

const ejs = require('ejs');

const furigana = require('./libs/furigana');
const renderFurigana = require('./libs/render-furigana');
const reviewRouter = require('./libs/review-router');
const config = require('./libs/config');
const ip = require('./libs/network-ip');
const cleanHtml = require('./libs/clean-html');

// (() => {
// 	const template = fs.readFileSync('./views/furigana.ejs', 'utf-8');
// 	let furiganaText = "やせおとろえて";
// 	const furiganaHtml = ejs.render(template, { elements: renderFurigana("痩せ衰えて", furiganaText) });
// 	console.log(furiganaHtml);
// })();

let openWindow = true;
let hasUnknownArgv = false;
let argvHandlers = {
	'nowindow': () => {
		openWindow = false;
	}
}

for(let i = 2; i < process.argv.length; i++){
	const argv = process.argv[i];
	if(argvHandlers[argv]){
		argvHandlers[argv]();
	} else {
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
}

server.listen(1414);

app.use(express.static('public'));
app.set('view engine', 'ejs');

app
	.use(bodyParser.urlencoded({ limit: '1mb', extended: true }))
	.use(bodyParser.json({ limit: '1mb' }));

reviewRouter.init(app);

app.get('/', function(req, res){
	res.render('index', { config: config });
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

	req.query.text = req.query.text.replace(/<br>/g, "");
	if(req.query.trans){
		req.query.trans = req.query.trans.replace(/<br>/g, "");
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

 	if(metadata.game == 'ed6t3'){
		setTimeout(() => {
			exec('ScreenCapture.exe', (err, data) => {
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
			    metadata.img = id;
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
	opener([ "chrome", "--app=http://localhost:1414/" ]);
}