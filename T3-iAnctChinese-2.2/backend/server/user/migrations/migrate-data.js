const fs = require('fs').promises;
const path = require('path');

// 注意：这里需要正确引入 database 配置
const { pool } = require('../config/database');

async function migrateData() {
    try {
        // 数据文件路径 - 从 migrations 目录出发
        const dataPath = path.join(__dirname, '..', '..', '..', 'database', 'data.json');
        
        console.log(`正在读取数据文件: ${dataPath}`);
        
        try {
            await fs.access(dataPath);
            console.log('✅ 找到数据文件');
        } catch (error) {
            console.error(`❌ 数据文件不存在: ${dataPath}`);
            console.log('当前工作目录:', process.cwd());
            console.log('请确保数据文件位于: backend/database/data.json');
            return;
        }

        const fileContent = await fs.readFile(dataPath, 'utf-8');
        const data = JSON.parse(fileContent);
        
        console.log('开始迁移数据到 MySQL...');
        
        // 测试数据库连接
        try {
            await pool.getConnection();
            console.log('✅ 数据库连接正常');
        } catch (error) {
            console.error('❌ 数据库连接失败:', error.message);
            return;
        }
        
        // 迁移用户数据
        console.log(`📊 迁移 ${data.users.length} 个用户...`);
        let userCount = 0;
        for (const user of data.users) {
            try {
                await pool.execute(
                    'INSERT IGNORE INTO users (id, username, email, password, created_at, last_login, is_active) VALUES (?, ?, ?, ?, ?, ?, ?)',
                    [user.id, user.username, user.email, user.password, user.created_at, user.last_login, user.is_active || true]
                );
                userCount++;
                console.log(`  ✅ 用户: ${user.username} (ID: ${user.id})`);
            } catch (error) {
                console.error(`  ❌ 迁移用户 ${user.username} 失败:`, error.message);
            }
        }
        console.log(`✅ 用户数据迁移完成: ${userCount}/${data.users.length}`);
        
        // 迁移项目数据
        console.log(`📊 迁移 ${data.projects.length} 个项目...`);
        let projectCount = 0;
        for (const project of data.projects) {
            try {
                await pool.execute(
                    'INSERT IGNORE INTO projects (id, user_id, name, description, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)',
                    [project.id, project.userId, project.name, project.description || '', project.createdAt, project.updatedAt]
                );
                projectCount++;
                console.log(`  ✅ 项目: ${project.name} (用户ID: ${project.userId})`);
            } catch (error) {
                console.error(`  ❌ 迁移项目 ${project.name} 失败:`, error.message);
            }
        }
        console.log(`✅ 项目数据迁移完成: ${projectCount}/${data.projects.length}`);
        
        // 迁移文档数据
        console.log(`📊 迁移 ${data.documents.length} 个文档...`);
        let documentCount = 0;
        for (const document of data.documents) {
            try {
                await pool.execute(
                    'INSERT IGNORE INTO documents (id, user_id, project_id, name, description, content, author, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
                    [
                        document.id, 
                        document.userId, 
                        document.projectId, 
                        document.name, 
                        document.description || '', 
                        document.content || '', 
                        document.author || '',
                        document.createdAt,
                        document.updatedAt
                    ]
                );
                documentCount++;
                console.log(`  ✅ 文档: ${document.name} (项目ID: ${document.projectId})`);
            } catch (error) {
                console.error(`  ❌ 迁移文档 ${document.name} 失败:`, error.message);
            }
        }
        console.log(`✅ 文档数据迁移完成: ${documentCount}/${data.documents.length}`);
        
        // 迁移实体标注数据
        console.log('📊 迁移实体标注数据...');
        let annotationCount = 0;
        for (const document of data.documents) {
            if (document.entityAnnotations && document.entityAnnotations.length > 0) {
                console.log(`  处理文档 "${document.name}" 的 ${document.entityAnnotations.length} 个标注`);
                for (const annotation of document.entityAnnotations) {
                    try {
                        // 从文档内容中提取标注文本
                        const textContent = document.content ? 
                            document.content.slice(annotation.start, annotation.end) : annotation.text || '';
                        
                        await pool.execute(
                            'INSERT INTO entity_annotations (document_id, start_index, end_index, label, text_content, created_at) VALUES (?, ?, ?, ?, ?, ?)',
                            [document.id, annotation.start, annotation.end, annotation.label, textContent, document.updatedAt]
                        );
                        annotationCount++;
                    } catch (error) {
                        console.error(`  标注迁移失败:`, error.message);
                    }
                }
            }
        }
        console.log(`✅ 实体标注数据迁移完成，共 ${annotationCount} 个标注`);
        
        console.log('\n🎉 所有数据迁移完成！');
        
        // 显示迁移统计
        const [userCountResult] = await pool.execute('SELECT COUNT(*) as count FROM users');
        const [projectCountResult] = await pool.execute('SELECT COUNT(*) as count FROM projects');
        const [documentCountResult] = await pool.execute('SELECT COUNT(*) as count FROM documents');
        const [annotationCountResult] = await pool.execute('SELECT COUNT(*) as count FROM entity_annotations');
        
        console.log('\n📈 迁移统计:');
        console.log(`   用户: ${userCountResult[0].count}`);
        console.log(`   项目: ${projectCountResult[0].count}`);
        console.log(`   文档: ${documentCountResult[0].count}`);
        console.log(`   实体标注: ${annotationCountResult[0].count}`);
        
    } catch (error) {
        console.error('数据迁移失败:', error);
    } finally {
        process.exit();
    }
}

// 如果直接运行此文件，则执行迁移
if (require.main === module) {
    migrateData();
}

module.exports = migrateData;