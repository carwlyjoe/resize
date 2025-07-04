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
const useAdvancedCompressionEl = document.getElementById('useAdvancedCompression');
const skipIfOptimalEl = document.getElementById('skipIfOptimal');
const jpegQualityEl = document.getElementById('jpegQuality');
const jpegQualityValueEl = document.getElementById('jpegQualityValue');
const jpegQualityGroupEl = document.getElementById('jpegQualityGroup');

// 新增尺寸设置元素
const resizePngImagesEl = document.getElementById('resizePngImages');
const resizeSettingsEl = document.getElementById('resizeSettings');
const landscapeWidthEl = document.getElementById('landscapeWidth');
const landscapeKeepSmallEl = document.getElementById('landscapeKeepSmall');
const portraitWidthEl = document.getElementById('portraitWidth');
const portraitKeepSmallEl = document.getElementById('portraitKeepSmall');

// TinyPNG API Key管理元素
const apiKeyInputEl = document.getElementById('apiKeyInput');
const addApiKeyBtnEl = document.getElementById('addApiKeyBtn');
const testAllKeysBtnEl = document.getElementById('testAllKeysBtn');
const apiKeyListEl = document.getElementById('apiKeyList');

// 存储状态
let state = {
  inputPath: '',
  outputPath: '',
  isDirectory: false,
  apiKeys: [] // 存储API Key列表
};

// 本地存储键名
const STORAGE_KEYS = {
  API_KEYS: 'tinypng_api_keys'
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

  // 高级压缩选项变化
  useAdvancedCompressionEl.addEventListener('change', () => {
    updateCompressionInfo();
  });

  // PNG缩放选项变化
  resizePngImagesEl.addEventListener('change', () => {
    updateCompressionInfo();
  });

  // API Key管理事件
  addApiKeyBtnEl.addEventListener('click', () => {
    addApiKey();
  });

  testAllKeysBtnEl.addEventListener('click', () => {
    testAllApiKeys();
  });

  // API Key输入框回车事件
  apiKeyInputEl.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      addApiKey();
    }
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



// 尺寸设置始终显示，因为JPG图片总是需要缩放设置

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
  const options = {
    maxSize: parseInt(maxSizeEl.value) || 70,
    useAdvancedCompression: useAdvancedCompressionEl.checked,
    skipIfOptimal: skipIfOptimalEl.checked,
    jpegQuality: parseInt(jpegQualityEl.value) || 95,
    // 新增的尺寸设置
    resizePngImages: resizePngImagesEl.checked,
    apiKeys: state.apiKeys.filter(key => key.status !== 'invalid'), // 只传有效的API Key
    sizeSettings: {
      landscapeWidth: parseInt(landscapeWidthEl.value) || 500,
      landscapeKeepSmall: landscapeKeepSmallEl.checked,
      portraitWidth: parseInt(portraitWidthEl.value) || 200,
      portraitKeepSmall: portraitKeepSmallEl.checked
    }
  };
  
  return options;
}

// 生成处理规则摘要
function generateRulesSummary(options) {
  const { sizeSettings } = options;
  let summary = '';
  
  // JPG图片处理规则
  summary += `JPG图片: 横屏→${sizeSettings.landscapeWidth}px`;
  if (sizeSettings.landscapeKeepSmall) {
    summary += '(保持小图)';
  }
  summary += `, 竖屏→${sizeSettings.portraitWidth}px`;
  if (sizeSettings.portraitKeepSmall) {
    summary += '(保持小图)';
  }
  
  // PNG图片处理规则
  if (options.resizePngImages) {
    summary += ' | PNG图片: 同JPG规则+本地压缩';
  } else {
    summary += ' | PNG图片: 保持原尺寸+TinyPNG压缩';
  }
  
  return summary;
}

// 生成压缩模式描述
function getCompressionModeDescription(options) {
  if (options.useAdvancedCompression) {
    return `商业级JPEG压缩（质量${options.jpegQuality}）`;
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
        useAdvancedCompression: options.useAdvancedCompression,
        skipIfOptimal: options.skipIfOptimal,
        jpegQuality: options.jpegQuality,
        resizePngImages: options.resizePngImages,
        apiKeys: options.apiKeys.map(key => key.key), // 只传递key字符串
        sizeSettings: options.sizeSettings
      }
    });
    
    // 显示详细的处理结果
    let resultMessage = result.message;
    if (result.success) {
      if (options.useAdvancedCompression) {
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

// ===== API Key 管理功能 =====

// 保存API Keys到本地存储
function saveApiKeysToStorage() {
  try {
    const apiKeysData = state.apiKeys.map(apiKey => ({
      key: apiKey.key,
      valid: apiKey.valid,
      compressionCount: apiKey.compressionCount,
      remainingCount: apiKey.remainingCount,
      status: apiKey.status,
      error: apiKey.error
    }));
    localStorage.setItem(STORAGE_KEYS.API_KEYS, JSON.stringify(apiKeysData));
  } catch (error) {
    console.error('保存API Keys失败:', error);
  }
}

// 从本地存储加载API Keys
function loadApiKeysFromStorage() {
  try {
    const storedData = localStorage.getItem(STORAGE_KEYS.API_KEYS);
    if (storedData) {
      const apiKeysData = JSON.parse(storedData);
      state.apiKeys = apiKeysData.map(apiKey => ({
        key: apiKey.key,
        valid: apiKey.valid !== false, // 默认为true，除非明确为false
        compressionCount: apiKey.compressionCount || 0,
        remainingCount: apiKey.remainingCount || 0,
        status: apiKey.status || (apiKey.valid ? 'available' : 'invalid'),
        error: apiKey.error || null
      }));
      updateApiKeyList();
    }
  } catch (error) {
    console.error('加载API Keys失败:', error);
    state.apiKeys = [];
  }
}

// 添加API Key
async function addApiKey() {
  const apiKey = apiKeyInputEl.value.trim();
  
  if (!apiKey) {
    showStatus('请输入API Key', false);
    return;
  }
  
  // 检查是否已经存在
  if (state.apiKeys.some(k => k.key === apiKey)) {
    showStatus('该API Key已存在', false);
    return;
  }
  
  // 测试API Key
  addApiKeyBtnEl.disabled = true;
  addApiKeyBtnEl.textContent = '测试中...';
  
  try {
    const testResult = await ipcRenderer.invoke('test-tinypng-key', apiKey);
    
    // 添加到状态
    state.apiKeys.push({
      key: apiKey,
      ...testResult
    });
    
    // 清空输入框
    apiKeyInputEl.value = '';
    
    // 更新界面
    updateApiKeyList();
    
    // 保存到本地存储
    saveApiKeysToStorage();
    
    if (testResult.valid) {
      showStatus(`API Key添加成功，剩余额度: ${testResult.remainingCount}`, true);
    } else {
      showStatus(`API Key无效: ${testResult.error}`, false);
    }
    
  } catch (error) {
    showStatus(`测试API Key失败: ${error.message}`, false);
  } finally {
    addApiKeyBtnEl.disabled = false;
    addApiKeyBtnEl.textContent = '添加';
  }
}

// 测试所有API Key
async function testAllApiKeys() {
  if (state.apiKeys.length === 0) {
    showStatus('没有API Key需要测试', false);
    return;
  }
  
  testAllKeysBtnEl.disabled = true;
  testAllKeysBtnEl.textContent = '测试中...';
  
  let testedCount = 0;
  
  for (const apiKeyObj of state.apiKeys) {
    try {
      const testResult = await ipcRenderer.invoke('test-tinypng-key', apiKeyObj.key);
      
      // 更新状态
      Object.assign(apiKeyObj, testResult);
      testedCount++;
      
    } catch (error) {
      apiKeyObj.valid = false;
      apiKeyObj.error = error.message;
      apiKeyObj.status = 'invalid';
    }
  }
  
  // 更新界面
  updateApiKeyList();
  
  // 保存到本地存储
  saveApiKeysToStorage();
  
  const validCount = state.apiKeys.filter(k => k.valid).length;
  showStatus(`测试完成: ${validCount}/${testedCount} 个API Key有效`, true);
  
  testAllKeysBtnEl.disabled = false;
  testAllKeysBtnEl.textContent = '测试所有';
}

// 删除API Key
function deleteApiKey(apiKey) {
  const index = state.apiKeys.findIndex(k => k.key === apiKey);
  if (index !== -1) {
    state.apiKeys.splice(index, 1);
    updateApiKeyList();
    
    // 保存到本地存储
    saveApiKeysToStorage();
    
    showStatus('API Key已删除', true);
  }
}

// 测试单个API Key
async function testSingleApiKey(apiKey) {
  const apiKeyObj = state.apiKeys.find(k => k.key === apiKey);
  if (!apiKeyObj) return;
  
  try {
    const testResult = await ipcRenderer.invoke('test-tinypng-key', apiKey);
    
    // 更新状态
    Object.assign(apiKeyObj, testResult);
    
    // 更新界面
    updateApiKeyList();
    
    // 保存到本地存储
    saveApiKeysToStorage();
    
    if (testResult.valid) {
      showStatus(`API Key测试成功，剩余额度: ${testResult.remainingCount}`, true);
    } else {
      showStatus(`API Key无效: ${testResult.error}`, false);
    }
    
  } catch (error) {
    apiKeyObj.valid = false;
    apiKeyObj.error = error.message;
    apiKeyObj.status = 'invalid';
    updateApiKeyList();
    
    // 保存到本地存储
    saveApiKeysToStorage();
    
    showStatus(`测试失败: ${error.message}`, false);
  }
}

// 更新API Key列表显示
function updateApiKeyList() {
  apiKeyListEl.innerHTML = '';
  
  if (state.apiKeys.length === 0) {
    apiKeyListEl.innerHTML = '<p style="color: #666; text-align: center; margin: 10px 0;">暂无API Key</p>';
    return;
  }
  
  state.apiKeys.forEach(apiKeyObj => {
    const item = document.createElement('div');
    item.className = 'api-key-item';
    
    const statusClass = `status-${apiKeyObj.status}`;
    const statusText = {
      'available': '可用',
      'limited': '有限',
      'exhausted': '已用完',
      'invalid': '无效'
    }[apiKeyObj.status] || '未知';
    
    const remainingText = apiKeyObj.valid ? 
      `剩余: ${apiKeyObj.remainingCount || 0}` : 
      (apiKeyObj.error || '错误');
    
    item.innerHTML = `
      <div class="api-key-info">
        <span class="api-key-text">${apiKeyObj.key.substring(0, 8)}...${apiKeyObj.key.substring(apiKeyObj.key.length - 4)}</span>
        <span class="api-key-status ${statusClass}">${statusText}</span>
        <span class="api-key-remaining">${remainingText}</span>
      </div>
      <div class="api-key-actions">
        <button class="btn-small btn-test" onclick="testSingleApiKey('${apiKeyObj.key}')">测试</button>
        <button class="btn-small btn-delete" onclick="deleteApiKey('${apiKeyObj.key}')">删除</button>
      </div>
    `;
    
    apiKeyListEl.appendChild(item);
  });
}

// 页面加载完成后初始化
document.addEventListener('DOMContentLoaded', () => {
  initializeEventListeners();
  loadApiKeysFromStorage(); // 从本地存储加载API Key列表
  updateCompressionInfo(); // 初始化压缩信息
}); 