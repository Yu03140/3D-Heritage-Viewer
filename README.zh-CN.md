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
# 克隆此仓库
git clone https://github.com/collidingScopes/3d-model-playground

# 导航到项目目录
cd 3d-model-playground

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

## 相关项目

您可能还会喜欢我的其他一些开源项目：

- [Three.js手部追踪教程](https://collidingScopes.github.io/threejs-handtracking-101) - 使用Three.js和MediaPipe计算机视觉的基础手部追踪设置
- [Particular Drift](https://collidingScopes.github.io/particular-drift) - 将照片转化为流动的粒子动画
- [Liquid Logo](https://collidingScopes.github.io/liquid-logo) - 将标志和图标转换为液态金属动画
- [Video-to-ASCII](https://collidingScopes.github.io/ascii) - 将视频转换为ASCII像素艺术

## 联系方式

- Instagram: [@stereo.drift](https://www.instagram.com/stereo.drift/)
- Twitter/X: [@measure_plan](https://x.com/measure_plan)
- 电子邮件: [stereodriftvisuals@gmail.com](mailto:stereodriftvisuals@gmail.com)
- GitHub: [collidingScopes](https://github.com/collidingScopes)

## 捐赠

如果您觉得这个工具有用，欢迎给我买杯咖啡。

我叫Alan，我喜欢为计算机视觉、游戏等创建开源软件。在深夜编程时，您的支持将非常受欢迎！

[![给我买杯咖啡](https://www.buymeacoffee.com/assets/img/custom_images/yellow_img.png)](https://www.buymeacoffee.com/stereoDrift)
