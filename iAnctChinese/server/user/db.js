// server/user/db.js
const mysql = require('mysql2');
require('dotenv').config();

// 创建数据库连接池
const pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '3147',
    database: process.env.DB_NAME || 'iannot',
    charset: 'utf8mb4',
    connectionLimit: 10,
    acquireTimeout: 60000,
    timeout: 60000
});

// 使用Promise包装
const promisePool = pool.promise();

// 测试连接
pool.getConnection((err, connection) => {
    if (err) {
        console.error('❌ 数据库连接失败:', err.message);
        return;
    }
    console.log('✅ MySQL数据库连接成功');
    connection.release();
});

// 在 db.js 文件末尾添加：
module.exports = {
    query: (text, params) => promisePool.execute(text, params),
    pool: promisePool  // 添加这一行
};