const workMins = 40;
const breakMins = 20;

class Timer {
	constructor(callbacks) {
		this.callbacks = callbacks;

		this.workBreakIntervals = [workMins * 60, breakMins * 60];
		this.isBreakTime = false;
		this.isPaused = true;
		this.secsLeft = this.getCurrentIntervalSeconds();
		this.setIsBreak(false);
		this.setIsPaused(true);
		this.setSecsLeft(this.getCurrentIntervalSeconds());

		this.tickInterval = null;
	}

	getCurrentIntervalSeconds() {
		return this.workBreakIntervals[Number(this.isBreakTime)];
	}
	getOtherIntervalSeconds() {
		return this.workBreakIntervals[Number(!this.isBreakTime)];
	}

	toggleWorkBreak() {
		setIsBreak(!this.isBreakTime);
	}

	setIsBreak(b) {
		this.isBreakTime = b;
		this.isBreakTime ? this.callbacks.setUIToBreak() : this.callbacks.setUIToWork();
	}

	setIsPaused(b) {
		this.isPaused = b;
		this.isPaused ? this.callbacks.onPause() : this.callbacks.onStart();
	}

	setSecsLeft(s) {
		this.secsLeft = s;
		this.callbacks.onTimeChange(s);
	}

	tick() {
		this.tickInterval = setTimeout(this.tick.bind(this), 1000);
		console.log(`Tick: advancing from secsLeft = ${this.secsLeft}. Timer state: ${this.toString()}`);
		if (this.secsLeft === 0) {
			toggleWorkBreak();
			this.setSecsLeft(this.getCurrentIntervalSeconds());
			playChime(this.isBreakTime);
		} else {
			this.setSecsLeft(this.secsLeft - 1);
		}
	}
	start() {
		if (this.tickInterval === null) { // else, already in progress
			this.tick();
		}
		this.setIsPaused(false);
	}

	pause() {
		if (this.tickInterval !== null) {
			clearInterval(this.tickInterval);
			this.tickInterval = null;
		}
		this.setIsPaused(true);
	}

	zeroify() {
		this.syncToState(true, !this.isBreakTime, this.getOtherIntervalSeconds());
	}

	exportState() {
		return {
			isPaused: this.isPaused,
			isBreakTime: this.isBreakTime,
			secsLeftAtTimestamp: this.secsLeft,
			timestamp: new Date().toISOString()
		}
	}

	syncToState(isPaused, isBreakTime, secsLeftAtTimestamp, timestamp) {
		// if (isBreakTime != this.isBreakTime) this.toggleWorkBreak();
		this.setIsBreak(isBreakTime);
		this.pause();

		if (isPaused) {
			this.setSecsLeft(secsLeftAtTimestamp);
			return;
		}

		let curTime = new Date().toISOString();
		let msSinceTimestamp = new Date(curTime) - new Date(timestamp); // silly hack required to avoid date being weird
		
		const curIntervalMs = 1000*this.getCurrentIntervalSeconds();
		const otherIntervalMs = 1000*this.getOtherIntervalSeconds();
		debugger;
		while (msSinceTimestamp >= curIntervalMs + otherIntervalMs) msSinceTimestamp -= 1000*period;

		let computedMsLeft = 1000*secsLeftAtTimestamp - msSinceTimestamp;
		if (msSinceTimestamp > 1000*secsLeftAtTimestamp) {
			computedMsLeft += otherIntervalMs;
		} else if (msSinceTimestamp > 1000*(secsLeftAtTimestamp + otherIntervalMs)) {
			computedMsLeft += otherIntervalMs + curIntervalMs;
		}
		let newSecsLeft = Math.floor(computedMsLeft/1000);
		this.setSecsLeft(newSecsLeft);
		this.setIsPaused(false);
		setTimeout(this.tick.bind(this), computedMsLeft - newSecsLeft*1000);
	}

	dateToHMS(d) {
		return d.toISOString().substr(11, 8);
	}

	toString() {
		return `Timer: ${this.isPaused ? "Paused" : "Ticking"} | ${this.isBreakTime ? "Break" : "Work"} | ${this.dateToHMS(new Date(this.secsLeft))} remaining. Intervals are ${this.workBreakIntervals}`;
	}
}
