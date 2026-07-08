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

  // 等待英文语音列表就绪（冷启动/刷新后 voices 可能尚未加载）
  ensureReady: function () {
    var self = this;
    return new Promise(function (resolve) {
      function check() {
        var all = speechSynthesis.getVoices();
        self.enVoices = all.filter(function (v) {
          return v.lang.indexOf('en') === 0;
        });
        if (self.enVoices.length > 0) {
          resolve();
          return true;
        }
        return false;
      }
      if (check()) return;

      var waited = 0;
      var timer = setInterval(function () {
        waited += 100;
        if (check() || waited >= 2000) {
          clearInterval(timer);
          resolve();
        }
      }, 100);
    });
  },

  getVoice: function (voiceSel) {
    if (!this.enVoices || this.enVoices.length === 0) {
      this.enVoices = speechSynthesis.getVoices().filter(function (v) {
        return v.lang.indexOf('en') === 0;
      });
    }
    var nameMap = { 2: 'Samantha', 3: 'Daniel' };
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
    var done = false;
    var startTime = Date.now();
    function finish() {
      if (done) return;
      done = true;
      clearTimeout(timer);
      // 确保最小时长：防止浏览器静默/阻断语音时 onend 过早触发
      var elapsed = Date.now() - startTime;
      var minMs = Math.min(1500, Math.max(600, Math.ceil((text || '').length / (rate || 1) * 80)));
      if (elapsed >= minMs) {
        callback();
      } else {
        setTimeout(callback, minMs - elapsed);
      }
    }
    utterance.onend = finish;
    utterance.onerror = finish;
    // 超时兜底：onend/onerror 可能不触发（尤其是刷新后首次朗读）
    var estMs = Math.max(2000, Math.ceil((text || '').length / (rate || 1) * 350));
    var timer = setTimeout(finish, estMs + 1500);
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
