// aiAssistant.js - AI文物助手功能
export class AIAssistant {
    constructor() {
        this.currentModelData = null;
        this.conversationHistory = [];
        
        // 通义千问配置
        this.apiKey = 'sk-a21472fce05548dbbc1e2e0c38ce407d';
        this.apiEndpoint = 'http://localhost:8001/api/chat';  // 通过本地代理调用，避免CORS问题
        this.modelName = 'qwen-turbo';
        this.isProcessing = false;
        this.pendingQuestions = [];
    this.ttsSupported = 'speechSynthesis' in window && 'SpeechSynthesisUtterance' in window;
    this.aiSpeechEnabled = localStorage.getItem('aiSpeechEnabled') !== 'false';
    this.currentSpeechUtterance = null;
    this.speechVoice = null;
        
        console.log('AI助手已就绪');
        
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

        this._updateSpeechToggleButton();
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
                this._selectSpeechVoice();
            });
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
            this.addErrorMessage('管理员尚未配置通义千问API Key，请联系管理员。');
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

        // 通过本地代理调用通义千问API
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
        
        // 解析通义千问API的不同返回格式
        let aiResponse = '';
        
        if (data.output && data.output.text) {
            aiResponse = data.output.text;
        } else if (data.output && data.output.choices && data.output.choices[0]) {
            aiResponse = data.output.choices[0].message.content;
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

    _selectSpeechVoice() {
        if (!this.ttsSupported || !window.speechSynthesis) return;
        const voices = window.speechSynthesis.getVoices?.() || [];
        if (!voices.length) return;

        const preferred = voices.find(v => v.lang?.toLowerCase().startsWith('zh'))
            || voices.find(v => v.lang?.toLowerCase().includes('zh'))
            || voices[0];
        this.speechVoice = preferred || null;
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
        utterance.rate = 1.0;
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
