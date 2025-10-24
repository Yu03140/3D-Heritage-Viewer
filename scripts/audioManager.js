// audioManager.js - 音频管理器，负责管理交互音效和背景音乐播放
// 基础Web音频API声音管理器
function _class_call_check(instance, Constructor) {
    if (!(instance instanceof Constructor)) {
        throw new TypeError("Cannot call a class as a function");
    }
}
function _defineProperties(target, props) {
    for(var i = 0; i < props.length; i++){
        var descriptor = props[i];
        descriptor.enumerable = descriptor.enumerable || false;
        descriptor.configurable = true;
        if ("value" in descriptor) descriptor.writable = true;
        Object.defineProperty(target, descriptor.key, descriptor);
    }
}
function _create_class(Constructor, protoProps, staticProps) {
    if (protoProps) _defineProperties(Constructor.prototype, protoProps);
    if (staticProps) _defineProperties(Constructor, staticProps);
    return Constructor;
}
export var AudioManager = /*#__PURE__*/ function() {
    "use strict";
    function AudioManager() {
        _class_call_check(this, AudioManager);
        var AudioContext = window.AudioContext || window.webkitAudioContext;
        this.audioCtx = null;
        this.isInitialized = false;
        this.lastClickTime = 0;
        this.clickInterval = 200; 
        if (AudioContext) {
            try {
                this.audioCtx = new AudioContext();
                this.isInitialized = true;
                console.log("音频上下文创建成功。");
            } catch (e) {
                console.error("创建音频上下文时出错:", e);
            }
        } else {
            console.warn("此浏览器不支持Web音频API。");
        }
    }
    _create_class(AudioManager, [
        {
            key: "resumeContext",
            value: function resumeContext() {
                if (this.audioCtx && this.audioCtx.state === 'suspended') {
                    this.audioCtx.resume().then(function() {
                        console.log("音频上下文恢复成功。");
                    }).catch(function(e) {
                        return console.error("恢复音频上下文时出错:", e);
                    });
                }
            }
        },
        {
            key: "playInteractionClickSound",
            value: function playInteractionClickSound() {
                if (!this.isInitialized || !this.audioCtx || this.audioCtx.state !== 'running') return;
                var internalCurrentTime = this.audioCtx.currentTime;
                if (internalCurrentTime - this.lastClickTime < this.clickInterval / 1000) {
                    return; 
                }
                this.lastClickTime = internalCurrentTime;
                var oscillator = this.audioCtx.createOscillator();
                var gainNode = this.audioCtx.createGain();
                oscillator.connect(gainNode);
                gainNode.connect(this.audioCtx.destination);
                oscillator.type = 'sine'; 
                oscillator.frequency.setValueAtTime(1200, this.audioCtx.currentTime); 
                oscillator.frequency.exponentialRampToValueAtTime(600, this.audioCtx.currentTime + 0.01); 
                var clickVolume = 0.08; 
                gainNode.gain.setValueAtTime(0, this.audioCtx.currentTime); 
                gainNode.gain.linearRampToValueAtTime(clickVolume, this.audioCtx.currentTime + 0.003); 
                gainNode.gain.exponentialRampToValueAtTime(0.0001, this.audioCtx.currentTime + 0.005); 
                oscillator.start(this.audioCtx.currentTime);
                oscillator.stop(this.audioCtx.currentTime + 0.005); 
            }
        }
    ]);
    return AudioManager;
}();
