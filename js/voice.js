var voice = {
  enVoices: [],

  init: function () {
    var self = this;
    function load() {
      var all = speechSynthesis.getVoices();
      self.enVoices = all.filter(function (v) {
        return v.lang.indexOf('en') === 0;
      });
    }
    load();
    if (typeof speechSynthesis.onvoiceschanged !== 'undefined') {
      speechSynthesis.onvoiceschanged = load;
    }
  },

  getVoice: function (voiceSel) {
    if (!this.enVoices || this.enVoices.length === 0) {
      this.enVoices = speechSynthesis.getVoices().filter(function (v) {
        return v.lang.indexOf('en') === 0;
      });
    }
    var nameMap = { 2: 'Samantha', 3: 'Alex' };
    var targetName = nameMap[voiceSel];
    if (targetName) {
      for (var i = 0; i < this.enVoices.length; i++) {
        if (this.enVoices[i].name === targetName) return this.enVoices[i];
      }
    }
    if (this.enVoices.length === 0) return null;
    var idx = Math.min(voiceSel || 0, this.enVoices.length - 1);
    return this.enVoices[idx];
  },

  speakWord: function (lang, text, rate, callback, voiceSel) {
    var utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = lang;
    utterance.rate = rate || 1;
    var v = this.getVoice(voiceSel);
    if (v) utterance.voice = v;
    utterance.onend = callback;
    utterance.onerror = callback;
    speechSynthesis.speak(utterance);
  },

  speak: function (lang, text, rate, voiceSel) {
    var self = this;
    return new Promise(function (resolve) {
      self.speakWord(lang, text, rate, resolve, voiceSel);
    });
  },

  cancel: function () {
    speechSynthesis.cancel();
  }
};

voice.init();
