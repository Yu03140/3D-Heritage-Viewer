class DescriptionNarrator {
    constructor() {
        this.button = document.getElementById('speakDescriptionBtn');
        this.descriptionElement = document.getElementById('modelDescription');
        this.supported = 'speechSynthesis' in window && 'SpeechSynthesisUtterance' in window;
        this.currentUtterance = null;
        this.isSpeaking = false;
        this.voice = null;

        if (!this.button || !this.descriptionElement) {
            console.warn('DescriptionNarrator: 必需的DOM元素不存在');
            return;
        }

        if (!this.supported) {
            this.button.disabled = true;
            this.button.textContent = '🔇 暂不支持';
            this.button.title = '当前浏览器不支持语音播放功能';
            return;
        }

        this._bindEvents();
        this._updateVoiceList();
        this.onDescriptionUpdated();
    }

    _bindEvents() {
        this.button.addEventListener('click', () => this._togglePlayback());

        document.addEventListener('visibilitychange', () => {
            if (document.hidden) {
                this.stop(true);
            }
        });

        window.addEventListener('modelChanged', () => this.stop(true));
        window.addEventListener('beforeunload', () => this.stop(true));

        if (typeof window.speechSynthesis !== 'undefined') {
            window.speechSynthesis.addEventListener('voiceschanged', () => this._updateVoiceList());
        }
    }

    _updateVoiceList() {
        const voices = window.speechSynthesis?.getVoices?.() || [];
        if (!voices.length) {
            return;
        }
        const preferred = voices.find(v => v.lang.toLowerCase().startsWith('zh'))
            || voices.find(v => v.lang.toLowerCase().includes('zh'))
            || voices.find(v => v.lang.toLowerCase().startsWith('en'))
            || voices[0];
        this.voice = preferred || null;
    }

    _togglePlayback() {
        if (!this.supported) return;
        if (this.isSpeaking) {
            this.stop();
        } else {
            this.speak();
        }
    }

    speak() {
        if (!this.supported) return;

        const text = this._getDescriptionText();
        if (!text) {
            this.button.disabled = true;
            this.button.title = '暂无可朗读的文物介绍';
            return;
        }

        this.stop(true);

        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = this.voice?.lang || 'zh-CN';
        utterance.voice = this.voice || null;
        utterance.rate = 1.0;
        utterance.pitch = 1.0;
        utterance.volume = 1.0;

        utterance.onstart = () => {
            this.isSpeaking = true;
            this._updateButtonState();
        };
        utterance.onend = () => this._handleSpeechFinished();
        utterance.onerror = (event) => {
            console.error('语音播放出错:', event.error);
            this._handleSpeechFinished(true);
        };

        this.currentUtterance = utterance;
        window.speechSynthesis.speak(utterance);
    }

    stop(silent = false) {
        if (!this.supported) return;
        if (window.speechSynthesis.speaking) {
            window.speechSynthesis.cancel();
        }
        this.currentUtterance = null;
        this.isSpeaking = false;
        if (!silent) {
            this._updateButtonState();
        }
    }

    _handleSpeechFinished(hasError = false) {
        this.isSpeaking = false;
        this.currentUtterance = null;
        this._updateButtonState();
        if (hasError) {
            this.button.title = '语音播放失败，请稍后重试';
        }
    }

    _getDescriptionText() {
        if (!this.descriptionElement) return '';
        return this.descriptionElement.innerText.trim();
    }

    _updateButtonState() {
        if (!this.button) return;
        this.button.textContent = this.isSpeaking ? '⏹ 停止讲解' : '🔊 语音讲解';
        this.button.setAttribute('aria-pressed', this.isSpeaking.toString());
        this.button.classList.toggle('speaking', this.isSpeaking);
    }

    onDescriptionUpdated() {
        if (!this.supported || !this.button) return;
        const hasText = !!this._getDescriptionText();
        this.button.disabled = !hasText;
        if (!hasText) {
            this.button.title = '暂无可朗读的文物介绍';
            this.stop(true);
        } else {
            this.button.title = '朗读当前文物介绍';
        }
        this._updateButtonState();
    }
}

const narrator = new DescriptionNarrator();
window.descriptionNarrator = narrator;

export { DescriptionNarrator };
