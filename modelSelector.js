// modelSelector.js - 管理模型选择功能
import * as THREE from 'three';
import { GLTFLoader } from 'three/loaders/GLTFLoader.js';

export class ModelSelector {
    constructor(game) {
        this.game = game;
        console.log("ModelSelector 初始化");
        this.setupEventListeners();
    }

    setupEventListeners() {
        // 注意：模型加载逻辑已完全移至 game.js 的 loadNewModel 方法
        // ModelSelector 类现在只用于初始化，不处理任何加载逻辑
        console.log("ModelSelector 初始化完成（模型加载由 game.js 处理）");
    }

    // 已禁用：所有模型加载逻辑已移至 game.js
    loadModel(modelPath) {
        console.warn("ModelSelector.loadModel 已禁用，请使用 game.loadNewModel");
        return;
    }

    // 已禁用：所有模型加载逻辑已移至 game.js
    onModelLoaded(gltf, modelPath) {
        console.warn("ModelSelector.onModelLoaded 已禁用");
        return;
    }

    setupAnimations(gltf) {
        this.game.animationMixer = new THREE.AnimationMixer(this.game.pandaModel);
        this.game.animationClips = gltf.animations;
        this.game.animationActions = {};
        
        if (this.game.animationClips && this.game.animationClips.length) {
            this.game.animationClips.forEach((clip, index) => {
                const action = this.game.animationMixer.clipAction(clip);
                const actionName = clip.name || `Animation ${index + 1}`;
                this.game.animationActions[actionName] = action;
                
                // 创建动画按钮
                const button = document.createElement('button');
                
                // 使用翻译函数获取中文按钮文本
                const displayName = this.game._getTranslatedAnimationName(actionName);
                button.innerText = displayName;
                button.dataset.originalName = actionName; // 存储原始名称以供引用
                
                button.style.padding = '5px 10px';
                button.style.fontSize = '13px';
                button.style.backgroundColor = '#f0f0f0';
                button.style.color = 'black';
                button.style.border = '2px solid black';
                button.style.borderRadius = '4px';
                button.style.cursor = 'pointer';
                button.style.transition = 'background-color 0.2s ease, box-shadow 0.2s ease';
                button.style.boxShadow = '2px 2px 0px black';
                button.addEventListener('click', () => this.game._playAnimation(actionName));
                
                this.game.animationButtonsContainer.appendChild(button);
            });
            
            // 寻找并播放默认动画（通常是idle）
            let defaultActionName = Object.keys(this.game.animationActions)[0];
            const idleActionKey = Object.keys(this.game.animationActions).find(name => 
                name.toLowerCase().includes('idle')
            );
            
            if (idleActionKey) {
                defaultActionName = idleActionKey;
            }
            
            if (defaultActionName && this.game.animationActions[defaultActionName]) {
                this.game.currentAction = this.game.animationActions[defaultActionName];
                this.game.currentAction.reset().play();
                this.game._updateButtonStyles(defaultActionName);
            } else {
                this.game.currentAction = null;
            }
        } else {
            console.log('新模型没有嵌入动画');
            this.game.currentAction = null;
        }
    }

    resetInteractionStates() {
        this.game.grabbingHandIndex = -1;
        this.game.pickedUpModel = null;
        this.game.rotateLastHandX = null;
        this.game.scaleInitialPinchDistance = null;
        this.game.scaleInitialModelScale = null;
        this.game.animationControlHandIndex = -1;
        this.game.animationControlInitialPinchY = null;
        
        // 更新交互模式按钮样式
        this.game._updateInteractionModeButtonStyles();
    }    showFeedback(message) {
        // 使用模型加载提示框显示消息，而不是语音反馈系统
        console.log("显示反馈信息:", message);
        if (this.game.modelLoadingBubble) {
            this.game.modelLoadingBubble.showMessage(message, 3000);
        } else {
            console.error("模型加载提示框未初始化，无法显示:", message);
        }
    }
}
