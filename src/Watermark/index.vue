<script setup>
import { ref, reactive, computed, onMounted, nextTick } from 'vue';
import { createWatermark } from './utils.js';

// 应用状态
const appState = ref('upload'); // 'upload' 或 'edit'

// 图片列表
const imageList = ref([]);
// 当前选中的图片索引
const currentImageIndex = ref(0);
// 当前图片
const currentImage = computed(() => {
  return imageList.value[currentImageIndex.value] || null;
});

// 设置面板显示状态
const showSettings = ref(false);

// 水印设置
const watermarkSettings = reactive({
  fontSize: 16, // 字体大小
  color: '#ffffff', // 水印颜色
  opacity: 0.7, // 透明度
  useCurrentTime: true, // 是否使用当前时间
  customTime: new Date(), // 自定义时间
  prefix: '', // 文件名前缀
  suffix: '_watermark', // 文件名后缀
  // 水印位置 (可拖动, 使用百分比)
  position: {
    x: 80, // 横向位置百分比 (0-100)
    y: 90, // 纵向位置百分比 (0-100)
  }
});

// 直链输入
const imageUrl = ref('');
// 拖放状态
const isDragging = ref(false);
// 加载状态
const loading = ref(false);
// 水印拖动状态
const isDraggingWatermark = ref(false);
// 图片容器引用
const imageContainer = ref(null);
// 水印容器引用
const watermarkElement = ref(null);

// 支持的图片类型
const supportedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/bmp', 'image/webp'];

// 格式化时间戳
const formattedTimestamp = computed(() => {
  const timestamp = watermarkSettings.useCurrentTime ? new Date() : new Date(watermarkSettings.customTime);
  const year = timestamp.getFullYear();
  const month = String(timestamp.getMonth() + 1).padStart(2, '0');
  const day = String(timestamp.getDate()).padStart(2, '0');
  const hours = String(timestamp.getHours()).padStart(2, '0');
  const minutes = String(timestamp.getMinutes()).padStart(2, '0');
  const seconds = String(timestamp.getSeconds()).padStart(2, '0');
  
  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
});

// 水印样式
const watermarkStyle = computed(() => {
  return {
    color: watermarkSettings.color,
    opacity: watermarkSettings.opacity,
    fontSize: `${watermarkSettings.fontSize}px`,
    left: `${watermarkSettings.position.x}%`,
    top: `${watermarkSettings.position.y}%`,
    transform: 'translate(-50%, -50%)',
    textShadow: '2px 2px 4px rgba(0, 0, 0, 0.8)'
  };
});

// 处理文件上传
const handleFileUpload = (event) => {
  const files = event.target.files;
  if (!files || files.length === 0) return;
  
  processFiles(files);
};

// 处理拖拽事件
const handleDragOver = (event) => {
  event.preventDefault();
  isDragging.value = true;
};

const handleDragLeave = () => {
  isDragging.value = false;
};

const handleDrop = (event) => {
  event.preventDefault();
  isDragging.value = false;
  
  const files = event.dataTransfer.files;
  if (!files || files.length === 0) return;
  
  processFiles(files);
};

// 处理文件
const processFiles = (files) => {
  const newImages = [];
  
  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    
    if (!supportedTypes.includes(file.type)) {
      alert(`不支持的文件类型: ${file.name}`);
      continue;
    }
    
    const reader = new FileReader();
    reader.onload = (e) => {
      newImages.push({
        id: Date.now() + i,
        name: file.name,
        originalFile: file,
        src: e.target.result,
        type: file.type,
        processed: null
      });
      
      // 如果全部加载完成，添加到图片列表
      if (newImages.length === Array.from(files).filter(f => supportedTypes.includes(f.type)).length) {
        imageList.value = [...imageList.value, ...newImages];
        currentImageIndex.value = imageList.value.length - newImages.length;
        appState.value = 'edit'; // 切换到编辑状态
      }
    };
    reader.readAsDataURL(file);
  }
};

// 处理URL上传
const handleUrlUpload = async () => {
  if (!imageUrl.value) return;
  
  try {
    loading.value = true;
    const response = await fetch(imageUrl.value);
    if (!response.ok) {
      throw new Error('网络请求错误');
    }
    
    const blob = await response.blob();
    
    if (!supportedTypes.includes(blob.type)) {
      alert('不支持的图片类型');
      loading.value = false;
      return;
    }
    
    const reader = new FileReader();
    reader.onload = (e) => {
      const urlParts = imageUrl.value.split('/');
      const filename = urlParts[urlParts.length - 1].split('?')[0] || 'image.jpg';
      
      imageList.value.push({
        id: Date.now(),
        name: filename,
        originalFile: blob,
        src: e.target.result,
        type: blob.type,
        processed: null
      });
      
      currentImageIndex.value = imageList.value.length - 1;
      appState.value = 'edit';
      imageUrl.value = '';
      loading.value = false;
    };
    reader.readAsDataURL(blob);
    
  } catch (error) {
    alert('获取图片失败: ' + error.message);
    loading.value = false;
  }
};

// 切换图片
const selectImage = (index) => {
  currentImageIndex.value = index;
};

// 删除图片
const removeImage = (index) => {
  imageList.value.splice(index, 1);
  
  if (imageList.value.length === 0) {
    appState.value = 'upload';
    return;
  }
  
  if (currentImageIndex.value >= imageList.value.length) {
    currentImageIndex.value = imageList.value.length - 1;
  }
};

// 返回上传页面
const backToUpload = () => {
  appState.value = 'upload';
};

// 切换设置面板显示状态
const toggleSettings = () => {
  showSettings.value = !showSettings.value;
};

// 开始拖动水印
const startDragWatermark = (event) => {
  if (!imageContainer.value) return;
  event.preventDefault();
  event.stopPropagation();
  isDraggingWatermark.value = true;
  
  // 获取容器位置和尺寸
  const containerRect = imageContainer.value.getBoundingClientRect();
  
  const handleMouseMove = (moveEvent) => {
    if (!isDraggingWatermark.value) return;
    
    // 计算鼠标在容器内的相对位置（百分比）
    const x = Math.max(0, Math.min(100, ((moveEvent.clientX - containerRect.left) / containerRect.width) * 100));
    const y = Math.max(0, Math.min(100, ((moveEvent.clientY - containerRect.top) / containerRect.height) * 100));
    
    // 更新水印位置
    watermarkSettings.position.x = x;
    watermarkSettings.position.y = y;
  };
  
  const handleMouseUp = () => {
    isDraggingWatermark.value = false;
    document.removeEventListener('mousemove', handleMouseMove);
    document.removeEventListener('mouseup', handleMouseUp);
  };
  
  document.addEventListener('mousemove', handleMouseMove);
  document.addEventListener('mouseup', handleMouseUp);
  
  // 初始移动到事件发生位置
  handleMouseMove(event);
};

// 应用水印
const applyWatermark = async () => {
  if (!currentImage.value) return;
  
  loading.value = true;
  
  try {
    const timestamp = watermarkSettings.useCurrentTime 
      ? new Date() 
      : new Date(watermarkSettings.customTime);
    
    // 克隆水印设置并转换位置格式为预处理
    const settingsForProcessing = { ...watermarkSettings };
    
    // 处理当前图片
    const watermarkedImageUrl = await createWatermark(
      currentImage.value.src,
      timestamp,
      settingsForProcessing,
      formattedTimestamp.value
    );
    
    // 更新当前图片的处理状态
    imageList.value[currentImageIndex.value] = {
      ...currentImage.value,
      processed: watermarkedImageUrl
    };
  } catch (error) {
    console.error('处理图片失败:', error);
    alert('处理图片失败');
  } finally {
    loading.value = false;
  }
};

// 下载处理后的图片
const downloadImage = () => {
  const image = currentImage.value;
  if (!image || !image.processed) {
    alert('请先应用水印');
    return;
  }
  
  const link = document.createElement('a');
  link.href = image.processed;
  
  const extension = image.name.split('.').pop();
  const baseName = image.name.substring(0, image.name.lastIndexOf('.'));
  const newFileName = `${watermarkSettings.prefix}${baseName}${watermarkSettings.suffix}.${extension}`;
  
  link.download = newFileName;
  link.click();
};

// 批量处理所有图片
const processAllImages = async () => {
  if (imageList.value.length === 0) return;
  
  loading.value = true;
  
  try {
    const timestamp = watermarkSettings.useCurrentTime 
      ? new Date() 
      : new Date(watermarkSettings.customTime);
    
    // 克隆水印设置用于处理
    const settingsForProcessing = { ...watermarkSettings };
    
    // 处理所有图片
    for (let i = 0; i < imageList.value.length; i++) {
      const image = imageList.value[i];
      
      const watermarkedImageUrl = await createWatermark(
        image.src,
        timestamp,
        settingsForProcessing,
        formattedTimestamp.value
      );
      
      // 更新处理状态
      imageList.value[i] = {
        ...image,
        processed: watermarkedImageUrl
      };
    }
    
    alert('所有图片处理完成');
  } catch (error) {
    console.error('批量处理失败:', error);
    alert('批量处理失败');
  } finally {
    loading.value = false;
  }
};

// 下载所有处理后的图片
const downloadAllImages = () => {
  const processedImages = imageList.value.filter(img => img.processed);
  
  if (processedImages.length === 0) {
    alert('没有已处理的图片');
    return;
  }
  
  for (const image of processedImages) {
    const link = document.createElement('a');
    link.href = image.processed;
    
    const extension = image.name.split('.').pop();
    const baseName = image.name.substring(0, image.name.lastIndexOf('.'));
    const newFileName = `${watermarkSettings.prefix}${baseName}${watermarkSettings.suffix}.${extension}`;
    
    link.download = newFileName;
    link.click();
  }
};

// 清空图片列表
const clearImages = () => {
  imageList.value = [];
  appState.value = 'upload';
};
</script>

<template>
  <div class="watermark-app">
    <!-- 上传页面 -->
    <div v-if="appState === 'upload'" class="upload-page">
      <h1>图片时间戳水印工具</h1>
      
      <!-- 拖拽上传区域 -->
      <div 
        class="drop-area" 
        :class="{ 'dragging': isDragging }"
        @dragover="handleDragOver"
        @dragleave="handleDragLeave"
        @drop="handleDrop"
      >
        <div class="drop-content">
          <div class="upload-icon">
            <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24">
              <path fill="currentColor" d="M19.35 10.04A7.49 7.49 0 0 0 12 4C9.11 4 6.6 5.64 5.35 8.04A5.994 5.994 0 0 0 0 14c0 3.31 2.69 6 6 6h13c2.76 0 5-2.24 5-5c0-2.64-2.05-4.78-4.65-4.96zM14 13v4h-4v-4H7l5-5l5 5h-3z"/>
            </svg>
          </div>
          <p>拖拽图片到此处，或</p>
          <input 
            type="file" 
            id="file-upload" 
            multiple 
            accept="image/jpeg,image/png,image/gif,image/bmp,image/webp"
            @change="handleFileUpload"
            class="file-input"
          />
          <label for="file-upload" class="upload-button">选择图片</label>
        </div>
      </div>
      
      <!-- 图片直链上传 -->
      <div class="url-upload">
        <h2>或通过图片链接上传</h2>
        <div class="url-input-container">
          <input 
            type="text" 
            v-model="imageUrl" 
            placeholder="输入图片URL" 
            class="url-input"
            @keyup.enter="handleUrlUpload"
          />
          <button 
            @click="handleUrlUpload" 
            class="url-upload-button"
            :disabled="loading"
          >
            {{ loading ? '上传中...' : '上传' }}
          </button>
        </div>
      </div>
    </div>
    
    <!-- 编辑页面 -->
    <div v-else-if="appState === 'edit'" class="edit-page">
      <div class="edit-header">
        <button @click="backToUpload" class="back-button">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24">
            <path fill="currentColor" d="M20 11H7.83l5.59-5.59L12 4l-8 8l8 8l1.41-1.41L7.83 13H20v-2z"/>
          </svg>
          返回
        </button>
        <h1>编辑水印</h1>
        <div class="action-buttons">
          <button @click="toggleSettings" class="settings-button">
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24">
              <path fill="currentColor" d="M19.14 12.94c.04-.3.06-.61.06-.94 0-.32-.02-.64-.07-.94l2.03-1.58c.18-.14.23-.41.12-.61l-1.92-3.32c-.12-.22-.37-.29-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54c-.04-.24-.24-.41-.48-.41h-3.84c-.24 0-.44.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96c-.22-.08-.47 0-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.05.3-.09.63-.09.94s.02.64.07.94l-2.03 1.58c-.18.14-.23.41-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.48-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.01-1.58zM12 15.6c-1.98 0-3.6-1.62-3.6-3.6s1.62-3.6 3.6-3.6 3.6 1.62 3.6 3.6-1.62 3.6-3.6 3.6z"/>
            </svg>
            设置
          </button>
          <button @click="clearImages" class="clear-button">清空图片</button>
        </div>
      </div>
      
      <div class="edit-content">
        <!-- 左侧缩略图列表 -->
        <div class="thumbnails">
          <div 
            v-for="(image, index) in imageList" 
            :key="image.id" 
            class="thumbnail-item"
            :class="{ 'active': currentImageIndex === index }"
            @click="selectImage(index)"
          >
            <img :src="image.src" alt="缩略图" class="thumbnail-img" />
            <button @click.stop="removeImage(index)" class="remove-button">×</button>
          </div>
        </div>
        
        <div class="main-edit-area">
          <!-- 左侧预览 -->
          <div class="preview-panel">
            <div class="preview-container" ref="imageContainer">
              <img 
                v-if="currentImage" 
                :src="currentImage.processed || currentImage.src" 
                alt="预览图片" 
                class="preview-image"
              />
              <div 
                v-if="currentImage"
                ref="watermarkElement"
                class="watermark-text" 
                :style="watermarkStyle"
                @mousedown="startDragWatermark"
                :class="{ 'dragging': isDraggingWatermark }"
              >
                {{ formattedTimestamp }}
              </div>
            </div>
          </div>
          
          <!-- 右侧设置 -->
          <div class="settings-panel">
            <h2>水印设置</h2>
            
            <div class="setting-group">
              <label>字体大小:</label>
              <input type="range" v-model.number="watermarkSettings.fontSize" min="8" max="72" step="1" />
              <span>{{ watermarkSettings.fontSize }}px</span>
            </div>
            
            <div class="setting-group">
              <label>颜色:</label>
              <input type="color" v-model="watermarkSettings.color" />
            </div>
            
            <div class="setting-group">
              <label>不透明度:</label>
              <input type="range" v-model.number="watermarkSettings.opacity" min="0.1" max="1" step="0.1" />
              <span>{{ Math.round(watermarkSettings.opacity * 100) }}%</span>
            </div>
            
            <div class="setting-group">
              <label>时间戳:</label>
              <div class="time-settings">
                <label>
                  <input type="radio" v-model="watermarkSettings.useCurrentTime" :value="true" />
                  使用当前时间
                </label>
                <label>
                  <input type="radio" v-model="watermarkSettings.useCurrentTime" :value="false" />
                  使用自定义时间
                </label>
              </div>
            </div>
            
            <div class="setting-group" v-if="!watermarkSettings.useCurrentTime">
              <label>自定义时间:</label>
              <input type="datetime-local" v-model="watermarkSettings.customTime" />
            </div>
            
            <div class="setting-group tip">
              <p class="tip-text">提示：水印文本可以在图片上拖动调整位置</p>
            </div>
            
            <div class="actions">
              <button @click="applyWatermark" class="apply-button" :disabled="loading">
                {{ loading ? '处理中...' : '应用水印' }}
              </button>
              
              <button @click="downloadImage" class="download-button" :disabled="!currentImage || !currentImage.processed">
                下载当前图片
              </button>
              
              <button @click="processAllImages" class="process-all-button" :disabled="loading">
                批量处理全部
              </button>
              
              <button @click="downloadAllImages" class="download-all-button">
                下载全部
              </button>
            </div>
          </div>
        </div>
      </div>
      
      <!-- 设置弹出面板 -->
      <div v-if="showSettings" class="settings-modal">
        <div class="settings-modal-content">
          <div class="settings-modal-header">
            <h3>高级设置</h3>
            <button @click="toggleSettings" class="close-settings">×</button>
          </div>
          
          <div class="settings-modal-body">
            <div class="setting-group">
              <label>文件名前缀:</label>
              <input type="text" v-model="watermarkSettings.prefix" placeholder="可选" />
            </div>
            
            <div class="setting-group">
              <label>文件名后缀:</label>
              <input type="text" v-model="watermarkSettings.suffix" placeholder="_watermark" />
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
html, body {
  margin: 0;
  padding: 0;
  background-color: #ffffff;
  min-height: 100vh;
}

.watermark-app {
  max-width: 1200px;
  margin: 0 auto;
  padding: 20px;
  font-family: Arial, sans-serif;
  background-color: #ffffff;
  color: #333333;
  min-height: 100vh;
  box-sizing: border-box;
}

/* 上传页面样式 */
.upload-page {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 30px;
  min-height: 80vh;
}

.upload-page h1 {
  margin-bottom: 20px;
  text-align: center;
  color: #333333;
}

.drop-area {
  width: 100%;
  max-width: 600px;
  height: 300px;
  border: 2px dashed #ccc;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.3s;
  background-color: #f9f9f9;
}

.drop-area.dragging {
  border-color: #2196F3;
  background-color: rgba(33, 150, 243, 0.1);
}

.drop-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 15px;
  text-align: center;
  padding: 20px;
  color: #666666;
}

.upload-icon {
  color: #666;
  margin-bottom: 10px;
}

.file-input {
  display: none;
}

.upload-button {
  padding: 10px 20px;
  background-color: #4CAF50;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 16px;
  transition: background-color 0.3s;
}

.upload-button:hover {
  background-color: #45a049;
}

.url-upload {
  width: 100%;
  max-width: 600px;
}

.url-upload h2 {
  font-size: 18px;
  margin-bottom: 15px;
  text-align: center;
  color: #333333;
}

.url-input-container {
  display: flex;
  gap: 10px;
}

.url-input {
  flex: 1;
  padding: 10px;
  border: 1px solid #ccc;
  border-radius: 4px;
  font-size: 16px;
  background-color: #ffffff;
  color: #333333;
}

.url-upload-button {
  padding: 10px 20px;
  background-color: #2196F3;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  transition: background-color 0.3s;
}

.url-upload-button:hover {
  background-color: #0b7dda;
}

.url-upload-button:disabled {
  background-color: #b0c4de;
  cursor: not-allowed;
}

/* 编辑页面样式 */
.edit-page {
  display: flex;
  flex-direction: column;
  gap: 20px;
  position: relative;
  min-height: 80vh;
}

.edit-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 20px;
}

.edit-header h1 {
  color: #333333;
}

.back-button {
  display: flex;
  align-items: center;
  gap: 5px;
  padding: 8px 15px;
  background-color: #f0f0f0;
  color: #333333;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  transition: background-color 0.3s;
}

.back-button:hover {
  background-color: #e0e0e0;
}

.action-buttons {
  display: flex;
  gap: 10px;
}

.settings-button {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 8px 12px;
  background-color: #2196F3;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  transition: background-color 0.3s;
}

.settings-button:hover {
  background-color: #0b7dda;
}

.clear-button {
  padding: 8px 15px;
  background-color: #f44336;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}

.edit-content {
  display: flex;
  gap: 20px;
  flex: 1;
  min-height: 500px;
}

.thumbnails {
  width: 120px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding-right: 10px;
}

.thumbnail-item {
  position: relative;
  border: 2px solid #eee;
  border-radius: 4px;
  overflow: hidden;
  cursor: pointer;
  transition: border-color 0.3s;
  background-color: #ffffff;
}

.thumbnail-item.active {
  border-color: #2196F3;
}

.thumbnail-img {
  width: 100%;
  height: 90px;
  object-fit: cover;
}

.remove-button {
  position: absolute;
  top: 2px;
  right: 2px;
  width: 20px;
  height: 20px;
  background-color: rgba(0, 0, 0, 0.5);
  color: white;
  border: none;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  font-size: 14px;
  opacity: 0;
  transition: opacity 0.3s;
}

.thumbnail-item:hover .remove-button {
  opacity: 1;
}

.main-edit-area {
  flex: 1;
  display: flex;
  gap: 20px;
}

.preview-panel {
  flex: 3;
  border: 1px solid #ddd;
  border-radius: 8px;
  overflow: hidden;
  background-color: #f5f5f5;
  display: flex;
  align-items: center;
  justify-content: center;
}

.preview-container {
  position: relative;
  display: inline-block;
  max-width: 100%;
  max-height: 100%;
  line-height: 0;
}

.preview-image {
  max-width: 100%;
  max-height: 100%;
  object-fit: contain;
}

.watermark-text {
  position: absolute;
  cursor: move;
  padding: 5px;
  white-space: nowrap;
  user-select: none;
  transition: transform 0.05s ease;
  text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.8);
  pointer-events: auto;
  z-index: 10;
}

.watermark-text.dragging {
  transition: none;
  z-index: 20;
}

.settings-panel {
  flex: 2;
  padding: 20px;
  background-color: #f9f9f9;
  border-radius: 8px;
  overflow-y: auto;
  color: #333333;
}

.settings-panel h2 {
  margin-top: 0;
  margin-bottom: 20px;
  color: #333333;
}

.setting-group {
  margin-bottom: 15px;
}

.setting-group label {
  display: block;
  margin-bottom: 8px;
  font-weight: bold;
  color: #333333;
}

.time-settings {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.time-settings label {
  font-weight: normal;
  display: flex;
  align-items: center;
  gap: 5px;
}

.setting-group input[type="range"],
.setting-group input[type="text"],
.setting-group input[type="datetime-local"],
.setting-group select {
  width: 100%;
  padding: 8px;
  border: 1px solid #ccc;
  border-radius: 4px;
  background-color: #ffffff;
  color: #333333;
}

.tip {
  background-color: #e8f4fd;
  padding: 10px;
  border-radius: 4px;
  border-left: 4px solid #2196F3;
}

.tip-text {
  margin: 0;
  color: #0277bd;
  font-size: 14px;
}

.actions {
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin-top: 20px;
}

.apply-button,
.download-button,
.process-all-button,
.download-all-button {
  padding: 10px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 16px;
  transition: background-color 0.3s;
}

.apply-button {
  background-color: #2196F3;
  color: white;
}

.apply-button:hover {
  background-color: #0b7dda;
}

.download-button {
  background-color: #4CAF50;
  color: white;
}

.download-button:hover {
  background-color: #45a049;
}

.process-all-button {
  background-color: #ff9800;
  color: white;
}

.process-all-button:hover {
  background-color: #e68a00;
}

.download-all-button {
  background-color: #9c27b0;
  color: white;
}

.download-all-button:hover {
  background-color: #7b1fa2;
}

button:disabled {
  background-color: #cccccc;
  cursor: not-allowed;
}

/* 设置弹出面板 */
.settings-modal {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.settings-modal-content {
  background-color: #ffffff;
  border-radius: 8px;
  width: 100%;
  max-width: 400px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.2);
  max-height: 90vh;
  overflow-y: auto;
}

.settings-modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 15px 20px;
  border-bottom: 1px solid #eee;
  background-color: #f5f5f5;
}

.settings-modal-header h3 {
  margin: 0;
  font-size: 18px;
  color: #333333;
}

.close-settings {
  background: none;
  border: none;
  font-size: 22px;
  cursor: pointer;
  color: #666;
}

.settings-modal-body {
  padding: 20px;
  color: #333333;
}
</style> 