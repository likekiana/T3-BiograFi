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

// 更新用户信息
app.patch('/api/users/:userId', async (req, res) => {
    try {
        const userId = parseInt(req.params.userId);
        const { email, password } = req.body;
        
        if (!email && !password) {
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
        
        // 检查邮箱是否被其他用户使用
        if (email) {
            const emailExists = await UserModel.isEmailExists(email, userId);
            if (emailExists) {
                return res.status(409).json({ 
                    success: false, 
                    error: '邮箱已被其他用户使用' 
                });
            }
        }
        
        // 更新用户信息
        const updates = {};
        if (email) updates.email = email;
        if (password) {
            if (password.length < 6) {
                return res.status(400).json({ 
                    success: false, 
                    error: '密码至少需要6个字符' 
                });
            }
            updates.password = password;
        }
        
        const updated = await UserModel.update(userId, updates);
        
        if (updated) {
            // 返回更新后的用户信息
            const updatedUser = await UserModel.findById(userId);
            res.json({ 
                success: true, 
                user: updatedUser 
            });
        } else {
            res.status(500).json({ 
                success: false, 
                error: '更新用户信息失败' 
            });
        }
        
    } catch (error) {
        console.error('更新用户信息错误:', error);
        res.status(500).json({ 
            success: false, 
            error: '服务器错误' 
        });
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

// 添加实体标注
app.post('/api/documents/:documentId/annotations', async (req, res) => {
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

// 删除实体标注
app.delete('/api/documents/:documentId/annotations/:annotationId', async (req, res) => {
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
