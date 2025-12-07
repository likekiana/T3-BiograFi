const mysql = require('mysql2/promise');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const dbConfig = {
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'ianct_chinese_user',
    charset: 'utf8mb4',
    timezone: '+08:00'
};

// 创建连接池
const pool = mysql.createPool({
    ...dbConfig,
    connectionLimit: 10,
    acquireTimeout: 60000,
    timeout: 60000,
    reconnect: true
});

// 测试连接
async function testConnection() {
    try {
        const connection = await pool.getConnection();
        console.log('✅ MySQL 数据库连接成功');
        connection.release();
        return true;
    } catch (error) {
        console.error('❌ MySQL 数据库连接失败:', error.message);
        return false;
    }
}

// 初始化数据库表
async function initDatabase() {
    try {
        await testConnection();
        await ensureSchema();
        console.log('✅ 数据库初始化完成');
    } catch (error) {
        console.error('❌ 数据库初始化失败:', error);
    }
}

// 创建必须的表结构
async function ensureSchema() {
    const conn = await pool.getConnection();
    try {
        await conn.execute(`CREATE TABLE IF NOT EXISTS users (
            id INT AUTO_INCREMENT PRIMARY KEY,
            username VARCHAR(64) NOT NULL UNIQUE,
            email VARCHAR(128) NOT NULL UNIQUE,
            password VARCHAR(128) NOT NULL,
            created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
            last_login DATETIME NULL,
            is_active TINYINT(1) NOT NULL DEFAULT 1
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;`);

        // 确保 users 表包含 settings JSON 列（用于保存用户个性化设置）
        try {
            const [cols] = await conn.execute(`SHOW COLUMNS FROM users LIKE 'settings'`);
            if (!Array.isArray(cols) || cols.length === 0) {
                await conn.execute(`ALTER TABLE users ADD COLUMN settings JSON NULL`);
                await conn.execute(`UPDATE users SET settings = '{}' WHERE settings IS NULL`);
                console.log('✅ 已为 users 表添加 settings 列');
            }
        } catch (e) {
            console.warn('⚠️ 检查/添加 users.settings 列失败:', e.message);
        }

        await conn.execute(`CREATE TABLE IF NOT EXISTS projects (
            id VARCHAR(64) PRIMARY KEY,
            user_id INT NOT NULL,
            name VARCHAR(128) NOT NULL,
            description TEXT NULL,
            created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            INDEX idx_projects_user (user_id),
            CONSTRAINT fk_projects_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;`);

        await conn.execute(`CREATE TABLE IF NOT EXISTS documents (
            id VARCHAR(64) PRIMARY KEY,
            user_id INT NOT NULL,
            project_id VARCHAR(64) NOT NULL,
            name VARCHAR(256) NOT NULL,
            description TEXT NULL,
            content LONGTEXT NULL,
            author VARCHAR(128) NULL,
            entityAnnotations JSON NULL,
            relationAnnotations JSON NULL,
            created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            INDEX idx_documents_user (user_id),
            INDEX idx_documents_project (project_id),
            CONSTRAINT fk_documents_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
            CONSTRAINT fk_documents_project FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;`);
        try {
            const [entityCols] = await conn.execute(`SHOW COLUMNS FROM documents LIKE 'entityAnnotations'`);
            if (!Array.isArray(entityCols) || entityCols.length === 0) {
                await conn.execute(`ALTER TABLE documents ADD COLUMN entityAnnotations JSON NULL`);
                await conn.execute(`UPDATE documents SET entityAnnotations = '[]' WHERE entityAnnotations IS NULL`);
                console.log('✅ 已为 documents 表添加 entityAnnotations 列');
            }
            const [relationCols] = await conn.execute(`SHOW COLUMNS FROM documents LIKE 'relationAnnotations'`);
            if (!Array.isArray(relationCols) || relationCols.length === 0) {
                await conn.execute(`ALTER TABLE documents ADD COLUMN relationAnnotations JSON NULL`);
                await conn.execute(`UPDATE documents SET relationAnnotations = '[]' WHERE relationAnnotations IS NULL`);
                console.log('✅ 已为 documents 表添加 relationAnnotations 列');
            }
        } catch (e) {
            console.warn('⚠️ 检查/添加 JSON 标注列失败:', e.message);
        }

        await conn.execute(`CREATE TABLE IF NOT EXISTS entity_annotations (
            id INT AUTO_INCREMENT PRIMARY KEY,
            document_id VARCHAR(64) NOT NULL,
            start_index INT NOT NULL,
            end_index INT NOT NULL,
            label VARCHAR(50) NOT NULL,
            text_content TEXT NULL,
            created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            INDEX idx_entity_document (document_id),
            INDEX idx_entity_label (label),
            CONSTRAINT fk_entity_document FOREIGN KEY (document_id) REFERENCES documents(id) ON DELETE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;`);

        await conn.execute(`CREATE TABLE IF NOT EXISTS relation_annotations (
            id INT AUTO_INCREMENT PRIMARY KEY,
            document_id VARCHAR(64) NOT NULL,
            source_entity_id INT,
            target_entity_id INT,
            relation_type VARCHAR(100) NOT NULL,
            created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            INDEX idx_relation_document (document_id),
            CONSTRAINT fk_relation_document FOREIGN KEY (document_id) REFERENCES documents(id) ON DELETE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;`);
    } finally {
        conn.release();
    }
}

module.exports = {
    pool,
    testConnection,
    initDatabase
};
