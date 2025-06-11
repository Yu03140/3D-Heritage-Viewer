# 3D 模型游乐场

使用手势和语音命令实时控制3D模型。

这是一个交互式网页应用，由 Three.js、MediaPipe 计算机视觉、Web Speech API 和 Rosebud AI 构建。

- 说出"拖拽"（drag）、"旋转"（rotate）、"缩放"（scale）或"动画"（animate）来切换交互模式
- 捏合手指以控制3D模型
- 将新的3D模型拖放到页面上以导入（目前仅支持GLTF格式）

[视频演示](https://x.com/measure_plan/status/1929900748235550912) | [在线演示](https://collidingscopes.github.io/3d-model-playground/)

## 系统要求

- 支持WebGL的现代网络浏览器
- 摄像头/麦克风访问权限

## 使用技术

- **Three.js** 用于3D渲染
- **MediaPipe** 用于手部追踪和手势识别
- **Web Speech API** 用于语音识别
- **HTML5 Canvas** 用于视觉反馈
- **JavaScript** 用于实时交互

## 开发环境设置

```bash
# 使用您喜欢的方法提供服务（示例使用Python）
python -m http.server
```

然后在浏览器中访问 `http://localhost:8000`。

## 许可证

MIT 许可证

## 技术鸣谢

- Three.js - https://threejs.org/
- MediaPipe - https://mediapipe.dev/
- Rosebud AI - https://rosebud.ai/
- Quaternius 3D 模型 - https://quaternius.com/