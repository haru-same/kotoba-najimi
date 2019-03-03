const getVerifiedPronunciation = (text, message, callback) => {
	if(!text) {
		console.error("Can't get pronunciation for null or empty text.");
		return;
	}

	$.get('/furigana', { text: text }, (res) => {
		let reading = prompt(message, res);
		if (reading == null || reading == "") console.log("canceled reading input");
		else callback(reading);
	});
};