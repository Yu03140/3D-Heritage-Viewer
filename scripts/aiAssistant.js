// aiAssistant.js - AI文物助手功能
export class AIAssistant {
    constructor() {
        this.currentModelData = null;
        this.conversationHistory = [];
        
        // 通义千问配置
        this.apiKey = 'sk-a21472fce05548dbbc1e2e0c38ce407d';
        this.apiEndpoint = 'http://localhost:8001/api/chat';  // 通过本地代理调用，避免CORS问题
        this.modelName = 'qwen-turbo';
        
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
    }

    handleModelChange(modelPath) {
        // 静默重置对话历史，不产生系统提示
        this.conversationHistory = [];
    }

    setModelData(modelData) {
        this.currentModelData = modelData;
    }

    async handleSubmit() {
        const question = this.inputElement.value.trim();
        if (!question) return;

        if (!this.apiKey || this.apiKey.includes('your-key-here')) {
            this.addErrorMessage('管理员尚未配置有效的API Key，请联系管理员。');
            return;
        }

        this.addUserMessage(question);
        this.inputElement.value = '';
        
        this.setLoading(true);

        try {
            const response = await this.callAI(question);
            this.addAssistantMessage(response);
        } catch (error) {
            console.error('AI调用失败:', error);
            this.addErrorMessage(`AI调用失败: ${error.message}`);
        } finally {
            this.setLoading(false);
        }
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

    addUserMessage(content) {
        this.addMessage('user', content);
    }

    addAssistantMessage(content) {
        this.addMessage('assistant', content);
    }

    addSystemMessage(content) {
        this.addMessage('system', content);
    }

    addErrorMessage(content) {
        this.addMessage('error', content);
    }

    addMessage(type, content) {
        const messageDiv = document.createElement('div');
        messageDiv.className = `ai-message ${type}`;
        
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
