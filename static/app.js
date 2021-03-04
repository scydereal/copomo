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

const changeIntervalsForm = document.querySelector('.change-intervals');
const submitIntervalsButton = document.getElementById('submit-intervals');

// these don't work
// const workMinsInput = document.getElementById('workmins');
// const breakMinsInput = document.getElementById('breakMins');

const showTimeMS = (s) => {
	timerDiv.textContent = new Date(s * 1000).toISOString().substr(14, 5);
	document.title = timerDiv.textContent;
}
const showTimeHMS = (s) => { timerDiv.textContent = new Date(s * 1000).toISOString().substr(11, 8); }
let showTimeCallback = showTimeMS;
function setWhetherHourShownInTimer(b) {
	showTimeCallback = b ? showTimeHMS : showTimeMS;
	timerDiv.style.fontSize = b ? '45px' : '70px';
}

const timerCallbacks = {
	onIntervalChange: function(wsecs, bsecs) {
		document.getElementById('workmins').value = Math.floor(wsecs/60);
		document.getElementById('breakmins').value = Math.floor(bsecs/60);
		setWhetherHourShownInTimer(wsecs >= 3600 || bsecs >= 3600);
	},
	onTimeChange: function(secs) {
		showTimeCallback(secs);
	},
	setUIToBreak: function() {
		mode.textContent = 'REAPING';
		mode.parentElement.style.color = 'cadetblue';
	},
	setUIToWork: function() {
		mode.textContent = 'SOWING';
		mode.parentElement.style.color = '#CB721C';
	},
	playChime(isBreakTime) {
		// audio[Number(isBreakTime)].play();
		// will crash if user has not interacted with page yet - sounds are illegal until they do
		// and oh my god do I
		try {
			audio[Number(isBreakTime)].play()
		} catch(e) {
		}
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
const wsAddr = 'wss' + window.location.href.slice(5); // slice out 'https'
console.log(wsAddr)
const socket = new WebSocket(wsAddr);
socket.addEventListener('open', (evt) => { prn("Opened socket") });
socket.addEventListener('message', (evt) => {
	const nowISO = new Date().toISOString();
	const message = JSON.parse(evt.data);
	const serverState = message.state;

	prn(`${message.event} from server:" + ${JSON.stringify(serverState)}`);
	switch(message.event) {
		case 'start':
			timer.start(serverState.lastStartTime);
			prn(timer.toString() + " <= remote start");
			break;
		case 'stop':
			timer.pause();
			prn(timer.toString() + " <= remote pause");
			break;
		case 'zeroify':
			timer.setIsBreak(!message.state.isBreakTime); // precaution - timer can be off by several seconds, don't want other client zeroifying when they're at 1second left until break and this client is 1 second into break
			timer.zeroify();
			prn(timer.toString() + " <= remote zeroify");
			break;
		case 'intervalChange':
			timer.setNewIntervals(serverState.workBreakIntervals);
			prn(timer.toString() + " <= remote intervalchange");
		case 'initStatePush' :
			if (serverState) {
				timer.syncToState(serverState.workBreakIntervals, serverState.isPaused, serverState.isBreakTime, serverState.secsLeftAtTimestamp, serverState.timestamp);
				prn(timer.toString() + " <= remote statePush");
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
	e.preventDefault();
	if (timer.isPaused) {
		timer.start(new Date());
		prn(timer.toString() + " <= local start");
		socket.send(JSON.stringify({
			event: 'start',
			state: timer.exportState()
		}));
	} else {
		timer.pause();
		prn(timer.toString() + " <= local pause");
		socket.send(JSON.stringify({
			event: 'stop',
			state: timer.exportState()
		}));
	}
});

zeroifyButton.addEventListener('click', function(e) {
	e.preventDefault(); // somehow interval tries to submit
	timer.zeroify();
	prn(timer.toString() + " <= local zeroify");
	socket.send(JSON.stringify({
		event: 'zeroify',
		state: timer.exportState()
	}));
});

timerDiv.addEventListener('click', function(e) {
	changeIntervalsForm.style.display = changeIntervalsForm.style.display === "none" ? "block" : "none";
});

submitIntervalsButton.addEventListener('click', function(e) {
	e.preventDefault();
	const workMins = document.getElementById('workmins').value;
	const breakMins = document.getElementById('breakmins').value;
	timer.setNewIntervals([workMins*60, breakMins*60]);
	prn(timer.toString() + " <= local intervalchange");
	socket.send(JSON.stringify({
		event: 'intervalChange',
		state: timer.exportState()
	}));

	// hide interval change form
	changeIntervalsForm.style.display = "none";
});
