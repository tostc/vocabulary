function TTS() {
    this.selectedVoice = 0;

    if("speechSynthesis" in window)
        this.synth = window.speechSynthesis;

    /**
     * Tries to load the japanese tts-voices of the system.
     * @param {function} callback Called if there are any japanese voices
     * @returns
     */
    this.loadVoices = callback => {
        if(!this.synth) {
            console.warn("No text-to-speech support")
            return;
        }

        const THIZ = this;
        function _loadVoices() {
            THIZ.voices = THIZ.synth.getVoices().filter(x => x.lang.startsWith("ja"));
            if((THIZ.voices.length > 0) && (typeof callback == "function"))
                callback();
            else if(typeof callback != "function")
                console.error("callback needs to be a function!")
        }

        _loadVoices();
        if ("onvoiceschanged" in this.synth)
            this.synth.onvoiceschanged = _loadVoices;
    };

    /**
     * @returns {boolean} Returns true, if there are any japanese voice packages found.
     */
    this.hasJapanese = () => {
        if(this.voices)
            return this.voices.length != 0;

        return false;
    }

    /**
     * Plays the given text.
     * @param {string} text Text to play
     * @returns
     */
    this.speak = text => {
        if(!this.voices || this.voices.length == 0)
            return;

        const utterThis = new SpeechSynthesisUtterance(text);
        utterThis.voice = this.voices[this.selectedVoice];
        this.synth.speak(utterThis);
    }
}