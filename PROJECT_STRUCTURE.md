# 项目结构说明

```
electron-image-processor/
├── 📄 main.js                 # Electron主进程
├── 📄 renderer.js             # Electron渲染进程
├── 📄 index.html              # 应用界面
├── 📄 imageProcessor.js       # 图片处理核心逻辑
├── 📄 simple.js               # 命令行版本（可选）
├── 🚀 start.vbs               # 无黑框启动脚本（推荐）
├── 🚀 start.bat               # 批处理启动脚本
├── 📦 package.json            # 项目配置和依赖
├── 📦 package-lock.json       # 依赖锁定文件
├── 📦 node_modules/           # 依赖包目录
├── 📝 README.md               # 详细项目说明文档
├── 📝 QUICK_START.md          # 快速入门指南
├── 📝 LICENSE                 # MIT开源协议
├── 📝 .gitignore              # Git忽略文件配置
├── 📝 push-to-github.md       # GitHub推送指令
└── 📝 PROJECT_STRUCTURE.md    # 本文件
```

## 核心文件说明

### 🎯 主要功能文件

- **main.js**: Electron主进程，处理窗口创建、文件对话框、IPC通信
- **renderer.js**: 渲染进程，处理用户界面交互和事件
- **index.html**: 应用的用户界面，包含所有控件和样式
- **imageProcessor.js**: 图片处理的核心逻辑，使用Sharp库

### 🚀 启动文件

- **start.vbs**: VBScript启动脚本，**无黑框启动**（推荐使用）
- **start.bat**: 批处理启动脚本，支持普通启动和静默启动

### 📦 配置文件

- **package.json**: 项目元数据、依赖管理、启动脚本
- **.gitignore**: Git版本控制忽略文件配置
- **LICENSE**: MIT开源协议

### 📝 文档文件

- **README.md**: 详细的项目说明、安装指南和故障排除
- **PROJECT_STRUCTURE.md**: 项目结构说明（本文件）

## 启动方式优先级

1. 🥇 **双击 start.vbs** - 无黑框，用户体验最佳
2. 🥈 **双击 start.bat** - 有控制台窗口，但中文显示正常
3. 🥉 **npm start** - 命令行启动，开发者使用

## 技术架构

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   用户界面       │    │    主进程        │    │   图片处理      │
│  (index.html)   │◄──►│   (main.js)     │◄──►│(imageProcessor) │
│  (renderer.js)  │    │                  │    │    (Sharp)      │
└─────────────────┘    └──────────────────┘    └─────────────────┘
        ▲                        ▲                        ▲
        │                        │                        │
        ▼                        ▼                        ▼
    界面交互               IPC通信/文件操作          MozJPEG压缩算法
```

## 依赖关系

- **Electron**: 跨平台桌面应用框架
- **Sharp**: 高性能图像处理库
  - 包含MozJPEG编码器
  - 支持多种图片格式
  - 商业级压缩算法 