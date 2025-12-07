// src/services/authService.js
// 认证服务

import api from './api';

export const authService = {
  /**
   * 用户登录
   * @param {string} username - 用户名
   * @param {string} password - 密码
   * @returns {Promise} 登录结果
   */
  async login(username, password) {
    try {
      const result = await api.user.login({ username, password });
      
      if (result.success) {
        // 保存用户信息和 token
        localStorage.setItem('currentUser', JSON.stringify(result.user));
        if (result.token) {
          localStorage.setItem('token', result.token);
        }
        return { success: true, user: result.user };
      } else {
        return { success: false, error: result.error || '登录失败' };
      }
    } catch (error) {
      console.error('登录错误:', error);
      return { 
        success: false, 
        error: error.message || '无法连接服务器，请确保用户服务已启动（cd server && npm start）' 
      };
    }
  },

  /**
   * 用户注册
   * @param {string} username - 用户名
   * @param {string} email - 邮箱
   * @param {string} password - 密码
   * @returns {Promise} 注册结果
   */
  async register(username, email, password) {
    try {
      const result = await api.user.register({ username, email, password });
      
      if (result.success) {
        return { success: true, user: result.user };
      } else {
        return { success: false, error: result.error || '注册失败' };
      }
    } catch (error) {
      console.error('注册错误:', error);
      return { 
        success: false, 
        error: error.message || '无法连接服务器，请确保用户服务已启动（cd server && npm start）' 
      };
    }
  },

  /**
   * 更新用户信息
   * @param {string} userId - 用户 ID
   * @param {Object} updates - 更新数据
   * @returns {Promise} 更新结果
   */
  async updateUser(userId, updates) {
    try {
      const result = await api.user.updateUser(userId, updates);
      
      if (result.success) {
        // 更新当前登录用户信息
        const currentUser = this.getCurrentUser();
        if (currentUser && currentUser.id === userId) {
          const updatedUser = { ...currentUser, ...result.user };
          localStorage.setItem('currentUser', JSON.stringify(updatedUser));
        }
        return { success: true, user: result.user };
      } else {
        return { success: false, error: result.error || '更新失败' };
      }
    } catch (error) {
      console.error('更新用户信息错误:', error);
      return { 
        success: false, 
        error: error.message || '无法连接服务器' 
      };
    }
  },

  /**
   * 用户登出
   */
  logout() {
    localStorage.removeItem('currentUser');
    localStorage.removeItem('token');
    localStorage.removeItem('rememberedUsername');
  },

  /**
   * 获取当前登录用户
   * @returns {Object|null} 当前用户或 null
   */
  getCurrentUser() {
    try {
      const userStr = localStorage.getItem('currentUser');
      return userStr ? JSON.parse(userStr) : null;
    } catch (error) {
      console.error('获取当前用户错误:', error);
      return null;
    }
  },

  /**
   * 检查是否已登录
   * @returns {boolean} 是否已登录
   */
  isLoggedIn() {
    return this.getCurrentUser() !== null;
  },

  /**
   * 获取当前用户 ID
   * @returns {string|null} 用户 ID 或 null
   */
  getCurrentUserId() {
    const user = this.getCurrentUser();
    return user ? user.id : null;
  },

  /**
   * 要求登录（用于路由保护）
   * @returns {boolean} 是否已登录
   */
  requireLogin() {
    if (!this.isLoggedIn()) {
      // 在 React 中，我们会使用导航而不是直接跳转
      console.warn('用户未登录，需要重定向到登录页');
      return false;
    }
    return true;
  },

  /**
   * 记住用户名
   * @param {string} username - 用户名
   */
  rememberUsername(username) {
    localStorage.setItem('rememberedUsername', username);
  },

  /**
   * 获取记住的用户名
   * @returns {string} 记住的用户名
   */
  getRememberedUsername() {
    return localStorage.getItem('rememberedUsername') || '';
  },

  /**
   * 清除记住的用户名
   */
  clearRememberedUsername() {
    localStorage.removeItem('rememberedUsername');
  }
};