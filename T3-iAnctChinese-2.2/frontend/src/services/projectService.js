// src/services/projectService.js
// 项目管理服务

import api from './api';
import { generateUUID, getCurrentTimestamp } from '../utils';

export const projectService = {
  /**
   * 获取所有项目
   * @returns {Promise<Array>} 项目列表
   */
  async getProjects() {
    try {
      const result = await api.project.getProjects();
      return result.projects || [];
    } catch (error) {
      console.error('获取项目列表失败:', error);
      // 降级到本地存储
      return this.getProjectsFromLocal();
    }
  },

  /**
   * 创建项目
   * @param {Object} projectData - 项目数据
   * @returns {Promise<Object>} 创建的项目
   */
  async createProject(projectData) {
    try {
      // 确保有用户信息
      const currentUser = JSON.parse(localStorage.getItem('currentUser') || '{}');
      if (!currentUser.id) {
        throw new Error('用户未登录');
      }

      const dataWithUser = {
        ...projectData,
        userId: currentUser.id
      };

      const result = await api.project.createProject(dataWithUser);
      return result.project;
    } catch (error) {
      console.error('创建项目失败，使用本地存储:', error);
      // 降级到本地存储
      return this.createProjectLocal(projectData);
    }
  },

  /**
   * 更新项目
   * @param {string} projectId - 项目 ID
   * @param {Object} updates - 更新数据
   * @returns {Promise<Object>} 更新的项目
   */
  async updateProject(projectId, updates) {
    try {
      const result = await api.project.updateProject(projectId, updates);
      return result.project;
    } catch (error) {
      console.error('更新项目失败，使用本地存储:', error);
      // 降级到本地存储
      return this.updateProjectLocal(projectId, updates);
    }
  },

  /**
   * 删除项目
   * @param {string} projectId - 项目 ID
   * @returns {Promise<boolean>} 是否删除成功
   */
  async deleteProject(projectId) {
    try {
      const result = await api.project.deleteProject(projectId);
      return result.success;
    } catch (error) {
      console.error('删除项目失败，使用本地存储:', error);
      // 降级到本地存储
      return this.deleteProjectLocal(projectId);
    }
  },

  /**
   * 搜索项目
   * @param {Array} projects - 项目列表
   * @param {string} query - 搜索查询
   * @returns {Array} 过滤后的项目列表
   */
  searchProjects(projects, query) {
    if (!query || query.trim() === '') {
      return projects;
    }
    
    const searchTerm = query.toLowerCase().trim();
    return projects.filter(project => 
      project.name.toLowerCase().includes(searchTerm) ||
      (project.description && project.description.toLowerCase().includes(searchTerm))
    );
  },

  // 本地存储方法
  async getProjectsFromLocal() {
    try {
      const projects = JSON.parse(localStorage.getItem('appdata_projects_v1') || '[]');
      const userId = JSON.parse(localStorage.getItem('currentUser') || '{}').id;
      
      // 如果用户已登录，只返回该用户的项目
      if (userId) {
        return projects.filter(p => p.userId === userId);
      }
      
      return projects;
    } catch (error) {
      console.error('从本地存储加载项目失败:', error);
      return [];
    }
  },

  async createProjectLocal(projectData) {
    const projects = await this.getProjectsFromLocal();
    const userId = JSON.parse(localStorage.getItem('currentUser') || '{}').id;
    
    if (!userId) {
      throw new Error('用户未登录');
    }

    const newProject = {
      id: generateUUID(),
      userId: userId,
      name: projectData.name,
      description: projectData.description || '',
      createdAt: getCurrentTimestamp(),
      updatedAt: getCurrentTimestamp()
    };

    projects.push(newProject);
    localStorage.setItem('appdata_projects_v1', JSON.stringify(projects));
    
    return newProject;
  },

  async updateProjectLocal(projectId, updates) {
    const projects = await this.getProjectsFromLocal();
    const index = projects.findIndex(p => p.id === projectId);
    
    if (index !== -1) {
      projects[index] = {
        ...projects[index],
        ...updates,
        updatedAt: getCurrentTimestamp()
      };
      localStorage.setItem('appdata_projects_v1', JSON.stringify(projects));
      return projects[index];
    }
    
    throw new Error('项目未找到');
  },

  async deleteProjectLocal(projectId) {
    const projects = await this.getProjectsFromLocal();
    const filteredProjects = projects.filter(p => p.id !== projectId);
    localStorage.setItem('appdata_projects_v1', JSON.stringify(filteredProjects));
    return true;
  }
};