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
        const textHeight = settings.fontSize;
        
        // 计算坐标
        const x = (settings.position.x / 100) * img.width - (textWidth / 2);
        const y = (settings.position.y / 100) * img.height;
        
        // 绘制水印文本
        ctx.fillText(watermarkText, x, y);
        
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