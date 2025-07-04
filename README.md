# 🖼️ 图片自动处理工具

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Node.js](https://img.shields.io/badge/node.js-16+-green.svg)
![Electron](https://img.shields.io/badge/electron-latest-blue.svg)

一个基于Electron的现代化图片压缩和尺寸调整工具，支持商业级压缩算法，提供高质量的图片压缩效果。

## ✨ 特色功能

- 🎯 **商业级压缩算法** - 使用MozJPEG编码器，压缩率高达80-90%
- 🔄 **智能批量处理** - 支持单个文件或整个文件夹批量处理
- 📐 **智能尺寸调整** - 横屏/竖屏图片分别优化，保持最佳显示效果
- 💡 **智能跳过检测** - 自动跳过已符合要求的图片，避免重复处理
- 📊 **实时处理日志** - 详细的处理过程和结果统计
- 🎨 **直观用户界面** - 现代化的Electron桌面应用

## 🚀 快速开始

### 1. 环境准备

#### 安装 Node.js
1. 访问 [Node.js官网](https://nodejs.org/)
2. 下载并安装 **LTS版本**（推荐 16.x 或更高）
3. 验证安装：
```bash
node --version
npm --version
```

#### 克隆或下载项目
```bash
# 方式1：克隆仓库
git clone https://github.com/YOUR_USERNAME/YOUR_REPO_NAME.git
cd YOUR_REPO_NAME

# 方式2：下载ZIP并解压
```

### 2. 安装依赖

```bash
# 安装所有依赖（包括 Electron 和 Sharp）
npm install

# 如果安装过程中遇到问题，尝试清除缓存
npm cache clean --force
npm install
```

> **注意**：首次安装可能需要几分钟时间，因为需要下载 Electron 和编译 Sharp 图像处理库。

#### 验证安装
```bash
# 检查依赖是否安装成功
npm list --depth=0

# 应该看到：
# ├── electron@37.1.0
# └── sharp@0.33.5
```

### 3. 启动应用

**方式1：无黑框启动（推荐）**
```bash
# Windows: 双击 start.vbs 文件
# 或者命令行运行：
cscript //nologo start.vbs
```

**方式2：批处理启动**
```bash
# PowerShell 中运行：
.\start.bat

# 或直接双击 start.bat 文件
```

**方式3：开发者模式**
```bash
npm start
```

## 📦 完整安装示例

### Windows 用户完整流程

```powershell
# 1. 检查 Node.js（如未安装请先安装）
node --version
npm --version

# 2. 克隆项目（替换为实际仓库地址）
git clone https://github.com/YOUR_USERNAME/electron-image-processor.git
cd electron-image-processor

# 3. 安装依赖
npm install

# 4. 验证安装
npm list --depth=0

# 5. 启动应用
.\start.bat
# 或者无黑框启动
cscript //nologo start.vbs
```

### 首次使用建议

1. **选择测试图片**：准备一些不同尺寸的JPG/PNG图片
2. **创建输出文件夹**：建议创建专门的输出目录
3. **调整设置**：根据需要调整压缩质量和尺寸参数
4. **查看日志**：注意观察应用内的实时处理日志

## 🎛️ 压缩模式

| 模式 | 描述 | 适用场景 |
|------|------|----------|
| **商业级JPEG** | MozJPEG算法，高质量压缩 | 网站图片、社交媒体 |
| **标准JPEG** | 常规压缩算法 | 通用场景 |
| **PNG无损** | 完美质量保持 | 设计素材、透明图片 |

## ⚙️ 高级特性

- **质量控制**：JPEG质量范围60-100可调
- **文件大小限制**：自定义最大文件大小（KB）
- **智能尺寸处理**：
  - 横屏图片：智能宽度限制
  - 竖屏图片：统一宽度设置
  - 小图保护：避免放大原本较小的图片

## 📋 支持格式

- **输入格式**：JPG、JPEG、PNG、GIF、WebP
- **输出格式**：JPG、PNG、WebP

## 🛠️ 技术栈

- **框架**：Electron ^37.1.0
- **图像处理**：Sharp ^0.33.5 (高性能Node.js图像处理库)
- **压缩算法**：MozJPEG、PNG优化、WebP支持
- **界面**：HTML5 + CSS3 + Vanilla JavaScript
- **开发语言**：JavaScript (ES6+)

### 核心依赖说明

| 依赖 | 版本 | 用途 |
|------|------|------|
| `electron` | ^37.1.0 | 跨平台桌面应用框架 |
| `sharp` | ^0.33.5 | 高性能图像处理，包含MozJPEG |

> **为什么选择这些技术？**
> - **Electron**: 使用Web技术构建跨平台桌面应用
> - **Sharp**: 基于libvips的快速图像处理，支持商业级压缩算法

## 📝 系统要求

- **操作系统**：Windows 10/11
- **Node.js**：16.0.0 或更高版本
- **内存**：推荐 4GB 以上
- **磁盘空间**：50MB 可用空间

## 🔧 故障排除

### 安装依赖问题

#### Node.js 相关
```bash
# 检查 Node.js 版本（需要 16+ ）
node --version

# 如果版本过低，请更新 Node.js
```

#### npm 安装失败
```bash
# 清除 npm 缓存
npm cache clean --force

# 删除 node_modules 重新安装
rm -rf node_modules package-lock.json  # Linux/Mac
# 或者手动删除 node_modules 文件夹       # Windows

npm install
```

#### Sharp 编译问题（Windows）
```bash
# 如果 Sharp 安装失败，尝试安装 Windows 构建工具
npm install --global windows-build-tools

# 或者使用预编译版本
npm install sharp --platform=win32 --arch=x64
```

#### Electron 下载问题
```bash
# 设置 Electron 镜像源（中国用户）
npm config set ELECTRON_MIRROR https://npmmirror.com/mirrors/electron/

# 重新安装
npm install electron
```

### 启动问题

#### PowerShell 执行策略
如果在 PowerShell 中无法运行 `.bat` 文件：
```powershell
# 运行批处理文件
.\start.bat

# 或者设置执行策略
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

#### 中文显示问题
- 使用 `start.vbs` 启动（推荐）
- 确保系统控制台支持UTF-8编码

### 权限问题
- 以管理员身份运行命令行
- 检查文件夹读写权限
- 确保防火墙不阻止 Electron 应用

## 🤝 贡献指南

欢迎提交Issues和Pull Requests！

1. Fork 本仓库
2. 创建特性分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 开启Pull Request

## 📄 开源协议

本项目采用 MIT 协议 - 查看 [LICENSE](LICENSE) 文件了解详情

## 🙏 致谢

- [Sharp](https://sharp.pixelplumbing.com/) - 高性能图像处理
- [Electron](https://www.electronjs.org/) - 跨平台桌面应用框架
- [MozJPEG](https://github.com/mozilla/mozjpeg) - Mozilla的JPEG编码器

## 🔐 API Key 安全性说明

### 本地存储，绝对安全
- ✅ **API Key只保存在您的本地计算机**：使用浏览器的localStorage存储
- ✅ **不会被推送到Git仓库**：API Key不存在于任何代码文件中
- ✅ **不会被上传到云端**：所有数据仅存储在本地
- ✅ **其他人无法访问**：只有您的计算机可以访问这些API Key

### 存储位置
API Key存储在：
- **Windows**: `%APPDATA%\Local\Electron\User Data\Default\Local Storage`
- **macOS**: `~/Library/Application Support/Electron/Local Storage`
- **Linux**: `~/.config/Electron/Local Storage`

### 安全建议
1. 🔒 不要在公共计算机上保存API Key
2. 📱 定期检查TinyPNG使用情况
3. 🔄 如有疑虑可随时删除并重新添加API Key

---

⭐ 如果这个项目对您有帮助，请给个Star支持一下！ 