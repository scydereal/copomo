const workMins = 40;
const breakMins = 10;

class Timer {
	constructor(callbacks) {
		this.callbacks = callbacks;

		this.workBreakIntervals = [workMins * 60, breakMins * 60];
		this.isBreakTime = false;
		this.isPaused = true;
		this.secsLeft = this.getCurrentIntervalSeconds();
		this.startPeg = null;

		this.setIsBreak(false); // this touches 'isBreakTime' but JS won't recognize the object member as being established in the constructor unless I touch it literally within the function. Ugh.
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
		this.setIsBreak(!this.isBreakTime);
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

	setNewIntervals(arr) {
		this.workBreakIntervals = arr;
		this.callbacks.onIntervalChange(arr[0], arr[1]);
	}

	calculateTimeout(startTime) {
		const startMsMod = (startTime.getMilliseconds() + 10)%1000;
		const now = new Date();
		const msSinceStart = now - startTime;
		const floorMsSinceStart = 1000*Math.floor(msSinceStart/1000);
		let msSinceOfStartNextTick = floorMsSinceStart + startMsMod;
		if (msSinceOfStartNextTick <= msSinceStart) msSinceOfStartNextTick += 1000;
		let timeoutMs = msSinceOfStartNextTick - msSinceStart;

		console.log(`startMsOffset = ${startMsMod}. It's been ${now.getSeconds()}.${now.getMilliseconds()} - ${startTime.getSeconds()}.${startTime.getMilliseconds()} ${msSinceStart/1000}s since start, and the next tick should be ${msSinceOfStartNextTick/1000}s after start. So timeout ms is set to ${timeoutMs}`)
		return timeoutMs;
	}

	tick() {
		let timeoutMs = this.calculateTimeout(this.startPeg);
		this.tickInterval = setTimeout(this.tick.bind(this), timeoutMs);

		if (this.secsLeft <= 0) {
			this.toggleWorkBreak();
			this.setSecsLeft(this.getCurrentIntervalSeconds());
			this.callbacks.playChime(this.isBreakTime);
		} else {
			const msSinceStart = new Date() - this.startPeg;
			const newSecsLeft = this.secsLeftAtLastStart - Math.ceil(msSinceStart/1000); 
			this.setSecsLeft(newSecsLeft);
		}
	}

	start(startTime) {
		if (this.tickInterval === null) { // else, already in progress
			this.startPeg = startTime;
			this.secsLeftAtLastStart = this.secsLeft;
			this.tick();
		}
		this.setIsPaused(false);
	}

	pause() {
		if (this.tickInterval !== null) {
			clearInterval(this.tickInterval);
			this.tickInterval = null;
			this.startPeg = null;
		}
		this.setIsPaused(true);
	}

	zeroify() {
		this.syncToState(this.workBreakIntervals, true, !this.isBreakTime, this.getOtherIntervalSeconds());
	}

	exportState() {
		return {
			workBreakIntervals: this.workBreakIntervals,
			isPaused: this.isPaused,
			isBreakTime: this.isBreakTime,
			secsLeftAtTimestamp: this.secsLeft,
			lastStartTime: this.startPeg,
			timestamp: new Date().toISOString()
		}
	}

	syncToState(wbIntervals, isPaused, isBreakTime, secsLeftAtTimestamp, timestamp) {
		// if (isBreakTime != this.isBreakTime) this.toggleWorkBreak();
		this.setNewIntervals(wbIntervals);
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
		const periodMs = curIntervalMs + otherIntervalMs;
		while (msSinceTimestamp >= periodMs) msSinceTimestamp -= periodMs;

		let computedMsLeft = 1000*secsLeftAtTimestamp - msSinceTimestamp;
		if (msSinceTimestamp > 1000*secsLeftAtTimestamp && msSinceTimestamp <= 1000*(secsLeftAtTimestamp + otherIntervalMs)) {
			this.setIsBreak(!this.isBreakTime);
			computedMsLeft += otherIntervalMs;
		} else if (msSinceTimestamp > 1000*(secsLeftAtTimestamp + otherIntervalMs)) {
			computedMsLeft += periodMs;
		}
		let newSecsLeft = Math.floor(computedMsLeft/1000);
		this.setSecsLeft(newSecsLeft);
		setTimeout(this.start.bind(this, new Date(timestamp)), computedMsLeft - newSecsLeft*1000)
	}

	dateToHMS(d) {
		return d.toISOString().substr(11, 8);
	}

	toString() {
		return `${this.isPaused ? "PAUS" : "TICK"} | ${this.isBreakTime ? "BRK" : "WRK"} | ${this.dateToHMS(new Date(this.secsLeft*1000))} | ${this.workBreakIntervals}`;
	}
}
