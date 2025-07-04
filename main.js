const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs');
const { processImage, processDirectory, testTinyPNGKey } = require('./imageProcessor');

// 设置控制台编码以正确显示中文
if (process.platform === 'win32') {
  // Windows系统设置控制台编码
  const { spawn } = require('child_process');
  try {
    // 设置控制台代码页为UTF-8
    spawn('chcp', ['65001'], { stdio: 'ignore', shell: true });
  } catch (e) {
    // 忽略错误，继续运行
  }
}

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
    }
  });

  mainWindow.loadFile('index.html');
  // mainWindow.webContents.openDevTools(); // 开发调试用
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

// 处理选择输入文件或文件夹
ipcMain.handle('select-input', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openFile', 'openDirectory']
  });
  
  if (!result.canceled) {
    const filePath = result.filePaths[0];
    const stats = fs.statSync(filePath);
    return {
      path: filePath,
      isDirectory: stats.isDirectory()
    };
  }
  return null;
});

// 处理选择输出文件或文件夹
ipcMain.handle('select-output', async (event, isDirectory) => {
  if (isDirectory) {
    const result = await dialog.showOpenDialog(mainWindow, {
      properties: ['openDirectory']
    });
    
    if (!result.canceled) {
      return result.filePaths[0];
    }
  } else {
    const result = await dialog.showSaveDialog(mainWindow, {
      filters: [
        { name: 'Images', extensions: ['jpg', 'jpeg', 'png', 'gif', 'webp'] }
      ]
    });
    
    if (!result.canceled) {
      return result.filePath;
    }
  }
  return null;
});

// 处理图片
ipcMain.handle('process-images', async (event, data) => {
  const { inputPath, outputPath, maxSize, isDirectory, options } = data;
  
  try {
    // 将KB转换为字节
    const maxSizeBytes = maxSize * 1024;
    
    // 创建日志回调函数，将日志发送到渲染进程
    const onLog = (message) => {
      event.sender.send('processing-log', message);
    };
    
    // 将日志回调添加到选项中
    const optionsWithLog = {
      ...options,
      onLog: onLog
    };
    
    onLog('🚀 开始处理图片...');
    onLog(`📁 输入路径: ${inputPath}`);
    onLog(`📁 输出路径: ${outputPath}`);
    onLog(`📏 最大大小: ${maxSize}KB`);
    onLog('');
    
    if (isDirectory) {
      // 处理目录
      await processDirectory(inputPath, outputPath, maxSizeBytes, optionsWithLog);
      onLog('');
      onLog('✅ 目录处理完成！所有图片已成功处理。');
      return { 
        success: true, 
        message: '目录处理完成！所有图片已成功处理。' 
      };
    } else {
      // 处理单个文件
      const result = await processImage(inputPath, outputPath, maxSizeBytes, optionsWithLog);
      onLog('');
      onLog('✅ 图片处理完成！');
      return { 
        success: true, 
        message: '图片处理完成！',
        apiKeyUsage: result?.apiKeyUsage 
      };
    }
  } catch (error) {
    const errorMessage = `❌ 处理失败: ${error.message}`;
    event.sender.send('processing-log', errorMessage);
    return { 
      success: false, 
      message: error.message 
    };
  }
});

// 处理TinyPNG API Key测试
ipcMain.handle('test-tinypng-key', async (event, apiKey) => {
  try {
    const result = await testTinyPNGKey(apiKey);
    return result;
  } catch (error) {
    return {
      valid: false,
      error: error.message,
      status: 'invalid'
    };
  }
});

 