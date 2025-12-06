const { pool } = require('../config/database');

class DocumentModel {
    // 获取用户的所有文档
    static async findByUserId(userId, projectId = null) {
        let query = 'SELECT * FROM documents WHERE user_id = ?';
        const params = [userId];
        
        if (projectId) {
            query += ' AND project_id = ?';
            params.push(projectId);
        }
        
        query += ' ORDER BY created_at DESC';
        
        const [rows] = await pool.execute(query, params);
        return rows;
    }

    // 通过ID查找文档
    static async findById(id) {
        const [rows] = await pool.execute(
            'SELECT * FROM documents WHERE id = ?',
            [id]
        );
        return rows[0];
    }

    // 创建文档
    static async create(documentData) {
        const { id, userId, projectId, name, description, content, author } = documentData;
        const now = new Date().toISOString().slice(0, 19).replace('T', ' ');
        
        const [result] = await pool.execute(
            'INSERT INTO documents (id, user_id, project_id, name, description, content, author, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
            [id, userId, projectId, name, description, content, author, now, now]
        );
        
        return result.insertId;
    }

    // 更新文档
    static async update(id, updates) {
        const allowedFields = ['name', 'description', 'content', 'author', 'entityAnnotations', 'relationAnnotations'];
        const setClauses = [];
        const values = [];
        
        allowedFields.forEach(field => {
            if (updates[field] !== undefined) {
                setClauses.push(`${field} = ?`);
                let v = updates[field];
                if ((field === 'entityAnnotations' || field === 'relationAnnotations')) {
                    if (typeof v !== 'string') {
                        v = JSON.stringify(v || []);
                    }
                }
                values.push(v);
            }
        });
        
        if (setClauses.length === 0) {
            return false;
        }
        
        setClauses.push('updated_at = ?');
        values.push(new Date().toISOString().slice(0, 19).replace('T', ' '));
        values.push(id);
        
        const [result] = await pool.execute(
            `UPDATE documents SET ${setClauses.join(', ')} WHERE id = ?`,
            values
        );
        
        return result.affectedRows > 0;
    }

    // 删除文档
    static async delete(id) {
        const [result] = await pool.execute(
            'DELETE FROM documents WHERE id = ?',
            [id]
        );
        return result.affectedRows > 0;
    }

    // 搜索文档
    static async searchDocuments(userId, query, projectId = null) {
        let searchQuery = `SELECT * FROM documents WHERE user_id = ? AND (name LIKE ? OR content LIKE ? OR description LIKE ?)`;
        const params = [userId, `%${query}%`, `%${query}%`, `%${query}%`];
        
        if (projectId) {
            searchQuery += ' AND project_id = ?';
            params.push(projectId);
        }
        
        searchQuery += ' ORDER BY created_at DESC';
        
        const [rows] = await pool.execute(searchQuery, params);
        return rows;
    }
}

module.exports = DocumentModel;
