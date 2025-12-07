const { pool } = require('../config/database');

class ProjectModel {
    // 获取用户的所有项目
    static async findByUserId(userId) {
        const [rows] = await pool.execute(
            'SELECT * FROM projects WHERE user_id = ? ORDER BY created_at DESC',
            [userId]
        );
        return rows;
    }

    // 通过ID查找项目
    static async findById(id) {
        const [rows] = await pool.execute(
            'SELECT * FROM projects WHERE id = ?',
            [id]
        );
        return rows[0];
    }

    // 创建项目
    static async create(projectData) {
        const { id, userId, name, description } = projectData;
        const now = new Date().toISOString().slice(0, 19).replace('T', ' ');
        
        const [result] = await pool.execute(
            'INSERT INTO projects (id, user_id, name, description, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)',
            [id, userId, name, description, now, now]
        );
        
        return result.insertId;
    }

    // 更新项目
    static async update(id, updates) {
        const allowedFields = ['name', 'description'];
        const setClauses = [];
        const values = [];
        
        allowedFields.forEach(field => {
            if (updates[field] !== undefined) {
                setClauses.push(`${field} = ?`);
                values.push(updates[field]);
            }
        });
        
        if (setClauses.length === 0) {
            return false;
        }
        
        setClauses.push('updated_at = ?');
        values.push(new Date().toISOString().slice(0, 19).replace('T', ' '));
        values.push(id);
        
        const [result] = await pool.execute(
            `UPDATE projects SET ${setClauses.join(', ')} WHERE id = ?`,
            values
        );
        
        return result.affectedRows > 0;
    }

    // 删除项目
    static async delete(id) {
        const [result] = await pool.execute(
            'DELETE FROM projects WHERE id = ?',
            [id]
        );
        return result.affectedRows > 0;
    }
}

module.exports = ProjectModel;