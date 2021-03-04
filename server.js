const http = require('http');
const ws = require('ws');
const fs = require('fs');
const path = require('path');

const permaSessions = ['squad'];
const sessions = {
	'squad': {
		'name': 'squad',
		lastTimerState: {
			workBreakIntervals: [2400, 1200],
			isPaused: true,
			isBreakTime: false,
			secsLeftAtTimestamp: 2400,
			timestamp: null
		},
		clients: [
			// {id: 1234, socketObj: socketObj}
		]
	}
};

const server = http.createServer(function (req, res) {

	if (req.method === 'GET') {
		let htmlReqPath;
		if (req.url === '/') {
			htmlReqPath = path.join(__dirname, '/static/index.html');
		} else { // only valid form is /sessionName
			const sessionName = req.url.slice(1);
			if (sessionName in sessions) {
				htmlReqPath = path.join(__dirname, '/static/timer.html');
			} else {
				htmlReqPath = null;
			}
		}

		if (htmlReqPath == null || !htmlReqPath.startsWith(path.join(__dirname, 'static'))) {
			res.writeHead(400);
			res.end();
			return;
		} else {
			fs.readFile(htmlReqPath, (err, data) => {
				if (err) {
					res.writeHead(404);
					res.end(JSON.stringify(err));
					return;
				}
				res.writeHead(200);
				res.end(data);
			});
		}
	} else if (req.method === 'POST') {
		req.on('data', chunk => { // assume, horribly, we only get one chunk
			const name = chunk.toString();
			if (name in sessions) {
				res.writeHead(409);
			} else {
				res.writeHead(200);
				sessions[name] = {
					'name': name,
					lastTimerState: {
						workBreakIntervals: [2400, 600],
						isPaused: true,
						isBreakTime: false,
						secsLeftAtTimestamp: 2400,
						timestamp: null
					},
					clients: [
						// {id: 1234, socketObj: socketObj}
					]
				}
			}
			console.log("   After", req.method, req.url, "sessions now:", Object.keys(sessions));
			res.end("");
		});
	}
});

let nextClientSocketId = 1000;

const timestr = () => {
	return new Date().toISOString().substr(11, 8);
};
const prn = (s) => {
	console.log(`[${timestr()}] ${s}`);
};
function dateToHMS(d) {
	return d.toISOString().substr(11, 8);
}

const printState = (sessionObj, event) => {
	console.log(`[${timestr()} | ${sessionObj.name}] ${sessionObj.lastTimerState.isPaused ? "PAUS" : "TICK"} | ${sessionObj.lastTimerState.isBreakTime ? "BRK" : "WRK"} | ${dateToHMS(new Date(sessionObj.lastTimerState.secsLeftAtTimestamp*1000))} | ${sessionObj.lastTimerState.workBreakIntervals} <= ${event}`)
};

const wss = new ws.Server({server});
wss.on('connection', (socket, req) => {
	const sessionName = req.url.slice(1);
	if (!(sessionName in sessions)) {
		prn(`Connection from page with invalid session name ${sessionName}`);
		return;
	}
	const sessionObj = sessions[sessionName];
	prn(`New connection in session ${sessionName}`);

	const socketId = nextClientSocketId++;
	sessionObj.clients.push({id: socketId, socketObj: socket});
	prn(`[${sessionName}] Adding connection with id ${socketId}, connections are now ${sessionObj.clients.map((c) => c.id)}`);
	
	socket.send(JSON.stringify({state: sessionObj.lastTimerState, event: "initStatePush"}));

	socket.on('message', (message) => {
		const msg = JSON.parse(message);
		const event = msg.event;
		switch(event) {
			case 'close':
				sessionObj.clients = sessionObj.clients.filter(function(client) {
					return client.id !== socketId;
				});
				prn(`Removed connection ${socketId}, connections are now ${sessionObj.clients.map((c) => c.id)}`);
				if (sessionObj.clients.length == 0 && !(sessionName in permaSessions)) {
					prn(`Removing session ${sessionName}`);
					delete sessions.sessionName;
				}
				break;
			case 'intervalChange':
			case 'zeroify':
			case 'start':
			case 'stop': // start or stop
				sessionObj.lastTimerState = msg.state;
				sessionObj.clients.forEach(function(client) {
					if (socketId !== client.id) client.socketObj.send(message);
				});
				printState(sessionObj, `${socketId} ${event}`);
				break;
			default:
				break;
		}
	})
});

server.listen(8080); //the server object listens on port 8080