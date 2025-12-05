import { useState, useEffect, useCallback } from 'react';
import { documentService } from '../services/documentService';

export const useDocuments = (projectId = null) => {
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // 加载文档列表
  const loadDocuments = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      console.log('开始加载文档，projectId:', projectId);
      
      // 检查用户登录状态
      const currentUser = JSON.parse(localStorage.getItem('currentUser') || '{}');
      console.log('当前用户:', currentUser);
      
      if (!currentUser.id) {
        throw new Error('用户未登录，无法加载文档');
      }

      const documentsData = await documentService.getDocuments(projectId);
      console.log('加载文档成功:', documentsData.length, '个文档');
      setDocuments(documentsData);
    } catch (err) {
      console.error('加载文档失败:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  // 初始化加载
  useEffect(() => {
    loadDocuments();
  }, [loadDocuments]);

  // 创建文档
  const createDocument = useCallback(async (documentData) => {
    try {
      const newDocument = await documentService.createDocument(documentData);
      setDocuments(prev => [...prev, newDocument]);
      return newDocument;
    } catch (err) {
      setError(err.message);
      throw err;
    }
  }, [projectId]);

  // 更新文档
  const updateDocument = useCallback(async (documentId, updates) => {
    try {
      const updatedDocument = await documentService.updateDocument(documentId, updates);
      setDocuments(prev => prev.map(d => d.id === documentId ? updatedDocument : d));
      return updatedDocument;
    } catch (err) {
      setError(err.message);
      throw err;
    }
  }, []);

  // 删除文档
  const deleteDocument = useCallback(async (documentId) => {
    try {
      await documentService.deleteDocument(documentId);
      setDocuments(prev => prev.filter(d => d.id !== documentId));
      return true;
    } catch (err) {
      setError(err.message);
      throw err;
    }
  }, []);

  // 导入文档
  const importDocuments = useCallback(async (files) => {
    if (!projectId) {
      throw new Error('请先选择项目');
    }
    
    try {
      const importedIds = await documentService.importDocuments(files, projectId);
      await loadDocuments(); // 重新加载文档列表
      return importedIds;
    } catch (err) {
      setError(err.message);
      throw err;
    }
  }, [projectId, loadDocuments]);

  // 导出文档
  const exportDocuments = useCallback(async (documentIds) => {
    try {
      return await documentService.exportDocuments(documentIds);
    } catch (err) {
      setError(err.message);
      throw err;
    }
  }, []);

  // 搜索文档
  const searchDocuments = useCallback((query) => {
    return documentService.searchDocuments(documents, query, projectId);
  }, [documents, projectId]);

  // 获取文档详情
  const getDocument = useCallback((documentId) => {
    return documents.find(d => d.id === documentId);
  }, [documents]);

  // 实体标注方法
  const addEntityAnnotation = useCallback(async (documentId, annotation) => {
    try {
      return await documentService.addEntityAnnotation(documentId, annotation);
    } catch (err) {
      setError(err.message);
      throw err;
    }
  }, []);

  // 删除实体标注 - 支持索引或标注对象参数
  const deleteEntityAnnotation = useCallback(async (documentId, indexOrAnnotation) => {
    try {
      return await documentService.deleteEntityAnnotation(documentId, indexOrAnnotation);
    } catch (err) {
      setError(err.message);
      throw err;
    }
  }, []);

  const getEntityAnnotations = useCallback(async (documentId) => {
    try {
      return await documentService.getEntityAnnotations(documentId);
    } catch (err) {
      setError(err.message);
      throw err;
    }
  }, []);

  // 关系标注方法
  const addRelationAnnotation = useCallback(async (documentId, relation) => {
    try {
      return await documentService.addRelationAnnotation(documentId, relation);
    } catch (err) {
      setError(err.message);
      throw err;
    }
  }, []);

  const deleteRelationAnnotation = useCallback(async (documentId, relationId) => {
    try {
      return await documentService.deleteRelationAnnotation(documentId, relationId);
    } catch (err) {
      setError(err.message);
      throw err;
    }
  }, []);

  const getRelationAnnotations = useCallback(async (documentId) => {
    try {
      return await documentService.getRelationAnnotations(documentId);
    } catch (err) {
      setError(err.message);
      throw err;
    }
  }, []);

  return {
    documents,
    loading,
    error,
    createDocument,
    updateDocument,
    deleteDocument,
    importDocuments,
    exportDocuments,
    searchDocuments,
    getDocument,
    addEntityAnnotation,
    deleteEntityAnnotation,
    getEntityAnnotations,
    addRelationAnnotation,
    deleteRelationAnnotation,
    getRelationAnnotations,
    refresh: loadDocuments
  };
};