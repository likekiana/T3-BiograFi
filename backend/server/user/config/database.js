const mysql = require('mysql2/promise');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const dbConfig = {
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '3147',
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

        // 开始数据库优化
        console.log('🔧 开始优化数据库结构...');

        // 1. 确保users表有updated_at和settings字段
        try {
            await conn.execute(`ALTER TABLE users ADD COLUMN IF NOT EXISTS updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP`);
            console.log('✅ 为users表添加updated_at字段');
        } catch (e) {
            console.warn('⚠️ users表已包含updated_at字段');
        }

        // 2. 确保entity_annotations表有type字段
        try {
            await conn.execute(`ALTER TABLE entity_annotations ADD COLUMN IF NOT EXISTS type VARCHAR(50) NOT NULL DEFAULT 'entity' AFTER text_content`);
            console.log('✅ 为entity_annotations表添加type字段');
        } catch (e) {
            console.warn('⚠️ entity_annotations表已包含type字段');
        }

        // 3. 确保entity_annotations和relation_annotations表有updated_at字段
        // 注意：这两个表在CREATE TABLE语句中已经包含updated_at字段，这里只是作为备份
        try {
            await conn.execute(`ALTER TABLE entity_annotations ADD COLUMN IF NOT EXISTS updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP`);
            console.log('✅ 为entity_annotations表添加updated_at字段');
        } catch (e) {
            console.warn('⚠️ entity_annotations表已包含updated_at字段');
        }

        try {
            await conn.execute(`ALTER TABLE relation_annotations ADD COLUMN IF NOT EXISTS updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP`);
            console.log('✅ 为relation_annotations表添加updated_at字段');
        } catch (e) {
            console.warn('⚠️ relation_annotations表已包含updated_at字段');
        }

        // 4. 为entity_annotations表添加更多索引
        try {
            await conn.execute(`ALTER TABLE entity_annotations ADD INDEX IF NOT EXISTS idx_document_type (document_id, type)`);
            await conn.execute(`ALTER TABLE entity_annotations ADD INDEX IF NOT EXISTS idx_label_text (label, text_content(100))`);
            console.log('✅ 为entity_annotations表添加额外索引');
        } catch (e) {
            console.warn('⚠️ 为entity_annotations表添加索引失败:', e.message);
        }

        // 5. 为relation_annotations表添加更多索引
        try {
            await conn.execute(`ALTER TABLE relation_annotations ADD INDEX IF NOT EXISTS idx_relation_type (relation_type)`);
            await conn.execute(`ALTER TABLE relation_annotations ADD INDEX IF NOT EXISTS idx_source_target (source_entity_id, target_entity_id)`);
            await conn.execute(`ALTER TABLE relation_annotations ADD INDEX IF NOT EXISTS idx_target_source (target_entity_id, source_entity_id)`);
            console.log('✅ 为relation_annotations表添加额外索引');
        } catch (e) {
            console.warn('⚠️ 为relation_annotations表添加索引失败:', e.message);
        }

        // 6. 确保documents表的JSON字段有默认值
        try {
            await conn.execute(`UPDATE documents SET entityAnnotations = '[]' WHERE entityAnnotations IS NULL`);
            await conn.execute(`UPDATE documents SET relationAnnotations = '[]' WHERE relationAnnotations IS NULL`);
            console.log('✅ 为documents表的JSON字段设置默认值');
        } catch (e) {
            console.warn('⚠️ 为documents表的JSON字段设置默认值失败:', e.message);
        }

        // 7. 创建location_geocodes表
        try {
            await conn.execute(`CREATE TABLE IF NOT EXISTS location_geocodes (
                id INT AUTO_INCREMENT PRIMARY KEY,
                name VARCHAR(255) NOT NULL UNIQUE,
                lng DECIMAL(10,6) NOT NULL,
                lat DECIMAL(10,6) NOT NULL,
                matched_name VARCHAR(255) NULL,
                confidence ENUM('high', 'medium', 'low') DEFAULT 'medium',
                created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                INDEX idx_lat_lng (lat, lng),
                INDEX idx_confidence (confidence)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;`);
            console.log('✅ 已创建location_geocodes表');
        } catch (e) {
            console.warn('⚠️ 创建location_geocodes表失败:', e.message);
        }

        // 8. 创建time_normalization_cache表
        try {
            await conn.execute(`CREATE TABLE IF NOT EXISTS time_normalization_cache (
                id INT AUTO_INCREMENT PRIMARY KEY,
                original_text VARCHAR(255) NOT NULL UNIQUE,
                normalized_time VARCHAR(50) NOT NULL,
                time_type ENUM('year', 'month', 'day', 'season', 'dynasty') NOT NULL,
                confidence ENUM('high', 'medium', 'low') DEFAULT 'medium',
                created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                INDEX idx_time_type (time_type),
                INDEX idx_confidence (confidence)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;`);
            console.log('✅ 已创建time_normalization_cache表');
        } catch (e) {
            console.warn('⚠️ 创建time_normalization_cache表失败:', e.message);
        }

        // 9. 创建document_statistics表
        try {
            await conn.execute(`CREATE TABLE IF NOT EXISTS document_statistics (
                id INT AUTO_INCREMENT PRIMARY KEY,
                document_id VARCHAR(64) NOT NULL UNIQUE,
                total_chars INT NOT NULL DEFAULT 0,
                label_counts JSON NOT NULL DEFAULT '{}',
                entity_density DECIMAL(5,2) DEFAULT 0.00,
                last_calculated DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                INDEX idx_document_id (document_id),
                CONSTRAINT fk_statistics_document FOREIGN KEY (document_id) REFERENCES documents(id) ON DELETE CASCADE
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;`);
            console.log('✅ 已创建document_statistics表');
        } catch (e) {
            console.warn('⚠️ 创建document_statistics表失败:', e.message);
        }

        // 10. 创建export_records表
        try {
            await conn.execute(`CREATE TABLE IF NOT EXISTS export_records (
                id VARCHAR(50) PRIMARY KEY,
                user_id INT NOT NULL,
                document_ids JSON NOT NULL DEFAULT '[]',
                export_format VARCHAR(20) DEFAULT 'txt+csv',
                file_paths JSON NOT NULL DEFAULT '[]',
                status ENUM('processing', 'completed', 'failed') DEFAULT 'processing',
                created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                completed_at DATETIME NULL,
                INDEX idx_user_id (user_id),
                INDEX idx_status (status),
                CONSTRAINT fk_export_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;`);
            console.log('✅ 已创建export_records表');
        } catch (e) {
            console.warn('⚠️ 创建export_records表失败:', e.message);
        }

        // 11. 创建user_settings表
        try {
            await conn.execute(`CREATE TABLE IF NOT EXISTS user_settings (
                id INT AUTO_INCREMENT PRIMARY KEY,
                user_id INT NOT NULL UNIQUE,
                default_labels JSON DEFAULT '[]',
                visualization_config JSON DEFAULT '{}',
                export_preferences JSON DEFAULT '{}',
                created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                CONSTRAINT fk_settings_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;`);
            console.log('✅ 已创建user_settings表');
        } catch (e) {
            console.warn('⚠️ 创建user_settings表失败:', e.message);
        }

        console.log('✅ 数据库结构优化完成');
    } finally {
        conn.release();
    }
}

module.exports = {
    pool,
    testConnection,
    initDatabase
};
