
var HTTP_PORT = 8000;
var WS_PORT = 8001;
var MIDI_OUTPUT_NAME = 'EveryMIDI';
var MIDI_INPUT_NAME = 'eKeys-49 USB MIDI Keyboard';
var INDEX_URL = '/index.html';
var QRPNG_URL = '/qr.png';
var QRHTML_URL = '/qr.html';
var SERVER_INTERFACE = 'en0';
var IDLE_TICKS = 50;
var TICK_INTERVAL = 100;	//0.1s

var ws = require("nodejs-websocket");
var http = require("http");
var fs = require("fs");
var midi = require('midi');
var qr = require('qr-image');  
var os = require('os');

var midiout = initMidiOut();
var midiin = initMidiIn();

var songs = [];
var currentSong = null;
var idleTicks = 0;
var songTicks = 0;


function loadSong(name) {
	fs.readFile(process.cwd()+'/'+name, 'utf8', function (err,data) {
	  	if (err) {
    		console.log('could not load song '+name);
    		process.exit(3);
  		} else {
  			var song = data.split("\n");
  			songs[songs.length] = song;
  			console.log("songs is "+songs);
  			
  		}
  	});
}

function sendNoteOn(note) {
	midiout.sendMessage([144,note,100]);
}

function sendNoteOff(note) {
	midiout.sendMessage([128,note,0]);
}

function sendAllOff() {
	midiout.sendMessage([176,123,0]);
}
 
function startSong() {
	var idx = Math.floor(Math.random() * songs.length);
	currentSong = songs[idx];
	idleTicks = 0;
	songTicks = -1;
}

function songTick() {
	if (currentSong) {
		songTicks++;
		var songLen = currentSong.length;
		if (songTicks >= songLen) {	//song over
			stopSong();
			return;
		}
		var line = currentSong[songTicks];
		while ((line.length > 0) && (line.charCodeAt(0) == 35)) {	// skip comment lines (#)
			songTicks++;
			if (songTicks >= songLen) {
				stopSong();
				return;
			}
			line = currentSong[songTicks];
		}
		if ((line.length > 0) && (line.charCodeAt(0) == 45)) {	// -: end of song, wrap
			songTicks = 0;
			line = currentSong[songTicks];
		}
		handleStringInput(line);
	} else {
		idleTicks++;
		if (idleTicks > IDLE_TICKS) {
			startSong();
		}
	}
}

function stopSong() {
	if (currentSong) {
		sendAllOff();
		idleTicks = 0;
		currentSong = null;
	}
}

function handleCharInput(ascii) {
	if ((ascii >= 65) && (ascii <= 90)) {	//A-Z: down
		sendNoteOn(ascii-65);
	}
	else if ((ascii >= 97) && (ascii <= 122)) {	//a-z: up
		sendNoteOff(ascii-97);
	}
}

function handleStringInput(str) {
	for (var i=0; i<str.length; i++) {
		handleCharInput(str.charCodeAt(i));
	}
}

function handleKeyboardMidiMessage(message) {
	if (!message) {
		return;
	}
	stopSong();
	midiout.sendMessage(message);
}

function initMidiOut() {
	var midiout = new midi.output();
	var midiconn = false;
	// Count the available output ports. 
	for (var i=0; i<midiout.getPortCount();i++) {
		var name = midiout.getPortName(i);
		if (name.match(MIDI_OUTPUT_NAME)) {
			console.log('MIDI output found!');
			midiout.openPort(i);
			midiconn = true;
		}
	}
	if (!midiconn) {
		console.log('Could not find MIDI output port ('+midiout.getPortCount()+' MIDI outputs)');
		process.exit(1);
	}
	return midiout;
}

function initMidiIn() {
	var midiin = new midi.input();
	var midiconn = false;
	// Count the available output ports. 
	for (var i=0; i<midiin.getPortCount();i++) {
		var name = midiin.getPortName(i);
		console.log("scanning input "+i+" : "+name);
		if (name.match(MIDI_INPUT_NAME)) {
			console.log('MIDI input found!');
			midiin.openPort(i);
			midiconn = true;
		}
	}
	if (!midiconn) {
		console.log('Could not find MIDI input port ('+midiin.getPortCount()+' MIDI outputs)');
		process.exit(1);
	}
	midiin.on('message', function(deltaTime, message) {
		handleKeyboardMidiMessage(message);
	});
	return midiin;
}

function genServerURL() {
	var ifaces = os.networkInterfaces();
	var iface = os.networkInterfaces()[SERVER_INTERFACE];
  	var v4 = iface.filter(function (item) {
  		return (item.family == 'IPv4');
  	});
  	if (v4.length < 1) {
  		console.log('no IP found');
  		process.exit(2);
  	}
  	var ip = v4[0].address;
  	return 'http://'+ip+':'+HTTP_PORT;//+INDEX_URL;
}

function serveQRPNG(req, res) {
  	var code = qr.image(genServerURL(), { type: 'png' });
	res.writeHead(200, {'Content-Type': 'image/png'});
  	code.pipe(res);
}

function serveQRHTML(req, res) {
	res.writeHead(200, {'Content-Type': 'text/html'});
	fs.readFile(process.cwd()+'/qr.html', 'utf8', function (err,data) {
	  	if (err) {
			res.writeHead(500, {'Content-Type': 'text/html'});
			res.end('Server error');
    		console.log(err);
  		} else {
	    	var body = data.replace('***SERVERADDR***',genServerURL());
			res.writeHead(200, {'Content-Type': 'text/html'});
    		res.end(body);
  		}
  	});

}

function serveIndex(req, res) {
	var host = req.headers['host'].split(":")[0];
	fs.readFile(process.cwd()+'/index.html', 'utf8', function (err,data) {
	  	if (err) {
			res.writeHead(500, {'Content-Type': 'text/html'});
			res.end('Server error');
    		console.log(err);
  		} else {
	    	var body = data.replace('***SOCKADDR***','ws://'+host+':'+WS_PORT);
			res.writeHead(200, {'Content-Type': 'text/html'});
    		res.end(body);
  		}
  	});
}

//main 

loadSong("song1.txt");

var httpserver = http.createServer(function(req, res) {
	var url = req.url;
	if (url == QRPNG_URL) {
		serveQRPNG(req, res);
	} else if (url == QRHTML_URL) {
		serveQRHTML(req, res);
	} else {
		serveIndex(req, res);
	}
}).listen(HTTP_PORT, function() {
	console.log('Listening on port '+HTTP_PORT);
});

var wsserver = ws.createServer(function(conn) {
	conn.on('text', function(str) {
		stopSong();	//user interaction
		console.log("received "+str);
		handleStringInput(str);
	});
	conn.on('close',function(code,reason) {
		console.log('closed '+reason);
	});
}).listen(WS_PORT);

setInterval(songTick, TICK_INTERVAL);
