// main.js - 应用入口文件，负责初始化和启动游戏主类
import { Game } from './game.js';

// 显示调试信息，方便排查模型加载问题
console.log("main.js loaded");

// 获取URL参数中的模型信息
function getModelFromURL() {
    const urlParams = new URLSearchParams(window.location.search);
    const modelParam = urlParams.get('model');
    if (modelParam) {
        return 'assets/' + modelParam;
    }
    return 'assets/teacup.gltf'; // 默认模型
}

// 获取渲染目标div元素
var renderDiv = document.getElementById('renderDiv');

// 检查renderDiv是否存在
if (!renderDiv) {
    console.error('致命错误: 未找到renderDiv元素。');
} else {
    console.log("已找到renderDiv，正在初始化游戏...");
    
    // 获取要加载的模型
    const modelPath = getModelFromURL();
    console.log("将加载模型:", modelPath);
    
    // 使用渲染目标初始化游戏
    var game = new Game(renderDiv, modelPath);
    // 启动游戏
    game.start(); // 实际设置在Game类构造函数中异步进行
    
    // 添加语音识别设置变更的监听
    document.addEventListener('DOMContentLoaded', function() {
        // 不再在这里创建切换按钮，将在game.js的UI初始化中添加
    });
    
    // 导出game实例以便在控制台中调试
    window.gameInstance = game;
}
