const http = require('http');
const ws = require('ws');
const fs = require('fs');
const path = require('path');

const sessions = {
	'default': {
		'name': 'default',
		passHash: 'dsasfllhjatyjnkcliuasdhliuahta',
		lastTimerState: {
			// workBreakIntervals: [2400, 600],
			workBreakIntervals: [5, 8],
			isBreakTime: false,
			isPaused: true,
			lastStartStop: null
		},
		clients: [
			// {id: 1234, socketObj: socketObj}
		]
	}
}

//create a server object:
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
//  res.write('Hello World!'); //write a response to the client
//  res.end(); //end the response
});

let nextClientSocketId = 1000;

const statusString = () => {
	console.log(JSON.stringify(sessions.default.lastTimerState, null, 2));
	// console.log(`${timestr()}: Status`)
	// for (key in sessions.default.lastTimerState) {
	// 	if (typeof key === "object") {
	// 		console.log(`    ${key}: ${JSON.stringify(sessions.default.lastTimerState[key])}`);
	// 	}
	// 	console.log(`    ${key}: ${sessions.default.lastTimerState[key]}`);
	// }
}
const timestr = () => {
	return new Date().toISOString().substr(11, 8);
}

const wss = new ws.Server({server});
wss.on('connection', (socket) => {
	const session = sessions.default;
	const socketId = nextClientSocketId++;
	session.clients.push({id: socketId, socketObj: socket});
	console.log(`${timestr()}: Adding connection with id ${socketId}, connections are now ${session.clients.map((c) => c.id)}`);
	
	socket.send(JSON.stringify({event: "initStatePush", state: session.lastTimerState}));

	socket.on('message', (message) => {
		const msg = JSON.parse(message);
		const event = msg.event;
		console.log(`${timestr()}: ${socketId} said ${msg}`); //socket.send(`You said ${msg}!`); this basically always works

		if (event === "close") {
			session.clients = session.clients.filter(function(client) {
				return client.id !== socketId;
			});
			console.log(`${timestr()}: Removed connection ${socketId}, connections are now ${session.clients.map((c) => c.id)}`);
		}

		if (['start', 'stop'].includes(event)) {
			session.lastTimerState = msg.status;
			statusString();

			session.clients.forEach(function(client) {
				client.socketObj.send(`${event}`) 
			});
		}
	})
});

server.listen(8080); //the server object listens on port 8080