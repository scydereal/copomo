const checkSessionName = () => {
	// console.log("Should this happen on the server side?");
}

document.getElementById('submit').addEventListener('click', function(e) {
	checkSessionName();
	const name = document.getElementById('name').value;
	console.log(`TODO: send ${name} in post request, wait for response, then redirect`);
	const xhr = new XMLHttpRequest();
	xhr.open('POST', "/", true); // async = true
	xhr.onload = function() { // logic for on data load
		const statusCode = this.status; // xhr.status
		// const response = this.responseText;
		if (statusCode === 409) {
			console.log("Session name is taken");
		} else if (statusCode === 200) {
			window.location.href = "https://pomo.scyy.fi/" + name;
		}
	}
	xhr.onerror = function() {
		console.log('POST Request error');
	}
	xhr.send(name);

});
