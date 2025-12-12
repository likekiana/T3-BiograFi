// src/services/segmentationService.js
import api from './api';

export const segmentationService = {
  /**
   * 中文分词（保持原有格式）
   * @param {string} text - 原始文本
   * @returns {Promise<string>} 分词后的文本
   */
  async segmentTextPreserveFormat(text) {
    try {
      if (!text || typeof text !== 'string' || !text.trim()) {
        return text;
      }
      
      // 检查是否包含中文
      if (!this.containsChinese(text)) {
        return text;
      }
      
      // 使用API进行分词
      const response = await api.segmentation.segmentText(text);
      
      // 提取分词结果
      let tokens = [];
      if (response && response.tokens) {
        tokens = response.tokens;
      } else if (response && Array.isArray(response)) {
        tokens = response;
      }
      
      if (tokens.length === 0) {
        return this.simpleSegmentChinese(text);
      }
      
      // 将tokens转换为分词文本
      const segmentedText = this.tokensToSegmentedText(text, tokens);
      return segmentedText;
      
    } catch (error) {
      console.error('分词失败：', error);
      // 出错时使用简单分词
      return this.simpleSegmentChinese(text);
    }
  },

  /**
   * 判断文本是否包含中文
   */
  containsChinese(text) {
    return /[\u4e00-\u9fa5]/.test(text);
  },

  /**
   * 从HTML内容中提取纯文本
   */
  extractPlainText(html) {
    if (!html || typeof html !== 'string') return '';
    
    try {
      // 创建临时DOM元素来提取纯文本
      const tempDiv = document.createElement('div');
      tempDiv.innerHTML = html;
      return tempDiv.textContent || tempDiv.innerText || '';
    } catch (error) {
      console.error('提取纯文本失败:', error);
      return html;
    }
  },

  /**
   * 将tokens转换回分词文本，保持原有格式
   */
  tokensToSegmentedText(originalText, tokens) {
    if (!originalText || typeof originalText !== 'string') {
      return originalText;
    }
    
    if (!tokens || !Array.isArray(tokens) || tokens.length === 0) {
      return originalText;
    }
    
    // 提取token文本
    const tokenTexts = tokens.map(token => {
      if (typeof token === 'string') {
        return token.trim();
      } else if (token && token.text) {
        return token.text.trim();
      }
      return '';
    }).filter(text => text.length > 0);
    
    if (tokenTexts.length === 0) {
      return originalText;
    }
    
    // 创建分词词典
    const wordSet = new Set(tokenTexts);
    
    // 按行处理，保持换行
    const lines = originalText.split('\n');
    const processedLines = lines.map(line => {
      if (!line || typeof line !== 'string' || !this.containsChinese(line)) {
        return line; // 不含中文的行保持不变
      }
      
      return this.segmentLine(line, wordSet);
    });
    
    return processedLines.join('\n');
  },

  /**
   * 对单行文本进行分词
   */
  segmentLine(line, wordSet) {
    if (!line || typeof line !== 'string' || line.length === 0) {
      return line;
    }
    
    if (!wordSet || !(wordSet instanceof Set)) {
      return line;
    }
    
    let result = '';
    let i = 0;
    
    while (i < line.length) {
      let matched = false;
      
      // 尝试匹配最长的词（最大4个字符）
      for (let len = Math.min(4, line.length - i); len >= 1; len--) {
        const candidate = line.substr(i, len);
        
        // 如果候选词在分词词典中
        if (wordSet.has(candidate)) {
          result += candidate + ' ';
          i += len;
          matched = true;
          break;
        }
      }
      
      // 如果没有匹配到，保持原字符
      if (!matched) {
        result += line[i];
        i++;
      }
    }
    
    // 清理多余空格
    return this.cleanSpaces(result);
  },

  /**
   * 清理多余空格
   */
  cleanSpaces(text) {
    let cleaned = text;
    
    // 合并多个空格
    cleaned = cleaned.replace(/\s+/g, ' ');
    
    // 标点符号前不应该有空格
    cleaned = cleaned.replace(/\s+([。，！？；,.!?;:：])/g, '$1');
    
    // 标点符号后不应该有空格（除了中文标点可能后面跟空格）
    cleaned = cleaned.replace(/([。，！？；])\s+/g, '$1 ');
    
    // 括号、引号前后不应该有空格
    cleaned = cleaned.replace(/\s*([（）()【】\[\]《》""''])\s*/g, '$1');
    
    // 清理行尾空格（但保留行首缩进）
    const lines = cleaned.split('\n');
    cleaned = lines.map(line => {
      // 保留行首空格（用于缩进）
      const leadingSpaces = line.match(/^\s*/)[0];
      const content = line.substring(leadingSpaces.length).trim();
      return leadingSpaces + content;
    }).join('\n');
    
    return cleaned;
  },

  /**
   * 简单的中文分词（备用方案）
   */
  simpleSegmentChinese(text) {
    if (!text || typeof text !== 'string') {
      return text;
    }
    
    try {
      // 只在中文词之间加空格
      let result = '';
      for (let i = 0; i < text.length; i++) {
        const char = text[i];
        const nextChar = text[i + 1];
        
        result += char;
        
        // 如果当前字符是中文，下一个字符也是中文，加空格
        if (this.isChinese(char) && this.isChinese(nextChar)) {
          result += ' ';
        }
      }
      
      // 清理多余空格
      return this.cleanSpaces(result);
    } catch (error) {
      console.error('简单分词失败:', error);
      return text;
    }
  },

  /**
   * 判断字符是否是中文
   */
  isChinese(char) {
    if (!char) return false;
    const code = char.charCodeAt(0);
    return code >= 0x4E00 && code <= 0x9FFF;
  },

  /**
   * 格式化的分词结果
   */
  async formatSegmentationResult(text) {
    return await this.segmentTextPreserveFormat(text);
  }
};