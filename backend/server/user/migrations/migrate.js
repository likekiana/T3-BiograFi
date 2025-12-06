/**
 * 数据库迁移脚本
 * 执行所有SQL迁移文件
 */
const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');
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

        // 获取迁移目录下的所有SQL文件
        const migrationsDir = path.dirname(__filename);
        let sqlFiles = fs.readdirSync(migrationsDir)
            .filter(file => file.endsWith('.sql'));
        
        // 确保init_database.sql首先执行，然后按文件名排序其他文件
        const initFile = sqlFiles.find(file => file === 'init_database.sql');
        if (initFile) {
            sqlFiles = sqlFiles.filter(file => file !== initFile);
            sqlFiles.sort();
            sqlFiles.unshift(initFile); // 将init_database.sql放在第一位
        } else {
            sqlFiles.sort(); // 如果没有init_database.sql，就按默认排序
        }

        console.log(`📋 发现 ${sqlFiles.length} 个迁移文件`);

        // 逐个执行迁移文件
        for (const file of sqlFiles) {
            const filePath = path.join(migrationsDir, file);
            console.log(`\n🚀 执行迁移文件: ${file}`);
            
            // 读取SQL文件内容
            const sqlContent = fs.readFileSync(filePath, 'utf8');
            
            // 执行SQL脚本
            await connection.execute(sqlContent);
            console.log(`✅ 迁移文件执行成功: ${file}`);
        }

        console.log('\n🎉 所有数据库迁移完成');
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
