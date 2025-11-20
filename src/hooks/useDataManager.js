// src/hooks/useDataManager.js
import { useState, useEffect, useCallback } from 'react';
import { projectService } from '../services/projectService';
import { documentService } from '../services/documentService';

export const useDataManager = () => {
  const [projects, setProjects] = useState([]);
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);

  // 加载数据
  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [projectsData, documentsData] = await Promise.all([
        projectService.getProjects(),
        documentService.getDocuments()
      ]);
      
      setProjects(projectsData.projects || []);
      setDocuments(documentsData.documents || []);
    } catch (error) {
      console.error('加载数据失败:', error);
    } finally {
      setLoading(false);
    }
  };

  // 项目管理
  const createProject = useCallback(async (projectData) => {
    const newProject = await projectService.createProject(projectData);
    setProjects(prev => [...prev, newProject]);
    return newProject;
  }, []);

  const updateProject = useCallback(async (projectId, updates) => {
    const updatedProject = await projectService.updateProject(projectId, updates);
    setProjects(prev => prev.map(p => p.id === projectId ? updatedProject : p));
    return updatedProject;
  }, []);

  const deleteProject = useCallback(async (projectId) => {
    await projectService.deleteProject(projectId);
    setProjects(prev => prev.filter(p => p.id !== projectId));
    // 同时删除相关文档
    setDocuments(prev => prev.filter(d => d.projectId !== projectId));
  }, []);

  // 文档管理
  const createDocument = useCallback(async (documentData) => {
    const newDocument = await documentService.createDocument(documentData);
    setDocuments(prev => [...prev, newDocument]);
    return newDocument;
  }, []);

  const updateDocument = useCallback(async (documentId, updates) => {
    const updatedDocument = await documentService.updateDocument(documentId, updates);
    setDocuments(prev => prev.map(d => d.id === documentId ? updatedDocument : d));
    return updatedDocument;
  }, []);

  const deleteDocument = useCallback(async (documentId) => {
    await documentService.deleteDocument(documentId);
    setDocuments(prev => prev.filter(d => d.id !== documentId));
  }, []);

  return {
    projects,
    documents,
    loading,
    createProject,
    updateProject,
    deleteProject,
    createDocument,
    updateDocument,
    deleteDocument,
    refresh: loadData
  };
};