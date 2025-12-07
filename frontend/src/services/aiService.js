// src/services/aiService.js
// AI 服务

import api from './api';

export const aiService = {
  /**
   * 古文解析
   * @param {string} text - 要解析的文本
   * @param {string} model - 模型名称
   * @returns {Promise<string>} 解析结果
   */
  async analyzeClassicalText(text, model = 'deepseek-chat') {
    try {
      // 获取模型信息，确定apiType
      const modelInfo = this.getAvailableModels().find(m => m.id === model) || {};
      const result = await api.ai.analyzeText(text, model, modelInfo.apiType || 'deepseek');
      return result.result || '';
    } catch (error) {
      console.error('古文解析失败:', error);
      throw new Error(`解析失败: ${error.message}`);
    }
  },

  /**
   * 古文答疑
   * @param {string} text - 古文文本
   * @param {string} question - 问题
   * @param {string} model - 模型名称
   * @returns {Promise<string>} 答案
   */
  async askQuestion(text, question, model = 'deepseek-chat') {
    try {
      // 获取模型信息，确定apiType
      const modelInfo = this.getAvailableModels().find(m => m.id === model) || {};
      const result = await api.ai.askQuestion(text, question, model, modelInfo.apiType || 'deepseek');
      return result.result || '';
    } catch (error) {
      console.error('古文答疑失败:', error);
      throw new Error(`答疑失败: ${error.message}`);
    }
  },

  /**
   * 自动实体标注
   * @param {string} text - 要标注的文本
   * @param {string} model - 模型名称
   * @returns {Promise<Array>} 标注结果
   */
  async autoAnnotateEntities(text, model = 'deepseek-chat') {
    try {
      // 获取模型信息，确定apiType
      const modelInfo = this.getAvailableModels().find(m => m.id === model) || {};
      const result = await api.ai.autoAnnotate(text, modelInfo.apiType || 'deepseek');
      return result.annotations || [];
    } catch (error) {
      console.error('自动标注失败:', error);
      throw new Error(`自动标注失败: ${error.message}`);
    }
  },

  /**
   * 获取可用模型列表
   * @returns {Array} 模型列表
   */
  getAvailableModels() {
    return [
      {
        id: 'deepseek-chat',
        name: 'DeepSeek',
        description: 'DeepSeek模型，适合各种文本生成任务',
        recommended: true,
        apiType: 'deepseek'
      },
      {
        id: 'am-hrzab73jvugw',
        name: 'ERNIE X1',
        description: '百度千帆ERNIE X1模型，适合古文解析',
        recommended: false,
        apiType: 'qianfan'
      }
    ];
  }
};