# 古文智能标注与解析系统 - API文档

## 1. 简介

本文档描述了古文智能标注与解析系统的API接口，包括接口的请求方法、路径、参数、响应格式等。系统采用RESTful API设计风格，所有接口返回JSON格式数据。

### 1.1 基本信息

- **API版本**：v1
- **基础URL**：`http://localhost:5002`
- **认证方式**：JWT Token
- **响应格式**：JSON

### 1.2 响应格式

所有API接口返回统一的响应格式：

```json
{
  "success": true/false,
  "data": {...}, // 响应数据，成功时返回
  "error": "错误信息", // 错误信息，失败时返回
  "message": "提示信息" // 提示信息，可选
}
```

### 1.3 认证方式

大多数API接口需要认证，认证方式为JWT Token。客户端需要在请求头中添加以下认证信息：

```
Authorization: Bearer <token>
```

Token在用户登录成功后获取，有效期为24小时。

## 2. 用户管理API

### 2.1 用户登录

**接口名称**：用户登录
**请求方法**：POST
**请求路径**：`/api/login`
**认证要求**：否

#### 请求参数

| 参数名 | 类型 | 位置 | 必填 | 描述 |
|--------|------|------|------|------|
| username | string | body | 是 | 用户名 |
| password | string | body | 是 | 密码 |

#### 示例请求

```json
{
  "username": "zontiks",
  "password": "123456"
}
```

#### 示例响应

```json
{
  "success": true,
  "data": {
    "user": {
      "id": 1,
      "username": "zontiks",
      "email": "zontiks@example.com",
      "created_at": "2023-01-01 00:00:00",
      "updated_at": "2023-01-01 00:00:00",
      "settings": null,
      "is_active": true,
      "last_login": "2023-01-01 00:00:00"
    }
  }
}
```

### 2.2 用户注册

**接口名称**：用户注册
**请求方法**：POST
**请求路径**：`/api/register`
**认证要求**：否

#### 请求参数

| 参数名 | 类型 | 位置 | 必填 | 描述 |
|--------|------|------|------|------|
| username | string | body | 是 | 用户名，长度3-20个字符 |
| email | string | body | 是 | 邮箱地址 |
| password | string | body | 是 | 密码，长度至少6个字符 |

#### 示例请求

```json
{
  "username": "newuser",
  "email": "newuser@example.com",
  "password": "123456"
}
```

#### 示例响应

```json
{
  "success": true,
  "data": {
    "user": {
      "id": 2,
      "username": "newuser",
      "email": "newuser@example.com",
      "created_at": "2023-01-02 00:00:00",
      "updated_at": "2023-01-02 00:00:00",
      "settings": null,
      "is_active": true,
      "last_login": null
    }
  }
}
```

### 2.3 更新用户信息

**接口名称**：更新用户信息
**请求方法**：PATCH
**请求路径**：`/api/users/:userId`
**认证要求**：是

#### 请求参数

| 参数名 | 类型 | 位置 | 必填 | 描述 |
|--------|------|------|------|------|
| userId | int | path | 是 | 用户ID |
| username | string | body | 否 | 用户名，长度3-20个字符 |
| email | string | body | 否 | 邮箱地址 |
| password | string | body | 否 | 密码，长度至少6个字符 |

#### 示例请求

```json
{
  "email": "updated@example.com"
}
```

#### 示例响应

```json
{
  "success": true,
  "data": {
    "user": {
      "id": 1,
      "username": "zontiks",
      "email": "updated@example.com",
      "created_at": "2023-01-01 00:00:00",
      "updated_at": "2023-01-03 00:00:00",
      "settings": null,
      "is_active": true,
      "last_login": "2023-01-01 00:00:00"
    }
  }
}
```

### 2.4 获取用户列表

**接口名称**：获取用户列表
**请求方法**：GET
**请求路径**：`/api/users`
**认证要求**：是

#### 示例响应

```json
{
  "success": true,
  "data": {
    "users": [
      {
        "id": 1,
        "username": "zontiks",
        "email": "zontiks@example.com",
        "created_at": "2023-01-01 00:00:00",
        "updated_at": "2023-01-01 00:00:00",
        "settings": null,
        "is_active": true,
        "last_login": "2023-01-01 00:00:00"
      },
      {
        "id": 2,
        "username": "newuser",
        "email": "newuser@example.com",
        "created_at": "2023-01-02 00:00:00",
        "updated_at": "2023-01-02 00:00:00",
        "settings": null,
        "is_active": true,
        "last_login": null
      }
    ]
  }
}
```

### 2.5 获取用户详情

**接口名称**：获取用户详情
**请求方法**：GET
**请求路径**：`/api/users/:userId`
**认证要求**：是

#### 请求参数

| 参数名 | 类型 | 位置 | 必填 | 描述 |
|--------|------|------|------|------|
| userId | int | path | 是 | 用户ID |

#### 示例响应

```json
{
  "success": true,
  "data": {
    "user": {
      "id": 1,
      "username": "zontiks",
      "email": "zontiks@example.com",
      "created_at": "2023-01-01 00:00:00",
      "updated_at": "2023-01-01 00:00:00",
      "settings": null,
      "is_active": true,
      "last_login": "2023-01-01 00:00:00"
    }
  }
}
```

### 2.6 更新用户设置

**接口名称**：更新用户设置
**请求方法**：PUT
**请求路径**：`/api/users/:userId/settings`
**认证要求**：是

#### 请求参数

| 参数名 | 类型 | 位置 | 必填 | 描述 |
|--------|------|------|------|------|
| userId | int | path | 是 | 用户ID |
| settings | object | body | 是 | 用户设置 |

#### 示例请求

```json
{
  "settings": {
    "theme": "dark",
    "language": "zh-CN"
  }
}
```

#### 示例响应

```json
{
  "success": true,
  "data": {
    "user": {
      "id": 1,
      "username": "zontiks",
      "email": "zontiks@example.com",
      "created_at": "2023-01-01 00:00:00",
      "updated_at": "2023-01-03 00:00:00",
      "settings": {
        "theme": "dark",
        "language": "zh-CN"
      },
      "is_active": true,
      "last_login": "2023-01-01 00:00:00"
    }
  }
}
```

### 2.7 修改密码

**接口名称**：修改密码
**请求方法**：POST
**请求路径**：`/api/users/:userId/change-password`
**认证要求**：是

#### 请求参数

| 参数名 | 类型 | 位置 | 必填 | 描述 |
|--------|------|------|------|------|
| userId | int | path | 是 | 用户ID |
| currentPassword | string | body | 是 | 当前密码 |
| newPassword | string | body | 是 | 新密码，长度至少6个字符 |

#### 示例请求

```json
{
  "currentPassword": "123456",
  "newPassword": "654321"
}
```

#### 示例响应

```json
{
  "success": true
}
```

## 3. 项目管理API

### 3.1 获取项目列表

**接口名称**：获取项目列表
**请求方法**：GET
**请求路径**：`/api/projects`
**认证要求**：是

#### 请求参数

| 参数名 | 类型 | 位置 | 必填 | 描述 |
|--------|------|------|------|------|
| userId | int | query | 是 | 用户ID |

#### 示例响应

```json
{
  "success": true,
  "data": {
    "projects": [
      {
        "id": "1234567890",
        "user_id": 1,
        "name": "《论语》研究",
        "description": "《论语》文本标注与分析",
        "created_at": "2023-01-01 00:00:00",
        "updated_at": "2023-01-01 00:00:00"
      },
      {
        "id": "0987654321",
        "user_id": 1,
        "name": "《孟子》研究",
        "description": "《孟子》文本标注与分析",
        "created_at": "2023-01-02 00:00:00",
        "updated_at": "2023-01-02 00:00:00"
      }
    ]
  }
}
```

### 3.2 获取项目详情

**接口名称**：获取项目详情
**请求方法**：GET
**请求路径**：`/api/projects/:projectId`
**认证要求**：是

#### 请求参数

| 参数名 | 类型 | 位置 | 必填 | 描述 |
|--------|------|------|------|------|
| projectId | string | path | 是 | 项目ID |

#### 示例响应

```json
{
  "success": true,
  "data": {
    "project": {
      "id": "1234567890",
      "user_id": 1,
      "name": "《论语》研究",
      "description": "《论语》文本标注与分析",
      "created_at": "2023-01-01 00:00:00",
      "updated_at": "2023-01-01 00:00:00"
    }
  }
}
```

### 3.3 创建项目

**接口名称**：创建项目
**请求方法**：POST
**请求路径**：`/api/projects`
**认证要求**：是

#### 请求参数

| 参数名 | 类型 | 位置 | 必填 | 描述 |
|--------|------|------|------|------|
| userId | int | body | 是 | 用户ID |
| name | string | body | 是 | 项目名称 |
| description | string | body | 否 | 项目描述 |

#### 示例请求

```json
{
  "userId": 1,
  "name": "《大学》研究",
  "description": "《大学》文本标注与分析"
}
```

#### 示例响应

```json
{
  "success": true,
  "data": {
    "project": {
      "id": "1357924680",
      "user_id": 1,
      "name": "《大学》研究",
      "description": "《大学》文本标注与分析",
      "created_at": "2023-01-03 00:00:00",
      "updated_at": "2023-01-03 00:00:00"
    }
  }
}
```

### 3.4 更新项目

**接口名称**：更新项目
**请求方法**：PUT
**请求路径**：`/api/projects/:projectId`
**认证要求**：是

#### 请求参数

| 参数名 | 类型 | 位置 | 必填 | 描述 |
|--------|------|------|------|------|
| projectId | string | path | 是 | 项目ID |
| name | string | body | 否 | 项目名称 |
| description | string | body | 否 | 项目描述 |

#### 示例请求

```json
{
  "description": "《大学》文本标注与智能分析"
}
```

#### 示例响应

```json
{
  "success": true,
  "data": {
    "project": {
      "id": "1357924680",
      "user_id": 1,
      "name": "《大学》研究",
      "description": "《大学》文本标注与智能分析",
      "created_at": "2023-01-03 00:00:00",
      "updated_at": "2023-01-04 00:00:00"
    }
  }
}
```

### 3.5 删除项目

**接口名称**：删除项目
**请求方法**：DELETE
**请求路径**：`/api/projects/:projectId`
**认证要求**：是

#### 请求参数

| 参数名 | 类型 | 位置 | 必填 | 描述 |
|--------|------|------|------|------|
| projectId | string | path | 是 | 项目ID |

#### 示例响应

```json
{
  "success": true
}
```

## 4. 文档管理API

### 4.1 获取文档列表

**接口名称**：获取文档列表
**请求方法**：GET
**请求路径**：`/api/documents`
**认证要求**：是

#### 请求参数

| 参数名 | 类型 | 位置 | 必填 | 描述 |
|--------|------|------|------|------|
| userId | int | query | 是 | 用户ID |
| projectId | string | query | 否 | 项目ID（可选，用于筛选特定项目下的文档） |

#### 示例响应

```json
{
  "success": true,
  "data": {
    "documents": [
      {
        "id": "1112223334",
        "user_id": 1,
        "project_id": "1234567890",
        "name": "《论语·学而》",
        "description": "《论语》学而篇",
        "content": "子曰：学而时习之，不亦说乎？有朋自远方来，不亦乐乎？人不知而不愠，不亦君子乎？",
        "author": "孔子及其弟子",
        "created_at": "2023-01-01 00:00:00",
        "updated_at": "2023-01-01 00:00:00"
      },
      {
        "id": "5556667778",
        "user_id": 1,
        "project_id": "1234567890",
        "name": "《论语·为政》",
        "description": "《论语》为政篇",
        "content": "子曰：为政以德，譬如北辰，居其所而众星共之。",
        "author": "孔子及其弟子",
        "created_at": "2023-01-02 00:00:00",
        "updated_at": "2023-01-02 00:00:00"
      }
    ]
  }
}
```

### 4.2 获取文档详情

**接口名称**：获取文档详情
**请求方法**：GET
**请求路径**：`/api/documents/:documentId`
**认证要求**：是

#### 请求参数

| 参数名 | 类型 | 位置 | 必填 | 描述 |
|--------|------|------|------|------|
| documentId | string | path | 是 | 文档ID |

#### 示例响应

```json
{
  "success": true,
  "data": {
    "document": {
      "id": "1112223334",
      "user_id": 1,
      "project_id": "1234567890",
      "name": "《论语·学而》",
      "description": "《论语》学而篇",
      "content": "子曰：学而时习之，不亦说乎？有朋自远方来，不亦乐乎？人不知而不愠，不亦君子乎？",
      "author": "孔子及其弟子",
      "created_at": "2023-01-01 00:00:00",
      "updated_at": "2023-01-01 00:00:00"
    }
  }
}
```

### 4.3 创建文档

**接口名称**：创建文档
**请求方法**：POST
**请求路径**：`/api/documents`
**认证要求**：是

#### 请求参数

| 参数名 | 类型 | 位置 | 必填 | 描述 |
|--------|------|------|------|------|
| userId | int | body | 是 | 用户ID |
| projectId | string | body | 是 | 项目ID |
| name | string | body | 是 | 文档名称 |
| description | string | body | 否 | 文档描述 |
| content | string | body | 否 | 文档内容 |
| author | string | body | 否 | 作者 |

#### 示例请求

```json
{
  "userId": 1,
  "projectId": "1234567890",
  "name": "《论语·八佾》",
  "description": "《论语》八佾篇",
  "content": "孔子谓季氏，八佾舞于庭，是可忍也，孰不可忍也？",
  "author": "孔子及其弟子"
}
```

#### 示例响应

```json
{
  "success": true,
  "data": {
    "document": {
      "id": "9998887776",
      "user_id": 1,
      "project_id": "1234567890",
      "name": "《论语·八佾》",
      "description": "《论语》八佾篇",
      "content": "孔子谓季氏，八佾舞于庭，是可忍也，孰不可忍也？",
      "author": "孔子及其弟子",
      "created_at": "2023-01-03 00:00:00",
      "updated_at": "2023-01-03 00:00:00"
    }
  }
}
```

### 4.4 更新文档

**接口名称**：更新文档
**请求方法**：PUT
**请求路径**：`/api/documents/:documentId`
**认证要求**：是

#### 请求参数

| 参数名 | 类型 | 位置 | 必填 | 描述 |
|--------|------|------|------|------|
| documentId | string | path | 是 | 文档ID |
| name | string | body | 否 | 文档名称 |
| description | string | body | 否 | 文档描述 |
| content | string | body | 否 | 文档内容 |
| author | string | body | 否 | 作者 |

#### 示例请求

```json
{
  "content": "孔子谓季氏，八佾舞于庭，是可忍也，孰不可忍也？",
  "author": "孔子及其弟子"
}
```

#### 示例响应

```json
{
  "success": true,
  "data": {
    "document": {
      "id": "9998887776",
      "user_id": 1,
      "project_id": "1234567890",
      "name": "《论语·八佾》",
      "description": "《论语》八佾篇",
      "content": "孔子谓季氏，八佾舞于庭，是可忍也，孰不可忍也？",
      "author": "孔子及其弟子",
      "created_at": "2023-01-03 00:00:00",
      "updated_at": "2023-01-04 00:00:00"
    }
  }
}
```

### 4.5 删除文档

**接口名称**：删除文档
**请求方法**：DELETE
**请求路径**：`/api/documents/:documentId`
**认证要求**：是

#### 请求参数

| 参数名 | 类型 | 位置 | 必填 | 描述 |
|--------|------|------|------|------|
| documentId | string | path | 是 | 文档ID |

#### 示例响应

```json
{
  "success": true
}
```

### 4.6 搜索文档

**接口名称**：搜索文档
**请求方法**：GET
**请求路径**：`/api/documents/search`
**认证要求**：是

#### 请求参数

| 参数名 | 类型 | 位置 | 必填 | 描述 |
|--------|------|------|------|------|
| userId | int | query | 是 | 用户ID |
| query | string | query | 是 | 搜索关键词 |
| projectId | string | query | 否 | 项目ID（可选，用于筛选特定项目下的文档） |

#### 示例响应

```json
{
  "success": true,
  "data": {
    "documents": [
      {
        "id": "1112223334",
        "user_id": 1,
        "project_id": "1234567890",
        "name": "《论语·学而》",
        "description": "《论语》学而篇",
        "content": "子曰：学而时习之，不亦说乎？有朋自远方来，不亦乐乎？人不知而不愠，不亦君子乎？",
        "author": "孔子及其弟子",
        "created_at": "2023-01-01 00:00:00",
        "updated_at": "2023-01-01 00:00:00"
      }
    ]
  }
}
```

### 4.7 导出文档

**接口名称**：导出文档
**请求方法**：POST
**请求路径**：`/api/export-documents`
**认证要求**：是

#### 请求参数

| 参数名 | 类型 | 位置 | 必填 | 描述 |
|--------|------|------|------|------|
| documentIds | array | body | 是 | 文档ID列表 |

#### 示例请求

```json
{
  "documentIds": ["1112223334", "5556667778"]
}
```

#### 示例响应

```json
{
  "success": true,
  "message": "成功导出 2 个文档",
  "exportedFiles": [
    "《论语·学而》.txt",
    "《论语·学而》+实体标注.csv",
    "《论语·为政》.txt",
    "《论语·为政》+实体标注.csv"
  ],
  "exportCount": 2
}
```

## 5. 标注管理API

### 5.1 获取标注列表

**接口名称**：获取标注列表
**请求方法**：GET
**请求路径**：`/api/documents/:documentId/annotations`
**认证要求**：是

#### 请求参数

| 参数名 | 类型 | 位置 | 必填 | 描述 |
|--------|------|------|------|------|
| documentId | string | path | 是 | 文档ID |

#### 示例响应

```json
{
  "success": true,
  "data": {
    "annotations": [
      {
        "id": 1,
        "document_id": "1112223334",
        "type": "entity",
        "start": 2,
        "end": 3,
        "label": "人物",
        "text": "子",
        "created_at": "2023-01-01 00:00:00",
        "updated_at": "2023-01-01 00:00:00"
      }
    ]
  }
}
```

### 5.2 添加实体标注

**接口名称**：添加实体标注
**请求方法**：POST
**请求路径**：`/api/documents/:documentId/annotations/entity`
**认证要求**：是

#### 请求参数

| 参数名 | 类型 | 位置 | 必填 | 描述 |
|--------|------|------|------|------|
| documentId | string | path | 是 | 文档ID |
| start | int | body | 是 | 实体开始位置 |
| end | int | body | 是 | 实体结束位置 |
| label | string | body | 是 | 实体标签（如：人物、地名、时间等） |
| text | string | body | 否 | 实体文本（可选，若不提供则从文档内容中截取） |

#### 示例请求

```json
{
  "start": 2,
  "end": 3,
  "label": "人物",
  "text": "子"
}
```

#### 示例响应

```json
{
  "success": true,
  "data": {
    "annotation": {
      "id": 1,
      "document_id": "1112223334",
      "type": "entity",
      "start": 2,
      "end": 3,
      "label": "人物",
      "text": "子",
      "created_at": "2023-01-01 00:00:00",
      "updated_at": "2023-01-01 00:00:00"
    }
  }
}
```

### 5.3 批量添加实体标注

**接口名称**：批量添加实体标注
**请求方法**：POST
**请求路径**：`/api/documents/:documentId/annotations/entity/bulk`
**认证要求**：是

#### 请求参数

| 参数名 | 类型 | 位置 | 必填 | 描述 |
|--------|------|------|------|------|
| documentId | string | path | 是 | 文档ID |
| annotations | array | body | 是 | 标注列表，每个标注包含start、end、label、text字段 |

#### 示例请求

```json
{
  "annotations": [
    {
      "start": 2,
      "end": 3,
      "label": "人物",
      "text": "子"
    },
    {
      "start": 15,
      "end": 17,
      "label": "人物",
      "text": "朋自"
    }
  ]
}
```

#### 示例响应

```json
{
  "success": true,
  "data": {
    "annotations": [
      {
        "id": 1,
        "document_id": "1112223334",
        "type": "entity",
        "start": 2,
        "end": 3,
        "label": "人物",
        "text": "子",
        "created_at": "2023-01-01 00:00:00",
        "updated_at": "2023-01-01 00:00:00"
      },
      {
        "id": 2,
        "document_id": "1112223334",
        "type": "entity",
        "start": 15,
        "end": 17,
        "label": "人物",
        "text": "朋自",
        "created_at": "2023-01-01 00:00:00",
        "updated_at": "2023-01-01 00:00:00"
      }
    ]
  }
}
```

### 5.4 删除实体标注

**接口名称**：删除实体标注
**请求方法**：DELETE
**请求路径**：`/api/documents/:documentId/annotations/entity/:annotationId`
**认证要求**：是

#### 请求参数

| 参数名 | 类型 | 位置 | 必填 | 描述 |
|--------|------|------|------|------|
| documentId | string | path | 是 | 文档ID |
| annotationId | int | path | 是 | 标注ID |

#### 示例响应

```json
{
  "success": true
}
```

### 5.5 搜索实体标注

**接口名称**：搜索实体标注
**请求方法**：GET
**请求路径**：`/api/annotations/search`
**认证要求**：是

#### 请求参数

| 参数名 | 类型 | 位置 | 必填 | 描述 |
|--------|------|------|------|------|
| documentId | string | query | 是 | 文档ID |
| label | string | query | 否 | 实体标签（可选，用于筛选特定类型的实体） |
| text | string | query | 否 | 实体文本（可选，用于模糊搜索） |

#### 示例响应

```json
{
  "success": true,
  "data": {
    "annotations": [
      {
        "id": 1,
        "document_id": "1112223334",
        "type": "entity",
        "start": 2,
        "end": 3,
        "label": "人物",
        "text": "子",
        "created_at": "2023-01-01 00:00:00",
        "updated_at": "2023-01-01 00:00:00"
      }
    ]
  }
}
```

### 5.6 统计实体标注数量

**接口名称**：统计实体标注数量
**请求方法**：GET
**请求路径**：`/api/documents/:documentId/annotations/count`
**认证要求**：是

#### 请求参数

| 参数名 | 类型 | 位置 | 必填 | 描述 |
|--------|------|------|------|------|
| documentId | string | path | 是 | 文档ID |

#### 示例响应

```json
{
  "success": true,
  "data": {
    "labelCounts": {
      "人物": 2,
      "地名": 1,
      "时间": 0
    }
  }
}
```

## 6. AI服务API

### 6.1 文本分析

**接口名称**：文本分析
**请求方法**：POST
**请求路径**：`/ai/api/analyze`
**认证要求**：否

#### 请求参数

| 参数名 | 类型 | 位置 | 必填 | 描述 |
|--------|------|------|------|------|
| text | string | body | 是 | 待分析的文本 |
| model | string | body | 否 | 模型名称（默认：xunzi-qwen2） |

#### 示例请求

```json
{
  "text": "子曰：学而时习之，不亦说乎？有朋自远方来，不亦乐乎？人不知而不愠，不亦君子乎？",
  "model": "xunzi-qwen2"
}
```

#### 示例响应

```json
{
  "success": true,
  "data": {
    "analysis": "这是《论语·学而》中的开篇名言，表达了孔子对于学习、交友和修身的看法。",
    "segments": [
      {"text": "子曰", "type": "quote"},
      {"text": "：学而时习之，不亦说乎？", "type": "content"},
      {"text": "有朋自远方来，不亦乐乎？", "type": "content"},
      {"text": "人不知而不愠，不亦君子乎？", "type": "content"}
    ]
  }
}
```

### 6.2 问答

**接口名称**：问答
**请求方法**：POST
**请求路径**：`/ai/api/qa`
**认证要求**：否

#### 请求参数

| 参数名 | 类型 | 位置 | 必填 | 描述 |
|--------|------|------|------|------|
| text | string | body | 是 | 上下文文本 |
| question | string | body | 是 | 问题 |
| model | string | body | 否 | 模型名称（默认：xunzi-qwen2） |

#### 示例请求

```json
{
  "text": "子曰：学而时习之，不亦说乎？有朋自远方来，不亦乐乎？人不知而不愠，不亦君子乎？",
  "question": "这句话的作者是谁？",
  "model": "xunzi-qwen2"
}
```

#### 示例响应

```json
{
  "success": true,
  "data": {
    "answer": "这句话的作者是孔子，出自《论语·学而》。",
    "confidence": 0.98
  }
}
```

### 6.3 自动标注

**接口名称**：自动标注
**请求方法**：POST
**请求路径**：`/ai/api/auto-annotate`
**认证要求**：否

#### 请求参数

| 参数名 | 类型 | 位置 | 必填 | 描述 |
|--------|------|------|------|------|
| text | string | body | 是 | 待标注的文本 |

#### 示例请求

```json
{
  "text": "子曰：学而时习之，不亦说乎？有朋自远方来，不亦乐乎？人不知而不愠，不亦君子乎？"
}
```

#### 示例响应

```json
{
  "success": true,
  "data": {
    "annotations": [
      {
        "start": 2,
        "end": 3,
        "label": "人物",
        "text": "子"
      },
      {
        "start": 15,
        "end": 17,
        "label": "人物",
        "text": "朋自"
      }
    ]
  }
}
```

## 7. 可视化API

### 7.1 获取可视化总览

**接口名称**：获取可视化总览
**请求方法**：GET
**请求路径**：`/api/visualization/overview`
**认证要求**：是

#### 请求参数

| 参数名 | 类型 | 位置 | 必填 | 描述 |
|--------|------|------|------|------|
| documentId | string | query | 是 | 文档ID |

#### 示例响应

```json
{
  "success": true,
  "data": {
    "totalChars": 45,
    "labelCounts": {
      "人物": 2,
      "地名": 0,
      "时间": 0,
      "器物": 0,
      "概念": 0
    }
  }
}
```

### 7.2 获取地点可视化数据

**接口名称**：获取地点可视化数据
**请求方法**：GET
**请求路径**：`/api/visualization/locations`
**认证要求**：是

#### 请求参数

| 参数名 | 类型 | 位置 | 必填 | 描述 |
|--------|------|------|------|------|
| documentId | string | query | 是 | 文档ID |

#### 示例响应

```json
{
  "success": true,
  "data": {
    "locations": [
      {
        "id": 3,
        "document_id": "1112223334",
        "type": "entity",
        "start": 16,
        "end": 18,
        "label": "地名",
        "text": "远方",
        "created_at": "2023-01-01 00:00:00",
        "updated_at": "2023-01-01 00:00:00"
      }
    ]
  }
}
```

### 7.3 获取人物关系数据

**接口名称**：获取人物关系数据
**请求方法**：GET
**请求路径**：`/api/visualization/relationships`
**认证要求**：是

#### 请求参数

| 参数名 | 类型 | 位置 | 必填 | 描述 |
|--------|------|------|------|------|
| documentId | string | query | 是 | 文档ID |

#### 示例响应

```json
{
  "success": true,
  "data": {
    "relationships": [
      {
        "id": 1,
        "document_id": "1112223334",
        "type": "entity",
        "start": 2,
        "end": 3,
        "label": "人物",
        "text": "子",
        "created_at": "2023-01-01 00:00:00",
        "updated_at": "2023-01-01 00:00:00"
      },
      {
        "id": 2,
        "document_id": "1112223334",
        "type": "entity",
        "start": 15,
        "end": 17,
        "label": "人物",
        "text": "朋自",
        "created_at": "2023-01-01 00:00:00",
        "updated_at": "2023-01-01 00:00:00"
      }
    ]
  }
}
```

### 7.4 获取时间轴数据

**接口名称**：获取时间轴数据
**请求方法**：GET
**请求路径**：`/api/visualization/timeline`
**认证要求**：是

#### 请求参数

| 参数名 | 类型 | 位置 | 必填 | 描述 |
|--------|------|------|------|------|
| documentId | string | query | 是 | 文档ID |

#### 示例响应

```json
{
  "success": true,
  "data": {
    "timeline": []
  }
}
```

## 8. 地名坐标缓存API

### 8.1 查询地名坐标缓存

**接口名称**：查询地名坐标缓存
**请求方法**：GET
**请求路径**：`/api/visualization/locations/cache`
**认证要求**：是

#### 请求参数

| 参数名 | 类型 | 位置 | 必填 | 描述 |
|--------|------|------|------|------|
| name | string | query | 是 | 地名 |

#### 示例响应

```json
{
  "success": true,
  "data": {
    "id": 1,
    "name": "远方",
    "lng": 116.4074,
    "lat": 39.9042,
    "matched_name": "远方",
    "confidence": 0.8,
    "created_at": "2023-01-01 00:00:00",
    "updated_at": "2023-01-01 00:00:00"
  }
}
```

### 8.2 更新地名坐标缓存

**接口名称**：更新地名坐标缓存
**请求方法**：POST
**请求路径**：`/api/visualization/locations/cache`
**认证要求**：是

#### 请求参数

| 参数名 | 类型 | 位置 | 必填 | 描述 |
|--------|------|------|------|------|
| name | string | body | 是 | 地名 |
| lng | number | body | 是 | 经度 |
| lat | number | body | 是 | 纬度 |
| matchedName | string | body | 否 | 匹配的地名 |
| confidence | number | body | 否 | 匹配置信度 |

#### 示例请求

```json
{
  "name": "远方",
  "lng": 116.4074,
  "lat": 39.9042,
  "matchedName": "远方",
  "confidence": 0.8
}
```

#### 示例响应

```json
{
  "success": true,
  "message": "地名坐标缓存已更新"
}
```

## 9. 健康检查API

### 9.1 健康检查

**接口名称**：健康检查
**请求方法**：GET
**请求路径**：`/api/health`
**认证要求**：否

#### 示例响应

```json
{
  "status": "ok",
  "service": "User Management Server (Express + MySQL)",
  "database": "connected",
  "timestamp": "2023-01-01T00:00:00.000Z"
}
```

## 10. 错误码说明

| 错误码 | 描述 |
|--------|------|
| 400 | 请求参数错误 |
| 401 | 未授权，Token无效或过期 |
| 403 | 禁止访问，没有权限 |
| 404 | 资源不存在 |
| 409 | 资源冲突，如用户名已存在 |
| 500 | 服务器内部错误 |
| 502 | 网关错误，代理请求失败 |

## 11. 示例代码

### 11.1 JavaScript示例

```javascript
// 使用Fetch API调用登录接口
async function login(username, password) {
  const response = await fetch('http://localhost:5002/api/login', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ username, password })
  });
  
  const data = await response.json();
  if (data.success) {
    // 保存Token到本地存储
    localStorage.setItem('token', data.token);
    localStorage.setItem('currentUser', JSON.stringify(data.user));
    return data.user;
  } else {
    throw new Error(data.error);
  }
}

// 使用Fetch API调用需要认证的接口
async function getProjects() {
  const token = localStorage.getItem('token');
  const response = await fetch('http://localhost:5002/api/projects?userId=1', {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });
  
  const data = await response.json();
  if (data.success) {
    return data.projects;
  } else {
    throw new Error(data.error);
  }
}
```

### 11.2 Python示例

```python
import requests

# 登录获取Token
def login(username, password):
    url = 'http://localhost:5002/api/login'
    data = {'username': username, 'password': password}
    response = requests.post(url, json=data)
    response_data = response.json()
    if response_data['success']:
        return response_data['token']
    else:
        raise Exception(response_data['error'])

# 使用Token调用需要认证的接口
def get_projects(token, user_id):
    url = f'http://localhost:5002/api/projects?userId={user_id}'
    headers = {'Authorization': f'Bearer {token}'}
    response = requests.get(url, headers=headers)
    response_data = response.json()
    if response_data['success']:
        return response_data['projects']
    else:
        raise Exception(response_data['error'])

# 示例用法
token = login('zontiks', '123456')
projects = get_projects(token, 1)
print(projects)
```

## 12. 附录

### 12.1 实体标签列表

| 标签 | 描述 |
|------|------|
| 人物 | 文本中的人物名称 |
| 地名 | 文本中的地理位置 |
| 时间 | 文本中的时间信息 |
| 器物 | 文本中的物品、工具等 |
| 概念 | 文本中的抽象概念、思想等 |

### 12.2 关系类型列表

| 类型 | 描述 |
|------|------|
| 师徒 | 师徒关系 |
| 父子 | 父子关系 |
| 兄弟 | 兄弟关系 |
| 朋友 | 朋友关系 |
| 君臣 | 君臣关系 |
| 因果 | 因果关系 |
| 递进 | 递进关系 |
| 转折 | 转折关系 |

### 12.3 服务端口列表

| 服务 | 端口 |
|------|------|
| 前端服务 | 3000 |
| 用户服务 | 5002 |
| 分词服务 | 5003 |
| AI服务 | 5004 |

## 13. 更新日志

| 日期 | 版本 | 更新内容 |
|------|------|----------|
| 2023-01-01 | v1.0 | 初始版本 |
| 2023-01-15 | v1.1 | 添加关系标注支持 |
| 2023-02-01 | v1.2 | 添加数据可视化API |
| 2023-02-15 | v1.3 | 优化AI服务接口 |
| 2023-03-01 | v1.4 | 添加地名坐标缓存功能 |