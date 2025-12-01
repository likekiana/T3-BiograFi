/**
 * 数据库迁移脚本
 * 添加 relationAnnotations 字段
 */
const mysql = require('mysql2/promise');
require('dotenv').config();

const dbConfig = {
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'ianct_chinese_user',
    charset: 'utf8mb4',
    timezone: '+08:00'
};

async function migrate() {
    let connection;
    try {
        console.log('🔄 连接数据库...');
        connection = await mysql.createConnection(dbConfig);
        console.log('✅ 数据库连接成功');

        // 检查字段是否已存在
        console.log('🔍 检查 relationAnnotations 字段是否存在...');
        const [columns] = await connection.execute(
            `SHOW COLUMNS FROM documents LIKE 'relationAnnotations'`
        );

        if (columns.length > 0) {
            console.log('ℹ️  relationAnnotations 字段已存在，跳过迁移');
        } else {
            console.log('➕ 添加 relationAnnotations 字段...');
            await connection.execute(
                `ALTER TABLE documents ADD COLUMN relationAnnotations JSON NULL`
            );
            console.log('✅ relationAnnotations 字段添加成功');

            // 为已存在的记录设置默认值
            console.log('🔄 设置默认值...');
            await connection.execute(
                `UPDATE documents SET relationAnnotations = '[]' WHERE relationAnnotations IS NULL`
            );
            console.log('✅ 默认值设置完成');
        }

        console.log('✅ 数据库迁移完成');
    } catch (error) {
        console.error('❌ 迁移失败:', error.message);
        process.exit(1);
    } finally {
        if (connection) {
            await connection.end();
            console.log('🔌 数据库连接已关闭');
        }
    }
}

// 执行迁移
migrate();
