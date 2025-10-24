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
            const response = await fetch('../data/descriptions.json');
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            this.descriptions = await response.json();
            console.log("模型描述数据加载成功");
            
            // 移除这里的初始描述设置，完全依赖modelChanged事件
            
            this.setupEventListeners();
        } catch (error) {
            console.error("加载模型描述数据失败:", error);
            this.descriptionContent.innerHTML = "无法加载模型描述数据。";
        }
    }
    
    extractModelName(modelPath) {
        // 规范化路径
        const normalizedPath = modelPath.replace(/^\.\.\//, '').replace(/^\.\//, '');
        const parts = normalizedPath.split('/');
        
        const fileName = parts[parts.length - 1];
        const fileNameWithoutExt = fileName.split('.')[0];
        
        // 如果文件名是通用的 "scene"，则使用父文件夹名称
        if (fileNameWithoutExt === 'scene' && parts.length > 1) {
            return parts[parts.length - 2];
        }
        
        return fileNameWithoutExt;
    }
    
    setupEventListeners() {
        this.showDescriptionBtn.addEventListener('click', () => {
            this.toggleDescriptionCard();
        });
        
        this.closeDescriptionBtn.addEventListener('click', () => {
            this.hideDescriptionCard();
        });
        
        window.addEventListener('modelChanged', (event) => {
            const modelPath = event.detail.modelPath;
            const modelName = this.extractModelName(modelPath);
            console.log(`描述管理器：从路径 "${modelPath}" 提取模型名 "${modelName}"`);
            this.setModelDescription(modelName);
        });
    }
    
    setModelDescription(modelName) {
        this.currentModelName = modelName;
        
        if (this.descriptions && this.descriptions[modelName]) {
            const modelData = this.descriptions[modelName];
            this.descriptionTitle.textContent = modelData.title;
            
            let htmlContent = '';
            
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
