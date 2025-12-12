/**
 * 用户管理服务器 - Express + MySQL 版本
 * 提供用户注册、登录、项目管理、文档管理 API
 * 数据存储于 MySQL 数据库
 */
const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs').promises;
require('dotenv').config();
const http = require('http');
const https = require('https');
const { URL } = require('url');

// 导入模型
const UserModel = require('./models/UserModel');
const ProjectModel = require('./models/ProjectModel');
const DocumentModel = require('./models/DocumentModel');
const AnnotationModel = require('./models/AnnotationModel');
const LocationGeocodeModel = require('./models/LocationGeocodeModel');

// 数据库初始化
const { initDatabase, testConnection } = require('./config/database');

const app = express();
const PORT = process.env.PORT || 5002;

// 中间件
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

function createProxyMiddleware(targetBase) {
    const targetUrl = new URL(targetBase);
    const mod = targetUrl.protocol === 'https:' ? https : http;
    return async (req, res) => {
        if (req.method === 'OPTIONS') {
            res.status(204).end();
            return;
        }
        const url = new URL(req.path || '/', targetUrl);
        const options = {
            method: req.method,
            headers: {
                ...req.headers,
                host: targetUrl.host,
                'accept-encoding': 'identity',
                'connection': 'close'
            }
        };
        const proxyReq = mod.request(url, options, (proxyRes) => {
            const chunks = [];
            proxyRes.on('data', (chunk) => chunks.push(chunk));
            proxyRes.on('end', () => {
                const buf = Buffer.concat(chunks);
                res.status(proxyRes.statusCode || 500);
                const ct = proxyRes.headers['content-type'] || 'application/json';
                res.setHeader('content-type', ct);
                res.send(buf);
            });
        });
        proxyReq.on('error', (err) => {
            console.error('Proxy error:', err.message);
            res.status(502).json({ success: false, error: '网关错误' });
        });
        if (req.body && typeof req.body === 'object') {
            const bodyStr = JSON.stringify(req.body);
            proxyReq.setHeader('content-type', 'application/json');
            proxyReq.setHeader('content-length', Buffer.byteLength(bodyStr));
            proxyReq.write(bodyStr);
        }
        proxyReq.end();
    };
}

const AI_TARGET = process.env.AI_API_BASE || 'http://localhost:5004';
const SEG_TARGET = process.env.SEG_API_BASE || 'http://localhost:5001';
app.use('/ai', createProxyMiddleware(AI_TARGET));
app.use('/seg', createProxyMiddleware(SEG_TARGET));

// 获取当前时间戳
function getTimestamp() {
    return new Date().toISOString().slice(0, 19).replace('T', ' ');
}

// ============ API 路由 ============

// 健康检查
app.get('/api/health', async (req, res) => {
    const dbStatus = await testConnection();
    res.json({ 
        status: 'ok', 
        service: 'User Management Server (Express + MySQL)',
        database: dbStatus ? 'connected' : 'disconnected',
        timestamp: new Date().toISOString()
    });
});

// 用户登录
app.post('/api/login', async (req, res) => {
    try {
        const { username, password } = req.body;
        
        console.log('登录请求:', { username, password: '***' });
        
        if (!username || !password) {
            return res.status(400).json({ 
                success: false, 
                error: '请提供用户名和密码' 
            });
        }
        
        const user = await UserModel.findByUsername(username);
        
        if (!user) {
            return res.status(404).json({ 
                success: false, 
                error: '用户名不存在' 
            });
        }
        
        if (user.password !== password) {
            return res.status(401).json({ 
                success: false, 
                error: '密码错误' 
            });
        }
        
        if (!user.is_active) {
            return res.status(403).json({ 
                success: false, 
                error: '账号已被禁用' 
            });
        }
        
        // 更新最后登录时间
        await UserModel.updateLastLogin(user.id);
        
        // 返回用户信息（不含密码）
        const { password: _, ...userInfo } = user;
        
        console.log('登录成功:', userInfo.username);
        res.json({ success: true, user: userInfo });
        
    } catch (error) {
        console.error('登录错误:', error);
        res.status(500).json({ 
            success: false, 
            error: '服务器错误' 
        });
    }
});

// 用户注册
app.post('/api/register', async (req, res) => {
    try {
        const { username, email, password } = req.body;
        
        console.log('注册请求:', { username, email, password: '***' });
        
        // 验证输入
        if (!username || username.length < 3 || username.length > 20) {
            return res.status(400).json({ 
                success: false, 
                error: '用户名长度应在3-20个字符之间' 
            });
        }
        
        if (!email || !email.includes('@')) {
            return res.status(400).json({ 
                success: false, 
                error: '请提供有效的邮箱地址' 
            });
        }
        
        if (!password || password.length < 6) {
            return res.status(400).json({ 
                success: false, 
                error: '密码至少需要6个字符' 
            });
        }
        
        // 检查用户名是否已存在
        const existingUser = await UserModel.findByUsername(username);
        if (existingUser) {
            return res.status(409).json({ 
                success: false, 
                error: '用户名已被注册' 
            });
        }
        
        // 检查邮箱是否已存在
        const emailExists = await UserModel.isEmailExists(email);
        if (emailExists) {
            return res.status(409).json({ 
                success: false, 
                error: '邮箱已被注册' 
            });
        }
        
        // 创建新用户
        const userId = await UserModel.create({
            username,
            email,
            password
        });
        
        // 获取新创建的用户信息
        const newUser = await UserModel.findById(userId);
        
        console.log('注册成功:', newUser.username);
        res.status(201).json({ 
            success: true, 
            user: newUser 
        });
        
    } catch (error) {
        console.error('注册错误:', error);
        res.status(500).json({ 
            success: false, 
            error: '服务器错误' 
        });
    }
});

// 更新用户信息（支持 username/email/password）
app.patch('/api/users/:userId', async (req, res) => {
    try {
        const userId = parseInt(req.params.userId);
        const { username, email, password } = req.body;

        console.log(`PATCH /api/users/${userId} body:`, req.body);

        if (!username && !email && !password) {
            return res.status(400).json({
                success: false,
                error: '没有需要更新的信息'
            });
        }

        const user = await UserModel.findById(userId);

        if (!user) {
            return res.status(404).json({
                success: false,
                error: '用户不存在'
            });
        }

        // 检查用户名是否被其他用户使用
        if (username && username !== user.username) {
            const nameExists = await UserModel.isUsernameExists(username, userId);
            if (nameExists) {
                return res.status(409).json({ success: false, error: '用户名已被其他用户使用' });
            }
        }

        // 检查邮箱是否被其他用户使用
        if (email && email !== user.email) {
            const emailExists = await UserModel.isEmailExists(email, userId);
            if (emailExists) {
                return res.status(409).json({ success: false, error: '邮箱已被其他用户使用' });
            }
        }

        // 密码长度校验（若提供）
        if (password && password.length < 6) {
            return res.status(400).json({ success: false, error: '密码至少需要6个字符' });
        }

        const updates = {};
        if (username) updates.username = username;
        if (email) updates.email = email;
        if (password) updates.password = password;

        const updateResult = await UserModel.update(userId, updates);
        console.log(`UserModel.update result for user ${userId}:`, updateResult);

        // updateResult may be the full result object from mysql2
        const affected = updateResult && (updateResult.affectedRows || updateResult.affectedRows === 0 ? updateResult.affectedRows : null);
        console.log(`更新影响的行数: ${affected}`);

        if (affected === null) {
            // unexpected result shape, still try to fetch user and return
            const updatedUser = await UserModel.findById(userId);
            console.log('返回给前端的 updatedUser (no affectedRows):', updatedUser);
            return res.json({ success: true, user: updatedUser });
        }

        if (affected > 0) {
            const updatedUser = await UserModel.findById(userId);
            console.log('返回给前端的 updatedUser:', updatedUser);
            return res.json({ success: true, user: updatedUser });
        }

        // affected === 0 -> no rows changed (可能因为值无变化)
        console.warn('更新操作未修改任何行（可能新值与旧值相同）', { userId, updates });
        const currentUser = await UserModel.findById(userId);
        return res.json({ success: true, user: currentUser, message: '未检测到变更（可能新值与旧值相同）' });

    } catch (error) {
        console.error('更新用户信息错误:', error);
        res.status(500).json({ success: false, error: '服务器错误' });
    }
});

// 获取所有用户
app.get('/api/users', async (req, res) => {
    try {
        const users = await UserModel.findAll();
        res.json({ success: true, users });
        
    } catch (error) {
        console.error('获取用户列表错误:', error);
        res.status(500).json({ 
            success: false, 
            error: '服务器错误' 
        });
    }
});

// 获取用户详情
app.get('/api/users/:userId', async (req, res) => {
    try {
        const userId = parseInt(req.params.userId);
        const user = await UserModel.findById(userId);
        
        if (!user) {
            return res.status(404).json({ 
                success: false, 
                error: '用户不存在' 
            });
        }
        
        res.json({ success: true, user });
        
    } catch (error) {
        console.error('获取用户详情错误:', error);
        res.status(500).json({ 
            success: false, 
            error: '服务器错误' 
        });
    }
});

// PUT /api/users/:userId/settings
app.put('/api/users/:userId/settings', async (req, res) => {
  try {
    const userId = parseInt(req.params.userId);
    const settings = req.body.settings || {};
    const ok = await UserModel.updateSettings(userId, settings);
    if (!ok) {
      return res.status(404).json({ success: false, error: '用户不存在或未更新' });
    }
    const updated = await UserModel.findById(userId);
    res.json({ success: true, user: updated });
  } catch (e) {
    console.error('更新设置错误:', e);
    res.status(500).json({ success: false, error: '服务器错误' });
  }
});

// POST /api/users/:userId/change-password
app.post('/api/users/:userId/change-password', async (req, res) => {
    try {
        const userId = parseInt(req.params.userId);
        // 简单请求者校验：要求请求头中包含发起者的用户ID，且必须与路径参数一致
        const requesterIdHeader = req.headers['x-user-id'] || req.headers['X-User-Id'];
        const requesterId = requesterIdHeader ? parseInt(requesterIdHeader) : null;
        if (!requesterId || requesterId !== userId) {
            return res.status(403).json({ success: false, error: '无权限修改此用户的密码' });
        }
        const { currentPassword, newPassword } = req.body;
        if (!currentPassword || !newPassword) {
            return res.status(400).json({ success: false, error: '需要提供当前密码与新密码' });
        }
        if (newPassword.length < 6) {
            return res.status(400).json({ success: false, error: '新密码长度至少6位' });
        }

        const result = await UserModel.changePassword(userId, currentPassword, newPassword);
        if (!result.success) {
            return res.status(400).json({ success: false, error: result.error || '修改失败' });
        }
        res.json({ success: true });
    } catch (e) {
        console.error('change-password error:', e);
        res.status(500).json({ success: false, error: '服务器错误' });
    }
});
// ============ 项目管理 API ============

// 获取用户的所有项目
app.get('/api/projects', async (req, res) => {
    try {
        const userId = parseInt(req.query.userId);
        if (!userId) {
            return res.json({ success: true, projects: [] });
        }
        const projects = await ProjectModel.findByUserId(userId);
        res.json({ success: true, projects });
    } catch (error) {
        console.error('获取项目列表错误:', error);
        res.status(500).json({ success: false, error: '服务器错误' });
    }
});

// 获取项目详情
app.get('/api/projects/:projectId', async (req, res) => {
    try {
        const { projectId } = req.params;
        const project = await ProjectModel.findById(projectId);
        
        if (!project) {
            return res.status(404).json({ success: false, error: '项目不存在' });
        }
        
        res.json({ success: true, project });
    } catch (error) {
        console.error('获取项目详情错误:', error);
        res.status(500).json({ success: false, error: '服务器错误' });
    }
});

// 创建项目
app.post('/api/projects', async (req, res) => {
    try {
        const { userId, name, description } = req.body;
        
        if (!userId || !name) {
            return res.status(400).json({ success: false, error: '缺少必要参数' });
        }
        
        // 生成项目ID
        const projectId = Date.now().toString() + Math.random().toString(36).substr(2, 9);
        
        const projectData = {
            id: projectId,
            userId,
            name,
            description: description || ''
        };
        
        await ProjectModel.create(projectData);
        
        const newProject = await ProjectModel.findById(projectId);
        
        res.status(201).json({ success: true, project: newProject });
    } catch (error) {
        console.error('创建项目错误:', error);
        res.status(500).json({ success: false, error: '服务器错误' });
    }
});

// 更新项目
app.put('/api/projects/:projectId', async (req, res) => {
    try {
        const { projectId } = req.params;
        const { name, description } = req.body;
        
        const project = await ProjectModel.findById(projectId);
        
        if (!project) {
            return res.status(404).json({ success: false, error: '项目不存在' });
        }
        
        const updates = {};
        if (name) updates.name = name;
        if (description !== undefined) updates.description = description;
        
        await ProjectModel.update(projectId, updates);
        
        const updatedProject = await ProjectModel.findById(projectId);
        
        res.json({ success: true, project: updatedProject });
    } catch (error) {
        console.error('更新项目错误:', error);
        res.status(500).json({ success: false, error: '服务器错误' });
    }
});

// 删除项目
app.delete('/api/projects/:projectId', async (req, res) => {
    try {
        const { projectId } = req.params;
        
        const project = await ProjectModel.findById(projectId);
        
        if (!project) {
            return res.status(404).json({ success: false, error: '项目不存在' });
        }
        
        await ProjectModel.delete(projectId);
        
        res.json({ success: true });
    } catch (error) {
        console.error('删除项目错误:', error);
        res.status(500).json({ success: false, error: '服务器错误' });
    }
});

// ============ 文档管理 API ============

// 获取用户的所有文档
app.get('/api/documents', async (req, res) => {
    try {
        const userId = parseInt(req.query.userId);
        const projectId = req.query.projectId;
        
        if (!userId) {
            return res.json({ success: true, documents: [] });
        }
        
        const documents = await DocumentModel.findByUserId(userId, projectId);
        res.json({ success: true, documents });
    } catch (error) {
        console.error('获取文档列表错误:', error);
        res.status(500).json({ success: false, error: '服务器错误' });
    }
});

// 获取文档详情
app.get('/api/documents/:documentId', async (req, res) => {
    try {
        const { documentId } = req.params;
        const document = await DocumentModel.findById(documentId);
        
        if (!document) {
            return res.status(404).json({ success: false, error: '文档不存在' });
        }
        
        res.json({ success: true, document });
    } catch (error) {
        console.error('获取文档详情错误:', error);
        res.status(500).json({ success: false, error: '服务器错误' });
    }
});

// 创建文档
app.post('/api/documents', async (req, res) => {
    try {
        const { userId, projectId, name, description, content, author } = req.body;
        
        console.log('创建文档请求:', { userId, projectId, name });
        
        if (!userId || !projectId || !name) {
            return res.status(400).json({ 
                success: false, 
                error: '缺少必要参数: userId, projectId, name 都是必需的' 
            });
        }
        
        // 生成文档ID
        const documentId = Date.now().toString() + Math.random().toString(36).substr(2, 9);
        
        const documentData = {
            id: documentId,
            userId,
            projectId,
            name,
            description: description || '',
            content: content || '',
            author: author || ''
        };
        
        await DocumentModel.create(documentData);
        
        const newDocument = await DocumentModel.findById(documentId);
        
        res.status(201).json({ success: true, document: newDocument });
    } catch (error) {
        console.error('创建文档错误:', error);
        res.status(500).json({ success: false, error: '服务器错误' });
    }
});

// 更新文档
app.put('/api/documents/:documentId', async (req, res) => {
    try {
        const { documentId } = req.params;
        const updates = req.body;
        
        const document = await DocumentModel.findById(documentId);
        
        if (!document) {
            return res.status(404).json({ success: false, error: '文档不存在' });
        }
        
        // 确保更新时间戳
        updates.updatedAt = getTimestamp();
        
        await DocumentModel.update(documentId, updates);
        
        const updatedDocument = await DocumentModel.findById(documentId);
        
        res.json({ success: true, document: updatedDocument });
    } catch (error) {
        console.error('更新文档错误:', error);
        res.status(500).json({ success: false, error: '服务器错误' });
    }
});

// ============ 文档标注 API ============

// 获取文档的实体标注列表
app.get('/api/documents/:documentId/annotations', async (req, res) => {
    try {
        const { documentId } = req.params;
        const annotations = await AnnotationModel.listEntities(documentId);
        res.json({ success: true, annotations });
    } catch (error) {
        console.error('获取实体标注错误:', error);
        res.json({ success: true, annotations: [] });
    }
});

// 获取文档的关系标注列表
app.get('/api/documents/:documentId/relations', async (req, res) => {
    try {
        const { documentId } = req.params;
        const document = await DocumentModel.findById(documentId);
        if (!document) {
            return res.status(404).json({ success: false, error: '文档不存在' });
        }
        
        // 从文档的relationAnnotations字段获取关系标注
        const relations = document.relationAnnotations || [];
        res.json({ success: true, relations });
    } catch (error) {
        console.error('获取关系标注错误:', error);
        res.json({ success: true, relations: [] });
    }
});

// 添加实体标注
app.post('/api/documents/:documentId/annotations/entity', async (req, res) => {
    try {
        const { documentId } = req.params;
        const { start, end, label, text } = req.body;

        if (typeof start !== 'number' || typeof end !== 'number' || !label) {
            return res.status(400).json({ success: false, error: '缺少必要参数' });
        }

        const entity = await AnnotationModel.addEntity(documentId, { start, end, label, text });
        res.status(201).json({ success: true, annotation: entity });
    } catch (error) {
        console.error('添加实体标注错误:', error);
        res.status(500).json({ success: false, error: '服务器错误' });
    }
});

// 批量添加实体标注
app.post('/api/documents/:documentId/annotations/entity/bulk', async (req, res) => {
    try {
        const { documentId } = req.params;
        const { annotations } = req.body;

        if (!Array.isArray(annotations) || annotations.length === 0) {
            return res.status(400).json({ success: false, error: '缺少必要参数：annotations 必须是一个非空数组' });
        }

        // 验证每个标注项
        for (const ann of annotations) {
            if (typeof ann.start !== 'number' || typeof ann.end !== 'number' || !ann.label) {
                return res.status(400).json({ success: false, error: '标注项缺少必要参数：start, end, label 都是必需的' });
            }
        }

        const entities = await AnnotationModel.addEntitiesBulk(documentId, annotations);
        res.status(201).json({ success: true, annotations: entities });
    } catch (error) {
        console.error('批量添加实体标注错误:', error);
        res.status(500).json({ success: false, error: '服务器错误' });
    }
});

// 删除实体标注
app.delete('/api/documents/:documentId/annotations/entity/:annotationId', async (req, res) => {
    try {
        const { documentId, annotationId } = req.params;
        const ok = await AnnotationModel.deleteEntity(documentId, parseInt(annotationId));
        if (!ok) {
            return res.status(404).json({ success: false, error: '标注不存在' });
        }
        res.json({ success: true });
    } catch (error) {
        console.error('删除实体标注错误:', error);
        res.status(500).json({ success: false, error: '服务器错误' });
    }
});

// 搜索实体标注
app.get('/api/annotations/search', async (req, res) => {
    try {
        const { documentId, label, text } = req.query;

        if (!documentId) {
            return res.status(400).json({ success: false, error: '缺少必要参数：documentId 是必需的' });
        }

        const annotations = await AnnotationModel.searchEntities(documentId, { label, text });
        res.json({ success: true, annotations });
    } catch (error) {
        console.error('搜索实体标注错误:', error);
        res.status(500).json({ success: false, error: '服务器错误' });
    }
});

// 根据标签统计实体标注数量
app.get('/api/documents/:documentId/annotations/count', async (req, res) => {
    try {
        const { documentId } = req.params;

        const counts = await AnnotationModel.countEntitiesByLabel(documentId);
        res.json({ success: true, labelCounts: counts });
    } catch (error) {
        console.error('统计实体标注数量错误:', error);
        res.status(500).json({ success: false, error: '服务器错误' });
    }
});

// 删除文档
app.delete('/api/documents/:documentId', async (req, res) => {
    try {
        const { documentId } = req.params;
        
        const document = await DocumentModel.findById(documentId);
        
        if (!document) {
            return res.status(404).json({ success: false, error: '文档不存在' });
        }
        
        await DocumentModel.delete(documentId);
        
        res.json({ success: true });
    } catch (error) {
        console.error('删除文档错误:', error);
        res.status(500).json({ success: false, error: '服务器错误' });
    }
});

// 文档搜索
app.get('/api/documents/search', async (req, res) => {
    try {
        const userId = parseInt(req.query.userId);
        const query = req.query.query;
        const projectId = req.query.projectId;
        
        if (!userId || !query) {
            return res.status(400).json({ 
                success: false, 
                error: '缺少必要参数：userId 和 query 都是必需的' 
            });
        }
        
        const documents = await DocumentModel.searchDocuments(userId, query, projectId);
        res.json({ success: true, documents });
    } catch (error) {
        console.error('搜索文档错误:', error);
        res.status(500).json({ success: false, error: '服务器错误' });
    }
});

// ============ 可视化分析 API ============

// 获取可视化总览统计
app.get('/api/visualization/overview', async (req, res) => {
    try {
        const { documentId } = req.query;
        
        if (!documentId) {
            return res.status(400).json({ 
                success: false, 
                error: '缺少必要参数：documentId 是必需的' 
            });
        }
        
        // 获取文档内容
        const document = await DocumentModel.findById(documentId);
        if (!document) {
            return res.status(404).json({ success: false, error: '文档不存在' });
        }
        
        // 计算总字符数
        const totalChars = document.content ? document.content.length : 0;
        
        // 获取标签统计
        const labelCounts = await AnnotationModel.countEntitiesByLabel(documentId);
        
        res.json({ 
            success: true, 
            data: {
                totalChars,
                labelCounts
            }
        });
    } catch (error) {
        console.error('获取可视化总览统计错误:', error);
        res.status(500).json({ success: false, error: '服务器错误' });
    }
});

// 获取地点可视化数据
app.get('/api/visualization/locations', async (req, res) => {
    try {
        const { documentId } = req.query;
        
        if (!documentId) {
            return res.status(400).json({ 
                success: false, 
                error: '缺少必要参数：documentId 是必需的' 
            });
        }
        
        // 获取所有实体标注
        const annotations = await AnnotationModel.searchEntities(documentId, { label: '地名' });
        
        // 这里可以添加更多的处理逻辑，比如获取地名的坐标信息等
        // 暂时只返回地名标注
        res.json({ 
            success: true, 
            data: {
                locations: annotations
            }
        });
    } catch (error) {
        console.error('获取地点可视化数据错误:', error);
        res.status(500).json({ success: false, error: '服务器错误' });
    }
});

// 获取人物关系图数据
app.get('/api/visualization/relationships', async (req, res) => {
    try {
        const { documentId } = req.query;
        
        if (!documentId) {
            return res.status(400).json({ 
                success: false, 
                error: '缺少必要参数：documentId 是必需的' 
            });
        }
        
        // 获取所有人物实体标注
        const personAnnotations = await AnnotationModel.searchEntities(documentId, { label: '人物' });
        
        // 这里可以添加更多的处理逻辑，比如分析人物之间的关系等
        // 暂时只返回人物标注
        res.json({ 
            success: true, 
            data: {
                relationships: personAnnotations
            }
        });
    } catch (error) {
        console.error('获取人物关系图数据错误:', error);
        res.status(500).json({ success: false, error: '服务器错误' });
    }
});

// 获取时间轴数据
app.get('/api/visualization/timeline', async (req, res) => {
    try {
        const { documentId } = req.query;
        
        if (!documentId) {
            return res.status(400).json({ 
                success: false, 
                error: '缺少必要参数：documentId 是必需的' 
            });
        }
        
        // 获取所有时间实体标注
        const timeAnnotations = await AnnotationModel.searchEntities(documentId, { label: '时间' });
        
        // 这里可以添加更多的处理逻辑，比如排序等
        // 暂时只返回时间标注
        res.json({ 
            success: true, 
            data: {
                timeline: timeAnnotations
            }
        });
    } catch (error) {
        console.error('获取时间轴数据错误:', error);
        res.status(500).json({ success: false, error: '服务器错误' });
    }
});

// ============ 地名坐标缓存管理 API ============

// 查询地名坐标缓存
app.get('/api/visualization/locations/cache', async (req, res) => {
    try {
        const { name } = req.query;
        
        if (!name) {
            return res.status(400).json({ 
                success: false, 
                error: '缺少必要参数：name 是必需的' 
            });
        }
        
        const location = await LocationGeocodeModel.findByName(name);
        res.json({ 
            success: true, 
            data: location 
        });
    } catch (error) {
        console.error('查询地名坐标缓存错误:', error);
        res.status(500).json({ success: false, error: '服务器错误' });
    }
});

// 更新地名坐标缓存
app.post('/api/visualization/locations/cache', async (req, res) => {
    try {
        const { name, lng, lat, matchedName, confidence } = req.body;
        
        if (!name || typeof lng !== 'number' || typeof lat !== 'number') {
            return res.status(400).json({ 
                success: false, 
                error: '缺少必要参数：name, lng, lat 都是必需的' 
            });
        }
        
        await LocationGeocodeModel.upsertLocation(name, { 
            lng, 
            lat, 
            matchedName, 
            confidence 
        });
        
        res.json({ success: true, message: '地名坐标缓存已更新' });
    } catch (error) {
        console.error('更新地名坐标缓存错误:', error);
        res.status(500).json({ success: false, error: '服务器错误' });
    }
});

// ============ 导出管理 API ============

// 导出选中的文档与标注
app.post('/api/export-documents', async (req, res) => {
    try {
        const { documentIds } = req.body;
        
        if (!documentIds || !Array.isArray(documentIds) || documentIds.length === 0) {
            return res.status(400).json({ success: false, error: '请提供要导出的文档ID列表' });
        }
        
        const documents = [];
        for (const docId of documentIds) {
            const doc = await DocumentModel.findById(docId);
            if (doc) {
                documents.push(doc);
            }
        }
        
        if (documents.length === 0) {
            return res.status(404).json({ success: false, error: '未找到指定的文档' });
        }
        
        // 导出文件夹路径
        const exportDir = path.join(__dirname, '..', '..', '..', 'exported_data');
        
        // 确保导出文件夹存在
        try {
            await fs.access(exportDir);
        } catch {
            await fs.mkdir(exportDir, { recursive: true });
        }
        
        const exportTime = getTimestamp();
        const exportedFiles = [];
        
        // 为每个文档生成txt和csv文件
        for (const doc of documents) {
            // 生成txt文件
            const txtContent = `文档名称: ${doc.name}
文档描述: ${doc.description || '无'}
创建时间: ${doc.created_at}
更新时间: ${doc.updated_at}
导出时间: ${exportTime}

文档内容（古文原文）:
${doc.content || ''}`;
            
            const txtFileName = `${doc.name.replace(/\.(txt|md)$/i, '')}.txt`;
            const txtFilePath = path.join(exportDir, txtFileName);
            await fs.writeFile(txtFilePath, txtContent, 'utf-8');
            exportedFiles.push(txtFileName);
            
            // 生成csv文件
            const csvLines = ['number,label,Instance'];
            
            // 注意：这里需要从数据库查询实体标注
            // 暂时使用文档中的 entityAnnotations 字段（如果存在）
            const annotations = doc.entityAnnotations || [];
            
            annotations.forEach((ann, index) => {
                const number = index + 1;
                const label = ann.label || '';
                const instance = doc.content ? doc.content.slice(ann.start, ann.end) : '';
                // CSV格式：如果字段包含逗号或引号，需要用引号包裹
                const escapedInstance = instance.includes(',') || instance.includes('"') 
                    ? `"${instance.replace(/"/g, '""')}"` 
                    : instance;
                csvLines.push(`${number},${label},${escapedInstance}`);
            });
            
            const csvContent = csvLines.join('\n');
            const csvFileName = `${doc.name.replace(/\.(txt|md)$/i, '')}+实体标注.csv`;
            const csvFilePath = path.join(exportDir, csvFileName);
            await fs.writeFile(csvFilePath, csvContent, 'utf-8');
            exportedFiles.push(csvFileName);
        }
        
        res.json({ 
            success: true, 
            message: `成功导出 ${documents.length} 个文档`,
            exportedFiles,
            exportCount: documents.length
        });
        
    } catch (error) {
        console.error('导出文档错误:', error);
        res.status(500).json({ success: false, error: '服务器错误: ' + error.message });
    }
});

// ============ 错误处理中间件 ============

// 404 处理
app.use('*', (req, res) => {
    res.status(404).json({
        success: false,
        error: `路由 ${req.originalUrl} 不存在`
    });
});

// 全局错误处理
app.use((error, req, res, next) => {
    console.error('未处理的错误:', error);
    res.status(500).json({
        success: false,
        error: '服务器内部错误'
    });
});

// ============ 服务器启动 ============

// 启动服务器
async function startServer() {
    try {
        // 初始化数据库连接
        console.log('🔄 初始化数据库连接...');
        await initDatabase();
        
        // 启动服务器
        app.listen(PORT, () => {
            console.log('\n' + '='.repeat(60));
            console.log('🚀 用户管理服务已启动 (Express + MySQL)');
            console.log('📡 端口:', PORT);
            console.log('🗄️  数据库: MySQL');
            console.log('📁 环境:', process.env.NODE_ENV || 'development');
            console.log('='.repeat(60));
            console.log('✅ 默认测试账号: zontiks / 123456');
            console.log('✅ 功能: 用户注册、登录、项目管理、文档管理');
            console.log('✅ 数据: MySQL 数据库存储');
            console.log('='.repeat(60) + '\n');
        });
    } catch (error) {
        console.error('❌ 服务器启动失败:', error);
        process.exit(1);
    }
}

// 优雅关闭
process.on('SIGINT', async () => {
    console.log('\n🛑 正在关闭服务器...');
    process.exit(0);
});

process.on('SIGTERM', async () => {
    console.log('\n🛑 收到终止信号，正在关闭服务器...');
    process.exit(0);
});

// 启动服务器
startServer().catch(console.error);
