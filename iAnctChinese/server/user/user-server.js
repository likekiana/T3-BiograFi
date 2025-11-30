/**
 * 用户管理服务器 - Express 版本 (MySQL数据库)
 * 提供用户注册、登录、信息更新 API
 */
const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs'); // 添加密码加密
const db = require('./db');

const app = express();
const PORT = process.env.PORT || 5002;

// 中间件
app.use(cors());
app.use(express.json());

// 密码加密函数
async function hashPassword(password) {
    const saltRounds = 10;
    return await bcrypt.hash(password, saltRounds);
}

// 验证密码函数
async function verifyPassword(password, hash) {
    return await bcrypt.compare(password, hash);
}

// ============ API 路由 ============

// 健康检查（保持不变）
app.get('/api/health', async (req, res) => {
    try {
        await db.query('SELECT 1');
        res.json({ 
            status: 'ok', 
            service: 'User Management Server (Express + MySQL)',
            database: 'connected'
        });
    } catch (error) {
        res.status(500).json({ 
            status: 'error', 
            service: 'User Management Server',
            database: 'disconnected',
            error: error.message 
        });
    }
});

// 用户登录 - 修复密码验证
app.post('/api/login', async (req, res) => {
    try {
        const { username, password } = req.body;
        
        if (!username || !password) {
            return res.status(400).json({ 
                success: false, 
                error: '请提供用户名和密码' 
            });
        }
        
        const [users] = await db.query(
            'SELECT * FROM users WHERE username = ?',
            [username]
        );
        
        if (users.length === 0) {
            return res.status(404).json({ 
                success: false, 
                error: '用户名不存在' 
            });
        }
        
        const user = users[0];
        
        // 修复：使用bcrypt验证密码
        const isPasswordValid = await verifyPassword(password, user.password_hash);
        if (!isPasswordValid) {
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
        
        await db.query(
            'UPDATE users SET last_login = NOW() WHERE id = ?',
            [user.id]
        );
        
        const { password_hash, ...userInfo } = user;
        res.json({ success: true, user: userInfo });
        
    } catch (error) {
        console.error('登录错误:', error);
        res.status(500).json({ 
            success: false, 
            error: '服务器错误' 
        });
    }
});

// 用户注册 - 修复密码加密
app.post('/api/register', async (req, res) => {
    try {
        const { username, email, password } = req.body;
        
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
        
        // 检查用户名和邮箱
        const [existingUsers] = await db.query(
            'SELECT id FROM users WHERE username = ? OR email = ?',
            [username, email]
        );
        
        if (existingUsers.length > 0) {
            // 更精确的错误信息
            const [checkUser] = await db.query(
                'SELECT id FROM users WHERE username = ?',
                [username]
            );
            const errorMsg = checkUser.length > 0 ? '用户名已被注册' : '邮箱已被注册';
            
            return res.status(409).json({ 
                success: false, 
                error: errorMsg 
            });
        }
        
        // 修复：加密密码
        const hashedPassword = await hashPassword(password);
        
        const [result] = await db.query(
            `INSERT INTO users (username, email, password_hash, created_at, is_active) 
             VALUES (?, ?, ?, NOW(), 1)`,
            [username, email, hashedPassword]  // 使用加密后的密码
        );
        
        const [newUsers] = await db.query(
            'SELECT id, username, email, created_at, last_login, is_active FROM users WHERE id = ?',
            [result.insertId]
        );
        
        res.status(201).json({ 
            success: true, 
            user: newUsers[0] 
        });
        
    } catch (error) {
        console.error('注册错误:', error);
        res.status(500).json({ 
            success: false, 
            error: '服务器错误' 
        });
    }
});

// 更新用户信息 - 修复密码加密
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
        
        const [users] = await db.query(
            'SELECT id FROM users WHERE id = ?',
            [userId]
        );
        
        if (users.length === 0) {
            return res.status(404).json({ 
                success: false, 
                error: '用户不存在' 
            });
        }
        
        // 检查邮箱
        if (email) {
            const [existingEmails] = await db.query(
                'SELECT id FROM users WHERE email = ? AND id != ?',
                [email, userId]
            );
            
            if (existingEmails.length > 0) {
                return res.status(409).json({ 
                    success: false, 
                    error: '邮箱已被其他用户使用' 
                });
            }
        }
        
        let updateFields = [];
        let updateValues = [];
        
        if (email) {
            updateFields.push('email = ?');
            updateValues.push(email);
        }
        
        if (password) {
            if (password.length < 6) {
                return res.status(400).json({ 
                    success: false, 
                    error: '密码至少需要6个字符' 
                });
            }
            // 修复：加密新密码
            const hashedPassword = await hashPassword(password);
            updateFields.push('password_hash = ?');
            updateValues.push(hashedPassword);
        }
        
        if (updateFields.length > 0) {
            updateValues.push(userId);
            await db.query(
                `UPDATE users SET ${updateFields.join(', ')} WHERE id = ?`,
                updateValues
            );
        }
        
        const [updatedUsers] = await db.query(
            'SELECT id, username, email, created_at, last_login, is_active FROM users WHERE id = ?',
            [userId]
        );
        
        res.json({ 
            success: true, 
            user: updatedUsers[0] 
        });
        
    } catch (error) {
        console.error('更新用户信息错误:', error);
        res.status(500).json({ 
            success: false, 
            error: '服务器错误' 
        });
    }
});
// ============ 项目管理 API ============



// ============ 新增API：标注管理 ============

// 获取文档的标注
app.get('/api/documents/:documentId/annotations', async (req, res) => {
    try {
        const documentId = parseInt(req.params.documentId);
        
        const [annotations] = await db.query(
            `SELECT a.*, u.username as created_by_username 
             FROM annotations a 
             LEFT JOIN users u ON a.created_by = u.id 
             WHERE a.document_id = ? 
             ORDER BY a.start_index`,
            [documentId]
        );
        
        res.json({ success: true, annotations });
    } catch (error) {
        console.error('获取标注错误:', error);
        res.status(500).json({ success: false, error: '服务器错误' });
    }
});

// 创建标注
app.post('/api/annotations', async (req, res) => {
    try {
        const { document_id, start_index, end_index, label, confidence, created_by } = req.body;
        
        if (!document_id || start_index === undefined || end_index === undefined || !label) {
            return res.status(400).json({ success: false, error: '缺少必要参数' });
        }
        
        const [result] = await db.query(
            `INSERT INTO annotations (document_id, start_index, end_index, label, confidence, created_by, created_at) 
             VALUES (?, ?, ?, ?, ?, ?, NOW())`,
            [document_id, start_index, end_index, label, confidence || null, created_by || null]
        );
        
        const [annotations] = await db.query(
            'SELECT * FROM annotations WHERE id = ?',
            [result.insertId]
        );
        
        res.status(201).json({ success: true, annotation: annotations[0] });
    } catch (error) {
        console.error('创建标注错误:', error);
        res.status(500).json({ success: false, error: '服务器错误' });
    }
});

// ============ 新增API：分割管理 ============

// 获取文档的分割结果
app.get('/api/documents/:documentId/segmentations', async (req, res) => {
    try {
        const documentId = parseInt(req.params.documentId);
        
        const [segmentations] = await db.query(
            'SELECT * FROM segmentations WHERE document_id = ? ORDER BY created_at DESC',
            [documentId]
        );
        
        res.json({ success: true, segmentations });
    } catch (error) {
        console.error('获取分割结果错误:', error);
        res.status(500).json({ success: false, error: '服务器错误' });
    }
});

// 创建文档 - 修复版本（支持UUID projectId）
app.post('/api/documents', async (req, res) => {
    try {
        console.log('=== 收到创建文档请求 ===');
        const { userId, projectId, name, description, content, author } = req.body;
        
        console.log('请求参数:', { userId, projectId, name });
        
        // 参数验证
        if (!userId) {
            return res.status(400).json({ 
                success: false, 
                error: '缺少必要参数: userId' 
            });
        }
        
        if (!projectId) {
            return res.status(400).json({ 
                success: false, 
                error: '缺少必要参数: projectId' 
            });
        }
        
        if (!name) {
            return res.status(400).json({ 
                success: false, 
                error: '缺少必要参数: 文档名称' 
            });
        }
        
        // 根据projectId（可能是UUID或数字）查找项目
        let actualProjectId;
        let projectQuery;
        let queryParams;
        
        // 判断projectId是UUID格式还是数字格式
        if (typeof projectId === 'string' && projectId.includes('-')) {
            // UUID格式 - 通过original_id查找
            projectQuery = 'SELECT id FROM projects WHERE original_id = ?';
            queryParams = [projectId];
        } else {
            // 数字格式 - 直接使用
            projectQuery = 'SELECT id FROM projects WHERE id = ?';
            queryParams = [parseInt(projectId)];
        }
        
        console.log('执行项目查询:', projectQuery, queryParams);
        
        const [projects] = await db.query(projectQuery, queryParams);
        
        if (projects.length === 0) {
            console.log('项目不存在，projectId:', projectId);
            return res.status(404).json({ 
                success: false, 
                error: '指定的项目不存在，请先创建项目' 
            });
        }
        
        actualProjectId = projects[0].id;
        const numericUserId = parseInt(userId);
        
        console.log('找到项目，实际项目ID:', actualProjectId, '用户ID:', numericUserId);
        
        // 检查用户是否存在
        const [users] = await db.query(
            'SELECT id FROM users WHERE id = ?',
            [numericUserId]
        );
        
        if (users.length === 0) {
            return res.status(404).json({ 
                success: false, 
                error: '指定的用户不存在' 
            });
        }
        
        // 生成唯一ID
        const originalId = `doc_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        
        console.log('准备插入文档数据...');
        
        // 插入数据库
        const [result] = await db.query(
            `INSERT INTO documents (original_id, project_id, user_id, name, description, content, author, created_at, updated_at) 
             VALUES (?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
            [
                originalId, 
                actualProjectId, 
                numericUserId,
                name.trim(),
                description || '',
                content || '',
                author || ''
            ]
        );
        
        console.log('文档插入成功，ID:', result.insertId);
        
        // 获取新创建的文档
        const [documents] = await db.query(
            'SELECT * FROM documents WHERE id = ?',
            [result.insertId]
        );
        
        console.log('文档创建完成');
        
        res.status(201).json({ 
            success: true, 
            document: documents[0],
            message: '文档创建成功'
        });
        
    } catch (error) {
        console.error('创建文档错误:', error);
        res.status(500).json({ 
            success: false, 
            error: '创建文档失败: ' + error.message 
        });
    }
});

// 获取文档列表
app.get('/api/documents', async (req, res) => {
    try {
        const { userId, projectId } = req.query;
        
        if (!userId) {
            return res.status(400).json({ 
                success: false, 
                error: '缺少必要参数: userId' 
            });
        }
        
        let query = `
            SELECT d.*, p.name as project_name, u.username 
            FROM documents d 
            LEFT JOIN projects p ON d.project_id = p.id 
            LEFT JOIN users u ON d.user_id = u.id 
            WHERE d.user_id = ?
        `;
        let params = [parseInt(userId)];
        
        if (projectId) {
            query += ' AND d.project_id = ?';
            params.push(parseInt(projectId));
        }
        
        query += ' ORDER BY d.updated_at DESC';
        
        const [documents] = await db.query(query, params);
        
        res.json({ 
            success: true, 
            documents 
        });
        
    } catch (error) {
        console.error('获取文档列表错误:', error);
        res.status(500).json({ 
            success: false, 
            error: '获取文档列表失败' 
        });
    }
});

// 获取单个文档详情
app.get('/api/documents/:documentId', async (req, res) => {
    try {
        const documentId = parseInt(req.params.documentId);
        
        const [documents] = await db.query(`
            SELECT d.*, p.name as project_name, u.username 
            FROM documents d 
            LEFT JOIN projects p ON d.project_id = p.id 
            LEFT JOIN users u ON d.user_id = u.id 
            WHERE d.id = ?
        `, [documentId]);
        
        if (documents.length === 0) {
            return res.status(404).json({ 
                success: false, 
                error: '文档不存在' 
            });
        }
        
        res.json({ 
            success: true, 
            document: documents[0] 
        });
        
    } catch (error) {
        console.error('获取文档错误:', error);
        res.status(500).json({ 
            success: false, 
            error: '获取文档失败' 
        });
    }
});

// 启动服务器
app.listen(PORT, () => {
    console.log('\n' + '='.repeat(50));
    console.log('🚀🚀 用户管理服务已启动 (Express + MySQL)');
    console.log('📡📡 端口:', PORT);
    console.log('🔐🔐 密码加密: 已启用');
    console.log('🗄️🗄️  数据库:', process.env.DB_NAME || 'iannot');
    console.log('='.repeat(50));
    console.log('✅ 功能: 用户注册、登录、信息更新');
    console.log('✅ 安全: 密码加密存储');
    console.log('✅ 数据: MySQL数据库存储');
    console.log('='.repeat(50) + '\n');
});