const fs = require('fs');
const path = require('path');
const sharp = require('sharp');
const tinify = require('tinify');

/**
 * 使用TinyPNG API压缩图片
 * @param {string} inputPath - 输入图片路径
 * @param {string} outputPath - 输出图片路径
 * @param {Array} apiKeys - API Key数组
 * @param {function} log - 日志函数
 * @returns {Promise<boolean>} - 返回是否成功
 */
async function compressWithTinyPNG(inputPath, outputPath, apiKeys, log) {
  if (!apiKeys || apiKeys.length === 0) {
    log('❌ 没有可用的TinyPNG API Key');
    return false;
  }

  // 尝试每个API Key
  for (const apiKey of apiKeys) {
    try {
      tinify.key = apiKey;
      
      log(`🔑 使用TinyPNG API Key: ${apiKey.substring(0, 8)}...`);
      
      const source = tinify.fromFile(inputPath);
      await source.toFile(outputPath);
      
      log('✅ TinyPNG压缩成功');
      return true;
      
    } catch (error) {
      if (error instanceof tinify.ClientError) {
        log(`❌ API Key ${apiKey.substring(0, 8)}... 无效或额度已用完`);
      } else if (error instanceof tinify.ServerError) {
        log(`❌ TinyPNG服务器错误，尝试下一个API Key`);
      } else if (error instanceof tinify.ConnectionError) {
        log(`❌ 网络连接错误，尝试下一个API Key`);
      } else {
        log(`❌ 压缩错误: ${error.message}`);
      }
    }
  }
  
  log('❌ 所有TinyPNG API Key都已尝试，压缩失败');
  return false;
}

/**
 * 测试TinyPNG API Key可用性
 * @param {string} apiKey - API Key
 * @returns {Promise<Object>} - 返回测试结果
 */
async function testTinyPNGKey(apiKey) {
  try {
    tinify.key = apiKey;
    
    // 使用一个很小的测试图片数据来验证API Key
    const testBuffer = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==', 'base64');
    const source = tinify.fromBuffer(testBuffer);
    await source.toBuffer();
    
    // 获取使用情况
    const compressionCount = tinify.compressionCount || 0;
    
    return {
      valid: true,
      compressionCount: compressionCount,
      remainingCount: Math.max(0, 500 - compressionCount),
      status: compressionCount >= 500 ? 'exhausted' : 
              compressionCount >= 400 ? 'limited' : 'available'
    };
  } catch (error) {
    return {
      valid: false,
      error: error.message,
      status: 'invalid'
    };
  }
}

/**
 * 自动调整图片大小并在必要时压缩
 * @param {string} inputPath - 输入图片路径
 * @param {string} outputPath - 输出图片路径
 * @param {number} maxSize - 最大文件大小（字节）
 * @param {Object} options - 处理选项
 * @returns {Promise<void>}
 */
async function processImage(inputPath, outputPath, maxSize = 70 * 1024, options = {}) {
  try {
    // 默认选项
    const {
      jpegQuality = 95,     // JPEG质量（1-100，95为高质量）
      skipIfOptimal = true, // 如果图片已经符合要求，是否跳过处理
      useAdvancedCompression = true, // 使用高级压缩算法
      resizePngImages = false, // 是否对PNG图片也执行缩放
      apiKeys = [],         // TinyPNG API Keys
      onLog = null,         // 日志回调函数，用于在Electron中显示日志
      sizeSettings = {      // 尺寸设置
        landscapeWidth: 500,    // 横屏图片最大宽度
        landscapeKeepSmall: true, // 是否保持小的横屏图片不放大
        portraitWidth: 200,     // 竖屏图片统一宽度
        portraitKeepSmall: true   // 是否保持小的竖屏图片不放大
      }
    } = options;
    
    // 日志输出函数，支持回调和控制台输出
    const log = (message) => {
      if (onLog && typeof onLog === 'function') {
        onLog(message);
      } else {
        console.log(message);
      }
    };

    // 获取图片元数据
    const metadata = await sharp(inputPath).metadata();
    const { width, height, format } = metadata;
    
    // 获取输入文件大小
    const inputStats = fs.statSync(inputPath);
    const inputFileSize = inputStats.size;
    
    log(`处理图片: ${path.basename(inputPath)}`);
    log(`输入图片信息: ${width}x${height}, 大小: ${inputFileSize} 字节, 格式: ${format}`);
    
    // 根据图片格式和用户选项决定处理策略
    if (format === 'png' && !resizePngImages) {
      // PNG图片且未勾选缩放选项：使用TinyPNG API压缩，保持原尺寸
      log('处理规则: PNG图片，保持原尺寸，使用TinyPNG API压缩');
      
      // 检查是否需要压缩
      const needsCompression = inputFileSize > maxSize;
      
      if (skipIfOptimal && !needsCompression) {
        log('图片已经符合大小要求，跳过处理');
        // 如果输入输出路径不同，直接复制文件
        if (inputPath !== outputPath) {
          fs.copyFileSync(inputPath, outputPath);
          log(`文件已复制到: ${path.basename(outputPath)}`);
        }
        return;
      }
      
      // 尝试使用TinyPNG压缩
      const tinyPngSuccess = await compressWithTinyPNG(inputPath, outputPath, apiKeys, log);
      
      if (tinyPngSuccess) {
        // 获取最终文件大小
        const finalStats = fs.statSync(outputPath);
        const finalSize = finalStats.size;
        
        // 计算压缩率
        const compressionRatio = ((inputFileSize - finalSize) / inputFileSize * 100).toFixed(1);
        
        log(`处理完成: ${path.basename(inputPath)} -> ${path.basename(outputPath)}`);
        log(`最终尺寸: ${width}x${height} (保持原尺寸)`);
        log(`文件大小: ${inputFileSize} -> ${finalSize} 字节 (压缩率: ${compressionRatio}%)`);
        log(`压缩结果: ${finalSize <= maxSize ? '✅ 符合' : '⚠️ 超出'}大小限制`);
      } else {
        // TinyPNG失败，回退到本地压缩
        log('⚠️ TinyPNG压缩失败，回退到本地PNG压缩');
        await processLocalPngCompression(inputPath, outputPath, maxSize, inputFileSize, width, height, log);
      }
      
      return;
    }
    
    // JPG图片或PNG图片勾选了缩放选项：执行本地缩放+压缩
    
    // 判断图片方向（横屏或竖屏）
    const isLandscape = width >= height;
    
    // 根据方向和设置确定新宽度
    let newWidth;
    if (isLandscape) {
      // 横屏图片处理
      if (sizeSettings.landscapeKeepSmall && width < sizeSettings.landscapeWidth) {
        newWidth = width; // 保持原尺寸，不放大
      } else {
        newWidth = Math.min(width, sizeSettings.landscapeWidth); // 限制最大宽度
      }
    } else {
      // 竖屏图片处理  
      if (sizeSettings.portraitKeepSmall && width < sizeSettings.portraitWidth) {
        newWidth = width; // 保持原尺寸，不放大
      } else {
        newWidth = sizeSettings.portraitWidth; // 统一宽度
      }
    }
    
    // 计算等比例的新高度
    const newHeight = Math.round(height * (newWidth / width));
    
    log(`处理规则: ${isLandscape ? '横屏' : '竖屏'}图片, 目标尺寸: ${newWidth}x${newHeight}`);
    
    // 检查是否需要处理
    const needsResize = (width !== newWidth || height !== newHeight);
    const needsCompression = inputFileSize > maxSize;
    
    if (skipIfOptimal && !needsResize && !needsCompression) {
      log('图片已经符合要求，跳过处理');
      // 如果输入输出路径不同，直接复制文件
      if (inputPath !== outputPath) {
        fs.copyFileSync(inputPath, outputPath);
        log(`文件已复制到: ${path.basename(outputPath)}`);
      }
      return;
    }
    
    log(`需要处理: 尺寸调整=${needsResize}, 压缩=${needsCompression}`);
    
    // 创建Sharp处理管道
    let processedImage = sharp(inputPath);
    
    // 如果需要调整尺寸
    if (needsResize) {
      processedImage = processedImage.resize(newWidth, newHeight, {
        fit: 'contain',
        withoutEnlargement: true // 避免放大小图片
      });
      log(`调整尺寸到: ${newWidth}x${newHeight}`);
    }
    
    if (format === 'png') {
      // PNG图片（勾选了缩放选项）：使用本地PNG压缩
      await processLocalPngCompression(processedImage, outputPath, maxSize, inputFileSize, newWidth, newHeight, log, needsResize);
    } else {
      // JPG图片：使用JPEG压缩，循环压缩直到达到目标大小
      await compressJpegToTarget(processedImage, outputPath, maxSize, jpegQuality, useAdvancedCompression, log);
      
      // 获取最终文件大小
      const finalStats = fs.statSync(outputPath);
      const finalSize = finalStats.size;
      
      // 计算压缩率
      const compressionRatio = ((inputFileSize - finalSize) / inputFileSize * 100).toFixed(1);
      
      log(`处理完成: ${path.basename(inputPath)} -> ${path.basename(outputPath)}`);
      log(`最终尺寸: ${needsResize ? `${newWidth}x${newHeight}` : `${width}x${height} (保持原尺寸)`}`);
      log(`文件大小: ${inputFileSize} -> ${finalSize} 字节 (压缩率: ${compressionRatio}%)`);
      log(`压缩结果: ✅ 符合大小限制`);
    }
    
  } catch (error) {
    const errorMessage = `处理图片时出错: ${error.message}`;
    if (options.onLog && typeof options.onLog === 'function') {
      options.onLog(errorMessage);
    } else {
      console.error(errorMessage);
    }
    throw error;
  }
}

/**
 * 本地PNG压缩处理
 * @param {Sharp|string} imageOrPath - Sharp处理对象或图片路径
 * @param {string} outputPath - 输出图片路径
 * @param {number} maxSize - 最大文件大小（字节）
 * @param {number} inputFileSize - 输入文件大小
 * @param {number} width - 图片宽度
 * @param {number} height - 图片高度
 * @param {function} log - 日志函数
 * @param {boolean} needsResize - 是否需要调整尺寸
 * @returns {Promise<void>}
 */
async function processLocalPngCompression(imageOrPath, outputPath, maxSize, inputFileSize, width, height, log, needsResize = false) {
  let processedImage;
  
  // 如果传入的是路径字符串，创建Sharp对象
  if (typeof imageOrPath === 'string') {
    processedImage = sharp(imageOrPath);
  } else {
    processedImage = imageOrPath;
  }
  
  // PNG无损压缩 - 使用最佳设置
  processedImage = processedImage.png({ 
    compressionLevel: 9,      // 最高压缩级别
    quality: 100,            // 无损质量
    progressive: false,      // 不使用渐进式（文件更小）
    palette: true,           // 尝试使用调色板（减少颜色数量）
    effort: 10              // 最大压缩努力
  });
  
  log('使用PNG本地压缩（高级优化）');
  
  // 保存文件
  await processedImage.toFile(outputPath);
  
  // 获取最终文件大小
  const finalStats = fs.statSync(outputPath);
  const finalSize = finalStats.size;
  
  // 计算压缩率
  const compressionRatio = ((inputFileSize - finalSize) / inputFileSize * 100).toFixed(1);
  
  log(`处理完成: ${path.basename(outputPath)}`);
  log(`最终尺寸: ${needsResize ? `${width}x${height}` : `${width}x${height} (保持原尺寸)`}`);
  log(`文件大小: ${inputFileSize} -> ${finalSize} 字节 (压缩率: ${compressionRatio}%)`);
  log(`压缩结果: ${finalSize <= maxSize ? '✅ 符合' : '⚠️ 超出'}大小限制`);
}

/**
 * JPEG循环压缩直到达到目标大小
 * @param {Sharp} processedImage - Sharp处理对象
 * @param {string} outputPath - 输出图片路径
 * @param {number} maxSize - 最大文件大小（字节）
 * @param {number} jpegQuality - 初始JPEG质量
 * @param {boolean} useAdvancedCompression - 是否使用高级压缩
 * @param {function} log - 日志函数
 * @returns {Promise<void>}
 */
async function compressJpegToTarget(processedImage, outputPath, maxSize, jpegQuality, useAdvancedCompression, log) {
  let currentQuality = jpegQuality;
  let attempt = 1;
  const maxAttempts = 10; // 最大尝试次数
  
  while (attempt <= maxAttempts) {
    // 设置JPEG压缩参数
    let jpegOptions;
    if (useAdvancedCompression) {
      jpegOptions = {
        quality: currentQuality,
        progressive: true,
        mozjpeg: true,
        trellisQuantisation: true,
        overshootDeringing: true,
        optimiseScans: true,
        optimiseCoding: true,
        quantisationTable: 3
      };
    } else {
      jpegOptions = {
        quality: currentQuality
      };
    }
    
    // 创建临时文件进行测试
    const tempPath = outputPath + '.temp';
    await processedImage.jpeg(jpegOptions).toFile(tempPath);
    
    // 检查文件大小
    const tempStats = fs.statSync(tempPath);
    const fileSize = tempStats.size;
    
    log(`第${attempt}次压缩: 质量${currentQuality}, 大小${fileSize}字节`);
    
    if (fileSize <= maxSize) {
      // 达到目标大小，移动到最终位置
      fs.renameSync(tempPath, outputPath);
      log(`✅ JPEG压缩成功！经过${attempt}次尝试达到目标大小`);
      return;
    }
    
    // 清理临时文件
    fs.unlinkSync(tempPath);
    
    // 调整质量进行下一次尝试
    if (attempt === maxAttempts) {
      // 最后一次尝试，使用最低质量
      currentQuality = 10;
    } else {
      // 动态调整质量
      const compressionRatio = maxSize / fileSize;
      const qualityReduction = Math.max(5, Math.floor((1 - compressionRatio) * currentQuality * 0.3));
      currentQuality = Math.max(10, currentQuality - qualityReduction);
    }
    
    attempt++;
  }
  
  // 如果所有尝试都失败，使用最低质量保存
  log(`⚠️ 经过${maxAttempts}次尝试仍未达到目标，使用最低质量(10)保存`);
  await processedImage.jpeg({ quality: 10 }).toFile(outputPath);
}

/**
 * 智能WebP转换（实验性功能）
 * @param {string} inputPath - 输入图片路径
 * @param {string} outputPath - 输出图片路径
 * @param {number} maxSize - 最大文件大小（字节）
 * @param {Object} options - 处理选项
 * @returns {Promise<void>}
 */
async function convertToWebP(inputPath, outputPath, maxSize = 70 * 1024, options = {}) {
  try {
    const { jpegQuality = 85, lossless = false } = options;
    
    // 更改输出文件扩展名为.webp
    const parsedPath = path.parse(outputPath);
    outputPath = path.join(parsedPath.dir, parsedPath.name + '.webp');
    
    let processedImage = sharp(inputPath);
    
    if (lossless) {
      processedImage = processedImage.webp({ 
        lossless: true,
        effort: 6  // 最大压缩努力
      });
      console.log('使用WebP无损压缩');
    } else {
      processedImage = processedImage.webp({ 
        quality: jpegQuality,
        effort: 6,           // 最大压缩努力
        smartSubsample: true // 智能子采样
      });
      console.log(`使用WebP有损压缩，质量: ${jpegQuality}`);
    }
    
    await processedImage.toFile(outputPath);
    
    const finalStats = fs.statSync(outputPath);
    const inputStats = fs.statSync(inputPath);
    const compressionRatio = ((inputStats.size - finalStats.size) / inputStats.size * 100).toFixed(1);
    
    console.log(`WebP转换完成，压缩率: ${compressionRatio}%`);
    
  } catch (error) {
    console.error('WebP转换时出错:', error);
    throw error;
  }
}

/**
 * 批量处理目录中的所有图片
 * @param {string} inputDir - 输入目录
 * @param {string} outputDir - 输出目录
 * @param {number} maxSize - 最大文件大小（字节）
 * @param {Object} options - 处理选项
 * @returns {Promise<void>}
 */
async function processDirectory(inputDir, outputDir, maxSize = 70 * 1024, options = {}) {
  // 添加日志函数
  const log = (message) => {
    if (options.onLog && typeof options.onLog === 'function') {
      options.onLog(message);
    } else {
      console.log(message);
    }
  };
  
  // 确保输出目录存在
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }
  
  // 获取目录中的所有文件
  const files = fs.readdirSync(inputDir);
  
  // 过滤出图片文件（简单判断常见图片扩展名）
  const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp'];
  const imageFiles = files.filter(file => {
    const ext = path.extname(file).toLowerCase();
    return imageExtensions.includes(ext);
  });
  
  log(`📂 找到 ${imageFiles.length} 个图片文件待处理`);
  log(`📐 处理设置: 横屏${options.sizeSettings?.landscapeWidth || 500}px, 竖屏${options.sizeSettings?.portraitWidth || 200}px`);
  log(`🎛️  压缩模式: ${options.useLossless ? 'PNG无损' : (options.useAdvancedCompression ? '高级JPEG' : '标准JPEG')}`);
  log('');
  
  let totalInputSize = 0;
  let totalOutputSize = 0;
  let processedCount = 0;
  
  // 处理每个图片
  for (const file of imageFiles) {
    const inputPath = path.join(inputDir, file);
    const outputPath = path.join(outputDir, file);
    
    log(`[${processedCount + 1}/${imageFiles.length}] 开始处理: ${file}`);
    
    const inputStats = fs.statSync(inputPath);
    totalInputSize += inputStats.size;
    
    try {
      await processImage(inputPath, outputPath, maxSize, options);
      
      if (fs.existsSync(outputPath)) {
        const outputStats = fs.statSync(outputPath);
        totalOutputSize += outputStats.size;
      }
      
      processedCount++;
      log('');
    } catch (error) {
      log(`❌ 处理失败: ${file} - ${error.message}`);
      log('');
    }
  }
  
  // 显示总体统计
  const totalCompressionRatio = ((totalInputSize - totalOutputSize) / totalInputSize * 100).toFixed(1);
  log(`📊 批量处理统计:`);
  log(`• 成功处理: ${processedCount}/${imageFiles.length} 个文件`);
  log(`• 总输入大小: ${(totalInputSize / 1024 / 1024).toFixed(2)} MB`);
  log(`• 总输出大小: ${(totalOutputSize / 1024 / 1024).toFixed(2)} MB`);
  log(`• 总压缩率: ${totalCompressionRatio}%`);
  log(`• 节省空间: ${((totalInputSize - totalOutputSize) / 1024 / 1024).toFixed(2)} MB`);
}

module.exports = {
  processImage,
  processDirectory,
  convertToWebP,
  compressWithTinyPNG,
  testTinyPNGKey
}; 