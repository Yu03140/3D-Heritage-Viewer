// game.js - 主游戏类，负责3D场景渲染、手势追踪、模型交互等核心功能
import * as THREE from 'three';
import { GLTFLoader } from 'three/loaders/GLTFLoader.js';
import { HandLandmarker, FilesetResolver } from 'https://esm.sh/@mediapipe/tasks-vision@0.10.14';
import { AudioManager } from './audioManager.js';
import { SpeechManager } from './SpeechManager.js';
import { ModelSelector } from './modelSelector.js';
import { ModelLoadingBubble } from './modelLoadingBubble.js';
import { DescriptionManager } from './descriptionManager.js';

// ==================== 配置常量 ====================
const CONFIG = {
    hand: {
        smoothingFactor: 0.4,           // 手部平滑系数
        pinchThreshold: 45,              // 捏合判定阈值（像素）
        fingertipRadius: 8,              // 指尖圆圈半径
        wristRadius: 12,                 // 手腕圆圈半径
        circleSegments: 16,              // 圆圈分段数
        defaultOpacity: 0.3,             // 默认透明度
        grabOpacity: 1.0,                // 抓取时透明度
        fingertipIndices: [0, 4, 8, 12, 16, 20]  // 手腕+五指尖的索引
    },
    interaction: {
        rotateSensitivityKey: 'rotateSensitivity',
        scaleSensitivityKey: 'scaleSensitivity',
        defaultRotateSensitivity: 0.02,
        defaultScaleSensitivity: 0.2,
        animationScrollThreshold: 40,    // 动画切换的垂直移动阈值
        pulseSpeed: 8,                   // 抓取脉冲动画速度
        pulseAmplitude: 0.5,             // 脉冲幅度
        pulseBaseScale: 1.0              // 基础缩放
    },
    model: {
        defaultScale: 2000,              // 茶壶初始缩放
        defaultMaxScale: 5000,
        defaultMinScale: 10,
        positionYFactor: -0.45,          // Y轴位置因子
        positionZ: -1000,                // Z轴位置
        minZ: -200,
        maxZ: 50
    },
    camera: {
        nearPlane: 1,
        farPlane: 2000
    },
    light: {
        ambientIntensity: 1.5,
        directionalIntensity: 1.8
    }
};

// 交互模式配置
const INTERACTION_MODES = {
    drag: {
        base: '#00FFFF',
        text: '#000000',
        hand: new THREE.Color('#00FFFF'),
        instruction: '捏合手指来抓取并移动模型'
    },
    rotate: {
        base: '#FF00FF',
        text: '#FFFFFF',
        hand: new THREE.Color('#FF00FF'),
        instruction: '捏合手指并左右移动手来旋转'
    },
    scale: {
        base: '#FFFF00',
        text: '#000000',
        hand: new THREE.Color('#FFFF00'),
        instruction: '使用双手，两手捏合并调整手之间的距离来缩放'
    },
    fixed: {
        base: '#808080',
        text: '#FFFFFF',
        hand: new THREE.Color('#808080'),
        instruction: '固定模式：手势识别已禁用'
    }
};

// 动画名称翻译映射
const ANIMATION_TRANSLATIONS = {
    "idle": "待机",
    "walk": "行走",
    "run": "跑步",
    "jump": "跳跃",
    "attack": "攻击",
    "dance": "舞蹈",
    "animation 1": "动画 1",
    "animation 2": "动画 2",
    "animation 3": "动画 3",
    "animation 4": "动画 4",
    "animation 5": "动画 5"
};

// 手部连接定义（MediaPipe Hand Landmarks）
const HAND_CONNECTIONS = [
    [0, 1], [1, 2], [2, 3], [3, 4],        // 拇指
    [0, 5], [5, 6], [6, 7], [7, 8],        // 食指
    [0, 9], [9, 10], [10, 11], [11, 12],   // 中指
    [0, 13], [13, 14], [14, 15], [15, 16], // 无名指
    [0, 17], [17, 18], [18, 19], [19, 20], // 小指
    [5, 9], [9, 13], [13, 17]              // 手掌连接
];

// ==================== 工具函数 ====================
class CoordinateTransformer {
    /**
     * 将MediaPipe地标坐标转换为屏幕坐标
     */
    static landmarkToScreen(landmark, videoParams, canvasWidth, canvasHeight) {
        const originalX = landmark.x * videoParams.videoNaturalWidth;
        const originalY = landmark.y * videoParams.videoNaturalHeight;
        const normX = (originalX - videoParams.offsetX) / videoParams.visibleWidth;
        const normY = (originalY - videoParams.offsetY) / videoParams.visibleHeight;
        
        return {
            x: (1 - normX) * canvasWidth - canvasWidth / 2,
            y: (1 - normY) * canvasHeight - canvasHeight / 2
        };
    }

    /**
     * 检查地标是否在屏幕内
     */
    static isLandmarkOnScreen(landmark, videoParams) {
        const originalX = landmark.x * videoParams.videoNaturalWidth;
        const originalY = landmark.y * videoParams.videoNaturalHeight;
        const normX = (originalX - videoParams.offsetX) / videoParams.visibleWidth;
        const normY = (originalY - videoParams.offsetY) / videoParams.visibleHeight;
        
        return normX >= 0 && normX <= 1 && normY >= 0 && normY <= 1;
    }
}

class GestureDetector {
    /**
     * 检测捏合手势
     */
    static detectPinch(landmarks, videoParams, canvasWidth, canvasHeight) {
        const thumbTip = landmarks[4];
        const indexTip = landmarks[8];
        
        if (!thumbTip || !indexTip) return null;

        const thumbScreen = CoordinateTransformer.landmarkToScreen(thumbTip, videoParams, canvasWidth, canvasHeight);
        const indexScreen = CoordinateTransformer.landmarkToScreen(indexTip, videoParams, canvasWidth, canvasHeight);
        
        const dx = thumbScreen.x - indexScreen.x;
        const dy = thumbScreen.y - indexScreen.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        if (distance < CONFIG.hand.pinchThreshold) {
            return {
                isPinching: true,
                pinchPoint: {
                    x: (thumbScreen.x + indexScreen.x) / 2,
                    y: (thumbScreen.y + indexScreen.y) / 2
                }
            };
        }
        
        return { isPinching: false, pinchPoint: null };
    }

    /**
     * 检测握拳手势
     */
    static detectFist(landmarks) {
        const isTipNearMCP = (tipIdx, mcpIdx, threshold = 0.08) => {
            const tip = landmarks[tipIdx];
            const mcp = landmarks[mcpIdx];
            if (!tip || !mcp) return false;
            
            const dx = tip.x - mcp.x;
            const dy = tip.y - mcp.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            return distance < threshold;
        };

        let curledFingers = 0;
        if (isTipNearMCP(8, 5)) curledFingers++;   // 食指
        if (isTipNearMCP(12, 9)) curledFingers++;  // 中指
        if (isTipNearMCP(16, 13)) curledFingers++; // 无名指
        if (isTipNearMCP(20, 17)) curledFingers++; // 小指
        
        return curledFingers >= 3;
    }
}

// ==================== 主Game类 ====================
export class Game {
    constructor(renderDiv, initialModelPath = 'assets/teacup.gltf') {
        this.renderDiv = renderDiv;
        this.initialModelPath = initialModelPath;
        this._initProperties();
        this._init().catch(error => {
            console.error("初始化失败:", error);
            this._showError("初始化失败，请查看控制台");
        });
    }

    // ========== 初始化 ==========
    _initProperties() {
        // Three.js核心对象
        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.clock = new THREE.Clock();

        // 视频和手部追踪
        this.videoElement = null;
        this.handLandmarker = null;
        this.lastVideoTime = -1;
        this.hands = [];
        this.lastLandmarkPositions = [[], []];

        // 材质
        this.handLineMaterial = null;
        this.fingertipMaterialHand1 = null;
        this.fingertipMaterialHand2 = null;

        // 模型和动画
        this.pandaModel = null;
        this.animationMixer = null;
        this.animationClips = [];
        this.animationActions = {};
        this.currentAction = null;

        // 交互状态
        this.gameState = 'loading';
        this.interactionMode = 'drag';
        this.grabbingHandIndex = -1;
        this.pickedUpModel = null;
        this.modelDragOffset = new THREE.Vector3();
        this.modelGrabStartDepth = 0;

        // 旋转模式
        this.rotateLastHandX = null;
        this.rotateSensitivity = this._loadSensitivity('rotateSensitivity', CONFIG.interaction.defaultRotateSensitivity);

        // 缩放模式
        this.scaleInitialPinchDistance = null;
        this.scaleInitialModelScale = null;
        this.scaleSensitivity = this._loadSensitivity('scaleSensitivity', CONFIG.interaction.defaultScaleSensitivity);

        // 动画控制
        this.animationControlHandIndex = -1;
        this.animationControlInitialPinchY = null;

        // 管理器
        this.audioManager = new AudioManager();
        this.speechManager = null;
        this.modelSelector = null;
        this.modelLoadingBubble = null;
        this.descriptionManager = null;

        // UI元素
        this.speechBubble = null;
        this.speechBubbleTimeout = null;
        this.isSpeechActive = false;
        this.gameOverContainer = null;
        this.gameOverText = null;
        this.restartHintText = null;
        this.animationButtonsContainer = null;
        this.interactionModeContainer = null;
        this.interactionModeButtons = {};
        this.instructionTextElement = null;
        this.speechStatusElement = null;
        this.speechStatusTextElement = null;
    }

    _loadSensitivity(key, defaultValue) {
        const saved = localStorage.getItem(key);
        return saved ? parseFloat(saved) : defaultValue;
    }

    async _init() {
        this._setupDOM();
        this._setupThree();
        this._setupSpeechRecognition();
        
        await this._loadAssets();
        await this._setupHandTracking();
        await this.videoElement.play();
        
        this.audioManager.resumeContext();
        
        // 启动语音识别
        const speechEnabled = localStorage.getItem('speechRecognitionEnabled') !== 'false';
        if (speechEnabled) {
            this.speechManager.requestPermissionAndStart();
            this._showSpeechMessage("语音识别已启用", 2000);
        } else {
            this._showSpeechMessage("语音识别已禁用", 2000);
        }
        
        this.clock.start();
        window.addEventListener('resize', this._onResize.bind(this));
        this.gameState = 'tracking';
        this._animate();

        // 初始化额外组件
        this.modelLoadingBubble = new ModelLoadingBubble(this.renderDiv);
        this.modelSelector = new ModelSelector(this);
        this.descriptionManager = new DescriptionManager(this);

        // 监听设置变化
        this._setupStorageListener();
    }

    _setupStorageListener() {
        window.addEventListener('storage', (e) => {
            if (e.key === 'scaleSensitivity') {
                this.scaleSensitivity = parseFloat(e.newValue);
                this.modelLoadingBubble?.showMessage("缩放灵敏度已更新", 2000);
            } else if (e.key === 'rotateSensitivity') {
                this.rotateSensitivity = parseFloat(e.newValue);
                this.modelLoadingBubble?.showMessage("旋转灵敏度已更新", 2000);
            }
        });

        // 监听模型切换事件
        window.addEventListener('loadNewModel', (e) => {
            const modelPath = e.detail.modelPath;
            console.log("接收到加载新模型事件:", modelPath);
            this.loadNewModel(modelPath);
        });
    }

    async loadNewModel(modelPath) {
        try {
            // 显示加载提示
            this.modelLoadingBubble?.showMessage("正在加载模型...", 0);

            // 移除旧模型
            if (this.pandaModel) {
                this.scene.remove(this.pandaModel);
                this.pandaModel = null;
            }

            // 清空动画
            this.animationMixer = null;
            this.animationClips = [];
            this.animationActions = {};
            this.currentAction = null;

            // 清空动画按钮
            const buttonContainer = document.getElementById('animation-buttons');
            if (buttonContainer) {
                buttonContainer.innerHTML = '';
            }

            // 加载新模型
            const gltfLoader = new GLTFLoader();
            await new Promise((resolve, reject) => {
                gltfLoader.load(
                    modelPath,
                    (gltf) => {
                        this.pandaModel = gltf.scene;
                        this.animationMixer = new THREE.AnimationMixer(this.pandaModel);
                        this.animationClips = gltf.animations;

                        // 设置模型
                        const scale = CONFIG.model.defaultScale;
                        this.pandaModel.scale.set(scale, scale, scale);
                        this.pandaModel.userData.maxScale = CONFIG.model.defaultMaxScale;
                        this.pandaModel.userData.minScale = CONFIG.model.defaultMinScale;

                        const sceneHeight = this.renderDiv.clientHeight;
                        this.pandaModel.position.set(
                            0,
                            sceneHeight * CONFIG.model.positionYFactor,
                            CONFIG.model.positionZ
                        );

                        this.scene.add(this.pandaModel);

                        // 处理动画
                        if (this.animationClips?.length) {
                            this._setupModelAnimations();
                        }

                        // 触发modelChanged事件
                        window.dispatchEvent(new CustomEvent('modelChanged', {
                            detail: { modelPath: modelPath }
                        }));

                        resolve();
                    },
                    undefined,
                    reject
                );
            });

            this.modelLoadingBubble?.showMessage("模型加载成功!", 2000);
        } catch (error) {
            console.error("加载模型失败:", error);
            this.modelLoadingBubble?.showMessage("加载模型失败", 3000);
        }
    }

    // ========== DOM设置 ==========
    _setupDOM() {
        this._setupContainer();
        this._setupVideo();
        this._setupStatusContainer();
        this._setupSpeechBubble();
        this._setupAnimationButtons();
        this._setupInteractionModeButtons();
        this._setupDragAndDrop();
    }

    _setupContainer() {
        this.renderDiv.style.cssText = `
            position: relative;
            width: 100vw;
            height: 100vh;
            overflow: hidden;
            background: #111;
        `;
    }

    _setupVideo() {
        this.videoElement = document.createElement('video');
        this.videoElement.style.cssText = `
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            object-fit: cover;
            transform: scaleX(-1);
            z-index: 0;
        `;
        this.videoElement.autoplay = true;
        this.videoElement.muted = true;
        this.videoElement.playsInline = true;
        this.renderDiv.appendChild(this.videoElement);
    }

    _setupStatusContainer() {
        this.gameOverContainer = document.createElement('div');
        this.gameOverContainer.style.cssText = `
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            z-index: 10;
            display: none;
            pointer-events: none;
            text-align: center;
            color: white;
            font-family: "Arial", "Helvetica Neue", Helvetica, sans-serif;
        `;

        this.gameOverText = document.createElement('div');
        this.gameOverText.style.cssText = `
            font-size: clamp(36px, 10vw, 72px);
            font-weight: bold;
            margin-bottom: 10px;
        `;
        
        this.restartHintText = document.createElement('div');
        this.restartHintText.style.cssText = `
            font-size: clamp(16px, 3vw, 24px);
            font-weight: normal;
            opacity: 0.8;
        `;
        this.restartHintText.innerText = '(点击重启追踪)';

        this.gameOverContainer.appendChild(this.gameOverText);
        this.gameOverContainer.appendChild(this.restartHintText);
        this.renderDiv.appendChild(this.gameOverContainer);
    }

    _setupSpeechBubble() {
        this.speechBubble = document.createElement('div');
        this.speechBubble.id = 'speech-bubble';
        this.speechBubble.style.cssText = `
            position: absolute;
            top: 10px;
            left: 50%;
            transform: translateX(-50%);
            padding: 15px 25px;
            background-color: rgba(255, 255, 255, 0.9);
            border: 2px solid black;
            border-radius: 4px;
            box-shadow: 4px 4px 0px rgba(0,0,0,1);
            color: #333;
            font-family: "Arial", "Helvetica Neue", Helvetica, sans-serif;
            font-size: clamp(16px, 3vw, 22px);
            max-width: 80%;
            text-align: center;
            z-index: 25;
            opacity: 0;
            transition: opacity 0.5s ease-in-out, transform 0.3s ease-in-out, 
                        box-shadow 0.3s ease-in-out, border 0.3s ease-in-out, 
                        padding 0.3s ease-in-out, font-size 0.3s ease-in-out, 
                        top 0.3s ease-in-out;
            pointer-events: none;
        `;
        this.speechBubble.innerHTML = "...";
        this.renderDiv.appendChild(this.speechBubble);
    }

    _setupAnimationButtons() {
        this.animationButtonsContainer = document.createElement('div');
        this.animationButtonsContainer.style.cssText = `
            position: absolute;
            top: 10px;
            left: 10px;
            z-index: 30;
            display: none;
            flex-direction: column;
            gap: 4px;
            opacity: 0;
            transition: opacity 0.3s ease-in-out;
        `;
        this.renderDiv.appendChild(this.animationButtonsContainer);
    }

    _setupInteractionModeButtons() {
        this.interactionModeContainer = document.createElement('div');
        this.interactionModeContainer.style.cssText = `
            position: absolute;
            top: 10px;
            right: 10px;
            z-index: 30;
            display: flex;
            flex-direction: column;
            gap: 4px;
        `;

        ['拖拽', '旋转', '缩放', '固定'].forEach(modeName => {
            const modeMap = { '拖拽': 'drag', '旋转': 'rotate', '缩放': 'scale', '固定': 'fixed' };
            const modeId = modeMap[modeName];
            
            const button = document.createElement('button');
            button.innerText = modeName;
            button.id = `interaction-mode-${modeId}`;
            button.style.cssText = `
                padding: 10px 22px;
                font-size: 18px;
                border: 2px solid black;
                border-radius: 4px;
                cursor: pointer;
                font-weight: bold;
                transition: background-color 0.2s ease, color 0.2s ease, box-shadow 0.2s ease;
                box-shadow: 2px 2px 0px black;
            `;
            
            button.addEventListener('click', () => this._setInteractionMode(modeId));
            this.interactionModeContainer.appendChild(button);
            this.interactionModeButtons[modeId] = button;
        });

        this.renderDiv.appendChild(this.interactionModeContainer);
        this._updateInteractionModeButtonStyles();
        this._updateInstructionText();
    }

    // ========== Three.js设置 ==========
    _setupThree() {
        const width = this.renderDiv.clientWidth;
        const height = this.renderDiv.clientHeight;

        this.scene = new THREE.Scene();
        this.camera = new THREE.OrthographicCamera(
            width / -2, width / 2, 
            height / 2, height / -2, 
            CONFIG.camera.nearPlane, 
            CONFIG.camera.farPlane
        );
        this.camera.position.z = 100;

        this.renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
        this.renderer.setSize(width, height);
        this.renderer.setPixelRatio(window.devicePixelRatio);
        this.renderer.domElement.style.cssText = `
            position: absolute;
            top: 0;
            left: 0;
            z-index: 1;
        `;
        this.renderDiv.appendChild(this.renderer.domElement);

        // 灯光
        const ambientLight = new THREE.AmbientLight(0xffffff, CONFIG.light.ambientIntensity);
        this.scene.add(ambientLight);
        
        const directionalLight = new THREE.DirectionalLight(0xffffff, CONFIG.light.directionalIntensity);
        directionalLight.position.set(0, 0, 100);
        this.scene.add(directionalLight);

        // 初始化手部可视化
        this._initHandVisualization();
    }

    _initHandVisualization() {
        const initialColor = INTERACTION_MODES[this.interactionMode].hand;

        this.handLineMaterial = new THREE.LineBasicMaterial({
            color: 0x00ccff,
            linewidth: 8
        });

        this.fingertipMaterialHand1 = new THREE.MeshBasicMaterial({
            color: initialColor.clone(),
            side: THREE.DoubleSide,
            transparent: true,
            opacity: CONFIG.hand.defaultOpacity
        });

        this.fingertipMaterialHand2 = new THREE.MeshBasicMaterial({
            color: initialColor.clone(),
            side: THREE.DoubleSide,
            transparent: true,
            opacity: CONFIG.hand.defaultOpacity
        });

        for (let i = 0; i < 2; i++) {
            const lineGroup = new THREE.Group();
            lineGroup.visible = false;
            this.scene.add(lineGroup);

            this.hands.push({
                landmarks: null,
                anchorPos: new THREE.Vector3(),
                lineGroup: lineGroup,
                isPinching: false,
                pinchPointScreen: new THREE.Vector2(),
                isFist: false
            });
        }
    }

    // ========== 资源加载 ==========
    async _loadAssets() {
        const gltfLoader = new GLTFLoader();
        
        try {
            await new Promise((resolve, reject) => {
                gltfLoader.load(this.initialModelPath, 
                    (gltf) => this._onModelLoaded(gltf, resolve),
                    undefined,
                    reject
                );
            });
        } catch (error) {
            console.error("加载模型失败:", error);
            this._showError("加载3D模型失败");
            throw error;
        }
    }

    _onModelLoaded(gltf, resolve) {
        this.pandaModel = gltf.scene;
        this.animationMixer = new THREE.AnimationMixer(this.pandaModel);
        this.animationClips = gltf.animations;

        // 设置模型
        const scale = CONFIG.model.defaultScale;
        this.pandaModel.scale.set(scale, scale, scale);
        this.pandaModel.userData.maxScale = CONFIG.model.defaultMaxScale;
        this.pandaModel.userData.minScale = CONFIG.model.defaultMinScale;

        const sceneHeight = this.renderDiv.clientHeight;
        this.pandaModel.position.set(
            0, 
            sceneHeight * CONFIG.model.positionYFactor, 
            CONFIG.model.positionZ
        );

        this.scene.add(this.pandaModel);

        // 处理动画
        if (this.animationClips?.length) {
            this._setupModelAnimations();
        }

        // 触发modelChanged事件，让描述管理器知道初始模型已加载
        window.dispatchEvent(new CustomEvent('modelChanged', {
            detail: { modelPath: this.initialModelPath }
        }));

        resolve();
    }

    _setupModelAnimations() {
        this.animationClips.forEach((clip, index) => {
            const action = this.animationMixer.clipAction(clip);
            const actionName = clip.name || `Animation ${index + 1}`;
            this.animationActions[actionName] = action;

            this._createAnimationButton(actionName);
        });

        // 播放默认动画
        const defaultName = this._findDefaultAnimation();
        if (defaultName) {
            this.currentAction = this.animationActions[defaultName];
            this.currentAction.play();
            this._updateButtonStyles(defaultName);
        }
    }

    _findDefaultAnimation() {
        const actionNames = Object.keys(this.animationActions);
        const idleAction = actionNames.find(name => name.toLowerCase().includes('idle'));
        return idleAction || actionNames[0];
    }

    _createAnimationButton(actionName) {
        const button = document.createElement('button');
        const displayName = this._translateAnimationName(actionName);
        
        button.innerText = displayName;
        button.dataset.originalName = actionName;
        button.style.cssText = `
            padding: 5px 10px;
            font-size: 13px;
            background-color: #f0f0f0;
            color: black;
            border: 2px solid black;
            border-radius: 4px;
            cursor: pointer;
            transition: background-color 0.2s ease, box-shadow 0.2s ease;
            box-shadow: 2px 2px 0px black;
        `;
        
        button.addEventListener('click', () => this._playAnimation(actionName));
        this.animationButtonsContainer.appendChild(button);
    }

    _translateAnimationName(englishName) {
        const lowerName = englishName.toLowerCase();
        
        for (const [key, value] of Object.entries(ANIMATION_TRANSLATIONS)) {
            if (lowerName === key.toLowerCase() || lowerName.includes(key.toLowerCase())) {
                return value;
            }
        }
        
        if (lowerName.startsWith("animation ")) {
            const num = lowerName.replace("animation ", "");
            return `动画 ${num}`;
        }
        
        return englishName;
    }

    // ========== 手势追踪设置 ==========
    async _setupHandTracking() {
        try {
            const vision = await FilesetResolver.forVisionTasks(
                'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/wasm'
            );

            this.handLandmarker = await HandLandmarker.createFromOptions(vision, {
                baseOptions: {
                    modelAssetPath: "https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task",
                    delegate: 'GPU'
                },
                numHands: 2,
                runningMode: 'VIDEO'
            });

            const stream = await navigator.mediaDevices.getUserMedia({
                video: { facingMode: 'user', width: { ideal: 1920 }, height: { ideal: 1080 } },
                audio: false
            });

            this.videoElement.srcObject = stream;

            return new Promise(resolve => {
                this.videoElement.onloadedmetadata = () => {
                    this.videoElement.style.width = this.renderDiv.clientWidth + 'px';
                    this.videoElement.style.height = this.renderDiv.clientHeight + 'px';
                    resolve();
                };
            });
        } catch (error) {
            console.error('手势追踪或摄像头设置错误:', error);
            this._showError(`摄像头/手势追踪错误: ${error.message}。请允许摄像头访问。`);
            throw error;
        }
    }

    // ========== 手势更新 ==========
    _updateHands() {
        if (!this.handLandmarker || !this.videoElement.srcObject || 
            this.videoElement.readyState < 2 || this.videoElement.videoWidth === 0) {
            return;
        }

        // 固定模式下禁用手势识别
        if (this.interactionMode === 'fixed') {
            this.hands.forEach(hand => {
                if (hand.lineGroup) hand.lineGroup.visible = false;
            });
            return;
        }

        const videoTime = this.videoElement.currentTime;
        if (videoTime <= this.lastVideoTime) return;
        
        this.lastVideoTime = videoTime;

        try {
            const results = this.handLandmarker.detectForVideo(this.videoElement, performance.now());
            const videoParams = this._getVisibleVideoParameters();
            if (!videoParams) return;

            const canvasWidth = this.renderDiv.clientWidth;
            const canvasHeight = this.renderDiv.clientHeight;

            this._processHands(results, videoParams, canvasWidth, canvasHeight);
            this._handleScaleMode();
        } catch (error) {
            console.error("手势检测错误:", error);
        }
    }

    _processHands(results, videoParams, canvasWidth, canvasHeight) {
        for (let i = 0; i < this.hands.length; i++) {
            const hand = this.hands[i];
            
            if (results.landmarks && results.landmarks[i]) {
                const smoothedLandmarks = this._smoothLandmarks(results.landmarks[i], i);
                hand.landmarks = smoothedLandmarks;

                // 更新手部位置
                this._updateHandPosition(hand, smoothedLandmarks, videoParams, canvasWidth, canvasHeight);

                // 检测手势
                const prevIsPinching = hand.isPinching;
                const pinchResult = GestureDetector.detectPinch(smoothedLandmarks, videoParams, canvasWidth, canvasHeight);
                
                if (pinchResult) {
                    hand.isPinching = pinchResult.isPinching;
                    if (pinchResult.pinchPoint) {
                        hand.pinchPointScreen.set(pinchResult.pinchPoint.x, pinchResult.pinchPoint.y);
                    }
                }

                hand.isFist = GestureDetector.detectFist(smoothedLandmarks);

                // 处理交互逻辑
                this._handleInteraction(i, hand, prevIsPinching);

                // 更新手部可视化
                this._updateHandLines(i, smoothedLandmarks, videoParams, canvasWidth, canvasHeight);
            } else {
                this._handleHandDisappeared(i, hand);
            }

            // 播放交互音效
            this._playInteractionSound(i, hand);
        }
    }

    _smoothLandmarks(rawLandmarks, handIndex) {
        if (!this.lastLandmarkPositions[handIndex] || 
            this.lastLandmarkPositions[handIndex].length !== rawLandmarks.length) {
            this.lastLandmarkPositions[handIndex] = rawLandmarks.map(lm => ({ ...lm }));
        }

        const smoothed = rawLandmarks.map((lm, idx) => {
            const prev = this.lastLandmarkPositions[handIndex][idx];
            const alpha = CONFIG.hand.smoothingFactor;
            return {
                x: alpha * lm.x + (1 - alpha) * prev.x,
                y: alpha * lm.y + (1 - alpha) * prev.y,
                z: alpha * lm.z + (1 - alpha) * prev.z
            };
        });

        this.lastLandmarkPositions[handIndex] = smoothed.map(lm => ({ ...lm }));
        return smoothed;
    }

    _updateHandPosition(hand, landmarks, videoParams, canvasWidth, canvasHeight) {
        const palm = landmarks[9]; // 中指MCP关节
        const screenPos = CoordinateTransformer.landmarkToScreen(palm, videoParams, canvasWidth, canvasHeight);
        hand.anchorPos.set(screenPos.x, screenPos.y, 1);
    }

    _handleInteraction(handIndex, hand, prevIsPinching) {
        if (this.interactionMode === 'fixed') {
            this._releaseModel(handIndex);
            return;
        }

        switch (this.interactionMode) {
            case 'drag':
                this._handleDragInteraction(handIndex, hand, prevIsPinching);
                break;
            case 'rotate':
                this._handleRotateInteraction(handIndex, hand, prevIsPinching);
                break;
            case 'scale':
                // 缩放模式在_handleScaleMode中处理
                break;
        }
    }

    _handleDragInteraction(handIndex, hand, prevIsPinching) {
        if (hand.isPinching) {
            if (!prevIsPinching && this.grabbingHandIndex === -1 && this.pandaModel) {
                // 开始拖拽
                this.grabbingHandIndex = handIndex;
                this.pickedUpModel = this.pandaModel;
                this.modelGrabStartDepth = this.pickedUpModel.position.z;

                const pinchPoint3D = this._screenToWorld(hand.pinchPointScreen);
                pinchPoint3D.z = this.modelGrabStartDepth;
                this.modelDragOffset.subVectors(this.pickedUpModel.position, pinchPoint3D);
            } else if (this.grabbingHandIndex === handIndex && this.pickedUpModel) {
                // 更新位置
                const newPoint3D = this._screenToWorld(hand.pinchPointScreen);
                newPoint3D.z = this.modelGrabStartDepth;
                this.pickedUpModel.position.addVectors(newPoint3D, this.modelDragOffset);
                
                // 限制Z轴范围
                this.pickedUpModel.position.z = Math.max(
                    CONFIG.model.minZ, 
                    Math.min(CONFIG.model.maxZ, this.pickedUpModel.position.z)
                );
            }
        } else if (prevIsPinching && this.grabbingHandIndex === handIndex) {
            this._releaseModel(handIndex);
        }
    }

    _handleRotateInteraction(handIndex, hand, prevIsPinching) {
        if (hand.isPinching) {
            if (!prevIsPinching && this.grabbingHandIndex === -1 && this.pandaModel) {
                // 开始旋转
                this.grabbingHandIndex = handIndex;
                this.pickedUpModel = this.pandaModel;
                this.rotateLastHandX = hand.pinchPointScreen.x;
            } else if (this.grabbingHandIndex === handIndex && this.pickedUpModel && this.rotateLastHandX !== null) {
                // 更新旋转
                const deltaX = hand.pinchPointScreen.x - this.rotateLastHandX;
                if (Math.abs(deltaX) > 0.5) {
                    this.pickedUpModel.rotation.y -= deltaX * this.rotateSensitivity;
                }
                this.rotateLastHandX = hand.pinchPointScreen.x;
            }
        } else if (prevIsPinching && this.grabbingHandIndex === handIndex) {
            this._releaseModel(handIndex);
            this.rotateLastHandX = null;
        }
    }

    _handleScaleMode() {
        if (this.interactionMode !== 'scale') return;

        const hand0 = this.hands[0];
        const hand1 = this.hands[1];

        const bothHandsPinching = hand0?.landmarks && hand1?.landmarks && 
                                   hand0.isPinching && hand1.isPinching;

        if (bothHandsPinching) {
            const dist = hand0.pinchPointScreen.distanceTo(hand1.pinchPointScreen);

            if (this.scaleInitialPinchDistance === null) {
                // 开始缩放
                this.scaleInitialPinchDistance = dist;
                this.scaleInitialModelScale = this.pandaModel.scale.clone();
                this.grabbingHandIndex = 0;
                this.pickedUpModel = this.pandaModel;
            } else {
                // 继续缩放
                const deltaDistance = dist - this.scaleInitialPinchDistance;
                const scaleChange = deltaDistance * this.scaleSensitivity;
                let newScale = this.scaleInitialModelScale.x + scaleChange;

                const minScale = this.pandaModel.userData?.minScale || CONFIG.model.defaultMinScale;
                const maxScale = this.pandaModel.userData?.maxScale || CONFIG.model.defaultMaxScale;
                newScale = Math.max(minScale, Math.min(maxScale, newScale));

                this.pandaModel.scale.set(newScale, newScale, newScale);
            }
        } else if (this.scaleInitialPinchDistance !== null) {
            // 结束缩放
            this.scaleInitialPinchDistance = null;
            this.scaleInitialModelScale = null;
            this.grabbingHandIndex = -1;
            this.pickedUpModel = null;
        }
    }

    _handleHandDisappeared(handIndex, hand) {
        if (this.interactionMode === 'drag' || this.interactionMode === 'rotate') {
            if (this.grabbingHandIndex === handIndex) {
                this._releaseModel(handIndex);
            }
        } else if (this.interactionMode === 'scale' && this.scaleInitialPinchDistance !== null) {
            const hand0Exists = this.hands[0]?.landmarks;
            const hand1Exists = this.hands[1]?.landmarks;
            if (!hand0Exists || !hand1Exists) {
                this.scaleInitialPinchDistance = null;
                this.scaleInitialModelScale = null;
                this.grabbingHandIndex = -1;
                this.pickedUpModel = null;
            }
        }

        hand.landmarks = null;
        hand.isPinching = false;
        hand.isFist = false;
        if (hand.lineGroup) hand.lineGroup.visible = false;
    }

    _releaseModel(handIndex) {
        this.grabbingHandIndex = -1;
        this.pickedUpModel = null;
    }

    _playInteractionSound(handIndex, hand) {
        let isActive = false;

        if (this.interactionMode === 'drag' || this.interactionMode === 'rotate') {
            isActive = this.grabbingHandIndex === handIndex && 
                      this.pickedUpModel === this.pandaModel;
        } else if (this.interactionMode === 'scale') {
            isActive = this.scaleInitialPinchDistance !== null && 
                      (handIndex === 0 || handIndex === 1);
        }

        if (hand.isPinching && isActive) {
            this.audioManager.playInteractionClickSound();
        }
    }

    _screenToWorld(screenPoint) {
        const ndcX = screenPoint.x / (this.renderDiv.clientWidth / 2);
        const ndcY = screenPoint.y / (this.renderDiv.clientHeight / 2);
        const point3D = new THREE.Vector3(ndcX, ndcY, 0.5);
        point3D.unproject(this.camera);
        return point3D;
    }

    // ========== 手部可视化 ==========
    _updateHandLines(handIndex, landmarks, videoParams, canvasWidth, canvasHeight) {
        const hand = this.hands[handIndex];
        const lineGroup = hand.lineGroup;

        // 确定是否正在交互
        const isInteracting = this._isHandInteracting(handIndex);
        const material = handIndex === 0 ? this.fingertipMaterialHand1 : this.fingertipMaterialHand2;
        if (material) {
            material.opacity = isInteracting ? CONFIG.hand.grabOpacity : CONFIG.hand.defaultOpacity;
        }

        // 清空旧的可视化
        while (lineGroup.children.length) {
            const child = lineGroup.children[0];
            lineGroup.remove(child);
            if (child.geometry) child.geometry.dispose();
        }

        if (!landmarks?.length || !videoParams) {
            lineGroup.visible = false;
            return;
        }

        // 检查是否所有地标都在屏幕内
        const allOnScreen = landmarks.every(lm => 
            CoordinateTransformer.isLandmarkOnScreen(lm, videoParams)
        );

        if (!allOnScreen) {
            lineGroup.visible = false;
            return;
        }

        // 转换为屏幕坐标
        const points3D = landmarks.map(lm => {
            const screen = CoordinateTransformer.landmarkToScreen(lm, videoParams, canvasWidth, canvasHeight);
            return new THREE.Vector3(screen.x, screen.y, 1.1);
        });

        // 绘制连接线
        HAND_CONNECTIONS.forEach(([idx1, idx2]) => {
            const p1 = points3D[idx1]?.clone().setZ(1);
            const p2 = points3D[idx2]?.clone().setZ(1);
            if (p1 && p2) {
                const geometry = new THREE.BufferGeometry().setFromPoints([p1, p2]);
                const line = new THREE.Line(geometry, this.handLineMaterial);
                lineGroup.add(line);
            }
        });

        // 绘制指尖圆圈
        CONFIG.hand.fingertipIndices.forEach(idx => {
            const pos = points3D[idx];
            if (pos) {
                const radius = idx === 0 ? CONFIG.hand.wristRadius : CONFIG.hand.fingertipRadius;
                const geometry = new THREE.CircleGeometry(radius, CONFIG.hand.circleSegments);
                const circle = new THREE.Mesh(geometry, material);
                circle.position.copy(pos);

                // 添加脉冲效果
                if (isInteracting) {
                    const pulseProgress = (1 + Math.sin(this.clock.elapsedTime * CONFIG.interaction.pulseSpeed)) / 2;
                    const scale = CONFIG.interaction.pulseBaseScale + 
                                 pulseProgress * CONFIG.interaction.pulseAmplitude;
                    circle.scale.set(scale, scale, 1);
                } else {
                    circle.scale.set(CONFIG.interaction.pulseBaseScale, CONFIG.interaction.pulseBaseScale, 1);
                }

                lineGroup.add(circle);
            }
        });

        lineGroup.visible = true;
    }

    _isHandInteracting(handIndex) {
        if (this.interactionMode === 'drag' || this.interactionMode === 'rotate') {
            return this.grabbingHandIndex === handIndex && this.pickedUpModel === this.pandaModel;
        } else if (this.interactionMode === 'scale') {
            return this.scaleInitialPinchDistance !== null && (handIndex === 0 || handIndex === 1);
        }
        return false;
    }

    // ========== 视频参数计算 ==========
    _getVisibleVideoParameters() {
        if (!this.videoElement || this.videoElement.videoWidth === 0 || 
            this.videoElement.videoHeight === 0) {
            return null;
        }

        const vNatW = this.videoElement.videoWidth;
        const vNatH = this.videoElement.videoHeight;
        const rW = this.renderDiv.clientWidth;
        const rH = this.renderDiv.clientHeight;

        if (vNatW === 0 || vNatH === 0 || rW === 0 || rH === 0) return null;

        const videoAR = vNatW / vNatH;
        const renderAR = rW / rH;

        let offsetX, offsetY, visibleWidth, visibleHeight;

        if (videoAR > renderAR) {
            // 视频更宽，水平裁剪
            const scale = rH / vNatH;
            const scaledVideoWidth = vNatW * scale;
            const totalCroppedX = (scaledVideoWidth - rW) / scale;
            offsetX = totalCroppedX / 2;
            offsetY = 0;
            visibleWidth = vNatW - totalCroppedX;
            visibleHeight = vNatH;
        } else {
            // 视频更高，垂直裁剪
            const scale = rW / vNatW;
            const scaledVideoHeight = vNatH * scale;
            const totalCroppedY = (scaledVideoHeight - rH) / scale;
            offsetX = 0;
            offsetY = totalCroppedY / 2;
            visibleWidth = vNatW;
            visibleHeight = vNatH - totalCroppedY;
        }

        if (visibleWidth <= 0 || visibleHeight <= 0) {
            return {
                offsetX: 0, offsetY: 0,
                visibleWidth: vNatW, visibleHeight: vNatH,
                videoNaturalWidth: vNatW, videoNaturalHeight: vNatH
            };
        }

        return {
            offsetX, offsetY, visibleWidth, visibleHeight,
            videoNaturalWidth: vNatW, videoNaturalHeight: vNatH
        };
    }

    // ========== 语音识别 ==========
    _setupSpeechRecognition() {
        // 创建语音状态显示
        this.speechStatusElement = document.createElement('div');
        this.speechStatusElement.style.cssText = `
            background-color: rgba(0,0,0,0.6);
            color: white;
            padding: 5px 10px;
            border-radius: 4px;
            font-size: 14px;
            margin-top: 4px;
        `;
        this.speechStatusElement.innerHTML = '语音识别状态：<span id="speech-status-text">已启用</span>';
        this.speechStatusTextElement = this.speechStatusElement.querySelector('#speech-status-text');
        this.interactionModeContainer.appendChild(this.speechStatusElement);

        this.updateSpeechStatusDisplay = () => {
            const enabled = localStorage.getItem('speechRecognitionEnabled') !== 'false';
            if (this.speechStatusTextElement) {
                this.speechStatusTextElement.textContent = enabled ? '已启用' : '已禁用';
                this.speechStatusElement.style.backgroundColor = enabled ? 
                    'rgba(0,123,255,0.6)' : 'rgba(108,117,125,0.6)';
            }
        };

        this.updateSpeechStatusDisplay();

        window.addEventListener('storage', (e) => {
            if (e.key === 'speechRecognitionEnabled') {
                this.speechManager.updateSpeechRecognitionState();
                this.updateSpeechStatusDisplay();
            }
        });

        // 初始化SpeechManager
        this.speechManager = new SpeechManager(
            (finalTranscript, interimTranscript) => this._onSpeechResult(finalTranscript, interimTranscript),
            (isActive) => this._onSpeechActiveChange(isActive),
            (command) => this._onSpeechCommand(command)
        );

        if (this.speechBubble) {
            this.speechBubble.innerHTML = "...";
            this.speechBubble.style.opacity = '0.7';
            this._updateSpeechBubbleAppearance();
        }
    }

    _onSpeechResult(finalTranscript, interimTranscript) {
        if (!this.speechBubble) return;

        clearTimeout(this.speechBubbleTimeout);

        if (finalTranscript) {
            this.speechBubble.innerHTML = finalTranscript;
            this.speechBubble.style.opacity = '1';
            this.speechBubbleTimeout = setTimeout(() => {
                this.speechBubble.innerHTML = "...";
                this.speechBubble.style.opacity = '0.7';
                this._updateSpeechBubbleAppearance();
            }, 2000);
        } else if (interimTranscript) {
            this.speechBubble.innerHTML = `<i style="color: #888;">${interimTranscript}</i>`;
            this.speechBubble.style.opacity = '1';
        } else {
            this.speechBubbleTimeout = setTimeout(() => {
                if (this.speechBubble.innerHTML !== "...") {
                    this.speechBubble.innerHTML = "...";
                }
                this.speechBubble.style.opacity = '0.7';
                this._updateSpeechBubbleAppearance();
            }, 500);
        }

        this._updateSpeechBubbleAppearance();
    }

    _onSpeechActiveChange(isActive) {
        this.isSpeechActive = isActive;
        this._updateSpeechBubbleAppearance();
    }

    _onSpeechCommand(command) {
        const validCommands = ['drag', 'rotate', 'scale', 'fixed'];
        if (validCommands.includes(command.toLowerCase())) {
            this._setInteractionMode(command.toLowerCase());
        }
    }

    _updateSpeechBubbleAppearance() {
        if (!this.speechBubble) return;

        const isPlaceholder = this.speechBubble.innerHTML === "..." || 
                             this.speechBubble.innerText === "...";
        const showActive = this.isSpeechActive && !isPlaceholder;

        const translateY = isPlaceholder ? '-5px' : '0px';
        const scale = showActive ? '1.15' : '1.0';
        this.speechBubble.style.transform = `translateX(-50%) translateY(${translateY}) scale(${scale})`;

        if (showActive) {
            this.speechBubble.style.boxShadow = '5px 5px 0px #007bff';
            this.speechBubble.style.padding = '18px 28px';
            this.speechBubble.style.fontSize = 'clamp(20px, 3.5vw, 26px)';
            this.speechBubble.style.top = '15px';
        } else {
            this.speechBubble.style.boxShadow = '4px 4px 0px rgba(0,0,0,1)';
            this.speechBubble.style.padding = '15px 25px';
            this.speechBubble.style.fontSize = 'clamp(16px, 3vw, 22px)';
            this.speechBubble.style.top = '10px';
        }
    }

    _showSpeechMessage(message, duration) {
        if (this.speechBubble) {
            this.speechBubble.innerHTML = message;
            this.speechBubble.style.opacity = '1';
            setTimeout(() => {
                this.speechBubble.innerHTML = "...";
                this.speechBubble.style.opacity = '0.7';
                this._updateSpeechBubbleAppearance();
            }, duration);
        }
    }

    // ========== 交互模式管理 ==========
    _setInteractionMode(mode) {
        if (this.interactionMode === mode) return;

        this.interactionMode = mode;

        const modeNames = { 'drag': '拖拽', 'rotate': '旋转', 'scale': '缩放', 'fixed': '固定' };
        this.modelLoadingBubble?.showMessage(`已切换至${modeNames[mode]}操作`, 3000);

        // 释放当前抓取
        if (this.grabbingHandIndex !== -1 && this.pickedUpModel) {
            this.grabbingHandIndex = -1;
            this.pickedUpModel = null;
            this.rotateLastHandX = null;
            this.scaleInitialPinchDistance = null;
            this.scaleInitialModelScale = null;
        }

        this._updateHandMaterialsForMode(mode);
        this._updateInteractionModeButtonStyles();
        this._updateInstructionText();
    }

    _updateHandMaterialsForMode(mode) {
        const color = INTERACTION_MODES[mode]?.hand || new THREE.Color(0x00ccff);
        if (this.fingertipMaterialHand1) this.fingertipMaterialHand1.color.set(color);
        if (this.fingertipMaterialHand2) this.fingertipMaterialHand2.color.set(color);
    }

    _updateInteractionModeButtonStyles() {
        for (const modeKey in this.interactionModeButtons) {
            const button = this.interactionModeButtons[modeKey];
            const modeConfig = INTERACTION_MODES[modeKey];

            if (modeKey === this.interactionMode) {
                button.style.backgroundColor = modeConfig.base;
                button.style.color = modeConfig.text;
                button.style.boxShadow = '1px 1px 0px black';
            } else {
                button.style.backgroundColor = 'rgba(255, 255, 255, 0.5)';
                button.style.color = modeConfig.base;
                button.style.boxShadow = '2px 2px 0px black';
            }
        }

        // 动画按钮容器始终隐藏（已移除动画功能）
        if (this.animationButtonsContainer) {
            this.animationButtonsContainer.style.opacity = '0';
            this.animationButtonsContainer.style.display = 'none';
        }
    }

    _updateInstructionText() {
        if (this.instructionTextElement) {
            const instruction = INTERACTION_MODES[this.interactionMode]?.instruction || "使用手势进行交互";
            this.instructionTextElement.innerText = instruction;
            this.instructionTextElement.style.bottom = '10px';
        }
    }

    // ========== 动画播放 ==========
    _playAnimation(name) {
        if (!this.animationActions[name]) return;

        const newAction = this.animationActions[name];
        if (this.currentAction === newAction && newAction.isRunning()) return;

        if (this.currentAction) {
            this.currentAction.fadeOut(0.5);
        }

        newAction.reset().fadeIn(0.5).play();
        this.currentAction = newAction;
        this._updateButtonStyles(name);
    }

    _updateButtonStyles(activeAnimationName) {
        const buttons = this.animationButtonsContainer.children;
        for (let i = 0; i < buttons.length; i++) {
            const button = buttons[i];
            const isActive = button.dataset.originalName === activeAnimationName;
            
            button.style.backgroundColor = isActive ? '#007bff' : '#f0f0f0';
            button.style.color = isActive ? 'white' : 'black';
            button.style.fontWeight = isActive ? 'bold' : 'normal';
            button.style.boxShadow = isActive ? '1px 1px 0px black' : '2px 2px 0px black';
        }
    }

    // ========== 拖拽上传 ==========
    _setupDragAndDrop() {
        this.renderDiv.addEventListener('dragover', (e) => {
            e.preventDefault();
            e.dataTransfer.dropEffect = 'copy';
            this.renderDiv.style.border = '2px dashed #007bff';
        });

        this.renderDiv.addEventListener('dragleave', () => {
            this.renderDiv.style.border = 'none';
        });

        this.renderDiv.addEventListener('drop', (e) => {
            e.preventDefault();
            this.renderDiv.style.border = 'none';

            if (e.dataTransfer.files?.length > 0) {
                const file = e.dataTransfer.files[0];
                const fileName = file.name.toLowerCase();
                const fileType = file.type.toLowerCase();

                if (fileName.endsWith('.gltf') || fileName.endsWith('.glb') || 
                    fileType === 'model/gltf+json' || fileType === 'model/gltf-binary') {
                    this._loadDroppedModel(file);
                } else {
                    this._showTemporaryMessage(`"${file.name}" 不是GLTF模型`, 3000);
                }
            }
        });
    }

    _loadDroppedModel(file) {
        const reader = new FileReader();

        reader.onload = (e) => {
            this._parseAndLoadGltf(e.target.result, file.name, file.type);
        };

        reader.onerror = (error) => {
            console.error(`读取文件错误 ${file.name}:`, error);
            this._showError(`读取文件 ${file.name} 失败`);
        };

        const fileNameLower = file.name.toLowerCase();
        const fileTypeLower = file.type?.toLowerCase() || '';

        if (fileNameLower.endsWith('.glb') || fileTypeLower === 'model/gltf-binary') {
            reader.readAsArrayBuffer(file);
        } else if (fileNameLower.endsWith('.gltf') || fileTypeLower === 'model/gltf+json') {
            reader.readAsText(file);
        } else {
            this._showError(`不支持的文件类型: ${file.name}`);
        }
    }

    _parseAndLoadGltf(content, fileName, fileType) {
        const loader = new GLTFLoader();

        try {
            loader.parse(content, '', 
                (gltf) => this._replaceModelWithLoaded(gltf, fileName),
                (error) => {
                    console.error(`解析GLTF模型失败 ${fileName}:`, error);
                    this._showError(`解析 "${fileName}" 失败。模型可能损坏或不受支持。`);
                }
            );
        } catch (e) {
            console.error(`GLTF解析设置错误 ${fileName}:`, e);
            this._showError(`设置解析器失败 "${fileName}"`);
        }
    }

    _replaceModelWithLoaded(gltf, fileName) {
        // 移除旧模型
        if (this.pandaModel) {
            this.scene.remove(this.pandaModel);
            if (this.animationMixer) {
                this.animationMixer.stopAllAction();
                this.currentAction = null;
            }
            while (this.animationButtonsContainer.firstChild) {
                this.animationButtonsContainer.removeChild(this.animationButtonsContainer.firstChild);
            }
            this.animationActions = {};
            this.animationClips = [];
        }

        // 设置新模型
        this.pandaModel = gltf.scene;
        const scale = 80;
        this.pandaModel.scale.set(scale, scale, scale);
        
        const sceneHeight = this.renderDiv.clientHeight;
        this.pandaModel.position.set(0, sceneHeight * CONFIG.model.positionYFactor, CONFIG.model.positionZ);
        
        this.scene.add(this.pandaModel);

        // 设置动画
        this.animationMixer = new THREE.AnimationMixer(this.pandaModel);
        this.animationClips = gltf.animations;
        this.animationActions = {};

        if (this.animationClips?.length) {
            this._setupModelAnimations();
        }

        // 重置交互状态
        this.grabbingHandIndex = -1;
        this.pickedUpModel = null;
        this.rotateLastHandX = null;
        this.scaleInitialPinchDistance = null;
        this.scaleInitialModelScale = null;

        this._updateInteractionModeButtonStyles();
    }

    // ========== 窗口调整 ==========
    _onResize() {
        const width = this.renderDiv.clientWidth;
        const height = this.renderDiv.clientHeight;

        this.camera.left = width / -2;
        this.camera.right = width / 2;
        this.camera.top = height / 2;
        this.camera.bottom = height / -2;
        this.camera.updateProjectionMatrix();

        this.renderer.setSize(width, height);
        this.videoElement.style.width = width + 'px';
        this.videoElement.style.height = height + 'px';
    }

    // ========== 动画循环 ==========
    _animate() {
        requestAnimationFrame(this._animate.bind(this));

        const deltaTime = this.clock.getDelta();

        if (this.gameState === 'tracking') {
            this._updateHands();
        }

        if (this.animationMixer) {
            this.animationMixer.update(deltaTime);
        }

        this.renderer.render(this.scene, this.camera);
    }

    // ========== UI消息显示 ==========
    _showStatusScreen(message, color = 'white', showRestartHint = false) {
        this.gameOverContainer.style.display = 'block';
        this.gameOverText.innerText = message;
        this.gameOverText.style.color = color;
        this.restartHintText.style.display = showRestartHint ? 'block' : 'none';
    }

    _showError(message) {
        this.gameOverContainer.style.display = 'block';
        this.gameOverText.innerText = `错误: ${message}`;
        this.gameOverText.style.color = 'orange';
        this.restartHintText.style.display = 'block';
        this.gameState = 'error';

        this.hands.forEach(hand => {
            if (hand.lineGroup) hand.lineGroup.visible = false;
        });
    }

    _showTemporaryMessage(message, duration) {
        this._showStatusScreen(message, 'orange', false);
        setTimeout(() => {
            if (this.gameOverContainer.style.display === 'block' && 
                this.gameOverText.innerText.includes(message)) {
                this.gameOverContainer.style.display = 'none';
            }
        }, duration);
    }

    _restartGame() {
        this.gameOverContainer.style.display = 'none';
        this.hands.forEach(hand => {
            if (hand.lineGroup) hand.lineGroup.visible = false;
        });

        this.gameState = 'tracking';
        this.lastVideoTime = -1;
        this.clock.start();
    }

    // ========== 启动 ==========
    start() {
        this.renderDiv.addEventListener('click', () => {
            this.audioManager.resumeContext();
            if (this.gameState === 'error' || this.gameState === 'paused') {
                this._restartGame();
            }
        });
    }

    // ========== 资源清理 ==========
    dispose() {
        // 清理几何体和材质
        this.scene.traverse((obj) => {
            if (obj.geometry) obj.geometry.dispose();
            if (obj.material) {
                if (Array.isArray(obj.material)) {
                    obj.material.forEach(m => m.dispose());
                } else {
                    obj.material.dispose();
                }
            }
        });

        // 停止摄像头流
        if (this.videoElement?.srcObject) {
            this.videoElement.srcObject.getTracks().forEach(track => track.stop());
        }

        // 移除事件监听
        window.removeEventListener('resize', this._onResize);
        window.removeEventListener('storage', this._setupStorageListener);

        // 清理管理器
        if (this.speechManager) this.speechManager.dispose?.();
        if (this.audioManager) this.audioManager.dispose?.();
    }
}