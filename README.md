
# 古文智能标注与解析系统

## 项目简介
这是一个基于T3栈的古文智能标注与解析系统，集成了荀子等先进AI模型，用于古文解析、答疑和自动实体标注。本系统旨在提高古文研究的效率和准确性，为研究者提供智能化的文本分析工具。

## 项目结构
```
├── backend/              # 后端服务
│   └── server/           # 服务器代码
│       ├── AI/           # AI服务模块
│       ├── seg/          # 分词服务模块
│       └── user/         # 用户服务模块
├── frontend/             # 前端代码
│   ├── src/              # 前端源码
│   │   ├── components/   # 组件目录
│   │   ├── hooks/        # 自定义钩子
│   │   ├── pages/        # 页面组件
│   │   ├── services/     # 服务封装
│   │   ├── styles/       # 样式文件
│   │   └── utils/        # 工具函数
│   ├── package.json      # 前端依赖
│   └── vite.config.js    # Vite配置
├── README.md             # 项目说明文档
└── GitHub-CODE-STYLE.md  # GitHub代码管理方法
```

## 环境要求
- Node.js 16+
- Python 3.8+
- MySQL 8.0+

## 启动说明

### 1. 安装依赖

#### 前端依赖
```powershell
cd frontend
npm install
npm install -D concurrently
```

#### 后端AI服务依赖
```powershell
cd backend/server/AI
pip install -r requirements.txt
```

#### 后端分词服务依赖
```powershell
cd backend/server/seg
pip install -r requirements.txt
```

### 2. 设置环境变量

```powershell
# 设置数据库环境变量
$env:DB_USER="root"
$env:DB_PASSWORD="3147"
$env:DB_NAME="ianct_chinese_user"


```

### 3. 启动所有服务

#### 方式一：同时启动所有服务（推荐）
```powershell
cd frontend
npm run start:services
```

#### 方式二：分别启动服务

**启动用户服务**：
```powershell
cd backend/server/user
node user-server.js
```

**启动AI服务**：
```powershell
cd backend/server/AI
python ai.py
```

**启动分词服务**：
```powershell
cd backend/server/seg
python seg_server.py
```

**启动前端服务**：
```powershell
cd frontend
npm start
```

## AI模型说明

本项目使用以下AI模型，主要功能包括：
1. **DeepSeek API**：通用大语言模型，用于文本生成和问答
2. **荀子古汉语大模型**：基于魔搭平台的Xunzillm4cc/Xunzi-Qwen2-1.5B模型，专门用于古汉语文本分析和生成

主要功能：
- 古文文本智能解析
- 古文答疑
- 自动实体标注（人物、地名、时间、器物、概念）
- 古汉语翻译
- 文本分词和词性标注

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
- `DB_USER`：数据库用户名（必填）
- `DB_PASSWORD`：数据库密码（必填）
- `DB_NAME`：数据库名称（必填）

**注意**：AI服务配置目前直接在 `config.py` 文件中设置，无需通过环境变量配置。

## 服务端口
| 服务名称 | 端口 | 技术栈 |
| ------ | ---- | ------ |
| 前端服务 | 3000 | React + Vite |
| 用户服务 | 5002 | Node.js + Express |
| 分词服务 | 5003 | Python + Flask |
| AI服务 | 5004 | Python + Flask |
| 数据库 | 3306 | MySQL |

## 技术栈
- **前端**：React 18 + Vite + Tailwind CSS + React Router + Axios
- **后端**：Node.js + Express + Python Flask
- **数据库**：MySQL
- **AI模型**：DeepSeek、荀子古汉语大模型
- **认证**：基于Token的认证机制

## 主要功能
1. **用户管理**：注册、登录、信息管理、密码修改
2. **项目管理**：创建、查询、更新、删除项目
3. **文档管理**：上传、创建、编辑、删除、搜索文档
4. **实体标注**：手动标注和AI自动标注，支持人物、地名、时间、器物、概念等实体类型
5. **关系标注**：标注实体之间的关系
6. **AI智能解析**：文本分析、问答功能、自动翻译
7. **数据可视化**：
   - 地点分布地图
   - 人物关系图
   - 时间轴可视化
   - 中国历史时间轴
   - 统计分析图表
8. **古典分析**：古文文本深度分析
9. **数据导出**：支持文档和标注数据导出

## 开发说明

### 后端服务开发

#### 用户服务（Node.js + Express）
- 位置：`backend/server/user/`
- 功能：用户管理、项目管理、文档管理、标注管理
- 主要文件：
  - `user-server.js`：服务器入口
  - `models/`：数据模型
  - `middleware/`：中间件

#### AI服务（Python + Flask）
- 位置：`backend/server/AI/`
- 功能：文本分析、问答功能、自动标注
- 主要文件：
  - `ai.py`：AI服务主程序
  - `config.py`：配置文件
  - `requirements.txt`：依赖列表

#### 分词服务（Python + Flask）
- 位置：`backend/server/seg/`
- 功能：文本分词和词性标注
- 主要文件：
  - `seg_server.py`：分词服务主程序
  - `requirements.txt`：依赖列表

### 前端开发

#### 模块结构
```
src/
├── components/            # 组件目录
│   ├── common/            # 通用组件
│   ├── documents/         # 文档相关组件
│   ├── editor/            # 编辑器相关组件
│   └── visualization/     # 可视化相关组件
├── hooks/                 # 自定义钩子
├── pages/                 # 页面组件
├── services/              # 服务封装
├── styles/                # 样式文件
├── utils/                 # 工具函数
├── App.jsx                # 应用入口组件
└── main.jsx               # 应用入口文件
```

#### 核心功能组件
- `EntityAnnotator.jsx`：实体标注组件
- `RelationAnnotator.jsx`：关系标注组件
- `ClassicalAnalysis.jsx`：古文分析组件
- `LocationMap.jsx`：地点地图组件
- `RelationshipGraph.jsx`：关系图组件
- `TimelineVisualization.jsx`：时间轴可视化组件

## GitHub代码管理
本项目使用专门的GitHub代码管理方法，详细内容请查看 [GitHub-CODE-STYLE.md](./GitHub-CODE-STYLE.md) 文件。

## 注意事项
1. 确保数据库已正确创建
2. 确保环境变量设置正确
3. 首次启动需要安装所有依赖
4. AI服务需要配置有效的DeepSeek和魔搭平台API密钥
5. 所有服务需要在同一网络环境下运行
6. 前端使用React 18，后端服务使用Node.js 16+和Python 3.8+

## 故障排查

### 常见问题
1. **AI服务无法启动**：检查API_KEY是否正确配置
2. **数据库连接失败**：检查数据库环境变量和数据库服务是否运行
3. **前端无法访问后端**：检查服务端口是否正确，防火墙是否允许访问
4. **分词服务报错**：检查Python版本和依赖是否正确安装

### 日志查看
- AI服务日志：控制台输出
- 用户服务日志：`backend/server/user/` 目录下
- 分词服务日志：控制台输出
- 前端日志：浏览器控制台

## 版本说明
- 当前版本：1.0.2
- 更新日期：2025-12-30
- 主要更新：
  - 完善前端组件结构
  - 优化AI服务调用逻辑
  - 增加数据可视化功能
  - 完善文档管理功能
  - 优化项目结构和启动流程
  - 添加GitHub代码管理规范
  - 修复已知bug
  - 提升系统性能和稳定性