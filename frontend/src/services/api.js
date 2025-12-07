// src/services/api.js
// API 基础服务

const USER_API_BASE = import.meta.env.VITE_USER_API_BASE || 'http://localhost:5002';
const AI_API_BASE = import.meta.env.VITE_AI_API_BASE || 'http://localhost:5004';
const SEG_API_BASE = import.meta.env.VITE_SEG_API_BASE || 'http://localhost:5001';

/**
 * 通用 API 请求函数
 * @param {string} url - 请求 URL
 * @param {Object} options - 请求选项
 * @returns {Promise} 响应数据
 */
const request = async (url, options = {}) => {
  const config = {
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    ...options,
  };

  if (config.body && typeof config.body === 'object') {
    config.body = JSON.stringify(config.body);
  }

  try {
    const response = await fetch(url, config);
    
    console.log('API 响应状态:', response.status);
    
    // 先读取响应文本，避免body stream被多次读取
    const text = await response.text();
    console.log('API 响应文本:', text.substring(0, 200) + '...');
    
    // 尝试解析JSON
    let data;
    let jsonParseError = null;
    try {
      data = JSON.parse(text);
    } catch (jsonError) {
      jsonParseError = jsonError;
      console.error('API 响应不是有效的JSON:', text);
    }
    
    if (!response.ok) {
      // 如果响应不成功，使用适当的错误信息
      if (data && (data.error || data.message)) {
        throw new Error(data.error || data.message);
      } else if (jsonParseError) {
        throw new Error(`HTTP ${response.status}: ${jsonParseError.message}`);
      } else {
        throw new Error(`HTTP ${response.status}`);
      }
    }
    
    if (jsonParseError) {
      throw new Error(`API 返回无效JSON: ${jsonParseError.message}，响应内容: ${text.substring(0, 200)}...`);
    }
    
    return data;
  } catch (error) {
    console.error('API 请求错误:', error);
    throw error;
  }
};

/**
 * 带认证的 API 请求
 * @param {string} url - 请求 URL
 * @param {Object} options - 请求选项
 * @returns {Promise} 响应数据
 */
// src/services/api.js - 完全重写 authenticatedRequest
const authenticatedRequest = async (url, options = {}) => {
  // 从本地存储获取用户信息
  let userId = null;
  let token = null;
  
  try {
    const userStr = localStorage.getItem('currentUser');
    if (userStr) {
      const user = JSON.parse(userStr);
      userId = user.id;
    }
    token = localStorage.getItem('token');
  } catch (error) {
    console.error('获取用户信息失败:', error);
  }

  // 构建 headers
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  // 添加认证头
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  // 处理 URL 和请求体
  let finalUrl = url;
  let body = options.body;

  // 如果是 GET 请求，添加 userId 到查询参数
  const isGetRequest = !options.method || options.method === 'GET';
  if (isGetRequest && userId) {
    const separator = finalUrl.includes('?') ? '&' : '?';
    finalUrl = `${finalUrl}${separator}userId=${userId}`;
  }

  // 如果是 POST/PUT/PATCH 请求，添加 userId 到请求体
  if (!isGetRequest && body && typeof body === 'object' && userId) {
    body = { ...body, userId };
  }

  console.log('API 请求:', {
    url: finalUrl,
    method: options.method || 'GET',
    hasUserId: !!userId,
    hasToken: !!token
  });

  return request(finalUrl, {
    ...options,
    headers,
    body,
  });
};

// 用户服务 API
export const userAPI = {
  async login(credentials) {
    return request(`${USER_API_BASE}/api/login`, {
      method: 'POST',
      body: credentials,
    });
  },

  async register(userData) {
    return request(`${USER_API_BASE}/api/register`, {
      method: 'POST',
      body: userData,
    });
  },

  async updateUser(userId, updates) {
    return authenticatedRequest(`${USER_API_BASE}/api/users/${userId}`, {
      method: 'PATCH',
      body: updates,
    });
  },
};

// 项目服务 API
export const projectAPI = {
  async getProjects() {
    return authenticatedRequest(`${USER_API_BASE}/api/projects`);
  },

  async createProject(projectData) {
    return authenticatedRequest(`${USER_API_BASE}/api/projects`, {
      method: 'POST',
      body: projectData,
    });
  },

  async updateProject(projectId, updates) {
    return authenticatedRequest(`${USER_API_BASE}/api/projects/${projectId}`, {
      method: 'PUT',
      body: updates,
    });
  },

  async deleteProject(projectId) {
    return authenticatedRequest(`${USER_API_BASE}/api/projects/${projectId}`, {
      method: 'DELETE',
    });
  },
};

// 文档服务 API
export const documentAPI = {
  async getDocuments(projectId = null) {
    // 不需要手动添加 userId，authenticatedRequest 会自动处理
    let url = `${USER_API_BASE}/api/documents`;
    if (projectId) {
      url += `?projectId=${projectId}`;
    }
    return authenticatedRequest(url);
  },

  async createDocument(documentData) {
    // 不需要手动检查 userId，authenticatedRequest 会自动添加
    return authenticatedRequest(`${USER_API_BASE}/api/documents`, {
      method: 'POST',
      body: documentData,
    });
  },

  async updateDocument(documentId, updates) {
    return authenticatedRequest(`${USER_API_BASE}/api/documents/${documentId}`, {
      method: 'PUT',
      body: updates,
    });
  },

  async deleteDocument(documentId) {
    return authenticatedRequest(`${USER_API_BASE}/api/documents/${documentId}`, {
      method: 'DELETE',
    });
  },

  async exportDocuments(documentIds) {
    return authenticatedRequest(`${USER_API_BASE}/api/export-documents`, {
      method: 'POST',
      body: { documentIds },
    });
  },
};

// AI 服务 API
export const aiAPI = {
  async analyzeText(text, model = 'deepseek-chat', apiType = 'deepseek') {
    return request(`${AI_API_BASE}/api/analyze`, {
      method: 'POST',
      body: { text, model, apiType },
    });
  },

  async askQuestion(text, question, model = 'deepseek-chat', apiType = 'deepseek') {
    return request(`${AI_API_BASE}/api/qa`, {
      method: 'POST',
      body: { text, question, model, apiType },
    });
  },

  async autoAnnotate(text, apiType = 'deepseek') {
    return request(`${AI_API_BASE}/api/auto-annotate`, {
      method: 'POST',
      body: { text, apiType },
    });
  },
};

// 分词服务 API
export const segmentationAPI = {
  async segmentText(text) {
    return request(`${SEG_API_BASE}/api/segment`, {
      method: 'POST',
      body: { text },
    });
  },
};

export default {
  user: userAPI,
  project: projectAPI,
  document: documentAPI,
  ai: aiAPI,
  segmentation: segmentationAPI,
  annotations: {
    async list(documentId) {
      return authenticatedRequest(`${USER_API_BASE}/api/documents/${documentId}/annotations`, {
        method: 'GET'
      });
    },
    async add(documentId, body) {
      return authenticatedRequest(`${USER_API_BASE}/api/documents/${documentId}/annotations/entity`, {
        method: 'POST',
        body
      });
    },
    async remove(documentId, annotationId) {
      return authenticatedRequest(`${USER_API_BASE}/api/documents/${documentId}/annotations/entity/${annotationId}`, {
        method: 'DELETE'
      });
    }
  }
};
