<script setup>
import { ref, reactive, computed, onMounted, nextTick } from 'vue';
import { createWatermark } from './utils.js';

// 导入Material Design图标
import UploadIcon from 'vue-material-design-icons/CloudUpload.vue';
import SettingsIcon from 'vue-material-design-icons/Cog.vue';
import ArrowBackIcon from 'vue-material-design-icons/ArrowLeft.vue';
import DeleteIcon from 'vue-material-design-icons/Delete.vue';
import CloseIcon from 'vue-material-design-icons/Close.vue';
import DownloadIcon from 'vue-material-design-icons/Download.vue';
import CheckIcon from 'vue-material-design-icons/Check.vue';
import CheckAllIcon from 'vue-material-design-icons/CheckAll.vue';
import DownloadMultipleIcon from 'vue-material-design-icons/DownloadMultiple.vue';

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
  position: 8, // 位置索引 (0-8，对应九宫格位置)
});

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

// 获取当前选择的位置坐标
const currentPosition = computed(() => {
  return positionMap[watermarkSettings.position] || positionMap[8]; // 默认右下
});

// 直链输入
const imageUrl = ref('');
// 拖放状态
const isDragging = ref(false);
// 加载状态
const loading = ref(false);
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
  const position = currentPosition.value;
  
  // 定义距离边缘的内边距（像素）
  const padding = 20; 
  
  // 计算基于系数的百分比位置，并考虑内边距
  let left, top;
  
  // 左侧、中间和右侧的x坐标计算
  if (position.x === 0) { // 左侧
    left = `${padding}px`;
  } else if (position.x === 1) { // 右侧
    left = `calc(100% - ${padding}px)`;
  } else { // 中间
    left = `${position.x * 100}%`;
  }
  
  // 顶部、中间和底部的y坐标计算
  if (position.y === 0) { // 顶部
    top = `${padding}px`;
  } else if (position.y === 1) { // 底部
    top = `calc(100% - ${padding}px)`;
  } else { // 中间
    top = `${position.y * 100}%`;
  }
  
  // 根据位置确定转换原点
  let transform;
  if (position.x === 0) {
    // 左对齐
    if (position.y === 0) {
      transform = 'translate(0, 0)'; // 左上
    } else if (position.y === 1) {
      transform = 'translate(0, -100%)'; // 左下
    } else {
      transform = 'translate(0, -50%)'; // 左中
    }
  } else if (position.x === 1) {
    // 右对齐
    if (position.y === 0) {
      transform = 'translate(-100%, 0)'; // 右上
    } else if (position.y === 1) {
      transform = 'translate(-100%, -100%)'; // 右下
    } else {
      transform = 'translate(-100%, -50%)'; // 右中
    }
  } else {
    // 水平居中
    if (position.y === 0) {
      transform = 'translate(-50%, 0)'; // 上中
    } else if (position.y === 1) {
      transform = 'translate(-50%, -100%)'; // 下中
    } else {
      transform = 'translate(-50%, -50%)'; // 中心
    }
  }
  
  return {
    color: watermarkSettings.color,
    opacity: watermarkSettings.opacity,
    fontSize: `${watermarkSettings.fontSize}px`,
    left: left,
    top: top,
    transform: transform,
    textShadow: '2px 2px 4px rgba(0, 0, 0, 0.8)',
    maxWidth: 'calc(100% - 40px)',  // 限制最大宽度，减去两侧内边距
    textOverflow: 'ellipsis',  // 超出部分省略
    position: 'absolute',  // 确保绝对定位
    whiteSpace: 'nowrap',  // 确保文本不换行
    lineHeight: 'normal',  // 使用正常行高
    padding: '2px 5px',    // 添加一点内边距，确保文本有足够空间
    borderRadius: '2px',   // 轻微的圆角
    display: 'block'       // 确保显示为块级元素
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
            <upload-icon :size="48" />
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
          <label for="file-upload" class="upload-button">
            <upload-icon :size="20" />
            <span>选择图片</span>
          </label>
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
            <upload-icon :size="20" />
          </button>
        </div>
      </div>
    </div>
    
    <!-- 编辑页面 -->
    <div v-else-if="appState === 'edit'" class="edit-page">
      <div class="edit-header">
        <button @click="backToUpload" class="icon-btn" title="返回">
          <arrow-back-icon :size="16" />
        </button>
        <h1>编辑水印</h1>
        <div class="action-buttons">
          <button @click="toggleSettings" class="icon-btn" title="设置">
            <settings-icon :size="16" />
          </button>
          <button @click="clearImages" class="icon-btn" title="清空图片">
            <delete-icon :size="16" />
          </button>
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
            <button @click.stop="removeImage(index)" class="remove-button" title="删除">
              <close-icon :size="14" />
            </button>
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
                :class="{ 'active': true }"
              >
                {{ formattedTimestamp }}
              </div>
            </div>
          </div>
          
          <!-- 右侧设置 -->
          <div class="settings-panel">
            <h2>水印设置</h2>
            
            <div class="settings-scroll-area">
              <div class="setting-group">
                <label>字体大小:</label>
                <input type="range" v-model.number="watermarkSettings.fontSize" min="8" max="20" step="1" />
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
              
              <div class="setting-group">
                <label>水印位置:</label>
                <div class="position-grid">
                  <div 
                    v-for="(pos, index) in positionMap" 
                    :key="index"
                    class="position-cell"
                    :class="{ 'active': watermarkSettings.position === index }"
                    @click="watermarkSettings.position = index"
                  >
                    <span class="position-name">{{ pos.name }}</span>
                  </div>
                </div>
              </div>
            </div>
            
            <div class="actions">
              <button @click="applyWatermark" class="icon-btn" :disabled="loading" title="应用水印">
                <check-icon :size="18" />
                <span class="btn-text">{{ loading ? '处理中...' : '应用' }}</span>
              </button>
              
              <button @click="downloadImage" class="icon-btn" :disabled="!currentImage || !currentImage.processed" title="下载当前图片">
                <download-icon :size="18" />
              </button>
              
              <button @click="processAllImages" class="icon-btn" :disabled="loading" title="批量处理全部">
                <check-all-icon :size="18" />
              </button>
              
              <button @click="downloadAllImages" class="icon-btn" title="下载全部">
                <download-multiple-icon :size="18" />
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
            <button @click="toggleSettings" class="close-settings" title="关闭">
              <close-icon :size="18" />
            </button>
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
  display: flex;
  flex-direction: column;
  overflow: hidden; /* 防止整体滚动 */
  width: 100%; /* 确保宽度适应 */
}

/* 上传页面样式 */
.upload-page {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 30px;
  min-height: 80vh;
  width: 100%;
  padding: 0 10px;
  box-sizing: border-box;
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
  background-color: #555;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 16px;
  transition: background-color 0.3s;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  width: auto;
  height: auto;
  line-height: 1; /* 添加行高为1 */
}

.upload-button:hover {
  background-color: #333;
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
  padding: 0; /* 移除内边距 */
  background-color: #555;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  transition: background-color 0.3s;
  width: 40px;
  height: 40px;
  min-width: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  line-height: 1; /* 添加行高为1 */
}

.url-upload-button:hover {
  background-color: #333;
}

.url-upload-button:disabled {
  background-color: #999;
  cursor: not-allowed;
}

/* 编辑页面样式 */
.edit-page {
  display: flex;
  flex-direction: column;
  gap: 20px;
  position: relative;
  min-height: 80vh;
  max-height: calc(100vh - 100px); /* 限制最大高度，减去头部和边距 */
  overflow: hidden; /* 防止整体滚动 */
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

.action-buttons {
  display: flex;
  gap: 10px;
}

.icon-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
  padding: 0; /* 移除内边距 */
  background-color: #555;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  transition: background-color 0.3s;
  font-size: 14px;
  min-width: 36px;
  min-height: 36px;
  width: 36px;
  height: 36px;
  aspect-ratio: 1;
  line-height: 1; /* 添加行高为1 */
}

.icon-btn:hover {
  background-color: #333;
}

.icon-btn:disabled {
  background-color: #999;
  cursor: not-allowed;
}

.btn-text {
  display: none;
}

.edit-content {
  display: flex;
  gap: 20px;
  flex: 1;
  min-height: 500px;
  height: calc(100vh - 150px);
  overflow: hidden; /* 防止整体滚动 */
  width: 100%;
}

.thumbnails {
  width: 120px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding-right: 10px;
  flex-shrink: 0; /* 防止缩小 */
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
  border-color: #555;
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
  padding: 0;
  line-height: 1; /* 添加行高为1 */
}

.thumbnail-item:hover .remove-button {
  opacity: 1;
}

.main-edit-area {
  flex: 1;
  display: flex;
  gap: 20px;
  overflow: hidden;
  min-width: 0; /* 允许缩小到容器宽度 */
}

.preview-panel {
  flex: 3;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: transparent;
  padding: 10px;
  box-sizing: border-box;
  overflow: hidden; /* 防止预览区滚动 */
  min-width: 0; /* 允许缩小 */
}

.preview-container {
  position: relative;
  display: inline-block;
  max-width: 100%;
  max-height: 100%;
  line-height: 0;
  overflow: hidden; /* 确保内容不超出容器 */
  box-sizing: border-box;
}

.preview-image {
  max-width: 100%;
  max-height: 100%;
  object-fit: contain;
  display: block; /* 确保图片正确显示 */
  box-sizing: border-box;
}

.watermark-text {
  position: absolute;
  cursor: default;
  padding: 5px;
  white-space: nowrap;
  user-select: none;
  transition: transform 0.05s ease;
  text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.8);
  pointer-events: none;
  z-index: 10;
  text-align: center;
  box-sizing: border-box;
  border-radius: 2px;
  max-width: 90%;
  text-overflow: ellipsis;
  /* 移除overflow: hidden，允许文本完整显示 */
  line-height: normal;
}

.settings-panel {
  flex: 2;
  padding: 20px;
  background-color: #f9f9f9;
  border-radius: 8px;
  color: #333333;
  display: flex;
  flex-direction: column;
  max-width: 320px;
  min-width: 280px; /* 确保最小宽度 */
  max-height: 100%; /* 占满容器高度 */
  overflow: hidden; /* 自身不滚动 */
  box-sizing: border-box; /* 确保padding不增加宽度 */
  flex-shrink: 0; /* 默认不收缩 */
}

.settings-panel h2 {
  margin-top: 0;
  margin-bottom: 15px;
  color: #333333;
}

/* 设置可滚动区域 */
.settings-scroll-area {
  flex: 1;
  overflow-y: auto; /* 内部可滚动 */
  padding-right: 10px;
  margin-bottom: 15px;
  max-height: 100%; /* 填满可用空间 */
  width: calc(100% - 10px); /* 控制宽度 */
  box-sizing: border-box; /* 确保内边距计算在内 */
}

.setting-group {
  margin-bottom: 15px;
  width: 100%; /* 确保宽度完全填充父容器 */
  box-sizing: border-box; /* 包括内边距在内的盒模型 */
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
  width: 100%; /* 确保宽度完全填充父容器 */
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
  width: calc(100% - 16px); /* 减去内边距 */
  padding: 8px;
  border: 1px solid #ccc;
  border-radius: 4px;
  background-color: #ffffff;
  color: #333333;
  box-sizing: border-box; /* 确保padding不增加宽度 */
}

.actions {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin-top: auto;
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
  cursor: pointer;
  color: #666;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0;
  line-height: 1; /* 添加行高为1 */
}

.settings-modal-body {
  padding: 20px;
  color: #333333;
}

/* 滚动条样式定制 */
.settings-scroll-area::-webkit-scrollbar {
  width: 6px;
}

.settings-scroll-area::-webkit-scrollbar-track {
  background: #f1f1f1;
  border-radius: 10px;
}

.settings-scroll-area::-webkit-scrollbar-thumb {
  background: #888;
  border-radius: 10px;
}

.settings-scroll-area::-webkit-scrollbar-thumb:hover {
  background: #555;
}

/* 添加九宫格位置选择器样式 */
.position-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  grid-template-rows: repeat(3, 1fr);
  gap: 5px;
  margin-top: 10px;
  background-color: #f0f0f0;
  border-radius: 4px;
  padding: 5px;
  width: calc(100% - 10px); /* 控制宽度防止溢出 */
}

.position-cell {
  width: 100%;
  aspect-ratio: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: #e0e0e0;
  border-radius: 4px;
  cursor: pointer;
  font-size: 12px;
  transition: all 0.2s;
}

.position-cell:hover {
  background-color: #d0d0d0;
}

.position-cell.active {
  background-color: #555;
  color: white;
}

.position-name {
  font-size: 12px;
}

/* 添加响应式设计媒体查询 */
@media (max-width: 1024px) {
  .edit-content {
    gap: 15px;
  }
  
  .settings-panel {
    min-width: 260px;
    max-width: 280px;
    padding: 15px;
  }
}

@media (max-width: 900px) {
  .main-edit-area {
    flex-direction: column;
    overflow-y: auto;
  }
  
  .preview-panel {
    flex: none;
    height: 50%;
    min-height: 300px;
  }
  
  .settings-panel {
    flex: none;
    max-width: 100%;
    min-width: 100%;
    height: auto;
  }
  
  .edit-content {
    height: auto;
    min-height: 80vh;
    overflow-y: auto;
  }
}

@media (max-width: 768px) {
  .edit-content {
    flex-direction: column;
  }
  
  .thumbnails {
    width: 100%;
    flex-direction: row;
    overflow-x: auto;
    overflow-y: hidden;
    padding-right: 0;
    padding-bottom: 10px;
    max-height: 120px;
  }
  
  .thumbnail-item {
    min-width: 100px;
    max-width: 100px;
  }
  
  .edit-header h1 {
    font-size: 1.5rem;
  }
  
  .settings-scroll-area {
    max-height: 400px;
  }
}

@media (max-width: 480px) {
  .watermark-app {
    padding: 10px;
  }
  
  .edit-header {
    flex-wrap: wrap;
    gap: 10px;
  }
  
  .edit-header h1 {
    font-size: 1.2rem;
    width: 100%;
    text-align: center;
    margin: 10px 0;
  }
  
  .position-grid {
    grid-template-columns: repeat(3, 1fr);
  }
  
  .drop-area {
    height: 200px;
  }
  
  .preview-panel {
    min-height: 250px;
  }
  
  .icon-btn {
    min-width: 32px;
    min-height: 32px;
    width: 32px;
    height: 32px;
  }
}
</style> 