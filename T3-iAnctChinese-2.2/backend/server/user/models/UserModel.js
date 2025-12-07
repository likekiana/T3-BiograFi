const { pool } = require('../config/database');

class UserModel {
    // 查找用户
    static async findByUsername(username) {
        const [rows] = await pool.execute(
            'SELECT * FROM users WHERE username = ?',
            [username]
        );
        return rows[0];
    }

    // 通过ID查找用户
    static async findById(id) {
        const [rows] = await pool.execute(
            'SELECT id, username, email, created_at, last_login, is_active FROM users WHERE id = ?',
            [id]
        );
        return rows[0];
    }

    // 创建用户
    static async create(userData) {
        const { username, email, password } = userData;
        const createdAt = new Date().toISOString().slice(0, 19).replace('T', ' ');
        
        const [result] = await pool.execute(
            'INSERT INTO users (username, email, password, created_at) VALUES (?, ?, ?, ?)',
            [username, email, password, createdAt]
        );
        
        return result.insertId;
    }

    // 更新用户最后登录时间
    static async updateLastLogin(userId) {
        await pool.execute(
            'UPDATE users SET last_login = ? WHERE id = ?',
            [new Date().toISOString().slice(0, 19).replace('T', ' '), userId]
        );
    }

    // 更新用户信息
    static async update(userId, updates) {
        const allowedFields = ['email', 'password'];
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
        
        values.push(userId);
        
        const [result] = await pool.execute(
            `UPDATE users SET ${setClauses.join(', ')} WHERE id = ?`,
            values
        );
        
        return result.affectedRows > 0;
    }

    // 获取所有用户
    static async findAll() {
        const [rows] = await pool.execute(
            'SELECT id, username, email, created_at, last_login, is_active FROM users'
        );
        return rows;
    }

    // 检查邮箱是否已存在
    static async isEmailExists(email, excludeUserId = null) {
        let query = 'SELECT COUNT(*) as count FROM users WHERE email = ?';
        const params = [email];
        
        if (excludeUserId) {
            query += ' AND id != ?';
            params.push(excludeUserId);
        }
        
        const [rows] = await pool.execute(query, params);
        return rows[0].count > 0;
    }
}

module.exports = UserModel;