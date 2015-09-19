
var midifileplayer = require("./playSong")
midifileplayer.initialize("./floppy-node/elefantgehen.mid", midifileplayer.testmidiout)

midifileplayer.play()
setTimeout(midifileplayer.pause, 6000)
setTimeout(midifileplayer.play, 9000)
