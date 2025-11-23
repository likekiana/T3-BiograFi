import api from './api';
import { generateUUID, getCurrentTimestamp, readFileAsText } from '../utils';

const getTextFromContent = (content = '', start, end) => {
  if (typeof start !== 'number' || typeof end !== 'number' || !content) {
    return '';
  }
  const safeStart = Math.max(0, Math.min(start, end));
  const safeEnd = Math.max(start, end);
  return content.slice(safeStart, safeEnd);
};

const normalizeEntity = (annotation, content = '') => {
  const start = Math.max(0, Math.min(annotation.start, annotation.end));
  const end = Math.max(annotation.start, annotation.end);

  if (end <= start) throw new Error('标注范围无效');

  return {
    start,
    end,
    label: annotation.label || '实体',
    text: annotation.text || getTextFromContent(content, start, end)
  };
};

const normalizeRelationEntity = (entity, content = '') => {
  if (!entity) {
    throw new Error('缺少关联实体');
  }

  return {
    start: typeof entity.start === 'number' ? entity.start : 0,
    end: typeof entity.end === 'number' ? entity.end : (typeof entity.start === 'number' ? entity.start : 0),
    label: entity.label || '实体',
    text: entity.text || getTextFromContent(content, entity.start, entity.end)
  };
};

const isSameEntity = (entityA, entityB) => {
  if (!entityA || !entityB) return false;
  return entityA.start === entityB.start && entityA.end === entityB.end && entityA.label === entityB.label;
};

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
  async addEntityAnnotation(documentId, annotation, existingAnnotations = null) {
    const doc = await this.getDocumentById(documentId);
    if (!doc) throw new Error('文档未找到');

    const normalized = normalizeEntity(annotation, doc.content || '');
    const entityAnnotations = Array.isArray(existingAnnotations)
      ? existingAnnotations
      : (Array.isArray(doc.entityAnnotations) ? doc.entityAnnotations : []);

    const updated = [...entityAnnotations, normalized];

    return this.updateDocument(documentId, { entityAnnotations: updated });
  },

  async deleteEntityAnnotation(documentId, index, existingAnnotations = null) {
    const doc = await this.getDocumentById(documentId);
    if (!doc) {
      throw new Error('文档未找到');
    }

    const entityAnnotations = Array.isArray(existingAnnotations)
      ? [...existingAnnotations]
      : (Array.isArray(doc.entityAnnotations) ? [...doc.entityAnnotations] : []);

    if (index < 0 || index >= entityAnnotations.length) {
      throw new Error('标注索引无效');
    }

    const removedEntity = entityAnnotations[index];
    entityAnnotations.splice(index, 1);

    // 同步删除关联的关系标注
    const relations = Array.isArray(doc.relationAnnotations) ? doc.relationAnnotations : [];
    const filteredRelations = relations.filter((relation) => {
      return !isSameEntity(relation.entity1, removedEntity) && !isSameEntity(relation.entity2, removedEntity);
    });

    return this.updateDocument(documentId, {
      entityAnnotations,
      relationAnnotations: filteredRelations
    });
  },

  async getEntityAnnotations(documentId) {
    const doc = await this.getDocumentById(documentId);
    if (!doc || !Array.isArray(doc.entityAnnotations)) return [];

    return doc.entityAnnotations.map((annotation) => ({
      ...annotation,
      text: annotation.text || getTextFromContent(doc.content || '', annotation.start, annotation.end)
    }));
  },

  async addRelationAnnotation(documentId, relation, existingRelations = null) {
    const doc = await this.getDocumentById(documentId);
    if (!doc) throw new Error('文档未找到');

    const { entity1, entity2, relationName } = relation;

    if (!relationName || !relationName.trim()) {
      throw new Error('关系名称不能为空');
    }

    if (!entity1 || !entity2) {
      throw new Error('请选择两个实体');
    }

    if (isSameEntity(entity1, entity2)) {
      throw new Error('请不要选择相同的实体');
    }

    const normalizedRelation = {
      id: relation.id || generateUUID(),
      relationName: relationName.trim(),
      entity1: normalizeRelationEntity(entity1, doc.content || ''),
      entity2: normalizeRelationEntity(entity2, doc.content || '')
    };

    const relationAnnotations = Array.isArray(existingRelations)
      ? existingRelations
      : (Array.isArray(doc.relationAnnotations) ? doc.relationAnnotations : []);

    return this.updateDocument(documentId, {
      relationAnnotations: [...relationAnnotations, normalizedRelation]
    });
  },

  async deleteRelationAnnotation(documentId, relationId, existingRelations = null) {
    const doc = await this.getDocumentById(documentId);
    if (!doc) throw new Error('文档未找到');

    const relationAnnotations = Array.isArray(existingRelations)
      ? existingRelations
      : (Array.isArray(doc.relationAnnotations) ? doc.relationAnnotations : []);

    const filtered = relationAnnotations.filter((relation) => relation.id !== relationId);

    return this.updateDocument(documentId, { relationAnnotations: filtered });
  },

  async getRelationAnnotations(documentId) {
    const doc = await this.getDocumentById(documentId);
    if (!doc || !Array.isArray(doc.relationAnnotations)) return [];
    return doc.relationAnnotations.map((relation) => ({
      ...relation,
      relationName: relation.relationName || '',
      entity1: normalizeRelationEntity(relation.entity1 || {}, doc.content || ''),
      entity2: normalizeRelationEntity(relation.entity2 || {}, doc.content || '')
    }));
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
    try {
      const documents = await this.getDocuments();
      const found = documents.find(d => d.id === documentId);
      if (found) {
        return found;
      }
    } catch (error) {
      console.warn('远程获取文档失败，尝试读取本地数据:', error.message);
    }

    const localDocuments = await this.getDocumentsFromLocal();
    return localDocuments.find(d => d.id === documentId);
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