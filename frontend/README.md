# 古文智能标注与解析系统

## 项目简介
这是一个基于T3栈的古文智能标注与解析系统，集成了DeepSeek和百度千帆ERNIE X1 AI模型，用于古文解析、答疑和自动实体标注。

## 环境要求
- Node.js 16+
- Python 3.8+
- MySQL 8.0+

## 安装依赖

```bash
# 安装前端依赖
npm install

# 安装后端依赖（用户服务）
cd ../backend/server/user
npm install

# 安装AI服务依赖
cd ../AI
pip install -r requirements.txt

# 安装分词服务依赖
cd ../seg
pip install -r requirements.txt
```

## 启动服务

### 1. 启动所有后端服务
```bash
# 在frontend目录下运行
npm run start:services
```

这将启动以下服务：
- 用户服务：http://localhost:5002
- AI服务：http://localhost:5004
- 分词服务：http://localhost:5001

### 2. 启动前端服务
```bash
# 在frontend目录下运行
npm start
```

前端服务将在 http://localhost:3000 启动

## 访问应用

在浏览器中打开 http://localhost:3000，使用默认测试账号登录：

- 用户名：`zontiks`
- 密码：`123456`

## 功能特性

### 文档编辑器
- 支持文本编辑和格式化（粗体、斜体、下划线）
- 支持AI自动实体标注
- 支持多种AI模型选择
- 支持手动实体标注
- 支持实体标注的增删改查

### AI模型
- **DeepSeek**（推荐）：适合各种文本生成任务
- **ERNIE X1**：百度千帆ERNIE X1模型，适合古文解析

### 自动标注
- 支持标注人物、地名、时间、器物、概念等实体
- 支持多种AI模型选择
- 标注结果可视化展示

### 文本预览
- 支持编辑和格式化
- 支持实体标注展示
- 支持多种视图切换

## 项目结构

```
├── backend/
│   └── server/
│       ├── AI/           # AI服务模块
│       ├── seg/          # 分词服务模块
│       └── user/         # 用户服务模块
├── frontend/             # 前端代码
│   ├── src/
│   │   ├── components/   # 组件目录
│   │   ├── services/     # 服务封装
│   │   ├── pages/        # 页面组件
│   │   ├── utils/        # 工具函数
│   │   └── styles/       # 样式文件
│   └── public/           # 静态资源
└── README.md             # 项目说明文档
```

## 环境变量

所有环境变量已在配置文件中预设，无需手动设置：

- **数据库配置**：MySQL 用户名、密码、数据库名
- **AI API 密钥**：DeepSeek 和 ERNIE X1 的 API 密钥
- **服务端口**：各服务的端口配置

## 开发说明

### 后端开发

- **AI服务**：基于Python Flask，位于 `backend/server/AI/`
- **用户服务**：基于Node.js Express，位于 `backend/server/user/`
- **分词服务**：基于Python Flask，位于 `backend/server/seg/`

### 前端开发

- 基于React 18 + Vite
- 使用Tailwind CSS进行样式设计
- 主要组件：
  - `EntityAnnotator`：实体标注组件
  - `TextEditor`：文本编辑器组件
  - `TimelineVisualization`：时间线可视化组件

## 常见问题

### 端口被占用
如果遇到端口被占用的错误（如 `EADDRINUSE`），可以：
1. 查找并终止占用端口的进程
2. 或修改配置文件中的端口号

### 数据库连接失败
- 确保MySQL服务正在运行
- 确保数据库名称、用户名和密码正确
- 确保数据库已创建

### AI服务错误
- 检查API密钥是否正确
- 检查网络连接
- 查看AI服务日志获取详细错误信息

## 更新日志

### v1.0.0
- 集成DeepSeek和ERNIE X1 AI模型
- 支持AI自动实体标注
- 支持多种AI模型选择
- 优化文本编辑器和预览功能
- 修复已知bug

## 许可证

MIT License
