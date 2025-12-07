const { pool } = require('../config/database');

class UserModel {
    // 查找用户
    static async findByUsername(username) {
        const [rows] = await pool.execute(
            'SELECT * FROM users WHERE username = ?',
            [username]
        );
        const row = rows[0];
        if (row) {
            try {
                row.settings = row.settings ? JSON.parse(row.settings) : {};
            } catch (e) {
                row.settings = {};
            }
        }
        return row;
    }

    // 通过ID查找用户
    // 在 findById 中包含 settings 字段并解析
static async findById(id) {
  const [rows] = await pool.execute(
    'SELECT id, username, email, created_at, last_login, is_active, settings FROM users WHERE id = ?',
    [id]
  );
  const row = rows[0];
  if (row) {
    try {
      row.settings = row.settings ? JSON.parse(row.settings) : {};
    } catch (e) {
      row.settings = {};
    }
  }
  return row;
}

// 新增方法
static async updateSettings(userId, settingsObj) {
  const settingsStr = JSON.stringify(settingsObj || {});
  const [result] = await pool.execute(
    'UPDATE users SET settings = ? WHERE id = ?',
    [settingsStr, userId]
  );
  return result.affectedRows > 0;
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
        const allowedFields = ['username', 'email', 'password'];
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

        const sql = `UPDATE users SET ${setClauses.join(', ')} WHERE id = ?`;
        try {
            const [result] = await pool.execute(sql, values);
            console.log('UserModel.update SQL:', sql, 'values:', values, 'result:', result);
            return result; // return full result object for richer info
        } catch (e) {
            console.error('UserModel.update 错误:', e.message, 'SQL:', sql, 'values:', values);
            throw e;
        }
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

    // 检查用户名是否已存在
    static async isUsernameExists(username, excludeUserId = null) {
        let query = 'SELECT COUNT(*) as count FROM users WHERE username = ?';
        const params = [username];
        if (excludeUserId) {
            query += ' AND id != ?';
            params.push(excludeUserId);
        }
        const [rows] = await pool.execute(query, params);
        return rows[0].count > 0;
    }

    // 修改密码：校验当前密码并更新为新密码
    static async changePassword(userId, currentPassword, newPassword) {
        const [rows] = await pool.execute('SELECT password FROM users WHERE id = ?', [userId]);
        const row = rows[0];
        if (!row) return { success: false, error: '用户不存在' };
        if (row.password !== currentPassword) {
            return { success: false, error: '当前密码不正确' };
        }
        const [result] = await pool.execute('UPDATE users SET password = ? WHERE id = ?', [newPassword, userId]);
        return { success: result.affectedRows > 0 };
    }
}

module.exports = UserModel;