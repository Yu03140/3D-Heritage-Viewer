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
    
    // 导出game实例以便在控制台中调试
    window.gameInstance = game;
}
