#!/usr/bin/env node

const { processImage, processDirectory, convertToWebP } = require('./imageProcessor');
const path = require('path');
const fs = require('fs');

// 解析命令行参数
function parseArguments() {
  const args = process.argv.slice(2);
  const options = {
    inputPath: '',
    outputPath: '',
    maxSize: 70, // KB
    useLossless: false,
    useAdvancedCompression: true, // 默认启用高级压缩
    skipIfOptimal: true,
    jpegQuality: 95,
    convertToWebP: false, // 新增WebP转换选项
    sizeSettings: {
      landscapeWidth: 500,
      landscapeKeepSmall: true,
      portraitWidth: 200,
      portraitKeepSmall: true
    }
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    
    switch (arg) {
      case '--input':
      case '-i':
        options.inputPath = args[++i];
        break;
      case '--output':
      case '-o':
        options.outputPath = args[++i];
        break;
      case '--max-size':
      case '-s':
        options.maxSize = parseInt(args[++i]);
        break;
      case '--landscape-width':
      case '-lw':
        options.sizeSettings.landscapeWidth = parseInt(args[++i]);
        break;
      case '--portrait-width':
      case '-pw':
        options.sizeSettings.portraitWidth = parseInt(args[++i]);
        break;
      case '--quality':
      case '-q':
        options.jpegQuality = parseInt(args[++i]);
        break;
      case '--lossless':
      case '-l':
        options.useLossless = true;
        break;
      case '--advanced':
      case '-a':
        options.useAdvancedCompression = true;
        break;
      case '--no-advanced':
        options.useAdvancedCompression = false;
        break;
      case '--webp':
      case '-w':
        options.convertToWebP = true;
        break;
      case '--no-skip':
        options.skipIfOptimal = false;
        break;
      case '--allow-enlarge':
        options.sizeSettings.landscapeKeepSmall = false;
        options.sizeSettings.portraitKeepSmall = false;
        break;
      case '--help':
      case '-h':
        showHelp();
        process.exit(0);
        break;
      default:
        if (!options.inputPath) {
          options.inputPath = arg;
        } else if (!options.outputPath) {
          options.outputPath = arg;
        }
        break;
    }
  }

  return options;
}

// 显示帮助信息
function showHelp() {
  console.log(`
🖼️  图片自动处理工具 - 命令行版本

用法: node simple.js [选项] <输入路径> [输出路径]

基本选项:
  -i, --input <路径>           输入文件或文件夹路径
  -o, --output <路径>          输出文件或文件夹路径
  -s, --max-size <KB>          最大文件大小 (默认: 70KB)
  -h, --help                   显示帮助信息

尺寸设置:
  -lw, --landscape-width <px>  横屏图片最大宽度 (默认: 500px)
  -pw, --portrait-width <px>   竖屏图片统一宽度 (默认: 200px)
  --allow-enlarge             允许放大小尺寸图片

压缩选项:
  -q, --quality <1-100>        JPEG质量 (默认: 95)
  -l, --lossless              使用PNG无损压缩
  -a, --advanced              启用商业级压缩算法 (默认启用)
  --no-advanced               禁用商业级压缩算法
  -w, --webp                  转换为WebP格式 (实验性)

处理选项:
  --no-skip                   禁用智能跳过功能
  
💡 压缩算法说明:
  • 商业级算法: 使用MozJPEG编码器，压缩率可达80-90%，接近TinyPNG质量
  • 标准算法: 使用常规JPEG压缩，压缩率通常60-75%
  • 无损压缩: PNG格式，质量完美但文件较大
  • WebP格式: 更先进的图片格式，比JPEG小20-35%

示例:
  node simple.js input.jpg output.jpg
  node simple.js -i ./images -o ./compressed --quality 85 --landscape-width 800
  node simple.js ./photos ./optimized --lossless --portrait-width 300
  node simple.js image.jpg output.webp --webp --quality 90
  `);
}

// 主函数
async function main() {
  const options = parseArguments();

  // 验证输入参数
  if (!options.inputPath) {
    console.error('❌ 错误: 请指定输入路径');
    console.log('使用 --help 查看帮助信息');
    process.exit(1);
  }

  if (!fs.existsSync(options.inputPath)) {
    console.error('❌ 错误: 输入路径不存在:', options.inputPath);
    process.exit(1);
  }

  // 检查输入是文件还是目录
  const inputStats = fs.statSync(options.inputPath);
  const isDirectory = inputStats.isDirectory();

  // 如果没有指定输出路径，自动生成
  if (!options.outputPath) {
    if (isDirectory) {
      options.outputPath = options.inputPath + '_processed';
    } else {
      const parsedPath = path.parse(options.inputPath);
      let suffix = '_processed';
      if (options.convertToWebP) {
        suffix = '.webp';
        options.outputPath = path.join(parsedPath.dir, parsedPath.name + suffix);
      } else if (options.useLossless) {
        suffix = '_processed.png';
        options.outputPath = path.join(parsedPath.dir, parsedPath.name + suffix);
      } else {
        suffix = '_processed' + parsedPath.ext;
        options.outputPath = path.join(parsedPath.dir, parsedPath.name + suffix);
      }
    }
  }

  console.log('🚀 开始处理图片...');
  console.log('📁 输入路径:', options.inputPath);
  console.log('📁 输出路径:', options.outputPath);
  console.log('📏 最大大小:', options.maxSize + 'KB');
  
  // 显示压缩模式
  let compressionMode;
  if (options.convertToWebP) {
    compressionMode = `WebP格式 (质量: ${options.jpegQuality})`;
  } else if (options.useLossless) {
    compressionMode = 'PNG无损压缩';
  } else if (options.useAdvancedCompression) {
    compressionMode = `商业级JPEG (质量: ${options.jpegQuality}, MozJPEG算法)`;
  } else {
    compressionMode = `标准JPEG (质量: ${options.jpegQuality})`;
  }
  console.log('🎛️  压缩模式:', compressionMode);
  
  // 显示尺寸设置
  console.log('📐 尺寸设置:', 
    `横屏≤${options.sizeSettings.landscapeWidth}px${options.sizeSettings.landscapeKeepSmall ? '(保持小图)' : ''}`, 
    `竖屏=${options.sizeSettings.portraitWidth}px${options.sizeSettings.portraitKeepSmall ? '(保持小图)' : ''}`
  );
  
  // 显示特殊选项
  const specialOptions = [];
  if (options.skipIfOptimal) specialOptions.push('智能跳过');
  if (options.useAdvancedCompression && !options.useLossless) specialOptions.push('商业级算法');
  if (specialOptions.length > 0) {
    console.log('⚙️  特殊选项:', specialOptions.join(', '));
  }
  
  console.log('');

  try {
    const maxSizeBytes = options.maxSize * 1024;
    
    if (options.convertToWebP) {
      // WebP转换
      if (isDirectory) {
        console.log('❌ 错误: WebP转换目前只支持单个文件');
        process.exit(1);
      } else {
        await convertToWebP(options.inputPath, options.outputPath, maxSizeBytes, {
          jpegQuality: options.jpegQuality,
          lossless: options.useLossless
        });
      }
    } else if (isDirectory) {
      // 处理目录
      await processDirectory(options.inputPath, options.outputPath, maxSizeBytes, {
        useLossless: options.useLossless,
        useAdvancedCompression: options.useAdvancedCompression,
        skipIfOptimal: options.skipIfOptimal,
        jpegQuality: options.jpegQuality,
        sizeSettings: options.sizeSettings
      });
    } else {
      // 处理单个文件
      await processImage(options.inputPath, options.outputPath, maxSizeBytes, {
        useLossless: options.useLossless,
        useAdvancedCompression: options.useAdvancedCompression,
        skipIfOptimal: options.skipIfOptimal,
        jpegQuality: options.jpegQuality,
        sizeSettings: options.sizeSettings
      });
    }

    console.log('\n✅ 所有图片处理完成！');
    console.log('📁 输出位置:', options.outputPath);

  } catch (error) {
    console.error('\n❌ 处理失败:', error.message);
    process.exit(1);
  }
}

// 运行主函数
if (require.main === module) {
  main().catch(console.error);
} 