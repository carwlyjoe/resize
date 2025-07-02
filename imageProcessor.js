const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

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
      useLossless = false,  // 是否使用无损压缩（PNG格式）
      jpegQuality = 95,     // JPEG质量（1-100，95为高质量）
      skipIfOptimal = true, // 如果图片已经符合要求，是否跳过处理
      useAdvancedCompression = true, // 使用高级压缩算法
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
    
    // 高级压缩处理
    if (useLossless) {
      // PNG无损压缩 - 使用最佳设置
      processedImage = processedImage.png({ 
        compressionLevel: 9,      // 最高压缩级别
        quality: 100,            // 无损质量
        progressive: false,      // 不使用渐进式（文件更小）
        palette: true,           // 尝试使用调色板（减少颜色数量）
        effort: 10              // 最大压缩努力
      });
      
      // 更改输出文件扩展名为.png
      const parsedPath = path.parse(outputPath);
      outputPath = path.join(parsedPath.dir, parsedPath.name + '.png');
      log('使用PNG无损压缩（高级优化）');
    } else {
      // JPEG压缩 - 商业级优化
      if (useAdvancedCompression) {
        // 智能质量调整算法
        let targetQuality = jpegQuality;
        
        if (needsCompression && inputFileSize > maxSize) {
          // 根据文件大小和复杂度智能调整质量
          const compressionRatio = maxSize / inputFileSize;
          const baseQuality = Math.max(60, jpegQuality * 0.7); // 基础质量不低于60
          const adjustedQuality = Math.min(jpegQuality, baseQuality + (compressionRatio * 30));
          targetQuality = Math.round(adjustedQuality);
          
          log(`智能质量调整: ${jpegQuality} -> ${targetQuality} (压缩比: ${compressionRatio.toFixed(2)})`);
        }
        
        // 使用高级JPEG设置
        processedImage = processedImage.jpeg({ 
          quality: targetQuality,
          progressive: true,        // 渐进式JPEG（更好的压缩）
          mozjpeg: true,           // 使用MozJPEG编码器（更好的压缩）
          trellisQuantisation: true, // 网格量化（提高压缩效率）
          overshootDeringing: true,  // 减少振铃效应
          optimiseScans: true,       // 优化扫描（更好的压缩）
          optimiseCoding: true,      // 优化编码（更好的压缩）
          quantisationTable: 3       // 使用优化的量化表
        });
        
        log(`使用高级JPEG压缩，质量: ${targetQuality} (商业级优化)`);
      } else {
        // 标准JPEG压缩
        if (needsCompression && inputFileSize > maxSize) {
          const compressionRatio = maxSize / inputFileSize;
          const dynamicQuality = Math.max(60, Math.min(jpegQuality, Math.floor(jpegQuality * compressionRatio * 1.2)));
          processedImage = processedImage.jpeg({ quality: dynamicQuality });
          log(`使用标准JPEG压缩，质量: ${dynamicQuality}`);
        } else {
          processedImage = processedImage.jpeg({ quality: jpegQuality });
          log(`使用JPEG高质量，质量: ${jpegQuality}`);
        }
      }
    }
    
    // 保存处理后的图片
    await processedImage.toFile(outputPath);
    
    // 获取最终文件大小
    const finalStats = fs.statSync(outputPath);
    const finalSize = finalStats.size;
    
    // 计算压缩率
    const compressionRatio = ((inputFileSize - finalSize) / inputFileSize * 100).toFixed(1);
    
    log(`处理完成: ${path.basename(inputPath)} -> ${path.basename(outputPath)}`);
    log(`最终尺寸: ${needsResize ? `${newWidth}x${newHeight}` : `${width}x${height} (未调整)`}`);
    log(`文件大小: ${inputFileSize} -> ${finalSize} 字节 (压缩率: ${compressionRatio}%)`);
    log(`压缩结果: ${finalSize <= maxSize ? '✅ 符合' : '⚠️ 超出'}大小限制`);
    
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
  convertToWebP
}; 