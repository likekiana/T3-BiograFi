// src/services/segmentationService.js
// 分词服务

import api from './api';

export const segmentationService = {
  /**
   * 中文分词
   * @param {string} text - 要分词的文本
   * @returns {Promise<Array>} 分词结果
   */
  async segmentChinese(text) {
    try {
      const result = await api.segmentation.segmentText(text);
      return result.tokens || [];
    } catch (error) {
      console.error('分词失败:', error);
      throw new Error(`分词失败: ${error.message}`);
    }
  },

  /**
   * 格式化分词结果
   * @param {Array} tokens - 分词结果
   * @returns {string} 格式化后的文本
   */
  formatSegmentationResult(tokens) {
    if (!Array.isArray(tokens) || tokens.length === 0) {
      return '';
    }
    
    return tokens.map(token => token.text || '').join(' ');
  },

  /**
   * 获取分词统计信息
   * @param {Array} tokens - 分词结果
   * @returns {Object} 统计信息
   */
  getSegmentationStats(tokens) {
    if (!Array.isArray(tokens)) {
      return { total: 0, unique: 0 };
    }
    
    const uniqueWords = new Set(tokens.map(token => token.text || ''));
    
    return {
      total: tokens.length,
      unique: uniqueWords.size
    };
  }
};