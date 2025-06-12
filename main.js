import { Game } from './game.js';

// 显示调试信息，方便排查模型加载问题
console.log("main.js loaded");

// Get the render target div
var renderDiv = document.getElementById('renderDiv');

// Check if renderDiv exists
if (!renderDiv) {
    console.error('Fatal Error: renderDiv element not found.');
} else {
    console.log("renderDiv found, initializing game...");
    // Initialize the game with the render target
    var game = new Game(renderDiv);
    // Start the game
    game.start(); // The actual setup happens async within the Game class constructor
      // 添加语音识别设置变更的监听
    document.addEventListener('DOMContentLoaded', function() {
        // 不再在这里创建切换按钮，将在game.js的UI初始化中添加
    });
    
    // 在初始化后触发默认模型加载完成事件
    setTimeout(() => {
        const initialModelChangedEvent = new CustomEvent('modelChanged', { 
            detail: { modelPath: 'Stan.gltf' }
        });
        window.dispatchEvent(initialModelChangedEvent);
    }, 2000); // 等待2秒，确保其他组件已初始化
    
    // 导出game实例以便在控制台中调试
    window.gameInstance = game;
}
