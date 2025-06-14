import { Game } from './game.js';

// 显示调试信息，方便排查模型加载问题
console.log("main.js loaded");

// 获取渲染目标div元素
var renderDiv = document.getElementById('renderDiv');

// 检查renderDiv是否存在
if (!renderDiv) {
    console.error('致命错误: 未找到renderDiv元素。');
} else {
    console.log("已找到renderDiv，正在初始化游戏...");
    // 使用渲染目标初始化游戏
    var game = new Game(renderDiv);
    // 启动游戏
    game.start(); // 实际设置在Game类构造函数中异步进行
    // 添加语音识别设置变更的监听
    document.addEventListener('DOMContentLoaded', function() {
        // 不再在这里创建切换按钮，将在game.js的UI初始化中添加
    });
    
    // 在初始化后触发默认模型加载完成事件
    setTimeout(() => {
        const initialModelChangedEvent = new CustomEvent('modelChanged', { 
            detail: { modelPath: 'teacup.gltf' } // 默认加载teacup.gltf
        });
        window.dispatchEvent(initialModelChangedEvent);
    }, 2000); // 等待2秒，确保其他组件已初始化
    
    // 导出game实例以便在控制台中调试
    window.gameInstance = game;
}
