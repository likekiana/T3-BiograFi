// src/services/api.js
// API 基础服务

const USER_API_BASE = import.meta.env.VITE_USER_API_BASE || 'http://localhost:5002';
const AI_API_BASE = import.meta.env.VITE_AI_API_BASE || `${USER_API_BASE}/ai`;
const SEG_API_BASE = import.meta.env.VITE_SEG_API_BASE || `${USER_API_BASE}/seg`;

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
    
    // 首先检查响应状态
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`HTTP ${response.status}: ${errorText}`);
    }
    
    // 尝试解析JSON，如果失败则返回文本
    const responseText = await response.text();
    let data;
    
    try {
      data = JSON.parse(responseText);
    } catch (parseError) {
      console.warn('响应不是有效的JSON，尝试提取JSON部分:', parseError);
      // 对于自动标注，可能返回的是纯文本或其他格式
      // 尝试提取JSON部分（如果响应包含JSON以外的内容）
      const jsonMatch = responseText.match(/\{.*\}|\[.*\]/s);
      if (jsonMatch) {
        try {
          data = JSON.parse(jsonMatch[0]);
        } catch (innerError) {
          // 如果还是失败，抛出有意义的错误
          throw new Error(`AI返回的格式无法解析: ${innerError.message}. 响应前100字符: ${responseText.substring(0, 100)}...`);
        }
      } else {
        throw new Error(`AI返回的格式不是JSON. 响应前100字符: ${responseText.substring(0, 100)}...`);
      }
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
    let url = `${USER_API_BASE}/api/documents`;
    if (projectId) {
      url += `?projectId=${projectId}`;
    }
    return authenticatedRequest(url);
  },

  async createDocument(documentData) {
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
  async analyzeText(text, model = 'xunzi-qwen2') {
    return request(`${AI_API_BASE}/api/analyze`, {
      method: 'POST',
      body: { text, model },
    });
  },

  async askQuestion(text, question, model = 'xunzi-qwen2') {
    return request(`${AI_API_BASE}/api/qa`, {
      method: 'POST',
      body: { text, question, model },
    });
  },

  async autoAnnotate(text, model = 'xunzi-qwen2') {
    return request(`${AI_API_BASE}/api/auto-annotate`, {
      method: 'POST',
      body: { text, model },
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