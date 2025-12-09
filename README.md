@ -1 +1,140 @@
前端添加数据可视化版本
# 古文智能标注与解析系统

## 项目简介
这是一个基于T3栈的古文智能标注与解析系统，集成了百度千帆ERNIE X1 AI模型，用于古文解析、答疑和自动实体标注。

## 项目结构
```
├── backend/              # 后端服务
│   └── server/           # 服务器代码
│       ├── AI/           # AI服务模块
│       ├── seg/          # 分词服务模块
│       └── user/         # 用户服务模块
├── frontend/             # 前端代码
└── README.md             # 项目说明文档
```

## 环境要求
- Node.js 16+
- Python 3.8+
- MySQL 8.0+

## 启动说明

### 后端服务启动

1. **打开PowerShell**
2. **进入前端目录**
   ```powershell
   cd frontend
   ```
3. **安装依赖**
   ```powershell
   npm i -D concurrently
   ```
4. **设置环境变量并启动服务**
   ```powershell
   # 设置数据库环境变量
   $env:DB_USER="root"
   $env:DB_PASSWORD="3147"
   $env:DB_NAME="ianct_chinese_user"
   
   # 设置AI模型环境变量（百度千帆ERNIE X1）
   $env:API_KEY="bce-v3/ALTAK-GlzTH3GEwkwIGzCsLtoeG/692dd1e4a3efc131b1b06ef241e668306e6782c9"
   
   # 启动所有服务
   npm run start:services
   ```

### 前端服务启动

1. **进入前端目录**
   ```powershell
   cd frontend
   ```
2. **启动前端服务**
   ```powershell
   npm start
   ```

## AI模型说明

本项目使用以下AI模型，主要功能包括：
1. **DeepSeek API**：通用大语言模型，用于文本生成和问答
2. **荀子古汉语大模型**：基于魔搭平台的Xunzillm4cc/Xunzi-Qwen2-1.5B模型，专门用于古汉语文本分析和生成

主要功能：
- 古文文本解析
- 古文答疑
- 自动实体标注（人物、地名、时间、器物、概念）
- 古汉语翻译

## 配置说明

### AI服务配置
AI服务配置文件位于 `backend/server/AI/config.py`，主要配置项：
- `DEEPSEEK_API_KEY`：DeepSeek API密钥
- `DEEPSEEK_API_URL`：DeepSeek API地址
- `DEEPSEEK_MODEL`：DeepSeek模型名称
- `MODELSCOPE_API_KEY`：魔搭平台API密钥
- `MODELSCOPE_API_URL`：魔搭平台API地址
- `XUNZI_MODEL`：荀子古汉语模型名称
- `TIMEOUT`：请求超时时间

### 环境变量
- `DEEPSEEK_API_KEY`：DeepSeek API密钥（必填）
- `MODELSCOPE_API_KEY`：魔搭平台API密钥（必填）
- `DB_USER`：数据库用户名（必填）
- `DB_PASSWORD`：数据库密码（必填）
- `DB_NAME`：数据库名称（必填）

## 服务端口
- 用户服务：5002
- AI服务：5004
- 分词服务：5003
- 前端服务：3000

## 技术栈
- **前端**：React 18 + Vite + Tailwind CSS
- **后端**：Node.js + Express + Python Flask
- **数据库**：MySQL
- **AI模型**：百度千帆ERNIE X1
- **认证**：JWT

## 主要功能
1. 项目管理
2. 文档管理
3. 古文智能解析
4. 自动实体标注
5. 关系标注
6. 数据可视化

## 开发说明

### 后端AI服务开发
AI服务使用Python Flask框架，位于 `backend/server/AI/` 目录下：
- `ai.py`：AI服务主程序
- `config.py`：配置文件
- `requirements.txt`：依赖列表

### 前端开发
前端使用React 18 + Vite，主要开发目录：
- `src/components/`：组件目录
- `src/services/`：服务封装
- `src/pages/`：页面组件
- `src/utils/`：工具函数

## 注意事项
1. 确保数据库已正确创建
2. 确保环境变量设置正确
3. 首次启动需要安装依赖
4. AI服务需要配置有效的百度千帆API密钥
5. 所有服务需要在同一网络环境下运行

## 故障排查

### 常见问题
1. **AI服务无法启动**：检查API_KEY是否正确配置
2. **数据库连接失败**：检查数据库环境变量和数据库服务是否运行
3. **前端无法访问后端**：检查服务端口是否正确，防火墙是否允许访问

### 日志查看
- AI服务日志：控制台输出
- 用户服务日志：`backend/server/user/` 目录下
- 前端日志：浏览器控制台

## 版本说明
- 当前版本：1.0.0
- 更新日期：2025-12-06
- 主要更新：切换到百度千帆ERNIE X1 AI模型