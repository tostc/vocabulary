function TTS() {
    this.selectedVoice = 0;

    if("speechSynthesis" in window)
        this.synth = window.speechSynthesis;

    this._loadVoices = () => {
        this.voices = this.synth.getVoices().filter(x => x.lang.startsWith("ja"));
    }

    this._loadVoices();
    if ("onvoiceschanged" in this.synth)
        this.synth.onvoiceschanged = this._loadVoices.bind(this);

    this.hasJapanese = () => {
        if(this.voices)
            return this.voices.length != 0;

        return false;
    }

    this.speak = text => {
        if(!this.voices || this.voices.length == 0)
            return;

        const utterThis = new SpeechSynthesisUtterance(text);
        utterThis.voice = this.voices[this.selectedVoice];
        this.synth.speak(utterThis);
    }
}