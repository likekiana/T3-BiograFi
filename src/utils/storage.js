// src/utils/storage.js
// 本地存储管理

const PROJECTS_KEY = 'appdata_projects_v1';
const DOCUMENTS_KEY = 'appdata_documents_v1';

/**
 * 保存项目数据到本地存储
 * @param {Array} projects - 项目数组
 */
export const saveProjectsToLocal = (projects) => {
  try {
    localStorage.setItem(PROJECTS_KEY, JSON.stringify(projects));
  } catch (error) {
    console.error('保存项目数据失败:', error);
  }
};

/**
 * 从本地存储加载项目数据
 * @returns {Array} 项目数组
 */
export const loadProjectsFromLocal = () => {
  try {
    const raw = localStorage.getItem(PROJECTS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (error) {
    console.error('加载项目数据失败:', error);
    return [];
  }
};

/**
 * 保存文档数据到本地存储
 * @param {Array} documents - 文档数组
 */
export const saveDocumentsToLocal = (documents) => {
  try {
    localStorage.setItem(DOCUMENTS_KEY, JSON.stringify(documents));
  } catch (error) {
    console.error('保存文档数据失败:', error);
  }
};

/**
 * 从本地存储加载文档数据
 * @returns {Array} 文档数组
 */
export const loadDocumentsFromLocal = () => {
  try {
    const raw = localStorage.getItem(DOCUMENTS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      // 迁移：确保 projectId 存在且类型为字符串
      return parsed.map(doc => ({
        ...doc,
        id: typeof doc.id === 'number' ? String(doc.id) : doc.id || generateUUID(),
        projectId: typeof doc.projectId === 'number' ? String(doc.projectId) : (doc.projectId || ''),
        entityAnnotations: Array.isArray(doc.entityAnnotations) ? doc.entityAnnotations : [],
        relationAnnotations: Array.isArray(doc.relationAnnotations) ? doc.relationAnnotations : []
      }));
    }
    return [];
  } catch (error) {
    console.error('加载文档数据失败:', error);
    return [];
  }
};

/**
 * 清除所有本地数据
 */
export const clearAllLocalData = () => {
  try {
    localStorage.removeItem(PROJECTS_KEY);
    localStorage.removeItem(DOCUMENTS_KEY);
  } catch (error) {
    console.error('清除本地数据失败:', error);
  }
};

/**
 * 导出所有数据
 * @returns {Object} 包含项目和文档的数据对象
 */
export const exportAllData = () => {
  const projects = loadProjectsFromLocal();
  const documents = loadDocumentsFromLocal();
  
  return {
    projects,
    documents,
    exportDate: new Date().toISOString(),
    version: '1.0'
  };
};

/**
 * 导入数据
 * @param {Object} data - 要导入的数据
 * @returns {boolean} 是否导入成功
 */
export const importData = (data) => {
  try {
    if (data.projects && Array.isArray(data.projects)) {
      saveProjectsToLocal(data.projects);
    }
    if (data.documents && Array.isArray(data.documents)) {
      saveDocumentsToLocal(data.documents);
    }
    return true;
  } catch (error) {
    console.error('导入数据失败:', error);
    return false;
  }
};

// 从 utils/index.js 导入 generateUUID
import { generateUUID } from './index';