// modelLoadingBubble.js - 管理模型加载提示框

export class ModelLoadingBubble {
    constructor(renderDiv) {
        this.renderDiv = renderDiv;
        this.bubble = null;
        this.timeout = null;
        this._setup();
    }

    _setup() {
        // 创建模型加载提示框
        this.bubble = document.createElement('div');
        this.bubble.id = 'model-loading-bubble';
        this.bubble.style.position = 'absolute';
        this.bubble.style.bottom = '20px'; // 位于右下角
        this.bubble.style.right = '20px';
        this.bubble.style.padding = '10px 15px';
        this.bubble.style.backgroundColor = 'rgba(0, 0, 0, 0.7)'; // 深色背景
        this.bubble.style.border = '1px solid #00ccff'; // 蓝色边框
        this.bubble.style.borderRadius = '4px';
        this.bubble.style.boxShadow = '0 0 8px rgba(0, 204, 255, 0.5)'; // 蓝色发光效果
        this.bubble.style.color = '#ffffff'; // 白色文字
        this.bubble.style.fontFamily = '"Arial", "Helvetica Neue", Helvetica, sans-serif';
        this.bubble.style.fontSize = '14px';
        this.bubble.style.maxWidth = '300px';
        this.bubble.style.textAlign = 'right';
        this.bubble.style.zIndex = '25';
        this.bubble.style.opacity = '0'; // 初始隐藏
        this.bubble.style.display = 'none';
        this.bubble.style.transition = 'opacity 0.3s ease-in-out';
        this.bubble.style.pointerEvents = 'none'; // 不可交互
        this.bubble.innerHTML = "..."; // 默认文本
        this.renderDiv.appendChild(this.bubble);
    }

    showMessage(message, duration = 3000) {
        if (!this.bubble) return;

        // 清除先前的超时
        if (this.timeout) {
            clearTimeout(this.timeout);
        }

        // 显示消息
        this.bubble.innerText = message;
        this.bubble.style.display = 'block';
        
        // 使用 requestAnimationFrame 确保在下一帧渲染前设置透明度，以触发过渡动画
        requestAnimationFrame(() => {
            this.bubble.style.opacity = '1';
        });

        // 设置超时隐藏
        this.timeout = setTimeout(() => {
            this.bubble.style.opacity = '0';
            // 等待过渡动画完成后隐藏元素
            setTimeout(() => {
                if (this.bubble.style.opacity === '0') {
                    this.bubble.style.display = 'none';
                }
            }, 300); // 300ms 与 CSS 过渡时间匹配
        }, duration);
    }
}
