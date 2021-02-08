const http = require('http');
const ws = require('ws');
const fs = require('fs');
const path = require('path');

const sessions = {
	'default': {
		'name': 'default',
		passHash: 'dsasfllhjatyjnkcliuasdhliuahta',
		lastTimerState: {
			workBreakIntervals: [2400, 1200],
			// workBreakIntervals: [5, 8],
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

const server = http.createServer(function (req, res) {
	if (req.method === 'GET') {
		let reqPath = path.join(
			__dirname,
			(req.url === '/')? '/static/index.html' : req.url);
		if (!reqPath.startsWith(path.join(__dirname, 'static'))) { // bad request!
			res.writeHead(400);
			res.end();
			return;
		}
		fs.readFile(reqPath, (err, data) => {
			if (err) {
				res.writeHead(404);
				res.end(JSON.stringify(err));
				return;
			}
			res.writeHead(200);
			res.end(data);
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
const printObj = (o) => {
	prn(JSON.stringify(o, null, 2));
};

const wss = new ws.Server({server});
wss.on('connection', (socket) => {
	const socketId = nextClientSocketId++;
	sessions.default.clients.push({id: socketId, socketObj: socket});
	prn(`Adding connection with id ${socketId}, connections are now ${sessions.default.clients.map((c) => c.id)}`);
	
	printObj(sessions.default.lastTimerState);
	socket.send(JSON.stringify({state: sessions.default.lastTimerState, event: "initStatePush"}));

	socket.on('message', (message) => {
		const msg = JSON.parse(message);
		const event = msg.event;
		prn(`${socketId} said ${JSON.stringify(msg, null, 2)}`);
		switch(event) {
			case 'close':
				sessions.default.clients = sessions.default.clients.filter(function(client) {
					return client.id !== socketId;
				});
				prn(`Removed connection ${socketId}, connections are now ${sessions.default.clients.map((c) => c.id)}`);
				break;
			case 'zeroify':
			case 'start':
			case 'stop': // start or stop
				sessions.default.lastTimerState = msg.state;
				prn("Changed timer state to client-given state.")
				sessions.default.clients.forEach(function(client) {
					if (socketId !== client.id) client.socketObj.send(message);
				});
				break;
			default:
				break;
		}
	})
});

server.listen(8080); //the server object listens on port 8080