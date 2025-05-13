/**
 * 给图片添加时间戳水印
 * @param {string} imageSrc - 图片的数据URL
 * @param {Date} timestamp - 时间戳
 * @param {Object} settings - 水印设置
 * @param {string} formattedText - 预格式化的水印文本
 * @returns {Promise<string>} - 处理后的图片数据URL
 */
export const createWatermark = (imageSrc, timestamp, settings, formattedText) => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'Anonymous';
    
    img.onload = () => {
      try {
        // 创建canvas
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        // 设置canvas尺寸与图片相同
        canvas.width = img.width;
        canvas.height = img.height;
        
        // 在canvas上绘制原始图片
        ctx.drawImage(img, 0, 0, img.width, img.height);
        
        // 使用预格式化的文本，如果没有则格式化时间戳
        const watermarkText = formattedText || formatTimestamp(timestamp);
        
        // 设置文本样式
        ctx.font = `${settings.fontSize}px Arial`;
        ctx.fillStyle = hexToRgba(settings.color, settings.opacity);
        
        // 计算文本尺寸
        const textMetrics = ctx.measureText(watermarkText);
        const textWidth = textMetrics.width;
        // 字体大小调整为1.2倍，更好地估计文本高度
        const textHeight = settings.fontSize * 1.2;
        
        // 位置映射表 (九宫格)
        const positionMap = [
          { name: '左上', x: 0, y: 0 }, // 0
          { name: '上中', x: 0.5, y: 0 }, // 1
          { name: '右上', x: 1, y: 0 }, // 2
          { name: '左中', x: 0, y: 0.5 }, // 3
          { name: '中心', x: 0.5, y: 0.5 }, // 4
          { name: '右中', x: 1, y: 0.5 }, // 5
          { name: '左下', x: 0, y: 1 }, // 6
          { name: '下中', x: 0.5, y: 1 }, // 7
          { name: '右下', x: 1, y: 1 }, // 8
        ];
        
        // 获取当前位置
        const posIndex = typeof settings.position === 'number' ? settings.position : 8;
        const position = positionMap[posIndex] || positionMap[8]; // 默认右下
        
        // 定义边缘内边距（像素）
        const padding = 20;
        
        // 计算文本在图片上的实际位置
        let x, y;
        
        // 根据相对位置计算实际像素坐标
        if (position.x === 0) { // 左侧
          x = padding + textWidth / 2;
        } else if (position.x === 1) { // 右侧
          x = img.width - padding - textWidth / 2;
        } else { // 水平居中
          x = img.width * position.x;
        }
        
        if (position.y === 0) { // 顶部
          y = padding + textHeight / 2;
        } else if (position.y === 1) { // 底部
          y = img.height - padding;
        } else { // 垂直居中
          y = img.height * position.y + textHeight / 4;
        }
        
        // 确保水印完全在图片内部显示
        x = Math.max(textWidth / 2 + padding, Math.min(img.width - textWidth / 2 - padding, x));
        y = Math.max(textHeight / 2 + padding, Math.min(img.height - padding, y));
        
        // 绘制文本前增加一个轻微背景（可选，提高可读性）
        if (settings.opacity < 0.8) { // 只有当透明度较低时添加
          const bgPadding = 5;
          ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
          ctx.fillRect(
            x - textWidth / 2 - bgPadding, 
            y - textHeight + bgPadding, 
            textWidth + bgPadding * 2, 
            textHeight + bgPadding
          );
          // 恢复文本颜色
          ctx.fillStyle = hexToRgba(settings.color, settings.opacity);
        }
        
        // 绘制水印文本
        ctx.fillText(watermarkText, x - textWidth / 2, y);
        
        // 导出处理后的图片
        const processedImageUrl = canvas.toDataURL(getOutputFormat(img.src));
        resolve(processedImageUrl);
      } catch (error) {
        reject(error);
      }
    };
    
    img.onerror = (error) => {
      reject(error);
    };
    
    img.src = imageSrc;
  });
};

/**
 * 格式化时间戳
 * @param {Date} timestamp - 时间对象
 * @returns {string} - 格式化后的时间字符串
 */
const formatTimestamp = (timestamp) => {
  const year = timestamp.getFullYear();
  const month = String(timestamp.getMonth() + 1).padStart(2, '0');
  const day = String(timestamp.getDate()).padStart(2, '0');
  const hours = String(timestamp.getHours()).padStart(2, '0');
  const minutes = String(timestamp.getMinutes()).padStart(2, '0');
  const seconds = String(timestamp.getSeconds()).padStart(2, '0');
  
  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
};

/**
 * 将十六进制颜色转换为rgba格式
 * @param {string} hex - 十六进制颜色值
 * @param {number} opacity - 不透明度
 * @returns {string} - rgba格式的颜色
 */
const hexToRgba = (hex, opacity) => {
  // 移除#前缀（如果有）
  hex = hex.replace('#', '');
  
  // 将十六进制转换为RGB
  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);
  
  return `rgba(${r}, ${g}, ${b}, ${opacity})`;
};

/**
 * 根据图片源获取输出格式
 * @param {string} src - 图片源
 * @returns {string} - 输出格式
 */
const getOutputFormat = (src) => {
  // 检查图片类型，默认使用image/jpeg
  if (src.includes('image/png')) {
    return 'image/png';
  } else if (src.includes('image/gif')) {
    return 'image/png'; // GIF不保留动画，转为PNG
  } else if (src.includes('image/webp')) {
    return 'image/webp';
  } else {
    return 'image/jpeg';
  }
}; 