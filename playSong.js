var fs = require('fs')
var midi = require('midifile')


function loadMIDIFile(fn) {
  //var ele = fs.readFileSync('elefantgehen.mid')
  console.log("loading: %s", fn)
  var ele = fs.readFileSync(fn)


  function toArrayBuffer(buffer) {
    var ab = new ArrayBuffer(buffer.length);
    var view = new Uint8Array(ab);
    for (var i = 0; i < buffer.length; ++i) {
      view[i] = buffer[i];
    }
    return ab;
  }

  var elephant_array_buffer = toArrayBuffer(ele)
  var midiFile= new midi(elephant_array_buffer);
  return midiFile
}





var TYPE_NOTE_ON = 9
var TYPE_NOTE_OFF = 8
var RANGE    = 24
var BEATS_PER_SEC = 120 * 4

var midiout = null
var playing = false
var chain = {}
var currentNode = chain

function prepareChain(midiFile) {

  var midiEvents = midiFile.getMidiEvents()
  for (var i = 0 ; i!= midiEvents.length; ++i) {
    var currentEv = midiEvents[i]
    var node = {
      delta: currentEv.delta,
      midiEv: currentEv
      
    } 
    switch(currentEv.subtype) {
      case TYPE_NOTE_ON:
        node.play = function() {midiout.sendNoteOn(this.midiEv.param1 % RANGE)}
        break
      case TYPE_NOTE_OFF:
        node.play = function() {midiout.sendNoteOff(this.midiEv.param1 % RANGE)}
        break
      default:
    } // switch
    currentNode.next = node
    currentNode = node
  }
  currentNode = chain
}



// midioutput = { sendNoteOn : function(note){...}, sendNoteOff : function(note) {} : sendAllOff() {} }
function initialize(midifilename, midioutput) {
  var midifile = loadMIDIFile(midifilename)
  midiout = midioutput
  prepareChain = prepareChain(midifile)
}

function play() {
  playing = true
  _play()
}

// starts playing from current position
function _play() {
  if (!playing) {
    return
  }

  if (currentNode.play) {
      currentNode.play()
  }

  if (currentNode.next) {
    var delta_ticks = currentNode.next.delta
    var delta_secs = delta_ticks * (1/BEATS_PER_SEC)
    setTimeout(_play, delta_secs*2000)
    currentNode = currentNode.next
  } else {
    console.log("song done ...")
    currentNode = chain
    stop()
    setTimeout(play, 8000)
  }
}
// pauses at current position, restart with play
function pause() {
  console.log("... pausing")
  playing = false
  midiout.sendAllOff()

}
// stops, sets current position to start
function stop() {
  console.log("... stopping")
  playing = false
  midiout.sendAllOff()
  currentNode = chain
}

exports.initialize = initialize
exports.play = play
exports.pause = pause
exports.stop = stop


var testmidiout = {
  sendNoteOn: function (note) { console.log("on : %d", note)},
  sendNoteOff: function (note) { console.log("off: %d", note)},
  sendAllOff: function () { console.log("alloff")}
}

exports.testmidiout = testmidiout
