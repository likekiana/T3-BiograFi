const { initDatabase } = require('./config/database');

async function optimizeDatabase() {
    console.log('🔄 开始优化数据库结构...');
    try {
        await initDatabase();
        console.log('🎉 数据库优化完成！');
    } catch (error) {
        console.error('❌ 数据库优化失败:', error.message);
        process.exit(1);
    }
}

optimizeDatabase();