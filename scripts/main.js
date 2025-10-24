// main.js - 应用入口文件，负责初始化和启动游戏主类
import { Game } from './game.js';

console.log("main.js loaded");

function getModelFromURL() {
    const urlParams = new URLSearchParams(window.location.search);
    const modelParam = urlParams.get('model');
    if (modelParam) {
        return '../assets/' + modelParam;
    }
    return '../assets/teacup.gltf'; 
}

var renderDiv = document.getElementById('renderDiv');

if (!renderDiv) {
    console.error('致命错误: 未找到renderDiv元素。');
} else {
    console.log("已找到renderDiv，正在初始化游戏...");
    
    const modelPath = getModelFromURL();
    console.log("将加载模型:", modelPath);
    
    var game = new Game(renderDiv, modelPath);
    game.start(); 
    
    document.addEventListener('DOMContentLoaded', function() {
    });
    
    window.gameInstance = game;
}
