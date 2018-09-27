const speechRecognizer = (() => {
	const recognition = new webkitSpeechRecognition();
	recognition.continuous = false;
	recognition.interimResults = true;
	recognition.maxAlternatives = 40;
	recognition.lang = 'ja';

	recognition.onresult = (event) => { 
		console.log(event);
	    if (typeof(event.results) == 'undefined') {
	        console.log('error');
	        recognition.onend = null;
	        recognition.stop();
	        upgrade();
	        return;
	    } 

	    for (var i = event.resultIndex; i < event.results.length; ++i) {
	        var speechOut = event.results[i][0].transcript;
	        console.log(speechOut);
	        if (event.results[i].isFinal) {
	        	console.log('final');
	        	results = event.results[i];
	        	console.log(results);
	    	} else {
	    		$("#speech-out").toggleClass('partial', true);
	    		$("#speech-out").text(speechOut);
	    	}
	    }
	};

	recognition.onstart = () => {
	    console.log('starting');
	};

	recognition.onerror = (event) => {
	    console.log(event.error);
	    console.log(event);  
	};

	return {
		setTargetPhrase: (target) => {
			const grammar = `#JSGF V1.0; grammar target; public <target> = ${target};`;
			const speechRecognitionList = new webkitSpeechGrammarList();
			speechRecognitionList.addFromString(grammar, 1);
			recognition.grammars = speechRecognitionList;
		},
		startRecording: (onend) => {
			$("#mic-button").toggleClass('recording', true);
			$("#mic-button").attr('disabled', true);

			recognition.onend = onend;
			recognition.start();
		}
	};
})();