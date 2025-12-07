// src/utils/index.js
// 通用工具函数

/**
 * 生成 UUID v4
 * @returns {string} UUID v4 字符串
 */
export const generateUUID = () => {
  try {
    if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
      return crypto.randomUUID();
    }
  } catch {}
  
  // 备用实现
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
};

/**
 * 格式化日期为 YYYY-MM-DD 格式
 * @param {Date} date - 日期对象
 * @returns {string} 格式化后的日期字符串
 */
export const formatDate = (date) => {
  return date.toISOString().split('T')[0];
};

/**
 * 获取当前日期（YYYY-MM-DD 格式）
 * @returns {string} 当前日期字符串
 */
export const getCurrentDate = () => {
  return formatDate(new Date());
};

/**
 * 获取当前时间戳（YYYY-MM-DD 格式，仅日期）
 * @returns {string} 当前时间戳字符串
 */
export const getCurrentTimestamp = () => {
  const now = new Date();
  return now.toISOString().slice(0, 10);
};

/**
 * 防抖函数
 * @param {Function} func - 要防抖的函数
 * @param {number} wait - 等待时间（毫秒）
 * @returns {Function} 防抖后的函数
 */
export const debounce = (func, wait) => {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
};

/**
 * 节流函数
 * @param {Function} func - 要节流的函数
 * @param {number} limit - 时间限制（毫秒）
 * @returns {Function} 节流后的函数
 */
export const throttle = (func, limit) => {
  let inThrottle;
  return function() {
    const args = arguments;
    const context = this;
    if (!inThrottle) {
      func.apply(context, args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  };
};

/**
 * 在元素上显示加载状态
 * @param {HTMLElement} element - 要显示加载状态的元素
 * @param {string} text - 加载文本
 */
export const showLoading = (element, text = 'Loading...') => {
  element.innerHTML = `<div class="loading"></div> ${text}`;
  element.disabled = true;
};

/**
 * 隐藏元素的加载状态
 * @param {HTMLElement} element - 要隐藏加载状态的元素
 * @param {string} originalText - 原始文本
 */
export const hideLoading = (element, originalText) => {
  element.innerHTML = originalText;
  element.disabled = false;
};

/**
 * 验证邮箱格式
 * @param {string} email - 要验证的邮箱
 * @returns {boolean} 是否为有效邮箱
 */
export const isValidEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

/**
 * 验证必填字段
 * @param {string} value - 要验证的值
 * @returns {boolean} 是否不为空
 */
export const isRequired = (value) => {
  return value && value.trim().length > 0;
};

/**
 * 清理 HTML 字符串防止 XSS
 * @param {string} str - 要清理的字符串
 * @returns {string} 清理后的字符串
 */
export const sanitizeHTML = (str) => {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
};

/**
 * 复制文本到剪贴板
 * @param {string} text - 要复制的文本
 * @returns {Promise<boolean>} 是否成功
 */
export const copyToClipboard = async (text) => {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch (err) {
    // 旧浏览器的备用方案
    const textArea = document.createElement('textarea');
    textArea.value = text;
    document.body.appendChild(textArea);
    textArea.select();
    try {
      document.execCommand('copy');
      document.body.removeChild(textArea);
      return true;
    } catch (err) {
      document.body.removeChild(textArea);
      return false;
    }
  }
};

/**
 * 格式化文件大小
 * @param {number} bytes - 文件大小（字节）
 * @returns {string} 格式化后的文件大小
 */
export const formatFileSize = (bytes) => {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

// 导入jschardet库用于编码检测
import jschardet from 'jschardet';

/**
 * 安全地使用jschardet检测编码（修复Uint8Array兼容性问题）
 * @param {ArrayBuffer|Uint8Array|string} buffer - 要检测的数据
 * @returns {object} 检测结果
 */
const safeDetectEncoding = (buffer) => {
  try {
    // 处理不同类型的输入
    let inputForDetection;
    
    if (buffer instanceof ArrayBuffer) {
      // ArrayBuffer -> 普通数组
      const uint8Array = new Uint8Array(buffer);
      inputForDetection = Array.from(uint8Array);
    } else if (buffer instanceof Uint8Array) {
      // Uint8Array -> 普通数组
      inputForDetection = Array.from(buffer);
    } else if (typeof buffer === 'string') {
      // 字符串直接使用
      inputForDetection = buffer;
    } else if (buffer && typeof buffer === 'object' && buffer.length !== undefined) {
      // 已经是数组或类数组
      inputForDetection = Array.isArray(buffer) ? buffer : Array.from(buffer);
    } else {
      // 其他类型转换为字符串
      inputForDetection = String(buffer);
    }
    
    // 调用jschardet检测
    return jschardet.detect(inputForDetection);
  } catch (error) {
    console.error('编码检测失败:', error);
    // 返回默认的UTF-8编码结果
    return { encoding: 'utf-8', confidence: 0 };
  }
};

/**
 * 读取文件为文本
 * @param {File} file - 要读取的文件
 * @returns {Promise<string>} 文件内容
 */
export const readFileAsText = async (file) => {
  const fileName = file.name.toLowerCase();
  
  // 处理docx文件
  if (fileName.endsWith('.docx')) {
    try {
      const mammoth = await import('mammoth');
      const mammothModule = mammoth.default || mammoth;
      const arrayBuffer = await file.arrayBuffer();
      const result = await mammothModule.extractRawText({ arrayBuffer });
      return result.value;
    } catch (error) {
      console.error('读取docx文件失败:', error);
      throw new Error('无法读取docx文件: ' + error.message);
    }
  }
  
  // 处理doc文件
  if (fileName.endsWith('.doc')) {
    throw new Error('当前不支持.doc文件，请转换为.docx格式后再导入');
  }
  
  // 处理txt、md等文本文件
  return new Promise((resolve, reject) => {
    // 先读取文件内容进行编码检测
    const reader = new FileReader();
    
    reader.onload = (e) => {
      const arrayBuffer = e.target.result;
      
      try {
        // 使用修复后的安全编码检测函数
        const detectionResult = safeDetectEncoding(arrayBuffer);
        let encoding = detectionResult.encoding || 'utf-8';
        
        // 统一编码名称，确保浏览器支持
        if (encoding.toLowerCase() === 'gb2312' || encoding.toLowerCase() === 'gbk') {
          encoding = 'gbk';
        } else if (encoding.toLowerCase() === 'utf-8' || encoding.toLowerCase() === 'ascii') {
          encoding = 'utf-8';
        } else if (encoding.toLowerCase() === 'windows-1252') {
          // Windows-1252编码在浏览器中通常不被支持，转换为ISO-8859-1或UTF-8
          encoding = 'utf-8';
        }
        
        // 打印检测结果用于调试
        console.log(`文件编码检测结果:`, {
          检测到编码: detectionResult.encoding,
          置信度: detectionResult.confidence,
          最终使用编码: encoding
        });
        
        // 如果置信度过低（小于0.2），使用UTF-8作为默认
        if (detectionResult.confidence < 0.2) {
          console.warn('编码检测置信度过低，使用UTF-8作为默认编码');
          encoding = 'utf-8';
        }
        
        // 使用检测到的编码重新读取文件
        const textReader = new FileReader();
        textReader.onload = (e) => {
          resolve(e.target.result);
        };
        textReader.onerror = () => {
          console.warn(`使用编码 ${encoding} 读取文件失败，尝试UTF-8`);
          // 如果检测到的编码读取失败，使用utf-8作为最后尝试
          const fallbackReader = new FileReader();
          fallbackReader.onload = (e) => resolve(e.target.result);
          fallbackReader.onerror = () => {
            console.error('使用UTF-8读取文件也失败:', fallbackReader.error);
            reject(fallbackReader.error);
          };
          fallbackReader.readAsText(file, 'utf-8');
        };
        textReader.readAsText(file, encoding);
      } catch (detectionError) {
        console.error('编码检测过程出错:', detectionError);
        // 编码检测失败时，直接使用 UTF-8
        const fallbackReader = new FileReader();
        fallbackReader.onload = (e) => resolve(e.target.result);
        fallbackReader.onerror = () => reject(fallbackReader.error);
        fallbackReader.readAsText(file, 'utf-8');
      }
    };
    
    reader.onerror = () => {
      console.error('读取ArrayBuffer失败:', reader.error);
      reject(reader.error);
    };
    
    // 先以ArrayBuffer读取文件用于编码检测
    reader.readAsArrayBuffer(file);
  });
};

/**
 * 下载文本为文件
 * @param {string} content - 内容
 * @param {string} filename - 文件名
 * @param {string} mimeType - MIME 类型
 */
export const downloadTextFile = (content, filename, mimeType = 'text/plain') => {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

/**
 * 从 URL 获取查询参数
 * @param {string} name - 参数名
 * @returns {string|null} 参数值或 null
 */
export const getQueryParam = (name) => {
  const urlParams = new URLSearchParams(window.location.search);
  return urlParams.get(name);
};

/**
 * 设置 URL 查询参数
 * @param {string} name - 参数名
 * @param {string} value - 参数值
 */
export const setQueryParam = (name, value) => {
  const url = new URL(window.location);
  url.searchParams.set(name, value);
  window.history.replaceState({}, '', url);
};

/**
 * 移除 URL 查询参数
 * @param {string} name - 参数名
 */
export const removeQueryParam = (name) => {
  const url = new URL(window.location);
  url.searchParams.delete(name);
  window.history.replaceState({}, '', url);
};