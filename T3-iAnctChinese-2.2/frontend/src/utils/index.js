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
  
  // 处理txt、md等文本文件
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(reader.error);
    reader.readAsText(file, 'utf-8');
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