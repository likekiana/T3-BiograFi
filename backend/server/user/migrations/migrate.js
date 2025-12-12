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
    timezone: '+08:00',
    multipleStatements: true // 启用多语句支持
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
        
        // 排除init_database.sql，只执行优化脚本
        // 因为init_database.sql会删除并重新创建所有表，我们只需要优化现有结构
        sqlFiles = sqlFiles.filter(file => file !== 'init_database.sql');
        
        // 确保optimize_database.sql最后执行，或者按需要排序
        const optimizeFile = sqlFiles.find(file => file === 'optimize_database.sql');
        if (optimizeFile) {
            sqlFiles = sqlFiles.filter(file => file !== optimizeFile);
            sqlFiles.sort();
            sqlFiles.push(optimizeFile); // 将optimize_database.sql放在最后
        } else {
            sqlFiles.sort(); // 如果没有optimize_database.sql，就按默认排序
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
