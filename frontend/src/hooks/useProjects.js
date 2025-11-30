// src/hooks/useProjects.js
// 项目管理 Hook

import { useState, useEffect, useCallback } from 'react';
import { projectService } from '../services/projectService';

export const useProjects = () => {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // 加载项目列表
  const loadProjects = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // 检查用户是否登录
      const currentUser = JSON.parse(localStorage.getItem('currentUser') || '{}');
      if (!currentUser.id) {
        throw new Error('用户未登录');
      }

      const projectsData = await projectService.getProjects();
      setProjects(projectsData);
    } catch (err) {
      setError(err.message);
      console.error('加载项目失败:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  // 初始化加载
  useEffect(() => {
    loadProjects();
  }, [loadProjects]);

  // 创建项目
  const createProject = useCallback(async (projectData) => {
    try {
      const newProject = await projectService.createProject(projectData);
      setProjects(prev => [...prev, newProject]);
      return newProject;
    } catch (err) {
      setError(err.message);
      throw err;
    }
  }, []);

  // 更新项目
  const updateProject = useCallback(async (projectId, updates) => {
    try {
      const updatedProject = await projectService.updateProject(projectId, updates);
      setProjects(prev => prev.map(p => p.id === projectId ? updatedProject : p));
      return updatedProject;
    } catch (err) {
      setError(err.message);
      throw err;
    }
  }, []);

  // 删除项目
  const deleteProject = useCallback(async (projectId) => {
    try {
      await projectService.deleteProject(projectId);
      setProjects(prev => prev.filter(p => p.id !== projectId));
      return true;
    } catch (err) {
      setError(err.message);
      throw err;
    }
  }, []);

  // 搜索项目
  const searchProjects = useCallback((query) => {
    return projectService.searchProjects(projects, query);
  }, [projects]);

  // 获取项目详情
  const getProject = useCallback((projectId) => {
    return projects.find(p => p.id === projectId);
  }, [projects]);

  return {
    projects,
    loading,
    error,
    createProject,
    updateProject,
    deleteProject,
    searchProjects,
    getProject,
    refresh: loadProjects
  };
};