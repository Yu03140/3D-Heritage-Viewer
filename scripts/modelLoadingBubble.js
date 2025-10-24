// modelLoadingBubble.js - 管理模型加载提示框

export class ModelLoadingBubble {
    constructor(renderDiv) {
        this.renderDiv = renderDiv;
        this.bubble = null;
        this.timeout = null;
        this._setup();
    }

    _setup() {
        this.bubble = document.createElement('div');
        this.bubble.id = 'model-loading-bubble';
        this.bubble.style.position = 'absolute';
        this.bubble.style.bottom = '20px';
        this.bubble.style.right = '20px';
        this.bubble.style.padding = '10px 15px';
        this.bubble.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
        this.bubble.style.border = '1px solid #00ccff';
        this.bubble.style.borderRadius = '4px';
        this.bubble.style.boxShadow = '0 0 8px rgba(0, 204, 255, 0.5)';
        this.bubble.style.color = '#ffffff';
        this.bubble.style.fontFamily = '"Arial", "Helvetica Neue", Helvetica, sans-serif';
        this.bubble.style.fontSize = '14px';
        this.bubble.style.maxWidth = '300px';
        this.bubble.style.textAlign = 'right';
        this.bubble.style.zIndex = '25';
        this.bubble.style.opacity = '0';
        this.bubble.style.display = 'none';
        this.bubble.style.transition = 'opacity 0.3s ease-in-out';
        this.bubble.style.pointerEvents = 'none';
        this.bubble.innerHTML = "...";
        this.renderDiv.appendChild(this.bubble);
    }

    showMessage(message, duration = 3000) {
        if (!this.bubble) return;

        if (this.timeout) {
            clearTimeout(this.timeout);
        }

        this.bubble.innerText = message;
        this.bubble.style.display = 'block';
        
        requestAnimationFrame(() => {
            this.bubble.style.opacity = '1';
        });

        this.timeout = setTimeout(() => {
            this.bubble.style.opacity = '0';
            setTimeout(() => {
                if (this.bubble.style.opacity === '0') {
                    this.bubble.style.display = 'none';
                }
            }, 300);
        }, duration);
    }
}
