let status = {
	neverSynced: true,
	workBreakIntervals: [2400, 600],
	isBreakTime: false,
	isPaused: true,
	lastStartStop: {
		secsLeft: null,
		timestamp: null
	}
};

let secsLeft = status.workBreakIntervals[Number(status.isBreakTime)];

// Websocket setup
const socket = new WebSocket('wss://localhost:8080');
socket.addEventListener('open', (evt) => {});
socket.addEventListener('message', (evt) => {
	const nowISO = new Date().toISOString();
	console.log(nowISO.substr(11, 8), evt.data);
	if (evt.data === 'start') {
		startTimer();
	} else if (evt.data === 'stop') {
		pauseTimer();
	} else {
		let serverMessage = JSON.parse(evt.data);
		if (serverMessage.event !== "statePush") {
			alert("Hello! Something is wrong!");
		}
		let serverStatus = serverMessage.state;
		console.log("Got serverStatus:", serverStatus);

		if (status.neverSynced && serverStatus.lastStartStop !== null) { // just handle this for now
			status = serverStatus;
			if (status.isPaused) {
				updateTimerWorkOrBreak();
				updateTimerSecsLeft(status.lastStartStop.secsLeft);
				updateTimerStartStopButton();
			} else {
				let msSince = new Date(nowISO) - new Date(status.lastStartStop.timestamp);
				let secsPassed = Math.ceil(msSince/1000);
				let modeIntervalAtLastStart = status.workBreakIntervals[Number(status.isBreakTime)];
				let otherModeInterval = status.workBreakIntervals[Number(!status.isBreakTime)];
				let period = modeIntervalAtLastStart + otherModeInterval;
				while (secsPassed >= period) {
					secsPassed -= period;
					msSince -= period*1000; // tbh I think all calculations should be done with ms
				}
				let computedSecsLeft;
				let debugVar = 0;
				if (secsPassed <= status.lastStartStop.secsLeft) {
					computedSecsLeft = secsLeft - secsPassed;
				} else if (secsPassed <= status.lastStartStop.secsLeft + otherModeInterval) {
					computedSecsLeft = otherModeInterval + status.lastStartStop.secsLeft - secsPassed;
					// status.isBreakTime = !status.isBreakTime; // TODO: some version of this necessary
					debugVar = otherModeInterval;
				} else {
					computedSecsLeft = period + status.lastStartStop.secsLeft - secsPassed;
					debugVar = period;
				}
				setTimeout(tick, 500);
				console.log(`Now is ${nowISO} and server's timestamp is ${status.lastStartStop.timestamp}, for a ms diff of msSince ${msSince} (${secsPassed}s). Computed secs left is offset ${debugVar} + secsLeft ${status.lastStartStop.secsLeft} - secsPassed ${secsPassed} => ${computedSecsLeft}s, or ${computedSecsLeft/60}min`);

				updateTimerWorkOrBreak();
				updateTimerSecsLeft(computedSecsLeft);
				updateTimerStartStopButton();
			}
		}
	}
});
socket.addEventListener('close', (e) => {
	console.log("Socket closing", e);
	// Reestablish? socket = new WebSocket('wss://pomo.scyy.fi');
})
window.onbeforeunload = function() {
	socket.send(JSON.stringify({event: 'close'}));
}

const audio = [new Audio('static/chime_cheeky.mp3'), new Audio('static/doublechime.mp3')]; // Last left off searching: https://www.zapsplat.com/sound-effect-category/fantasy/page/13/
const mode = document.getElementById('mode');
const timer = document.getElementById('timer');
const startStop = document.getElementById('startstop')

function updateTimerWorkOrBreak(isBreak) {
	if (typeof isBreak !== 'undefined') status.isBreakTime = isBreak;
	if (status.isBreakTime) {
		mode.textContent = 'REAPING (Pace!)';
		mode.parentElement.style.color = 'goldenrod';
	} else {
		mode.textContent = 'SOWING';
		mode.parentElement.style.color = 'cadetblue';
	}
}
function updateTimerSecsLeft(s) {
	if (typeof s !== 'undefined') secsLeft = s;
	timer.textContent = new Date(secsLeft * 1000).toISOString().substr(11, 8);
}
function updateTimerStartStopButton(isPaused) {
	if (typeof isPaused !== 'undefined') status.isPaused = isPaused;
	startStop.textContent = status.isPaused ? 'Start' : 'Stop';
}

updateTimerWorkOrBreak(status.isBreakTime);
updateTimerSecsLeft(status.secsLeft);
updateTimerStartStopButton(status.isPaused);

let interval = null;
function tick() {
	interval = setTimeout(tick, 1000);
	if (secsLeft === 0) {
		updateTimerWorkOrBreak(!status.isBreakTime);
		audio[Number(status.isBreakTime)].play();
		updateTimerSecsLeft(status.workBreakIntervals[Number(status.isBreakTime)]);
	} else {
		updateTimerSecsLeft(--secsLeft);
	}
}

function startTimer() {
	if (interval !== null) return;
	tick();
	updateTimerStartStopButton(false);
}

function pauseTimer() {
	if (interval === null) return;
	clearInterval(interval);
	interval = null;
	updateTimerStartStopButton(true);
}

// Button start/stop logic
startStop.addEventListener('click', function(e) {
	status.lastStartStop = {timestamp: new Date().toISOString(), secsLeft: secsLeft};
	if (status.isPaused) {
		startTimer();
		socket.send(JSON.stringify({event: 'start', status: status}));
	} else {
		pauseTimer();
		socket.send(JSON.stringify({event: 'stop', status: status}));
	}
});