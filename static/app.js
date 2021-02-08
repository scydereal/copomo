
const timestr = () => {
	return new Date().toISOString().substr(11, 8);
}
const prn = (s) => {
	console.log(`[${timestr()}] ${s}`);
}

const audio = [new Audio('static/chime_cheeky.mp3'), new Audio('static/doublechime.mp3')]; // Last left off searching: https://www.zapsplat.com/sound-effect-category/fantasy/page/13/
const mode = document.getElementById('mode');
const timerDiv = document.getElementById('timer');
const startStop = document.getElementById('startstop')
const zeroifyButton = document.getElementById('zeroify');

const showTimeMS = (s) => { timerDiv.textContent = new Date(s * 1000).toISOString().substr(14, 5); }
const showTimeHMS = (s) => { timerDiv.textContent = new Date(s * 1000).toISOString().substr(11, 8); }
let showTimeCallback = showTimeMS;
function showHourInTimer(b) {
	showTimeCallback = b ? showTimeHMS : showTimeMS;
	timerDiv.style.fontSize = b ? '40px' : '70px';
}

const timerCallbacks = {
	onTimeChange: function(secs) {
		showTimeCallback(secs);
	},
	setUIToBreak: function() {
		mode.textContent = 'REAPING';
		mode.parentElement.style.color = 'goldenrod';
	},
	setUIToWork: function() {
		mode.textContent = 'SOWING';
		mode.parentElement.style.color = 'cadetblue';
	},
	playChime(isWorkThatEnded) {
		audio[Number(isBreakTime)].play();
	},
	onStart: function() {
		startStop.textContent = 'Pause';
	},
	onPause: function() {
		startStop.textContent = 'Start';
	}
};
const timer = new Timer(timerCallbacks);

// Websocket setup
const socket = new WebSocket('wss://pomo.scyy.fi');
socket.addEventListener('open', (evt) => { prn("Opened socket") });
socket.addEventListener('message', (evt) => {
	const nowISO = new Date().toISOString();
	prn("From server: " + evt.data);
	const message = JSON.parse(evt.data);
	switch(message.event) {
		case 'start':
			timer.start();
			break;
		case 'stop':
			timer.pause();
			break;
		case 'zeroify':
			timer.zeroify();
			break;
		case 'initStatePush' :
			const serverState = message.state;
			if (serverState) {
				timer.syncToState(serverState.isPaused, serverState.isBreakTime, serverState.secsLeftAtTimestamp, serverState.timestamp);
			}
			break;
	}
});
socket.addEventListener('close', (e) => {
	prn("Socket closing, reestablishing...");
	socket = new WebSocket('wss://pomo.scyy.fi');
})
window.onbeforeunload = function() {
	socket.send(JSON.stringify({event: 'close'}));
}

startStop.addEventListener('click', function(e) {
	if (timer.isPaused) {
		prn("Timer start");
		timer.start();
		socket.send(JSON.stringify({
			event: 'start',
			state: timer.exportState()
		}));
	} else {
		prn("Timer pause");
		timer.pause();
		socket.send(JSON.stringify({
			event: 'stop',
			state: timer.exportState()
		}));
	}
});

zeroifyButton.addEventListener('click', function(e) {
	prn("Timer zeroify");
	timer.zeroify();
	socket.send(JSON.stringify({
		event: 'zeroify',
		state: timer.exportState()
	}));
});

timerDiv.addEventListener('click', function(e) {
	console.log("show way to change interval len");
	showHourInTimer(true);
});