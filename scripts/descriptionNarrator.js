// descriptionNarrator.js - 文物介绍语音朗读功能
class DescriptionNarrator {
    constructor() {
        console.log('🎤 初始化 DescriptionNarrator...');
        this.button = document.getElementById('speakDescriptionBtn');
        this.descriptionElement = document.getElementById('modelDescription');
        this.supported = 'speechSynthesis' in window && 'SpeechSynthesisUtterance' in window;
        this.currentUtterance = null;
        this.isSpeaking = false;
        this.voice = null;

        console.log('按钮元素:', this.button);
        console.log('描述元素:', this.descriptionElement);
        console.log('语音支持:', this.supported);

        if (!this.button || !this.descriptionElement) {
            console.warn('DescriptionNarrator: 必需的DOM元素不存在');
            return;
        }

        if (!this.supported) {
            this.button.disabled = true;
            this.button.textContent = '🔇 暂不支持';
            this.button.title = '当前浏览器不支持语音播放功能';
            console.warn('浏览器不支持语音合成');
            return;
        }

        this._bindEvents();
        this._updateVoiceList();
        this.onDescriptionUpdated();
        console.log('✅ DescriptionNarrator 初始化完成');
    }

    _bindEvents() {
        console.log('🔗 绑定按钮点击事件...');
        this.button.addEventListener('click', (e) => {
            console.log('🖱️ 按钮被点击了！');
            console.log('按钮状态 - disabled:', this.button.disabled, 'isSpeaking:', this.isSpeaking);
            e.preventDefault();
            e.stopPropagation();
            this._togglePlayback();
        });

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
        console.log('✅ 事件绑定完成');
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
        console.log('🎯 _togglePlayback 被调用');
        if (!this.supported) {
            console.warn('浏览器不支持语音合成');
            return;
        }
        if (this.isSpeaking) {
            console.log('停止播放');
            this.stop();
        } else {
            console.log('开始播放');
            this.speak();
        }
    }

    speak() {
        console.log('🔊 speak() 方法被调用');
        if (!this.supported) {
            console.warn('不支持语音合成');
            return;
        }

        const text = this._getDescriptionText();
        console.log('获取到的文本:', text ? `${text.substring(0, 50)}...` : '(空)');
        
        if (!text) {
            console.warn('没有可朗读的文本');
            this.button.disabled = true;
            this.button.title = '暂无可朗读的文物介绍';
            return;
        }

        this.stop(true);

        console.log('创建语音合成实例...');
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = this.voice?.lang || 'zh-CN';
        utterance.voice = this.voice || null;
        utterance.rate = 1.0;
        utterance.pitch = 1.0;
        utterance.volume = 1.0;

        utterance.onstart = () => {
            console.log('✅ 语音开始播放');
            this.isSpeaking = true;
            this._updateButtonState();
        };
        utterance.onend = () => {
            console.log('✅ 语音播放结束');
            this._handleSpeechFinished();
        };
        utterance.onerror = (event) => {
            console.error('❌ 语音播放出错:', event.error);
            this._handleSpeechFinished(true);
        };

        this.currentUtterance = utterance;
        console.log('调用 speechSynthesis.speak()...');
        window.speechSynthesis.speak(utterance);
        console.log('speak() 命令已发出');
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
        if (!this.descriptionElement) {
            console.warn('描述元素不存在');
            return '';
        }
        const text = this.descriptionElement.innerText || this.descriptionElement.textContent || '';
        const trimmed = text.trim();
        
        // 过滤掉"加载中..."这样的占位文本
        if (trimmed === '加载中...' || trimmed === '暂无描述信息' || trimmed === '未找到介绍') {
            console.log('描述内容为占位文本，忽略');
            return '';
        }
        
        return trimmed;
    }

    _updateButtonState() {
        if (!this.button) return;
        this.button.textContent = this.isSpeaking ? '⏹ 停止讲解' : '🔊 语音讲解';
        this.button.setAttribute('aria-pressed', this.isSpeaking.toString());
        this.button.classList.toggle('speaking', this.isSpeaking);
    }

    onDescriptionUpdated() {
        console.log('📝 描述更新，检查按钮状态...');
        if (!this.supported || !this.button) {
            console.warn('不支持或按钮不存在');
            return;
        }
        const text = this._getDescriptionText();
        const hasText = !!text;
        console.log('描述文本长度:', text.length, '有内容:', hasText);
        
        this.button.disabled = !hasText;
        if (!hasText) {
            this.button.title = '暂无可朗读的文物介绍';
            this.stop(true);
        } else {
            this.button.title = '朗读当前文物介绍';
            console.log('✅ 语音讲解按钮已启用');
        }
        this._updateButtonState();
    }
}

// 初始化 - 等待DOM加载完成
let narrator = null;

function initNarrator() {
    console.log('🎬 尝试初始化 DescriptionNarrator...');
    narrator = new DescriptionNarrator();
    window.descriptionNarrator = narrator;
    
    // 延迟检查按钮状态，确保描述内容已加载
    setTimeout(() => {
        if (narrator && narrator.onDescriptionUpdated) {
            console.log('🔄 延迟检查描述内容...');
            narrator.onDescriptionUpdated();
        }
    }, 1000);
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initNarrator);
} else {
    // DOM已经加载完成
    initNarrator();
}

export { DescriptionNarrator };
