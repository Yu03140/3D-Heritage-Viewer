// aiAssistant.js - AI文物助手功能
export class AIAssistant {
    constructor() {
        this.currentModelData = null;
        this.conversationHistory = [];
        
        // DeepSeek配置 (通过本地代理)
        this.apiKey = 'sk-0e4fac7233614d8d8b1432f7b6c3ae5a';
        this.apiEndpoint = 'http://localhost:8001/api/chat';  // 通过本地代理调用，避免CORS问题
        this.modelName = 'deepseek-chat';
        this.isProcessing = false;
        this.pendingQuestions = [];
        this.ttsSupported = 'speechSynthesis' in window && 'SpeechSynthesisUtterance' in window;
        this.aiSpeechEnabled = localStorage.getItem('aiSpeechEnabled') !== 'false';
        this.currentSpeechUtterance = null;
        this.speechVoice = null;
        this.availableVoices = [];
        this.selectedVoiceIndex = parseInt(localStorage.getItem('aiSelectedVoiceIndex') || '0');        console.log('AI助手已就绪');
        
        this.initUI();
        this.setupEventListeners();
    }

    initUI() {
        this.messagesContainer = document.getElementById('aiMessages');
        this.inputElement = document.getElementById('aiInput');
        this.submitButton = document.getElementById('aiSubmitBtn');
        this.btnText = this.submitButton.querySelector('.btn-text');
        this.btnLoading = this.submitButton.querySelector('.btn-loading');
        this.speechToggleButton = document.getElementById('aiSpeechToggle');
        this.voiceSelectButton = document.getElementById('aiVoiceSelect');

        this._updateSpeechToggleButton();
        this._initVoiceSelector();
    }

    setupEventListeners() {
        this.submitButton.addEventListener('click', () => this.handleSubmit());
        
        // 回车发送（Shift+Enter换行）
        this.inputElement.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                this.handleSubmit();
            }
        });

        // 监听模型变更，切换时重置对话历史
        window.addEventListener('modelChanged', (e) => {
            this.handleModelChange(e.detail.modelPath);
        });

        if (this.speechToggleButton) {
            this.speechToggleButton.addEventListener('click', () => {
                if (!this.ttsSupported) return;
                this.setAssistantSpeechEnabled(!this.aiSpeechEnabled);
            });
        }

        if (this.ttsSupported && window.speechSynthesis) {
            window.speechSynthesis.addEventListener('voiceschanged', () => {
                this._loadAvailableVoices();
                this._selectSpeechVoice();
            });
            // 立即加载语音列表
            this._loadAvailableVoices();
        }

        document.addEventListener('visibilitychange', () => {
            if (document.hidden) {
                this.stopAssistantSpeech();
            }
        });

        window.addEventListener('beforeunload', () => this.stopAssistantSpeech());
    }

    handleModelChange(modelPath) {
        // 静默重置对话历史，不产生系统提示
        this.conversationHistory = [];
        this.stopAssistantSpeech();
    }

    setModelData(modelData) {
        this.currentModelData = modelData;
    }

    async handleSubmit() {
        await this.submitQuestion(this.inputElement.value, { source: 'text', clearInput: true });
    }

    async submitQuestion(rawQuestion, { source = 'text', clearInput = false } = {}) {
        const question = (rawQuestion || '').trim();
        if (!question) return;

        if (!this.isApiConfigured()) {
            this.addErrorMessage('管理员尚未配置AI API Key，请联系管理员。');
            return;
        }

        if (clearInput && this.inputElement) {
            this.inputElement.value = '';
        }

        this.addUserMessage(question, { source });

        const payload = { question };
        if (this.isProcessing) {
            this.pendingQuestions.push(payload);
            return;
        }

        await this._processQuestionPayload(payload);
    }

    async _processQuestionPayload({ question }) {
        this.isProcessing = true;
        this.setLoading(true);

        try {
            const response = await this.callAI(question);
            this.addAssistantMessage(response);
        } catch (error) {
            console.error('AI调用失败:', error);
            this.addErrorMessage(`AI调用失败: ${error.message}`);
        } finally {
            this.setLoading(false);
            this.isProcessing = false;

            if (this.pendingQuestions.length > 0) {
                const nextPayload = this.pendingQuestions.shift();
                this._processQuestionPayload(nextPayload);
            }
        }
    }

    isApiConfigured() {
        return this.apiKey && this.apiKey !== 'sk-your-qianwen-api-key-here';
    }

    async callAI(userQuestion) {
        const systemPrompt = this.buildSystemPrompt();
        
        const messages = [
            { role: 'system', content: systemPrompt },
            ...this.conversationHistory,
            { role: 'user', content: userQuestion }
        ];

        // 通过本地代理调用AI API (DeepSeek)
        const response = await fetch(this.apiEndpoint, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model: this.modelName,
                input: {
                    messages: messages
                },
                parameters: {
                    temperature: 0.7,
                    max_tokens: 150  // 限制回复长度
                }
            })
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error('API错误响应:', errorText);
            throw new Error(`API调用失败 (${response.status})`);
        }

        const data = await response.json();
        console.log('API响应数据:', data);
        
        // 解析API返回（代理已统一格式）
        let aiResponse = '';
        
        if (data.output && data.output.text) {
            aiResponse = data.output.text;
        } else if (data.output && data.output.choices && data.output.choices[0]) {
            aiResponse = data.output.choices[0].message.content;
        } else if (data.choices && data.choices[0]) {
            // 直接OpenAI格式（备用）
            aiResponse = data.choices[0].message.content;
        } else {
            console.error('完整响应:', JSON.stringify(data, null, 2));
            throw new Error('API返回格式无法解析，请查看控制台');
        }

        this.conversationHistory.push(
            { role: 'user', content: userQuestion },
            { role: 'assistant', content: aiResponse }
        );

        // 限制对话历史长度，防止上下文过长
        if (this.conversationHistory.length > 20) { // 保留最近10轮对话
            this.conversationHistory = this.conversationHistory.slice(-20);
        }

        return aiResponse;
    }

    buildSystemPrompt() {
        let prompt = `你是一个专业的文物讲解员，请用简洁、通俗的语言回答问题，每次回答控制在100字以内。\n\n`;

        if (this.currentModelData) {
            prompt += `当前展示的文物信息：\n`;
            prompt += `名称：${this.currentModelData.title || '未知'}\n`;
            
            if (this.currentModelData.dynasty) {
                prompt += `朝代：${this.currentModelData.dynasty}\n`;
            }
            
            if (this.currentModelData.year) {
                prompt += `年代：${this.currentModelData.year}\n`;
            }
            
            if (this.currentModelData.category) {
                prompt += `类别：${this.currentModelData.category}\n`;
            }
            
            if (this.currentModelData.description) {
                prompt += `介绍：${this.currentModelData.description}\n`;
            }
            
            prompt += `\n请基于以上信息简洁回答，不超过100字。`;
        } else {
            prompt += `请简洁回答用户的文物历史问题，不超过100字。`;
        }

        return prompt;
    }

    addUserMessage(content, options = {}) {
        this.addMessage('user', content, options);
    }

    addAssistantMessage(content) {
        this.addMessage('assistant', content);
        this.speakAssistantMessage(content);
    }

    addSystemMessage(content) {
        this.addMessage('system', content);
    }

    addErrorMessage(content) {
        this.addMessage('error', content);
    }

    addMessage(type, content, options = {}) {
        const messageDiv = document.createElement('div');
        messageDiv.className = `ai-message ${type}`;
        if (type === 'user' && options.source === 'speech') {
            messageDiv.classList.add('speech-origin');
            const badge = document.createElement('span');
            badge.className = 'speech-origin-badge';
            badge.textContent = '语音输入';
            messageDiv.appendChild(badge);
        }
        
        const contentDiv = document.createElement('div');
        contentDiv.className = 'message-content';
        contentDiv.textContent = content;
        
        messageDiv.appendChild(contentDiv);
        
        if (type !== 'system') {
            const timeDiv = document.createElement('div');
            timeDiv.className = 'message-time';
            timeDiv.textContent = new Date().toLocaleTimeString('zh-CN', { 
                hour: '2-digit', 
                minute: '2-digit' 
            });
            messageDiv.appendChild(timeDiv);
        }
        
        this.messagesContainer.appendChild(messageDiv);
        
        // 自动滚动到最新消息
        this.messagesContainer.parentElement.scrollTop = this.messagesContainer.parentElement.scrollHeight;
    }

    setLoading(isLoading) {
        this.submitButton.disabled = isLoading;
        this.inputElement.disabled = isLoading;
        
        if (isLoading) {
            this.btnText.style.display = 'none';
            this.btnLoading.style.display = 'inline-flex';
        } else {
            this.btnText.style.display = 'inline';
            this.btnLoading.style.display = 'none';
        }
    }

    setAssistantSpeechEnabled(enabled) {
        if (!this.ttsSupported) return;
        this.aiSpeechEnabled = enabled;
        localStorage.setItem('aiSpeechEnabled', enabled ? 'true' : 'false');
        if (!enabled) {
            this.stopAssistantSpeech();
        }
        this._updateSpeechToggleButton();
    }

    _updateSpeechToggleButton() {
        if (!this.speechToggleButton) return;

        if (!this.ttsSupported) {
            this.speechToggleButton.disabled = true;
            this.speechToggleButton.textContent = '🔇 浏览器不支持语音播报';
            this.speechToggleButton.classList.remove('active');
            return;
        }

        if (this.aiSpeechEnabled) {
            this.speechToggleButton.textContent = '🔊 语音播报开启';
            this.speechToggleButton.classList.add('active');
        } else {
            this.speechToggleButton.textContent = '🔈 语音播报关闭';
            this.speechToggleButton.classList.remove('active');
        }
    }

    _loadAvailableVoices() {
        if (!this.ttsSupported || !window.speechSynthesis) return;
        const voices = window.speechSynthesis.getVoices?.() || [];
        if (!voices.length) return;

        // 优先选择中文语音，并按质量排序
        const chineseVoices = voices.filter(v => {
            const lang = v.lang?.toLowerCase() || '';
            return lang.includes('zh') || lang.includes('cn');
        });

        // 优先级：Google > Microsoft > 其他在线 > 本地
        const sortedVoices = chineseVoices.sort((a, b) => {
            const aScore = this._getVoiceQualityScore(a);
            const bScore = this._getVoiceQualityScore(b);
            return bScore - aScore;
        });

        this.availableVoices = sortedVoices.length > 0 ? sortedVoices : voices;
        this._updateVoiceSelector();
    }

    _getVoiceQualityScore(voice) {
        let score = 0;
        const name = voice.name?.toLowerCase() || '';
        const lang = voice.lang?.toLowerCase() || '';

        // Google 语音通常质量最好
        if (name.includes('google')) score += 100;
        
        // Microsoft 语音也不错
        if (name.includes('microsoft')) score += 80;
        
        // 在线语音优于本地
        if (!voice.localService) score += 50;
        
        // 女声通常更自然
        if (name.includes('female') || name.includes('女')) score += 30;
        
        // 普通话优先
        if (lang.includes('zh-cn') || lang.includes('cmn')) score += 20;
        
        return score;
    }

    _selectSpeechVoice() {
        if (!this.availableVoices.length) return;
        
        // 使用用户选择的语音，如果索引无效则使用第一个
        const index = Math.min(this.selectedVoiceIndex, this.availableVoices.length - 1);
        this.speechVoice = this.availableVoices[index] || this.availableVoices[0];
        
        console.log(`🔊 已选择语音: ${this.speechVoice?.name} (${this.speechVoice?.lang})`);
    }

    _initVoiceSelector() {
        if (!this.voiceSelectButton) return;
        
        this.voiceSelectButton.addEventListener('click', () => {
            if (!this.ttsSupported || !this.availableVoices.length) return;
            this._showVoiceSelectionDialog();
        });
    }

    _updateVoiceSelector() {
        if (!this.voiceSelectButton) return;
        
        if (!this.ttsSupported || !this.availableVoices.length) {
            this.voiceSelectButton.disabled = true;
            this.voiceSelectButton.textContent = '🎤 无可用语音';
            return;
        }

        this.voiceSelectButton.disabled = false;
        const currentVoice = this.availableVoices[this.selectedVoiceIndex];
        if (currentVoice) {
            const shortName = currentVoice.name.split(' ')[0].substring(0, 8);
            this.voiceSelectButton.textContent = `🎤 ${shortName}`;
            this.voiceSelectButton.title = `当前语音: ${currentVoice.name}`;
        }
    }

    _showVoiceSelectionDialog() {
        const dialog = document.createElement('div');
        dialog.className = 'voice-selection-overlay';
        dialog.innerHTML = `
            <div class="voice-selection-dialog">
                <h3>选择语音引擎</h3>
                <div class="voice-list" id="voiceList"></div>
                <div class="voice-dialog-actions">
                    <button class="voice-test-btn" id="voiceTestBtn">🔊 试听</button>
                    <button class="voice-close-btn" id="voiceCloseBtn">关闭</button>
                </div>
            </div>
        `;

        document.body.appendChild(dialog);

        const voiceList = dialog.querySelector('#voiceList');
        this.availableVoices.forEach((voice, index) => {
            const item = document.createElement('div');
            item.className = 'voice-item';
            if (index === this.selectedVoiceIndex) {
                item.classList.add('selected');
            }
            
            const qualityBadge = this._getVoiceQualityBadge(voice);
            item.innerHTML = `
                <div class="voice-info">
                    <div class="voice-name">${voice.name} ${qualityBadge}</div>
                    <div class="voice-lang">${voice.lang} ${voice.localService ? '(本地)' : '(在线)'}</div>
                </div>
            `;
            
            item.addEventListener('click', () => {
                dialog.querySelectorAll('.voice-item').forEach(i => i.classList.remove('selected'));
                item.classList.add('selected');
                this.selectedVoiceIndex = index;
                localStorage.setItem('aiSelectedVoiceIndex', index.toString());
                this._selectSpeechVoice();
                this._updateVoiceSelector();
            });
            
            voiceList.appendChild(item);
        });

        dialog.querySelector('#voiceTestBtn').addEventListener('click', () => {
            this.stopAssistantSpeech();
            const testText = '你好，我是AI文物助手，很高兴为您讲解文物知识。';
            this.speakAssistantMessage(testText);
        });

        dialog.querySelector('#voiceCloseBtn').addEventListener('click', () => {
            document.body.removeChild(dialog);
        });

        dialog.addEventListener('click', (e) => {
            if (e.target === dialog) {
                document.body.removeChild(dialog);
            }
        });
    }

    _getVoiceQualityBadge(voice) {
        const name = voice.name?.toLowerCase() || '';
        if (name.includes('google')) return '<span class="quality-badge high">推荐</span>';
        if (name.includes('microsoft')) return '<span class="quality-badge medium">优质</span>';
        if (!voice.localService) return '<span class="quality-badge low">在线</span>';
        return '';
    }

    speakAssistantMessage(text) {
        if (!this.ttsSupported || !this.aiSpeechEnabled) return;
        const content = (text || '').trim();
        if (!content) return;

        this.stopAssistantSpeech();
        if (!this.speechVoice) {
            this._selectSpeechVoice();
        }

        const utterance = new SpeechSynthesisUtterance(content);
        utterance.lang = this.speechVoice?.lang || 'zh-CN';
        if (this.speechVoice) {
            utterance.voice = this.speechVoice;
        }
        // 稍微加快语速，使其更自然
        utterance.rate = 1.1;
        utterance.pitch = 1.0;
        utterance.volume = 1.0;

        utterance.onend = () => {
            if (this.currentSpeechUtterance === utterance) {
                this.currentSpeechUtterance = null;
            }
        };
        utterance.onerror = (event) => {
            console.error('AI语音播报出错:', event.error);
            if (this.currentSpeechUtterance === utterance) {
                this.currentSpeechUtterance = null;
            }
            this._updateSpeechToggleButton();
        };

        this.currentSpeechUtterance = utterance;
        window.speechSynthesis.speak(utterance);
    }

    stopAssistantSpeech() {
        if (!this.ttsSupported) return;
        if (window.speechSynthesis?.speaking || window.speechSynthesis?.pending) {
            window.speechSynthesis.cancel();
        }
        this.currentSpeechUtterance = null;
    }

}

// 全局AI助手实例
let aiAssistant = null;

document.addEventListener('DOMContentLoaded', () => {
    if (document.getElementById('aiMessages')) {
        aiAssistant = new AIAssistant();
        window.aiAssistant = aiAssistant; // 挂载到window供调试
    }
});

export { aiAssistant };
