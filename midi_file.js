var midi = require('midi');
var midifileplayer = require('./playSong')


var MIDIOUT = null
var MIDIIN = null
var MIDIFILEPLAYER = null




var MIDI_OUTPUT_NAME = 'EveryMIDI';
var MIDI_INPUT_NAME = 'eKeys-49 USB MIDI Keyboard';


function initMidiOut () {
	var midiout = new midi.output();
	var midiconn = false;
	// Count the available output ports. 
	for (var i=0; i<midiout.getPortCount();i++) {
		var name = midiout.getPortName(i);
		if (name.match(MIDI_OUTPUT_NAME)) {
			console.log('MIDI output found: %s', name);
			midiout.openPort(i);
			midiconn = true;
		}
	}
	if (!midiconn) {
		console.log('Could not find MIDI output port ('+midiout.getPortCount()+' MIDI outputs)');
		process.exit(1);
	}
  MIDIOUT = midiout;
	return midiout;
}

function initMidiIn () {
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
    console.log('Will try again in 5 seconds...');
		//process.exit(1);
    setTimeout(initMidiIn, 5000)
    return
	}

	midiin.on('message', function(deltaTime, message) {
		handleKeyboardMidiMessage(message);
	});
  MIDIIN = midiin;
	return midiin;

}

var restartTimeout = null

function handleKeyboardMidiMessage(message) {
	if (!message) {
		return;
	}

  midifileplayer.pause()
  if (restartTimeout) {
    clearTimeout(restartTimeout)
  }
  restartTimeout = setTimeout(midifileplayer.play, 8000)

	MIDIOUT.sendMessage(message);
}


function sendNoteOn(note) {
	MIDIOUT.sendMessage([144,note,100]);
}

function sendNoteOff(note) {
	MIDIOUT.sendMessage([128,note,0]);
}

function sendAllOff() {
	MIDIOUT.sendMessage([176,123,0]);
}




function initMidiFilePlayer() {
  var mididevice = {
    sendNoteOn: sendNoteOn,
    sendNoteOff: sendNoteOff,
    sendAllOff: sendAllOff
  }
  var fn = process.argv[2] || './elefantgehen.mid'
  midifileplayer.initialize(fn, mididevice)
}


initMidiOut()
initMidiIn()
initMidiFilePlayer()
midifileplayer.play()


