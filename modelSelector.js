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
        // 监听模型选择事件
        window.addEventListener('loadNewModel', (event) => {
            const modelPath = event.detail.modelPath;
            console.log("模型选择器接收到加载请求:", modelPath);
            this.loadModel(modelPath);
        });
        console.log("ModelSelector 事件监听器已设置");
    }

    loadModel(modelPath) {
        // 显示加载提示
        this.showFeedback(`加载模型中: ${modelPath.split('/').pop()}`);
        
        // 使用GLTFLoader加载模型
        const loader = new GLTFLoader();
        loader.load(
            modelPath,
            (gltf) => this.onModelLoaded(gltf, modelPath),
            (xhr) => {
                // 加载进度回调
                if (xhr.lengthComputable) {
                    const percent = Math.floor((xhr.loaded / xhr.total) * 100);
                    this.showFeedback(`加载中: ${percent}%`);
                }
            },
            (error) => {
                console.error('加载模型时出错:', error);
                this.showFeedback('加载模型失败');
            }
        );
    }

    onModelLoaded(gltf, modelPath) {
        console.log(`模型 ${modelPath} 加载成功`, gltf);
        
        // 如果已有模型，先清除
        if (this.game.pandaModel) {
            this.game.scene.remove(this.game.pandaModel);
            console.log("已移除旧模型");
            
            if (this.game.animationMixer) {
                this.game.animationMixer.stopAllAction();
                this.game.currentAction = null;
            }
            
            // 清除旧的动画按钮
            while(this.game.animationButtonsContainer.firstChild){
                this.game.animationButtonsContainer.removeChild(this.game.animationButtonsContainer.firstChild);
            }
            
            this.game.animationActions = {};
            this.game.animationClips = [];
        }
        
        // 设置新模型
        this.game.pandaModel = gltf.scene;
        
        // 调整模型比例和位置
        const scale = 80;
        this.game.pandaModel.scale.set(scale, scale, scale);
        
        const sceneHeight = this.game.renderDiv.clientHeight;
        this.game.pandaModel.position.set(0, sceneHeight * -0.45, -1000);
        
        // 将新模型添加到场景
        this.game.scene.add(this.game.pandaModel);
        console.log(`已添加新模型 "${modelPath}" 到场景`);
        
        // 设置新模型的动画
        this.setupAnimations(gltf);
        
        // 重置交互状态
        this.resetInteractionStates();
        
        // 触发模型变更事件，以便更新描述
        const modelChangedEvent = new CustomEvent('modelChanged', { 
            detail: { modelPath }
        });
        window.dispatchEvent(modelChangedEvent);
        
        // 显示成功反馈
        this.showFeedback(`模型 "${modelPath.split('/').pop()}" 已加载`);
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
    }

    showFeedback(message) {
        // 使用模型加载提示框显示消息，而不是语音反馈系统
        if (this.game.modelLoadingBubble) {
            this.game.modelLoadingBubble.showMessage(message, 3000);
        }
    }
}
