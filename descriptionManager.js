// descriptionManager.js - 管理模型文本介绍功能

export class DescriptionManager {
    constructor(game) {
        this.game = game;
        this.descriptions = null;
        this.currentModelName = null;
        this.descriptionCard = document.getElementById('description-card');
        this.descriptionTitle = document.getElementById('description-title');
        this.descriptionContent = document.getElementById('description-content');
        this.showDescriptionBtn = document.getElementById('showDescriptionBtn');
        this.closeDescriptionBtn = document.getElementById('closeDescriptionCard');
        
        this.init();
    }
    
    async init() {
        try {
            // 加载描述数据
            const response = await fetch('data/descriptions.json');
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            this.descriptions = await response.json();
            console.log("模型描述数据加载成功");
            
            // 移除这里的初始描述设置，完全依赖modelChanged事件
            // this.setModelDescription("teacup");
            
            // 设置事件监听器
            this.setupEventListeners();
        } catch (error) {
            console.error("加载模型描述数据失败:", error);
            this.descriptionContent.innerHTML = "无法加载模型描述数据。";
        }
    }
    
    setupEventListeners() {
        // 监听显示描述按钮点击事件
        this.showDescriptionBtn.addEventListener('click', () => {
            this.toggleDescriptionCard();
        });
        
        // 监听关闭描述按钮点击事件
        this.closeDescriptionBtn.addEventListener('click', () => {
            this.hideDescriptionCard();
        });
        
        // 监听模型切换事件
        window.addEventListener('modelChanged', (event) => {
            const modelPath = event.detail.modelPath;
            // 从路径中提取模型名称（不含扩展名）
            const modelName = modelPath.split('/').pop().split('.')[0];
            this.setModelDescription(modelName);
        });
    }
    
    setModelDescription(modelName) {
        this.currentModelName = modelName;
        
        if (this.descriptions && this.descriptions[modelName]) {
            const modelData = this.descriptions[modelName];
            this.descriptionTitle.textContent = modelData.title;
            
            // 构建包含标签的HTML内容
            let htmlContent = '';
            
            // 添加标签区域
            if (modelData.dynasty || modelData.category) {
                htmlContent += '<div class="model-tags">';
                
                if (modelData.dynasty) {
                    htmlContent += `<span class="tag tag-dynasty">${modelData.dynasty}</span>`;
                }
                
                if (modelData.category) {
                    htmlContent += `<span class="tag tag-category">${modelData.category}</span>`;
                }
                
                htmlContent += '</div>';
            }
            
            // 添加描述内容
            htmlContent += `<div class="model-description-text">${modelData.description}</div>`;
            
            this.descriptionContent.innerHTML = htmlContent;
        } else {
            this.descriptionTitle.textContent = "未找到介绍";
            this.descriptionContent.innerHTML = `未找到 "${modelName}" 的介绍信息。`;
        }
    }
    
    toggleDescriptionCard() {
        if (this.descriptionCard.style.display === 'flex') {
            this.hideDescriptionCard();
        } else {
            this.showDescriptionCard();
        }
    }
    
    showDescriptionCard() {
        this.descriptionCard.style.display = 'flex';
    }
    
    hideDescriptionCard() {
        this.descriptionCard.style.display = 'none';
    }
}
