// modelSelector.js - 管理模型选择功能
import * as THREE from 'three';
import { GLTFLoader } from 'three/loaders/GLTFLoader.js';
import { getModelConfig } from './modelConfig.js';

export class ModelSelector {
    constructor(game) {
        this.game = game;
        console.log("ModelSelector 初始化");
        this.setupEventListeners();
        this.handleUrlParams();
    }

    handleUrlParams() {
        const urlParams = new URLSearchParams(window.location.search);
        const dynasty = urlParams.get('dynasty');
        if (dynasty) {
            console.log(`URL参数检测到朝代: ${dynasty}`);
            setTimeout(() => {
                const modelSelectionOverlay = document.getElementById('modelSelectionOverlay');
                if (modelSelectionOverlay) {
                    modelSelectionOverlay.style.display = 'block';
                    
                    const filterBtn = document.querySelector(`.filter-btn[data-filter-type="dynasty"][data-filter-value="${dynasty}"]`);
                    if (filterBtn) {
                        filterBtn.click();
                        console.log(`已自动触发筛选: ${dynasty}`);
                    } else {
                        console.warn(`未找到朝代筛选按钮: ${dynasty}`);
                    }
                }
            }, 500);
        }
    }

    setupEventListeners() {
        window.addEventListener('loadNewModel', (event) => {
            const modelPath = event.detail.modelPath;
            console.log("模型选择器接收到加载请求:", modelPath);
            this.loadModel(modelPath);
        });
        console.log("ModelSelector 事件监听器已设置");
    }

    loadModel(modelPath) {
        this.showFeedback(`加载模型中: ${modelPath.split('/').pop()}`);
        
        const loader = new GLTFLoader();
        loader.load(
            modelPath,
            (gltf) => this.onModelLoaded(gltf, modelPath),
            (xhr) => {
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
        
        // 清理旧模型资源
        if (this.game.pandaModel) {
            this.game.scene.remove(this.game.pandaModel);
            
            this.game.pandaModel.traverse((child) => {
                if (child.isMesh) {
                    child.geometry?.dispose();
                    if (child.material) {
                        if (Array.isArray(child.material)) {
                            child.material.forEach(mat => {
                                mat.map?.dispose();
                                mat.normalMap?.dispose();
                                mat.roughnessMap?.dispose();
                                mat.metalnessMap?.dispose();
                                mat.dispose();
                            });
                        } else {
                            child.material.map?.dispose();
                            child.material.normalMap?.dispose();
                            child.material.roughnessMap?.dispose();
                            child.material.metalnessMap?.dispose();
                            child.material.dispose();
                        }
                    }
                }
            });
            
            while(this.game.pandaModel.children.length > 0) {
                this.game.pandaModel.remove(this.game.pandaModel.children[0]);
            }
            
            console.log("已移除并清理旧模型资源");
            
            if (this.game.animationMixer) {
                this.game.animationMixer.stopAllAction();
                this.game.animationMixer = null;
                this.game.currentAction = null;
            }
            
            while(this.game.animationButtonsContainer.firstChild){
                this.game.animationButtonsContainer.removeChild(this.game.animationButtonsContainer.firstChild);
            }
            
            this.game.animationActions = {};
            this.game.animationClips = [];
            this.game.pandaModel = null;
        }
        
        this.game.pandaModel = gltf.scene;
        
        const config = getModelConfig(modelPath, this.game.renderDiv.clientHeight);
        
        this.game.pandaModel.scale.set(config.scale, config.scale, config.scale);
        this.game.pandaModel.userData.maxScale = config.maxScale;
        this.game.pandaModel.userData.minScale = config.minScale;
        
        this.game.pandaModel.position.set(0, 0, 0);
        this.game.scene.add(this.game.pandaModel);
        
        // 对需要居中的模型进行偏移校正
        if (config.centerOffset) {
            const tempBox = new THREE.Box3().setFromObject(this.game.pandaModel);
            const tempCenter = new THREE.Vector3();
            tempBox.getCenter(tempCenter);
            
            this.game.pandaModel.position.x = 0 - tempCenter.x;
            this.game.pandaModel.position.y = config.posY - tempCenter.y;
            this.game.pandaModel.position.z = config.posZ - tempCenter.z;
        } else {
            this.game.pandaModel.position.set(0, config.posY, config.posZ);
        }
        
        console.log(`已添加新模型 "${modelPath}" 到场景`);
        
        this.setupAnimations(gltf);
        this.resetInteractionStates();
        
        // 触发模型变更事件，以更新UI和描述
        const modelChangedEvent = new CustomEvent('modelChanged', { 
            detail: { modelPath }
        });
        window.dispatchEvent(modelChangedEvent);
        
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
                
                const button = document.createElement('button');
                
                const displayName = this.game._getTranslatedAnimationName(actionName);
                button.innerText = displayName;
                button.dataset.originalName = actionName;
                
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
            
            // 自动播放默认动画
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
        
        if (this.game.hands) {
            this.game.hands.forEach(hand => {
                if (hand.circles) {
                    hand.circles.forEach(circle => {
                        circle.scale.set(1, 1, 1);
                        circle.material.opacity = 0.3;
                    });
                }
                hand.isPinching = false;
                hand.isFist = false;
            });
        }
        
        this.game._updateInteractionModeButtonStyles();
        
        console.log("✅ 交互状态已重置");
    }    showFeedback(message) {
        console.log("显示反馈信息:", message);
        if (this.game.modelLoadingBubble) {
            this.game.modelLoadingBubble.showMessage(message, 3000);
        } else {
            console.error("模型加载提示框未初始化，无法显示:", message);
        }
    }
}
