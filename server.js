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

const printObj = (o) => {
	// for (key in o) {
	// 	if (key == 'lastStartStop') printObj(o.key);
	// 	else console.log(`${key}: ${o[key]}`) 
	// }
	console.log(JSON.stringify(o, null, 2));
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
	
	printObj(sessions.default.lastTimerState);
	socket.send(JSON.stringify({state: sessions.default.lastTimerState, event: "initStatePush"}));

	socket.on('message', (message) => {
		const msg = JSON.parse(message);
		const event = msg.event;
		console.log(`${timestr()}: ${socketId} said ${msg}`);
		switch(event) {
			case 'close':
				session.clients = session.clients.filter(function(client) {
					return client.id !== socketId;
				});
				console.log(`${timestr()}: Removed connection ${socketId}, connections are now ${session.clients.map((c) => c.id)}`);
			case 'zeroify':
				session.lastTimerState = msg.state;
				printObj(session.lastTimerState);
				session.clients.forEach(function(client) {
					if (socketId !== client.id) client.socketObj.send(message);
					else console.log("skipping client");
				});
				break;
			default: // start or stop
				session.lastTimerState = msg.state;
				printObj(session.lastTimerState);
				session.clients.forEach(function(client) {
					client.socketObj.send(message);
				});
		}
	})
});

server.listen(8080); //the server object listens on port 8080