# BiograFi-Backend API文档

## 1. 项目概述

BiograFi-Backend是一个基于Spring Boot 3.x的用户管理与文档标注系统后端服务，提供用户认证、项目管理、文档管理、实体标注、可视化分析和导出等功能。

### 1.1 技术栈

- Spring Boot 3.x
- Java 17
- Spring Data JPA
- MySQL 8.0+ (生产环境)
- H2 Database (开发环境)
- SpringDoc OpenAPI
- RESTful API设计
- Lombok
- Maven

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
  "service": "User Management Server (Spring Boot + MySQL)",
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

#### PATCH /api/users/

- **描述**：更新用户信息
- **请求体**：

```json
{
  "username": "updateduser",
  "email": "updateduser@example.com"
}
```

#### GET /api/users

- **描述**：获取所有用户列表

#### GET /api/users/

- **描述**：获取用户详情

### 2.3 项目管理

#### GET /api/projects

- **描述**：获取用户项目列表
- **请求参数**：
  - userId (必需)：用户ID

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

#### PUT /api/projects/

- **描述**：更新项目
- **请求体**：

```json
{
  "name": "更新后的项目名",
  "description": "更新后的项目描述"
}
```

#### DELETE /api/projects/

- **描述**：删除项目

#### GET /api/projects/

- **描述**：获取项目详情

### 2.4 文档管理

#### GET /api/documents

- **描述**：获取用户文档列表
- **请求参数**：
  - userId (必需)：用户ID
  - projectId (可选)：项目ID

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

#### GET /api/documents/

- **描述**：获取文档详情

#### PUT /api/documents/

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

#### DELETE /api/documents/

- **描述**：删除文档

#### GET /api/documents/search

- **描述**：文档搜索
- **请求参数**：
  - userId (必需)：用户ID
  - query (必需)：搜索关键词
  - projectId (可选)：项目ID

### 2.5 实体标注

#### GET /api/documents//annotations

- **描述**：获取文档的实体标注列表

#### POST /api/documents//annotations/entity

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

#### POST /api/documents//annotations/entity/bulk

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

#### DELETE /api/documents//annotations/entity/

- **描述**：删除实体标注

#### GET /api/annotations/search

- **描述**：搜索实体标注
- **请求参数**：
  - documentId (必需)：文档ID
  - label (可选)：标签类型筛选
  - text (可选)：文本内容筛选

#### GET /api/documents//annotations/count

- **描述**：根据标签统计实体标注数量

### 2.6 可视化分析

#### GET /api/visualization/overview

- **描述**：获取可视化总览统计
- **请求参数**：
  - documentId (必需)：文档ID
- **响应示例**：

```json
{
  "success": true,
  "data": {
    "totalChars": 1324,
    "labelCounts": {
      "人物": 18,
      "地名": 12,
      "时间": 7,
      "器物": 2,
      "概念": 5,
      "其他": 3
    }
  }
}
```

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
  "documentIds": ["doc1", "doc2"],
  "exportFormat": "txt+csv"
}
```

#### GET /api/exports//

- **描述**：下载导出文件

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

#### POST /api/ai/analyze

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
  "success": true,
  "message": "分析成功",
  "data": {
    "result": "1. 字面意思：...\n2. 核心哲学思想：...\n3. 现实意义：..."
  }
}
```

#### POST /api/ai/qa

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
  "success": true,
  "message": "问答成功",
  "data": {
    "result": "问题的答案"
  }
}
```

#### POST /api/ai/auto-annotate

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
  "success": true,
  "message": "自动标注成功",
  "data": {
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
  "success": true,
  "message": "分词成功",
  "data": {
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
}
```

## 3. 数据模型

### 3.1 User (用户)

- id: Integer (主键)
- username: String (用户名)
- password: String (密码)
- email: String (邮箱)
- createdAt: LocalDateTime (创建时间)
- updatedAt: LocalDateTime (更新时间)

### 3.2 Project (项目)

- id: String (主键)
- userId: Integer (用户ID)
- name: String (项目名称)
- description: String (项目描述)
- createdAt: LocalDateTime (创建时间)
- updatedAt: LocalDateTime (更新时间)

### 3.3 Document (文档)

- id: String (主键)
- userId: Integer (用户ID)
- projectId: String (项目ID)
- name: String (文档名称)
- description: String (文档描述)
- content: String (文档内容)
- author: String (作者)
- createdAt: LocalDateTime (创建时间)
- updatedAt: LocalDateTime (更新时间)

### 3.4 EntityAnnotation (实体标注)

- id: Integer (主键)
- documentId: String (文档ID)
- startIndex: Integer (起始位置)
- endIndex: Integer (结束位置)
- label: String (标签类型)
- textContent: String (文本内容)
- createdAt: LocalDateTime (创建时间)

### 3.5 LocationGeocode (地点坐标缓存)

- id: Integer (主键)
- name: String (地名)
- lng: BigDecimal (经度)
- lat: BigDecimal (纬度)
- matchedName: String (匹配的标准地名)
- confidence: String (匹配置信度)
- updatedAt: LocalDateTime (更新时间)

## 4. 快速启动

### 4.1 环境要求

- JDK 17+
- Maven 3.8+

### 4.2 构建项目

```bash
mvn clean install -DskipTests
```

### 4.3 运行项目

```bash
java -jar target/BiograFi-Backend-0.0.1-SNAPSHOT.jar
```

### 4.4 访问API文档

- Swagger UI: http://localhost:8080/swagger-ui.html
- OpenAPI JSON: http://localhost:8080/v3/api-docs
- OpenAPI YAML: http://localhost:8080/v3/api-docs.yaml

## 5. 部署运行说明

### 5.1 配置文件说明

项目使用application.yaml进行配置，支持开发环境和生产环境的切换。

#### 开发环境（默认）

- 数据库：H2内存数据库
- 端口：8080
- OpenAPI：开启

#### 生产环境

- 数据库：MySQL
- 端口：8080
- OpenAPI：关闭

### 5.2 生产环境部署

1. **准备MySQL数据库**

   - 创建数据库：`create database biogafi_db character set utf8mb4 collate utf8mb4_unicode_ci;
   - 创建用户并授权：`grant all privileges on biogafi_db.* to 'biogafi'@'%' identified by 'biogafi123';
2. **配置环境变量**

   - 设置 `SPRING_PROFILES_ACTIVE=prod` 启用生产环境配置
   - 根据实际情况修改数据库连接信息
3. **启动应用**

   ```bash
   java -jar target/BiograFi-Backend-0.0.1-SNAPSHOT.jar --spring.profiles.active=prod
   ```

### 5.3 容器化部署（可选）

可以使用Docker容器化部署，示例Dockerfile：

```dockerfile
FROM openjdk:17-jdk-alpine
VOLUME /tmp
COPY target/*.jar app.jar
ENTRYPOINT ["java","-jar","/app.jar"]
```

构建并运行Docker容器：

```bash
docker build -t biogafi-backend .
docker run -d -p 8080:8080 --name biogafi-backend biogafi-backend
```

## 6. 系统架构

### 6.1 分层架构

1. **Controller层**：处理HTTP请求，调用Service层进行业务逻辑处理
2. **Service层**：实现业务逻辑，调用Repository层进行数据访问
3. **Repository层**：数据访问层，使用Spring Data JPA与数据库交互
4. **Model层**：数据模型，定义实体类和数据传输对象
5. **Config层**：配置类，处理系统配置和Bean管理

### 6.2 数据流向

1. **客户端请求** → **Controller层**：接收并验证请求
2. **Controller层** → **Service层**：调用业务逻辑
3. **Service层** → **Repository层**：数据操作
4. **Repository层** → **数据库**：数据持久化
5. **数据库** → **Repository层**：数据查询
6. **Repository层** → **Service层**：返回数据结果
7. **Service层** → **Controller层**：处理业务结果
8. **Controller层** → **客户端**：返回HTTP响应

## 7. 监控与维护

### 7.1 日志管理

项目使用Spring Boot默认的日志框架，日志级别可通过配置文件调整。生产环境建议设置为INFO级别，开发环境可设置为DEBUG级别。

### 7.2 健康检查

可通过访问 `/api/health` 端点检查服务状态和数据库连接情况。

### 7.3 常见问题排查

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

## 8. 版本历史

| 版本  | 日期       | 说明                   |
| ----- | ---------- | ---------------------- |
| 1.0.0 | 2024-01-01 | 初始版本，包含基本功能 |

## 9. 联系方式

如有问题或建议，欢迎联系开发团队：

- 邮箱：example@example.com
- GitHub：https://github.com/example/biogafi-backend
