const { ipcRenderer } = require('electron');

// DOM元素
const inputPathEl = document.getElementById('inputPath');
const outputPathEl = document.getElementById('outputPath');
const maxSizeEl = document.getElementById('maxSize');
const inputBtn = document.getElementById('inputBtn');
const outputBtn = document.getElementById('outputBtn');
const processBtn = document.getElementById('processBtn');
const statusEl = document.getElementById('status');

// 新增高级选项元素
const useLosslessEl = document.getElementById('useLossless');
const useAdvancedCompressionEl = document.getElementById('useAdvancedCompression');
const skipIfOptimalEl = document.getElementById('skipIfOptimal');
const jpegQualityEl = document.getElementById('jpegQuality');
const jpegQualityValueEl = document.getElementById('jpegQualityValue');
const jpegQualityGroupEl = document.getElementById('jpegQualityGroup');

// 新增尺寸设置元素
const landscapeWidthEl = document.getElementById('landscapeWidth');
const landscapeKeepSmallEl = document.getElementById('landscapeKeepSmall');
const portraitWidthEl = document.getElementById('portraitWidth');
const portraitKeepSmallEl = document.getElementById('portraitKeepSmall');

// 存储状态
let state = {
  inputPath: '',
  outputPath: '',
  isDirectory: false
};

// 初始化事件监听器
function initializeEventListeners() {
  // 监听处理日志
  ipcRenderer.on('processing-log', (event, message) => {
    addLogMessage(message);
  });
  
  // JPEG质量滑块值更新
  jpegQualityEl.addEventListener('input', () => {
    jpegQualityValueEl.textContent = jpegQualityEl.value;
  });

  // 无损压缩选项变化
  useLosslessEl.addEventListener('change', () => {
    toggleJpegQualityGroup();
    toggleAdvancedCompressionGroup();
  });

  // 高级压缩选项变化
  useAdvancedCompressionEl.addEventListener('change', () => {
    updateCompressionInfo();
  });

  // 选择输入文件或文件夹
  inputBtn.addEventListener('click', async () => {
    const result = await ipcRenderer.invoke('select-input');
    if (result) {
      state.inputPath = result.path;
      state.isDirectory = result.isDirectory;
      inputPathEl.value = result.path;
      outputPathEl.value = ''; // 清空输出路径
      state.outputPath = '';
      updateProcessButton();
    }
  });

  // 选择输出位置
  outputBtn.addEventListener('click', async () => {
    const result = await ipcRenderer.invoke('select-output', state.isDirectory);
    if (result) {
      state.outputPath = result;
      outputPathEl.value = result;
      updateProcessButton();
    }
  });

  // 处理图片
  processBtn.addEventListener('click', async () => {
    await processImages();
  });
}

// 切换JPEG质量控制组的可用性
function toggleJpegQualityGroup() {
  if (useLosslessEl.checked) {
    jpegQualityGroupEl.classList.add('disabled');
  } else {
    jpegQualityGroupEl.classList.remove('disabled');
  }
}

// 切换高级压缩控制组的可用性
function toggleAdvancedCompressionGroup() {
  if (useLosslessEl.checked) {
    useAdvancedCompressionEl.disabled = true;
    useAdvancedCompressionEl.parentElement.style.opacity = '0.5';
  } else {
    useAdvancedCompressionEl.disabled = false;
    useAdvancedCompressionEl.parentElement.style.opacity = '1';
  }
}

// 更新压缩信息显示
function updateCompressionInfo() {
  // 这里可以动态更新界面上的说明文字
  // 暂时保留给未来扩展使用
}

// 更新处理按钮状态
function updateProcessButton() {
  processBtn.disabled = !(state.inputPath && state.outputPath);
}

// 显示状态信息
function showStatus(message, isSuccess) {
  statusEl.textContent = message;
  statusEl.style.display = 'block';
  
  if (isSuccess) {
    statusEl.className = 'success';
  } else {
    statusEl.className = 'error';
  }
}

// 添加日志消息到界面
function addLogMessage(message) {
  // 检查是否存在日志显示区域，如果不存在则创建
  let logArea = document.getElementById('logArea');
  if (!logArea) {
    logArea = document.createElement('div');
    logArea.id = 'logArea';
    logArea.style.cssText = `
      margin-top: 20px;
      padding: 15px;
      border: 1px solid #ddd;
      border-radius: 4px;
      background-color: #f9f9f9;
      font-family: monospace;
      font-size: 12px;
      max-height: 300px;
      overflow-y: auto;
      white-space: pre-wrap;
      word-break: break-all;
    `;
    
    // 添加标题
    const logTitle = document.createElement('h3');
    logTitle.textContent = '处理日志：';
    logTitle.style.marginTop = '0';
    logTitle.style.marginBottom = '10px';
    logTitle.style.color = '#333';
    logArea.appendChild(logTitle);
    
    // 创建日志内容容器
    const logContent = document.createElement('div');
    logContent.id = 'logContent';
    logArea.appendChild(logContent);
    
    // 将日志区域添加到状态区域后面
    statusEl.parentNode.insertBefore(logArea, statusEl.nextSibling);
  }
  
  const logContent = document.getElementById('logContent');
  logContent.textContent += message + '\n';
  
  // 自动滚动到底部
  logArea.scrollTop = logArea.scrollHeight;
}

// 清空日志
function clearLog() {
  const logContent = document.getElementById('logContent');
  if (logContent) {
    logContent.textContent = '';
  }
}

// 收集处理选项
function getProcessingOptions() {
  return {
    maxSize: parseInt(maxSizeEl.value) || 70,
    useLossless: useLosslessEl.checked,
    useAdvancedCompression: useAdvancedCompressionEl.checked,
    skipIfOptimal: skipIfOptimalEl.checked,
    jpegQuality: parseInt(jpegQualityEl.value) || 95,
    // 新增的尺寸设置
    sizeSettings: {
      landscapeWidth: parseInt(landscapeWidthEl.value) || 500,
      landscapeKeepSmall: landscapeKeepSmallEl.checked,
      portraitWidth: parseInt(portraitWidthEl.value) || 200,
      portraitKeepSmall: portraitKeepSmallEl.checked
    }
  };
}

// 生成处理规则摘要
function generateRulesSummary(options) {
  const { sizeSettings } = options;
  let summary = `横屏图片→最大宽度${sizeSettings.landscapeWidth}px`;
  if (sizeSettings.landscapeKeepSmall) {
    summary += '(保持小图)';
  }
  summary += `，竖屏图片→统一宽度${sizeSettings.portraitWidth}px`;
  if (sizeSettings.portraitKeepSmall) {
    summary += '(保持小图)';
  }
  return summary;
}

// 生成压缩模式描述
function getCompressionModeDescription(options) {
  if (options.useLossless) {
    return 'PNG无损压缩（质量完美）';
  } else if (options.useAdvancedCompression) {
    return `商业级JPEG压缩（质量${options.jpegQuality}，MozJPEG算法）`;
  } else {
    return `标准JPEG压缩（质量${options.jpegQuality}）`;
  }
}

// 处理图片
async function processImages() {
  const options = getProcessingOptions();
  
  // 清空之前的日志
  clearLog();
  
  // 禁用按钮，显示处理中
  processBtn.disabled = true;
  processBtn.textContent = '处理中...';
  
  const rulesSummary = generateRulesSummary(options);
  const compressionMode = getCompressionModeDescription(options);
  const processingMessage = `正在使用${compressionMode}处理图片 (${rulesSummary})，请稍候...`;
  
  showStatus(processingMessage, true);
  
  try {
    const result = await ipcRenderer.invoke('process-images', {
      inputPath: state.inputPath,
      outputPath: state.outputPath,
      maxSize: options.maxSize,
      isDirectory: state.isDirectory,
      options: {
        useLossless: options.useLossless,
        useAdvancedCompression: options.useAdvancedCompression,
        skipIfOptimal: options.skipIfOptimal,
        jpegQuality: options.jpegQuality,
        sizeSettings: options.sizeSettings
      }
    });
    
    // 显示详细的处理结果
    let resultMessage = result.message;
    if (result.success) {
      if (options.useLossless) {
        resultMessage += ' (PNG无损格式)';
      } else if (options.useAdvancedCompression) {
        resultMessage += ` (商业级JPEG，质量: ${options.jpegQuality})`;
      } else {
        resultMessage += ` (标准JPEG，质量: ${options.jpegQuality})`;
      }
      
      if (options.skipIfOptimal) {
        resultMessage += ' - 智能跳过已启用';
      }
      
      resultMessage += ` | ${rulesSummary}`;
      
      // 如果返回了压缩统计信息，显示出来
      if (result.stats) {
        resultMessage += ` | 压缩率: ${result.stats.compressionRatio}%`;
      }
    }
    
    showStatus(resultMessage, result.success);
  } catch (error) {
    showStatus(`处理失败: ${error.message}`, false);
  } finally {
    processBtn.disabled = false;
    processBtn.textContent = '开始处理';
  }
}

// 页面加载完成后初始化
document.addEventListener('DOMContentLoaded', () => {
  initializeEventListeners();
  toggleJpegQualityGroup(); // 初始化JPEG质量组状态
  toggleAdvancedCompressionGroup(); // 初始化高级压缩组状态
  updateCompressionInfo(); // 初始化压缩信息
}); 