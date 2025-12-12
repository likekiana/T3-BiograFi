#!/usr/bin/env node

/**
 * 统一启动脚本 - 启动所有后端服务
 * 跨平台兼容，支持Windows、Linux和macOS
 */

const { spawn } = require('child_process');
const path = require('path');
const os = require('os');

// 获取当前目录的绝对路径
const currentDir = __dirname;

// 服务配置
const services = [
    {
        name: '分词服务',
        script: path.join(currentDir, 'seg', 'seg_server.py'),
        command: os.platform() === 'win32' ? 'python' : 'python3',
        args: [path.join(currentDir, 'seg', 'seg_server.py')],
        port: 5001
    },
    {
        name: 'AI服务',
        script: path.join(currentDir, 'AI', 'ai.py'),
        command: os.platform() === 'win32' ? 'python' : 'python3',
        args: [path.join(currentDir, 'AI', 'ai.py')],
        port: 5004
    },
    {
        name: '用户管理服务',
        script: path.join(currentDir, 'user', 'user-server.js'),
        command: 'node',
        args: [path.join(currentDir, 'user', 'user-server.js')],
        port: 5002
    }
];

// 启动所有服务
const runningServices = [];

console.log('\n' + '='.repeat(60));
console.log('🚀 启动所有后端服务...');
console.log('='.repeat(60));

function startService(service) {
    console.log(`\n📡 启动 ${service.name} (端口: ${service.port})...`);
    
    const child = spawn(service.command, service.args, {
        cwd: path.dirname(service.script),
        stdio: 'inherit',
        shell: os.platform() === 'win32' // Windows需要shell来处理环境变量
    });
    
    child.on('error', (error) => {
        console.error(`❌ ${service.name} 启动失败: ${error.message}`);
    });
    
    child.on('exit', (code) => {
        console.log(`\n🔌 ${service.name} 已退出 (退出码: ${code})`);
        // 从运行列表中移除
        const index = runningServices.findIndex(s => s.name === service.name);
        if (index > -1) {
            runningServices.splice(index, 1);
        }
        // 如果所有服务都已退出，退出主进程
        if (runningServices.length === 0) {
            process.exit(code || 0);
        }
    });
    
    runningServices.push({
        name: service.name,
        process: child
    });
}

// 逐个启动服务
let serviceIndex = 0;
function startNextService() {
    if (serviceIndex < services.length) {
        startService(services[serviceIndex]);
        serviceIndex++;
        // 间隔1秒启动下一个服务，避免端口冲突和资源竞争
        setTimeout(startNextService, 1000);
    } else {
        console.log('\n' + '='.repeat(60));
        console.log('✅ 所有后端服务启动完成！');
        console.log('📋 服务列表:');
        services.forEach(service => {
            console.log(`  - ${service.name}: http://localhost:${service.port}`);
        });
        console.log('='.repeat(60));
        console.log('\n💡 提示: 按 Ctrl+C 停止所有服务');
    }
}

// 启动第一个服务
startNextService();

// 处理优雅关闭
process.on('SIGINT', () => {
    console.log('\n\n🛑 正在停止所有服务...');
    runningServices.forEach(service => {
        console.log(`🔌 停止 ${service.name}...`);
        service.process.kill();
    });
    // 等待所有服务退出
    setTimeout(() => {
        console.log('\n✅ 所有服务已停止');
        process.exit(0);
    }, 2000);
});

process.on('SIGTERM', () => {
    console.log('\n\n🛑 收到终止信号，正在停止所有服务...');
    runningServices.forEach(service => {
        service.process.kill();
    });
    setTimeout(() => {
        console.log('\n✅ 所有服务已停止');
        process.exit(0);
    }, 2000);
});
