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
            // 从场景中移除
            this.game.scene.remove(this.game.pandaModel);
            
            // 深度清理资源
            this.game.pandaModel.traverse((child) => {
                if (child.isMesh) {
                    if (child.geometry) {
                        child.geometry.dispose();
                    }
                    if (child.material) {
                        if (Array.isArray(child.material)) {
                            child.material.forEach(mat => {
                                if (mat.map) mat.map.dispose();
                                if (mat.normalMap) mat.normalMap.dispose();
                                if (mat.roughnessMap) mat.roughnessMap.dispose();
                                if (mat.metalnessMap) mat.metalnessMap.dispose();
                                mat.dispose();
                            });
                        } else {
                            if (child.material.map) child.material.map.dispose();
                            if (child.material.normalMap) child.material.normalMap.dispose();
                            if (child.material.roughnessMap) child.material.roughnessMap.dispose();
                            if (child.material.metalnessMap) child.material.metalnessMap.dispose();
                            child.material.dispose();
                        }
                    }
                }
            });
            
            // 确保从场景中完全移除（包括所有子对象）
            while(this.game.pandaModel.children.length > 0) {
                this.game.pandaModel.remove(this.game.pandaModel.children[0]);
            }
            
            console.log("已移除并清理旧模型资源");
            
            if (this.game.animationMixer) {
                this.game.animationMixer.stopAllAction();
                this.game.animationMixer = null;
                this.game.currentAction = null;
            }
            
            // 清除旧的动画按钮
            while(this.game.animationButtonsContainer.firstChild){
                this.game.animationButtonsContainer.removeChild(this.game.animationButtonsContainer.firstChild);
            }
            
            this.game.animationActions = {};
            this.game.animationClips = [];
            
            // 将旧模型引用设为 null
            this.game.pandaModel = null;
        }
        
        // 设置新模型
        this.game.pandaModel = gltf.scene;
        
        // 按模型文件名自定义缩放比例和最大缩放、初始位置
        let scale = 80;
        let maxScale = 300;
        let posY = this.game.renderDiv.clientHeight * -0.45;
        let posZ = -1000;
        const fileName = modelPath.split('/').pop();



        if (fileName === 'modelNew.gltf') {
            scale = 20;
        }
         if (fileName === 'copper-chew.gltf') {
            scale = 5000;
            maxScale = 9000;
        }
        if (fileName === 'teacup.gltf') {
            scale = 2000;
            maxScale = 5000;
        }
        if (fileName === 'egypt_djembe_drum.glb') {
            // 让鼓初始位置在屏幕中心
            posY = 450;
            posZ = -500;
            scale = 2000;
            maxScale = 5000;
        }
        if (modelPath.includes('armillary_sphere_1771')) {
            scale = 1000;  
            maxScale = 2000;
            posY = -100;
            posZ = -500;
        }
        if (modelPath.includes('ding_censer_with_an_openwork_cover')) {
            scale = 1;   // 极小缩放以匹配其他模型
            maxScale = 30;
            posY = 0;
            posZ = -1500;
        }
        if (modelPath.includes('mass_chalice')) {
            scale = 12;   
            maxScale = 40;
            posY = 0;
            posZ = -1500;
        }
        if (modelPath.includes('sculpture_bust_of_roza_loewenfeld')) {
            scale = 3000;    
            maxScale = 6000;
            posY = -100;  // 降低位置，因为模型中心偏移较大
            posZ = -500;
        }
        this.game.pandaModel.scale.set(scale, scale, scale);
        this.game.pandaModel.userData.maxScale = maxScale;
        // minScale 设置为初始缩放的 10%，避免缩得太小
        this.game.pandaModel.userData.minScale = Math.max(0.1, scale * 0.1);
        
        // 先临时添加到场景以计算包围盒
        this.game.pandaModel.position.set(0, 0, posZ);
        this.game.scene.add(this.game.pandaModel);
        
        // 对于有中心偏移的模型，计算并补偿偏移
        if (modelPath.includes('sculpture_bust_of_roza_loewenfeld')) {
            // 计算包围盒以获取模型的实际中心
            const tempBox = new THREE.Box3().setFromObject(this.game.pandaModel);
            const tempCenter = new THREE.Vector3();
            tempBox.getCenter(tempCenter);
            
            // 调整位置：让模型的中心对准目标位置
            // 目标是让模型中心在posY，所以位置应该是 posY - 中心偏移
            this.game.pandaModel.position.y = posY - tempCenter.y;
            console.log(`🔧 姆萨乌中心偏移补偿: 目标y=${posY}, 模型中心偏移=${tempCenter.y.toFixed(2)}, 最终位置y=${this.game.pandaModel.position.y.toFixed(2)}`);
        } else {
            // 其他模型直接设置位置
            this.game.pandaModel.position.y = posY;
        }
        
        // 调试信息：输出模型的详细信息
        console.log(`已添加新模型 "${modelPath}" 到场景`);
        console.log(`模型缩放: ${scale}, 最大缩放: ${maxScale}`);
        console.log(`模型位置: x=0, y=${posY.toFixed(2)}, z=${posZ}`);
        
        // 计算模型的包围盒
        const box = new THREE.Box3().setFromObject(this.game.pandaModel);
        const size = new THREE.Vector3();
        const center = new THREE.Vector3();
        box.getSize(size);
        box.getCenter(center);
        console.log(`模型实际尺寸: x=${size.x.toFixed(2)}, y=${size.y.toFixed(2)}, z=${size.z.toFixed(2)}`);
        console.log(`模型中心: x=${center.x.toFixed(2)}, y=${center.y.toFixed(2)}, z=${center.z.toFixed(2)}`);
        
        // 检查模型的可见性和子对象
        console.log(`模型可见性: ${this.game.pandaModel.visible}`);
        console.log(`模型子对象数量: ${this.game.pandaModel.children.length}`);
        
        // 遍历检查所有网格对象
        let meshCount = 0;
        this.game.pandaModel.traverse((child) => {
            if (child.isMesh) {
                meshCount++;
                console.log(`  └─ Mesh ${meshCount}: visible=${child.visible}, material=${child.material?.type || 'none'}`);
            }
        });
        console.log(`🔺 总共找到 ${meshCount} 个网格对象`);
        
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
        // 完全重置所有交互状态
        this.game.grabbingHandIndex = -1;
        this.game.pickedUpModel = null;
        this.game.rotateLastHandX = null;
        this.game.scaleInitialPinchDistance = null;
        this.game.scaleInitialModelScale = null;
        this.game.animationControlHandIndex = -1;
        this.game.animationControlInitialPinchY = null;
        
        // 重置手部可视化
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
        
        // 更新交互模式按钮样式
        this.game._updateInteractionModeButtonStyles();
        
        console.log("✅ 交互状态已重置");
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
