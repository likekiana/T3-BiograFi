import api from './api';
import { generateUUID, getCurrentTimestamp, readFileAsText } from '../utils';

export const documentService = {
  /**
   * 获取文档列表
   */
  async getDocuments(projectId = null) {
    try {
      const result = await api.document.getDocuments(projectId);
      return result.documents || [];
    } catch (error) {
      console.error('获取文档列表失败，使用本地存储:', error);
      return this.getDocumentsFromLocal(projectId);
    }
  },

  /**
   * 创建文档
   */
  async createDocument(documentData) {
    try {
      const result = await api.document.createDocument(documentData);
      return result.document;
    } catch (error) {
      console.error('创建文档失败，使用本地存储:', error);
      return this.createDocumentLocal(documentData);
    }
  },


  /**
   * 更新文档
   * @param {string} documentId - 文档 ID
   * @param {Object} updates - 更新数据
   * @returns {Promise<Object>} 更新的文档
   */
  async updateDocument(documentId, updates) {
    try {
      const result = await api.document.updateDocument(documentId, updates);
      return result.document;
    } catch (error) {
      console.error('更新文档失败，使用本地存储:', error);
      // 降级到本地存储
      return this.updateDocumentLocal(documentId, updates);
    }
  },

  /**
   * 删除文档
   * @param {string} documentId - 文档 ID
   * @returns {Promise<boolean>} 是否删除成功
   */
  async deleteDocument(documentId) {
    try {
      const result = await api.document.deleteDocument(documentId);
      return result.success;
    } catch (error) {
      console.error('删除文档失败，使用本地存储:', error);
      // 降级到本地存储
      return this.deleteDocumentLocal(documentId);
    }
  },

  /**
   * 导入文档
   * @param {FileList} files - 文件列表
   * @param {string} projectId - 项目 ID
   * @returns {Promise<Array>} 导入的文档 ID 列表
   */
  async importDocuments(files, projectId) {
    const importedIds = [];
    
    for (const file of files) {
      try {
        const text = await readFileAsText(file);
        const document = await this.createDocument({
          projectId,
          name: file.name,
          description: '',
          content: text,
          author: ''
        });
        importedIds.push(document.id);
      } catch (error) {
        console.error(`导入文档失败: ${file.name}`, error);
      }
    }
    
    return importedIds;
  },

  /**
   * 导出文档
   * @param {Array} documentIds - 文档 ID 列表
   * @returns {Promise<Object>} 导出结果
   */
  async exportDocuments(documentIds) {
    try {
      return await api.document.exportDocuments(documentIds);
    } catch (error) {
      console.error('导出文档失败:', error);
      throw error;
    }
  },

  /**
   * 搜索文档
   * @param {Array} documents - 文档列表
   * @param {string} query - 搜索查询
   * @param {string} projectId - 项目 ID（可选）
   * @returns {Array} 过滤后的文档列表
   */
  searchDocuments(documents, query, projectId = null) {
    if (!query || query.trim() === '') {
      return projectId ? documents.filter(d => d.projectId === projectId) : documents;
    }
    
    const searchTerm = query.toLowerCase().trim();
    let filteredDocs = projectId ? documents.filter(d => d.projectId === projectId) : documents;
    
    return filteredDocs.filter(doc => 
      doc.name.toLowerCase().includes(searchTerm) ||
      (doc.description && doc.description.toLowerCase().includes(searchTerm)) ||
      (doc.content && doc.content.toLowerCase().includes(searchTerm)) ||
      (doc.author && doc.author.toLowerCase().includes(searchTerm))
    );
  },

  // 实体标注方法
  async addEntityAnnotation(documentId, annotation) {
    const doc = await this.getDocumentById(documentId);
    if (!doc) throw new Error('文档未找到');

    const start = Math.max(0, Math.min(annotation.start, annotation.end));
    const end = Math.max(annotation.start, annotation.end);
    
    if (end <= start) throw new Error('标注范围无效');

    const normalized = {
      start,
      end,
      label: annotation.label || '实体'
    };

    const entityAnnotations = Array.isArray(doc.entityAnnotations) ? doc.entityAnnotations : [];
    entityAnnotations.push(normalized);

    return this.updateDocument(documentId, { entityAnnotations });
  },

  async deleteEntityAnnotation(documentId, index) {
    const doc = await this.getDocumentById(documentId);
    if (!doc || !Array.isArray(doc.entityAnnotations)) {
      throw new Error('文档或标注未找到');
    }

    if (index < 0 || index >= doc.entityAnnotations.length) {
      throw new Error('标注索引无效');
    }

    const entityAnnotations = [...doc.entityAnnotations];
    entityAnnotations.splice(index, 1);

    return this.updateDocument(documentId, { entityAnnotations });
  },

  async getEntityAnnotations(documentId) {
    const doc = await this.getDocumentById(documentId);
    return (doc && Array.isArray(doc.entityAnnotations)) ? doc.entityAnnotations : [];
  },

  // 本地存储方法
  async getDocumentsFromLocal(projectId = null) {
    try {
      const documents = JSON.parse(localStorage.getItem('appdata_documents_v1') || '[]');
      const userId = JSON.parse(localStorage.getItem('currentUser') || '{}').id;
      
      // 过滤用户和项目
      let filteredDocs = documents;
      if (userId) {
        filteredDocs = filteredDocs.filter(d => d.userId === userId);
      }
      if (projectId) {
        filteredDocs = filteredDocs.filter(d => d.projectId === projectId);
      }
      
      return filteredDocs;
    } catch (error) {
      console.error('从本地存储加载文档失败:', error);
      return [];
    }
  },

  async getDocumentById(documentId) {
    const documents = await this.getDocumentsFromLocal();
    return documents.find(d => d.id === documentId);
  },

  async createDocumentLocal(documentData) {
    const documents = await this.getDocumentsFromLocal();
    const userId = JSON.parse(localStorage.getItem('currentUser') || '{}').id;
    
    if (!userId) {
      throw new Error('用户未登录');
    }

    const newDocument = {
      id: generateUUID(),
      userId: userId,
      projectId: documentData.projectId,
      name: documentData.name,
      description: documentData.description || '',
      content: documentData.content || '',
      author: documentData.author || '',
      entityAnnotations: [],
      relationAnnotations: [],
      createdAt: getCurrentTimestamp(),
      updatedAt: getCurrentTimestamp()
    };

    documents.push(newDocument);
    localStorage.setItem('appdata_documents_v1', JSON.stringify(documents));
    
    return newDocument;
  },

  async updateDocumentLocal(documentId, updates) {
    const documents = await this.getDocumentsFromLocal();
    const index = documents.findIndex(d => d.id === documentId);
    
    if (index !== -1) {
      documents[index] = {
        ...documents[index],
        ...updates,
        updatedAt: getCurrentTimestamp()
      };
      localStorage.setItem('appdata_documents_v1', JSON.stringify(documents));
      return documents[index];
    }
    
    throw new Error('文档未找到');
  },

  async deleteDocumentLocal(documentId) {
    const documents = await this.getDocumentsFromLocal();
    const filteredDocuments = documents.filter(d => d.id !== documentId);
    localStorage.setItem('appdata_documents_v1', JSON.stringify(filteredDocuments));
    return true;
  }
};