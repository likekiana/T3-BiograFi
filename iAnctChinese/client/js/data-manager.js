// js/data-manager.js
// Data management and local storage functionality

class DataManager {
    constructor() {
        this.PROJECTS_KEY = 'appdata_projects_v1';
        this.DOCUMENTS_KEY = 'appdata_documents_v1';
        
        // Initialize empty data - let users create their own projects and documents
        this.defaultProjects = [];
        this.defaultDocuments = [];
        
        // 获取当前登录用户
        this.currentUser = this.getCurrentUser();
        
        // API 基础地址
        this.apiBase = window.USER_API_BASE || 'http://localhost:5002';
        
        // 云端同步开关（默认启用）
        this.cloudSyncEnabled = localStorage.getItem('cloudSyncEnabled') !== 'false';
        
        // Load data from cloud or localStorage
        this.projects = [];
        this.documents = [];
        this.initializeData();
        
        // Editor state
        this.editingDocId = null;
        this.editingContent = '';
        this.editingAuthor = '';
        this.activeTab = '结构标注';
        
        // Event listeners
        this.listeners = new Map();
    }
    
    // 初始化数据（从云端或本地加载）
// 初始化数据（从云端或本地加载）- 修复版本
async initializeData() {
    console.log('开始初始化数据，云端同步:', this.cloudSyncEnabled);
    
    if (this.cloudSyncEnabled && this.currentUser) {
        try {
            await this.loadFromCloud();
            console.log('云端数据加载成功');
        } catch (error) {
            console.error('从云端加载失败，使用本地数据:', error);
            this.projects = this.loadProjectsFromLocal();
            this.documents = this.loadDocumentsFromLocal();
        }
    } else {
        console.log('使用本地数据');
        this.projects = this.loadProjectsFromLocal();
        this.documents = this.loadDocumentsFromLocal();
    }
    
    console.log('数据初始化完成，项目数量:', this.projects.length, '文档数量:', this.documents.length);
    
    this.emit('projectsChanged', this.projects);
    this.emit('documentsChanged', this.documents);
}
    
    // 从云端加载数据
// 从云端加载数据 - 修复版本
async loadFromCloud() {
    const userId = this.getCurrentUserId();
    if (!userId) {
        console.log('未登录用户，跳过云端加载');
        return;
    }
    
    try {
        console.log('从云端加载数据，用户ID:', userId);
        
        // 加载项目
        const projectsRes = await fetch(`${this.apiBase}/api/projects?userId=${userId}`);
        console.log('项目API响应状态:', projectsRes.status);
        
        if (!projectsRes.ok) {
            throw new Error(`项目API错误: ${projectsRes.status}`);
        }
        
        const projectsData = await projectsRes.json();
        console.log('项目API响应数据:', projectsData);
        
        if (projectsData.success) {
            this.projects = projectsData.projects || [];
            console.log('加载项目成功，数量:', this.projects.length);
        } else {
            throw new Error(projectsData.error || '获取项目失败');
        }
        
        // 加载文档
        const documentsRes = await fetch(`${this.apiBase}/api/documents?userId=${userId}`);
        console.log('文档API响应状态:', documentsRes.status);
        
        if (documentsRes.ok) {
            const documentsData = await documentsRes.json();
            console.log('文档API响应数据:', documentsData);
            
            if (documentsData.success) {
                this.documents = documentsData.documents || [];
                console.log('加载文档成功，数量:', this.documents.length);
            }
        } else {
            console.warn('文档API调用失败，跳过文档加载');
        }
        
    } catch (error) {
        console.error('从云端加载失败，使用本地数据:', error);
        throw error; // 重新抛出错误，让调用方处理
    }
}
    
    // 获取当前登录用户
    getCurrentUser() {
        try {
            const userStr = localStorage.getItem('currentUser');
            return userStr ? JSON.parse(userStr) : null;
        } catch (error) {
            console.error('Error getting current user:', error);
            return null;
        }
    }
    
    // 获取当前用户ID
    getCurrentUserId() {
        return this.currentUser ? this.currentUser.id : null;
    }
    
    // 搜索项目
    searchProjects(query) {
        if (!query || query.trim() === '') {
            return this.projects;
        }
        
        const searchTerm = query.toLowerCase().trim();
        return this.projects.filter(project => 
            project.name.toLowerCase().includes(searchTerm) ||
            (project.description && project.description.toLowerCase().includes(searchTerm))
        );
    }
    
    // 搜索文档
    searchDocuments(query, projectId = null) {
        if (!query || query.trim() === '') {
            return projectId ? this.getDocumentsByProject(projectId) : this.documents;
        }
        
        const searchTerm = query.toLowerCase().trim();
        let documents = projectId ? this.getDocumentsByProject(projectId) : this.documents;
        
        return documents.filter(doc => 
            doc.name.toLowerCase().includes(searchTerm) ||
            (doc.description && doc.description.toLowerCase().includes(searchTerm)) ||
            (doc.content && doc.content.toLowerCase().includes(searchTerm)) ||
            (doc.author && doc.author.toLowerCase().includes(searchTerm))
        );
    }
    
    // Project management
    loadProjectsFromLocal() {
        try {
            const raw = localStorage.getItem(this.PROJECTS_KEY);
            const allProjects = raw ? JSON.parse(raw) : [...this.defaultProjects];
            
            // 如果用户已登录，只返回该用户的项目
            const userId = this.getCurrentUserId();
            if (userId) {
                return allProjects.filter(p => p.userId === userId);
            }
            
            return allProjects;
        } catch (error) {
            console.error('Error loading projects:', error);
            return [...this.defaultProjects];
        }
    }
    
    saveProjects() {
        try {
            // 获取所有项目（包括其他用户的）
            const raw = localStorage.getItem(this.PROJECTS_KEY);
            const allProjects = raw ? JSON.parse(raw) : [];
            
            // 移除当前用户的旧项目
            const userId = this.getCurrentUserId();
            const otherProjects = userId ? allProjects.filter(p => p.userId !== userId) : [];
            
            // 合并当前用户的新项目和其他用户的项目
            const merged = [...otherProjects, ...this.projects];
            
            localStorage.setItem(this.PROJECTS_KEY, JSON.stringify(merged));
            this.emit('projectsChanged', this.projects);
        } catch (error) {
            console.error('Error saving projects:', error);
        }
    }
    
    async addProject(projectData) {
        const userId = this.getCurrentUserId();
        if (!userId) {
            console.error('No user logged in');
            return null;
        }
        
        if (this.cloudSyncEnabled) {
            try {
                console.log('云端模式：创建项目', { userId, name: projectData.name });
                
                const response = await fetch(`${this.apiBase}/api/projects`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        userId: parseInt(userId), // 确保是数字
                        name: projectData.name,
                        description: projectData.description || ''
                    })
                });
                
                console.log('API响应状态:', response.status);
                
                if (!response.ok) {
                    throw new Error(`HTTP ${response.status}: ${await response.text()}`);
                }
                
                const result = await response.json();
                console.log('API响应数据:', result);
                
                if (result.success) {
                    const newProject = result.project;
                    console.log('云端创建项目成功:', newProject);
                    
                    // 添加到本地列表
                    this.projects.push(newProject);
                    this.emit('projectsChanged', this.projects);
                    return newProject;
                } else {
                    throw new Error(result.error || '创建项目失败');
                }
            } catch (error) {
                console.error('云端创建项目失败，保存到本地:', error);
                // 继续执行本地模式
            }
        }
        
        // 本地模式或云端失败时的后备方案
        console.log('本地模式：创建项目');
        const newProject = {
            id: generateUUID(),
            userId: userId,
            name: projectData.name,
            description: projectData.description || '',
            createdAt: getCurrentTimestamp(),
            updatedAt: getCurrentTimestamp()
        };
        
        this.projects.push(newProject);
        this.saveProjects();
        this.emit('projectsChanged', this.projects);
        return newProject;
    }
    
    async updateProject(id, data) {
        if (this.cloudSyncEnabled) {
            try {
                const response = await fetch(`${this.apiBase}/api/projects/${id}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(data)
                });
                const result = await response.json();
                if (result.success) {
                    const index = this.projects.findIndex(p => p.id === id);
                    if (index !== -1) {
                        this.projects[index] = result.project;
                        this.emit('projectsChanged', this.projects);
                    }
                    return result.project;
                }
            } catch (error) {
                console.error('云端更新项目失败:', error);
            }
        }
        
        // 本地模式或云端失败
        const index = this.projects.findIndex(p => p.id === id);
        if (index !== -1) {
            this.projects[index] = {
                ...this.projects[index],
                ...data,
                updatedAt: getCurrentTimestamp()
            };
            this.saveProjects();
            return this.projects[index];
        }
        return null;
    }
    
    async deleteProject(id) {
        if (this.cloudSyncEnabled) {
            try {
                const response = await fetch(`${this.apiBase}/api/projects/${id}`, {
                    method: 'DELETE'
                });
                const result = await response.json();
                if (result.success) {
                    this.projects = this.projects.filter(p => p.id !== id);
                    this.documents = this.documents.filter(d => d.projectId !== id);
                    this.emit('projectsChanged', this.projects);
                    this.emit('documentsChanged', this.documents);
                    return true;
                }
            } catch (error) {
                console.error('云端删除项目失败:', error);
            }
        }
        
        // 本地模式或云端失败
        const index = this.projects.findIndex(p => p.id === id);
        if (index !== -1) {
            this.projects.splice(index, 1);
            this.documents = this.documents.filter(d => d.projectId !== id);
            this.saveProjects();
            this.saveDocuments();
            return true;
        }
        return false;
    }
    
    getProject(id) {
        return this.projects.find(p => p.id === id);
    }
    
    // Document management
    loadDocumentsFromLocal() {
        try {
            const raw = localStorage.getItem(this.DOCUMENTS_KEY);
            if (raw) {
                const parsed = JSON.parse(raw);
                // Migrate: ensure projectId exists and types are string
                const allDocuments = parsed.map(doc => ({
                    ...doc,
                    id: typeof doc.id === 'number' ? String(doc.id) : doc.id || generateUUID(),
                    projectId: typeof doc.projectId === 'number' ? String(doc.projectId) : (doc.projectId ?? this.projects[0]?.id ?? generateUUID()),
                    entityAnnotations: Array.isArray(doc.entityAnnotations) ? doc.entityAnnotations : [],
                    relationAnnotations: Array.isArray(doc.relationAnnotations) ? doc.relationAnnotations : []
                }));
                
                // 如果用户已登录，只返回该用户的文档
                const userId = this.getCurrentUserId();
                if (userId) {
                    return allDocuments.filter(d => d.userId === userId);
                }
                
                return allDocuments;
            }
            return [...this.defaultDocuments];
        } catch (error) {
            console.error('Error loading documents:', error);
            return [...this.defaultDocuments];
        }
    }
    
    saveDocuments() {
        try {
            // 获取所有文档（包括其他用户的）
            const raw = localStorage.getItem(this.DOCUMENTS_KEY);
            const allDocuments = raw ? JSON.parse(raw) : [];
            
            // 移除当前用户的旧文档
            const userId = this.getCurrentUserId();
            const otherDocuments = userId ? allDocuments.filter(d => d.userId !== userId) : [];
            
            // 合并当前用户的新文档和其他用户的文档
            const merged = [...otherDocuments, ...this.documents];
            
            localStorage.setItem(this.DOCUMENTS_KEY, JSON.stringify(merged));
            this.emit('documentsChanged', this.documents);
        } catch (error) {
            console.error('Error saving documents:', error);
        }
    }
    
    async addDocument(documentData) {
        const userId = this.getCurrentUserId();
        if (!userId) {
            console.error('No user logged in');
            return null;
        }
        
        if (this.cloudSyncEnabled) {
            try {
                const response = await fetch(`${this.apiBase}/api/documents`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        userId,
                        projectId: documentData.projectId,
                        name: documentData.name,
                        description: documentData.description || '',
                        content: documentData.content || '',
                        author: documentData.author || ''
                    })
                });
                const result = await response.json();
                if (result.success) {
                    this.documents.push(result.document);
                    this.emit('documentsChanged', this.documents);
                    return result.document;
                }
            } catch (error) {
                console.error('云端创建文档失败，保存到本地:', error);
            }
        }
        
        // 本地模式或云端失败
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
        
        this.documents.push(newDocument);
        this.saveDocuments();
        return newDocument;
    }
    
    async updateDocument(id, data) {
        if (this.cloudSyncEnabled) {
            try {
                const response = await fetch(`${this.apiBase}/api/documents/${id}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(data)
                });
                const result = await response.json();
                if (result.success) {
                    const index = this.documents.findIndex(d => d.id === id);
                    if (index !== -1) {
                        this.documents[index] = result.document;
                        this.emit('documentsChanged', this.documents);
                    }
                    return result.document;
                }
            } catch (error) {
                console.error('云端更新文档失败:', error);
            }
        }
        
        // 本地模式或云端失败
        const index = this.documents.findIndex(d => d.id === id);
        if (index !== -1) {
            this.documents[index] = {
                ...this.documents[index],
                ...data,
                updatedAt: getCurrentTimestamp()
            };
            this.saveDocuments();
            return this.documents[index];
        }
        return null;
    }
    
    async deleteDocument(id) {
        if (this.cloudSyncEnabled) {
            try {
                const response = await fetch(`${this.apiBase}/api/documents/${id}`, {
                    method: 'DELETE'
                });
                const result = await response.json();
                if (result.success) {
                    this.documents = this.documents.filter(d => d.id !== id);
                    this.emit('documentsChanged', this.documents);
                    return true;
                }
            } catch (error) {
                console.error('云端删除文档失败:', error);
            }
        }
        
        // 本地模式或云端失败
        const index = this.documents.findIndex(d => d.id === id);
        if (index !== -1) {
            this.documents.splice(index, 1);
            this.saveDocuments();
            return true;
        }
        return false;
    }
    
    getDocument(id) {
        return this.documents.find(d => d.id === id);
    }
    
    getDocumentsByProject(projectId) {
        return this.documents.filter(d => d.projectId === projectId);
    }
    
    // Document import
    async importDocuments(files, projectId) {
        try {
            const userId = this.getCurrentUserId();
            if (!userId) {
                console.error('No user logged in');
                return [];
            }
            
            const filePromises = Array.from(files).map(async (file) => {
                try {
                    const text = await readFileAsText(file);
                    return { file, text };
                } catch (error) {
                    console.error('Error reading file:', file.name, error);
                    return { file, text: '' };
                }
            });
            
            const results = await Promise.all(filePromises);
            const importedIds = [];
            
            if (this.cloudSyncEnabled) {
                // 云端模式：逐个上传到服务器
                for (const { file, text } of results) {
                    try {
                        const response = await fetch(`${this.apiBase}/api/documents`, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                                userId,
                                projectId,
                                name: file.name,
                                description: '',
                                content: text,
                                author: ''
                            })
                        });
                        const result = await response.json();
                        if (result.success) {
                            this.documents.push(result.document);
                            importedIds.push(result.document.id);
                        }
                    } catch (error) {
                        console.error('云端导入文档失败:', file.name, error);
                    }
                }
                this.emit('documentsChanged', this.documents);
            } else {
                // 本地模式
                const newDocuments = results.map(({ file, text }) => ({
                    id: generateUUID(),
                    userId: userId,
                    projectId,
                    name: file.name,
                    description: '',
                    content: text,
                    author: '',
                    entityAnnotations: [],
                    relationAnnotations: [],
                    createdAt: getCurrentDate(),
                    updatedAt: getCurrentTimestamp()
                }));
                
                this.documents.push(...newDocuments);
                this.saveDocuments();
                importedIds.push(...newDocuments.map(doc => doc.id));
            }
            
            return importedIds;
        } catch (error) {
            console.error('Error importing documents:', error);
            return [];
        }
    }
    
    // Editor state management
    setEditingDocId(id) {
        this.editingDocId = id;
        if (id) {
            const doc = this.getDocument(id);
            if (doc) {
                this.editingContent = doc.content || '';
                this.editingAuthor = doc.author || '';
            }
        } else {
            this.editingContent = '';
            this.editingAuthor = '';
        }
        this.emit('editingStateChanged', { editingDocId: id });
    }
    
    setEditingContent(content) {
        this.editingContent = content;
        this.emit('editingContentChanged', content);
    }
    
    setEditingAuthor(author) {
        this.editingAuthor = author;
        this.emit('editingAuthorChanged', author);
    }
    
    setActiveTab(tab) {
        this.activeTab = tab;
        this.emit('activeTabChanged', tab);
    }
    
    async saveEditingDocument() {
        if (this.editingDocId) {
            return await this.updateDocument(this.editingDocId, {
                content: this.editingContent,
                author: this.editingAuthor
            });
        }
        return null;
    }

    // Entity annotations
    addEntityAnnotation(docId, annotation) {
        const doc = this.getDocument(docId);
        if (!doc) return null;
        const start = Math.max(0, Math.min(annotation.start, annotation.end));
        const end = Math.max(annotation.start, annotation.end);
        if (end <= start) return null;
        const normalized = {
            start,
            end,
            label: annotation.label || '实体'
        };
        doc.entityAnnotations = Array.isArray(doc.entityAnnotations) ? doc.entityAnnotations : [];
        doc.entityAnnotations.push(normalized);
        return this.updateDocument(docId, { entityAnnotations: doc.entityAnnotations });
    }

    deleteEntityAnnotation(docId, index) {
        const doc = this.getDocument(docId);
        if (!doc || !Array.isArray(doc.entityAnnotations)) return null;
        if (index < 0 || index >= doc.entityAnnotations.length) return null;
        doc.entityAnnotations.splice(index, 1);
        return this.updateDocument(docId, { entityAnnotations: doc.entityAnnotations });
    }

    getEntityAnnotations(docId) {
        const doc = this.getDocument(docId);
        return (doc && Array.isArray(doc.entityAnnotations)) ? doc.entityAnnotations : [];
    }
    
    // Event system
    on(event, callback) {
        if (!this.listeners.has(event)) {
            this.listeners.set(event, []);
        }
        this.listeners.get(event).push(callback);
    }
    
    off(event, callback) {
        if (this.listeners.has(event)) {
            const callbacks = this.listeners.get(event);
            const index = callbacks.indexOf(callback);
            if (index > -1) {
                callbacks.splice(index, 1);
            }
        }
    }
    
    emit(event, data) {
        if (this.listeners.has(event)) {
            this.listeners.get(event).forEach(callback => {
                try {
                    callback(data);
                } catch (error) {
                    console.error('Error in event callback:', error);
                }
            });
        }
    }
    
    // 清除编辑状态
    clearEditingState() {
        this.editingDocId = null;
        this.editingContent = null;
        this.editingAuthor = null;
    }
    
    // Utility methods
    exportData() {
        return {
            projects: this.projects,
            documents: this.documents,
            exportDate: getCurrentDate()
        };
    }
    
    importData(data) {
        try {
            if (data.projects && Array.isArray(data.projects)) {
                this.projects = data.projects;
                this.saveProjects();
            }
            if (data.documents && Array.isArray(data.documents)) {
                this.documents = data.documents;
                this.saveDocuments();
            }
            return true;
        } catch (error) {
            console.error('Error importing data:', error);
            return false;
        }
    }
    
    clearAllData() {
        this.projects = [...this.defaultProjects];
        this.documents = [...this.defaultDocuments];
        this.saveProjects();
        this.saveDocuments();
        this.setEditingDocId(null);
    }
}

// Create global instance
window.dataManager = new DataManager();
