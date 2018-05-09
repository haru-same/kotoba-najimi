function SpeechPlayer(){
	this.voices = window.speechSynthesis.getVoices();
	this.voice = null;

	this.play = (text) => {
		voices = window.speechSynthesis.getVoices();
		let voice = null;
		for(const v of voices){
			if(v.lang == 'ja-JP') {
				voice = v;
			}
		}
		const msg = new SpeechSynthesisUtterance();
		msg.voice = voice;
		msg.text = text;
		speechSynthesis.speak(msg);
	};
}

window.speechPlayer = new SpeechPlayer();