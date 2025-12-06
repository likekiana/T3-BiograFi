# iAnctChinese API文档-实际实现

## 1. 项目概述

iAnctChinese是一个基于Node.js + Express的用户管理与文档标注系统后端服务，提供用户认证、项目管理、文档管理、实体标注、可视化分析和导出等功能。

### 1.1 技术栈

- Node.js + Express
- MySQL 8.0+
- RESTful API设计
- Python (AI服务，基于Flask)
- 中文分词服务

### 1.2 主要功能模块

1. **健康检查**：服务状态和数据库连接检查
2. **用户认证**：登录、注册、用户信息管理
3. **项目管理**：项目的创建、查询、更新、删除
4. **文档管理**：文档的创建、查询、更新、删除、搜索
5. **实体标注**：实体的标注、查询、批量操作、统计
6. **可视化分析**：标注数据的可视化展示、统计分析
7. **导出与缓存**：文档及标注的导出、地名坐标缓存管理
8. **AI 服务**：文本分析、问答系统、自动标注
9. **分词服务**：中文文本分词

## 2. API接口详情

### 2.1 健康检查

#### GET /api/health

- **描述**：检查服务状态和数据库连接
- **请求参数**：无
- **响应示例**：

```json
{
  "status": "ok",
  "service": "User Management Server (Node.js + MySQL)",
  "database": "connected",
  "timestamp": "2024-01-01T12:00:00.000Z"
}
```

### 2.2 用户认证

#### POST /api/login

- **描述**：用户登录
- **请求体**：

```json
{
  "username": "zontiks",
  "password": "123456"
}
```

- **响应示例**：

```json
{
  "success": true,
  "data": {
    "id": 1,
    "username": "zontiks",
    "email": "zontiks@example.com",
    "createdAt": "2024-01-01T12:00:00.000Z",
    "updatedAt": "2024-01-01T12:00:00.000Z"
  }
}
```

#### POST /api/register

- **描述**：用户注册
- **请求体**：

```json
{
  "username": "newuser",
  "password": "123456",
  "email": "newuser@example.com"
}
```

#### GET /api/users

- **描述**：获取所有用户列表

#### GET /api/users/:userId

- **描述**：获取用户详情

### 2.3 项目管理

#### GET /api/projects

- **描述**：获取用户项目列表
- **请求参数**：
  - userId (必需)：用户ID

#### GET /api/projects/:projectId

- **描述**：获取项目详情

#### POST /api/projects

- **描述**：创建项目
- **请求体**：

```json
{
  "userId": 1,
  "name": "新项目",
  "description": "项目描述"
}
```

#### PUT /api/projects/:projectId

- **描述**：更新项目
- **请求体**：

```json
{
  "name": "更新后的项目名",
  "description": "更新后的项目描述"
}
```

#### DELETE /api/projects/:projectId

- **描述**：删除项目

### 2.4 文档管理

#### GET /api/documents

- **描述**：获取用户文档列表
- **请求参数**：
  - userId (必需)：用户ID
  - projectId (可选)：项目ID

#### GET /api/documents/:documentId

- **描述**：获取文档详情

#### POST /api/documents

- **描述**：创建文档
- **请求体**：

```json
{
  "userId": 1,
  "projectId": "proj123",
  "name": "新文档",
  "description": "文档描述",
  "content": "文档内容",
  "author": "作者"
}
```

#### PUT /api/documents/:documentId

- **描述**：更新文档
- **请求体**：

```json
{
  "name": "更新后的文档名",
  "description": "更新后的文档描述",
  "content": "更新后的文档内容",
  "author": "更新后的作者"
}
```

#### DELETE /api/documents/:documentId

- **描述**：删除文档

#### GET /api/documents/search

- **描述**：文档搜索
- **请求参数**：
  - userId (必需)：用户ID
  - query (必需)：搜索关键词
  - projectId (可选)：项目ID

### 2.5 实体标注

#### GET /api/documents/:documentId/annotations

- **描述**：获取文档的实体标注列表

#### POST /api/documents/:documentId/annotations/entity

- **描述**：添加实体标注
- **请求体**：

```json
{
  "start": 10,
  "end": 15,
  "label": "人物",
  "text": "刘备"
}
```

#### POST /api/documents/:documentId/annotations/entity/bulk

- **描述**：批量添加实体标注
- **请求体**：

```json
{
  "annotations": [
    {"start": 10, "end": 15, "label": "人物", "text": "刘备"},
    {"start": 25, "end": 30, "label": "地名", "text": "洛阳"}
  ]
}
```

#### DELETE /api/documents/:documentId/annotations/entity/:annotationId

- **描述**：删除实体标注

#### GET /api/annotations/search

- **描述**：搜索实体标注
- **请求参数**：
  - documentId (必需)：文档ID
  - label (可选)：标签类型筛选
  - text (可选)：文本内容筛选

#### GET /api/documents/:documentId/annotations/count

- **描述**：根据标签统计实体标注数量

### 2.6 可视化分析

#### GET /api/visualization/overview

- **描述**：获取可视化总览统计
- **请求参数**：
  - documentId (必需)：文档ID

#### GET /api/visualization/locations

- **描述**：获取地点可视化数据
- **请求参数**：
  - documentId (必需)：文档ID

#### GET /api/visualization/relationships

- **描述**：获取人物关系图数据
- **请求参数**：
  - documentId (必需)：文档ID

#### GET /api/visualization/timeline

- **描述**：获取时间轴数据
- **请求参数**：
  - documentId (必需)：文档ID

### 2.7 导出与缓存

#### POST /api/export-documents

- **描述**：导出文档及标注
- **请求体**：

```json
{
  "documentIds": ["doc1", "doc2"]
}
```

#### GET /api/visualization/locations/cache

- **描述**：查询地名坐标缓存
- **请求参数**：
  - name (必需)：地名

#### POST /api/visualization/locations/cache

- **描述**：更新地名坐标缓存
- **请求体**：

```json
{
  "name": "新地名",
  "lng": 116.4074,
  "lat": 39.9042,
  "matchedName": "北京",
  "confidence": "high"
}
```

### 2.8 AI 服务

#### POST /api/analyze

- **描述**：对文本进行详细分析，包含字面意思、核心哲学思想和现实意义
- **请求体**：

```json
{
  "text": "要分析的文本内容",
  "model": "可选模型名称"
}
```

- **响应示例**：

```json
{
  "result": "1. 字面意思：...\n2. 核心哲学思想：...\n3. 现实意义：..."
}
```

#### POST /api/qa

- **描述**：根据提供的文本回答用户问题
- **请求体**：

```json
{
  "text": "原文内容",
  "question": "用户问题",
  "model": "可选模型名称"
}
```

- **响应示例**：

```json
{
  "result": "问题的答案"
}
```

#### POST /api/auto-annotate

- **描述**：使用 AI 对文本进行实体标注，识别人物、地名、时间、器物、概念
- **请求体**：

```json
{
  "text": "要标注的文本内容"
}
```

- **响应示例**：

```json
{
  "annotations": [
    {
      "start": 0,
      "end": 2,
      "label": "人物",
      "text": "刘备"
    },
    {
      "start": 5,
      "end": 7,
      "label": "地名",
      "text": "荆州"
    }
  ]
}
```

### 2.9 分词服务

#### POST /api/segment

- **描述**：对文本进行中文分词，返回每个词的起止位置
- **请求体**：

```json
{
  "text": "要分词的文本内容"
}
```

- **响应示例**：

```json
{
  "tokens": [
    {
      "text": "我",
      "start": 0,
      "end": 1
    },
    {
      "text": "爱",
      "start": 1,
      "end": 2
    },
    {
      "text": "北京",
      "start": 2,
      "end": 4
    },
    {
      "text": "天安门",
      "start": 4,
      "end": 7
    }
  ]
}
```

## 3. 响应格式说明

### 3.1 成功响应

- **格式**：`{"result": "..."}` 或 `{"field": "..."}`
- **示例**：
  - 文本分析：`{"result": "分析结果..."}`
  - 自动标注：`{"annotations": [...标注列表...]}`
  - 分词服务：`{"tokens": [...分词结果...]}`

### 3.2 错误响应

- **格式**：`{"error": "错误信息"}`
- **示例**：
  - 参数错误：`{"error": "请提供要分析的文本"}`
  - 服务器错误：`{"error": "生成回复时出错: ..."}`

## 4. 服务说明

### 4.1 用户管理服务

- **技术栈**：Node.js + Express + MySQL
- **端口**：5002
- **主要功能**：用户认证、项目管理、文档管理、实体标注、可视化分析、导出功能

### 4.2 AI 服务

- **技术栈**：Python + Flask
- **端口**：5004
- **主要功能**：文本分析、问答系统、自动标注
- **API 前缀**：无（直接使用根路径）

### 4.3 分词服务

- **技术栈**：Node.js + Express
- **端口**：5003
- **主要功能**：中文文本分词
- **API 前缀**：无（直接使用根路径）

## 5. 数据模型

### 5.1 User (用户)

- id: Integer (主键)
- username: String (用户名)
- password: String (密码)
- email: String (邮箱)
- createdAt: DateTime (创建时间)
- updatedAt: DateTime (更新时间)

### 5.2 Project (项目)

- id: String (主键)
- userId: Integer (用户ID)
- name: String (项目名称)
- description: String (项目描述)
- createdAt: DateTime (创建时间)
- updatedAt: DateTime (更新时间)

### 5.3 Document (文档)

- id: String (主键)
- userId: Integer (用户ID)
- projectId: String (项目ID)
- name: String (文档名称)
- description: String (文档描述)
- content: String (文档内容)
- author: String (作者)
- createdAt: DateTime (创建时间)
- updatedAt: DateTime (更新时间)

### 5.4 EntityAnnotation (实体标注)

- id: Integer (主键)
- documentId: String (文档ID)
- start: Integer (起始位置)
- end: Integer (结束位置)
- label: String (标签类型)
- text: String (文本内容)
- createdAt: DateTime (创建时间)

### 5.5 LocationGeocode (地点坐标缓存)

- id: Integer (主键)
- name: String (地名)
- lng: Float (经度)
- lat: Float (纬度)
- matchedName: String (匹配的标准地名)
- confidence: String (匹配置信度)
- updatedAt: DateTime (更新时间)

## 6. 快速启动

### 6.1 环境要求

- Node.js 16+
- Python 3.8+
- MySQL 8.0+

### 6.2 启动服务

1. **用户管理服务**
   ```bash
   cd backend/server/user
   npm install
   npm start
   ```

2. **AI 服务**
   ```bash
   cd backend/server/AI
   pip install -r requirements.txt
   python ai.py
   ```

3. **分词服务**
   ```bash
   cd backend/server/segment
   npm install
   npm start
   ```

## 7. 常见问题排查

1. **数据库连接失败**
   - 检查数据库服务是否正常运行
   - 检查数据库连接配置是否正确
   - 检查数据库用户权限是否正确

2. **API访问失败**
   - 检查服务是否正常运行
   - 检查请求URL和参数是否正确
   - 检查请求头和认证信息是否正确
   - 查看服务日志，定位具体错误信息

3. **性能问题**
   - 检查数据库索引是否合理
   - 优化SQL查询语句
   - 考虑引入缓存机制
   - 分析系统瓶颈，进行针对性优化

## 8. 联系方式

如有问题或建议，欢迎联系开发团队。