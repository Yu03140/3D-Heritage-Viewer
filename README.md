# 🏛️ 3D数字文物展馆

一个基于Web的3D文物展示系统，支持手势控制、语音交互和AI智能问答。

## ✨ 核心功能

- 🎮 **手势识别** - MediaPipe手部追踪，自然交互旋转缩放模型
- 🤖 **AI助手** - 通义千问驱动，智能回答文物相关问题
- 💬 **评论系统** - 实时评论和点赞功能
- 📱 **响应式设计** - 支持桌面和移动设备
- 🎨 **朝代浏览** - 按历史朝代分类展示文物
- 📸 **3D模型查看** - 高质量GLTF/GLB模型渲染

## 🚀 快速开始

### 1. 启动服务

```bash
# Windows: 双击运行
play.bat

# 或手动启动
python scripts/ai-proxy.py     # 终端1: AI代理服务器
python -m http.server 8000     # 终端2: Web服务器
```

### 2. 访问系统

打开浏览器访问：**http://localhost:8000/pages/index.html**

## 📁 项目结构

```
3D-Heritage-Viewer/
├── play.bat                 # 启动脚本
├── README.md               # 本文件
│
├── pages/                  # 📄 网页文件
│   ├── index.html          # 主页
│   ├── main.html           # 3D查看器
│   ├── dynasty.html        # 朝代浏览
│   ├── gallery.html        # 图库
│   ├── settings.html       # 设置
│   ├── tutorial.html       # 教程
│   └── video_demo.html     # 视频演示
│
├── scripts/                # 🔧 脚本文件
│   ├── game.js             # 3D渲染和手势识别
│   ├── aiAssistant.js      # AI助手功能
│   ├── ai-proxy.py         # AI代理服务器
│   └── ...                 # 其他脚本
│
├── styles/                 # 🎨 样式文件
│   └── styles.css
│
├── images/                 # 🖼️ 图片资源
│   ├── favicon.png
│   └── *.jpg, *.svg
│
├── assets/                 # 🗿 3D模型
│   ├── teacup.gltf
│   ├── copper-chew.gltf
│   └── ...
│
├── data/                   # 📊 数据文件
│   └── descriptions.json   # 文物描述
│
├── media/                  # 🎬 媒体文件
│   └── video.mp4
│
└── docs/                   # 📚 文档
    ├── README.zh-CN.md
    ├── 文件结构说明.md
    └── ...
```

## 🛠️ 技术栈

### 前端
- **Three.js** - 3D渲染引擎
- **MediaPipe** - 手势识别
- **原生JavaScript** - 无框架依赖

### 后端
- **Python http.server** - 静态文件服务
- **通义千问API** - AI对话服务

### 3D模型
- **GLTF/GLB** - 3D模型格式
- **OrthographicCamera** - 正交投影相机

## 📖 使用说明

### 手势控制

- 🖐️ **单手张开** - 旋转模型
- ✌️ **两指捏合** - 缩放模型
- 👆 **食指指向** - 平移模型

### AI助手

1. 在右侧输入框输入问题
2. AI会基于当前文物信息回答
3. 支持多轮对话

### 评论功能

- 输入评论内容并发布
- 为喜欢的评论点赞
- 评论按时间倒序显示

## ⚙️ 配置说明

### AI配置

编辑 `scripts/ai-proxy.py` 第10行：

```python
API_KEY = 'sk-your-qianwen-api-key-here'
```

获取API Key：https://dashscope.aliyun.com/

### 添加文物

1. 将3D模型放入 `assets/` 文件夹
2. 在 `data/descriptions.json` 添加描述信息
3. 在相应页面更新模型列表

## 🔍 故障排查

### 无法启动服务

- 确保已安装Python 3.x
- 检查端口8000和8001是否被占用

### AI助手不工作

- 确保 `ai-proxy.py` 正在运行
- 检查API Key是否有效
- 查看浏览器控制台错误信息

### 3D模型不显示

- 检查模型文件路径是否正确
- 确保模型格式为GLTF或GLB
- 查看浏览器控制台是否有加载错误

## 📝 更新日志

### v2.0 (2025-10-20)
- ✅ 添加AI助手功能（通义千问）
- ✅ 重构文件夹结构
- ✅ 优化启动流程
- ✅ 修复多个bug

### v1.0 (初始版本)
- 3D模型展示
- 手势识别
- 评论系统

## 👥 贡献

欢迎提交Issue和Pull Request！

## 📄 许可证

MIT License

## 🔗 相关链接

- [Three.js 文档](https://threejs.org/docs/)
- [MediaPipe 文档](https://developers.google.com/mediapipe)
- [通义千问 API](https://dashscope.aliyun.com/)

---

**Made with ❤️ by Yu03140**
