# 实现古文解析对话历史localStorage缓存功能

## 目标
将古文解析模块的对话历史保存到浏览器localStorage中，确保页面刷新后对话历史不会丢失。

## 实现步骤

### 1. 修改ClassicalAnalysis组件

#### 1.1 组件挂载时读取缓存
- 在组件挂载时，从localStorage读取之前保存的对话历史
- 使用useEffect钩子实现

#### 1.2 对话历史更新时写入缓存
- 在setQaHistory调用后，将最新的对话历史写入localStorage
- 确保每次对话历史变化都能及时保存

#### 1.3 添加localStorage键名常量
- 使用唯一的键名标识该组件的对话历史，避免与其他功能冲突

#### 1.4 处理localStorage数据格式
- 确保数据在保存前正确序列化（JSON.stringify）
- 确保数据在读取后正确反序列化（JSON.parse）

#### 1.5 考虑添加清除历史功能（可选）
- 为用户提供清除对话历史的选项
- 清除历史时同时更新localStorage

### 2. 代码修改细节

#### 2.1 引入useEffect钩子
```javascript
import React, { useState, useEffect } from 'react';
```

#### 2.2 定义localStorage键名
```javascript
const QA_HISTORY_KEY = 'classical_analysis_qa_history';
```

#### 2.3 添加useEffect读取缓存
```javascript
useEffect(() => {
  // 从localStorage读取对话历史
  const savedHistory = localStorage.getItem(QA_HISTORY_KEY);
  if (savedHistory) {
    try {
      setQaHistory(JSON.parse(savedHistory));
    } catch (error) {
      console.error('Failed to parse saved QA history:', error);
    }
  }
}, []);
```

#### 2.4 添加useEffect写入缓存
```javascript
useEffect(() => {
  // 将对话历史保存到localStorage
  localStorage.setItem(QA_HISTORY_KEY, JSON.stringify(qaHistory));
}, [qaHistory]);
```

#### 2.5 优化对话历史更新逻辑
- 确保每次添加新对话时，localStorage都会被更新

### 3. 测试与验证

#### 3.1 功能测试
- 测试对话历史在页面刷新后是否仍然存在
- 测试多次对话后，历史记录是否正确保存
- 测试清除历史功能（如果实现）是否正常工作

#### 3.2 性能考虑
- 对话历史数据量通常不会很大，localStorage性能足够
- 考虑在组件卸载时不需要特殊处理，因为localStorage是持久化的

## 预期效果

1. 用户在使用古文解析功能时，所有问答对话都会被保存到浏览器localStorage
2. 页面刷新后，之前的对话历史会自动恢复
3. 对话历史的保存和读取对用户透明，不影响正常使用体验
4. 数据存储安全可靠，符合浏览器存储规范

## 技术要点

- 使用React的useEffect钩子管理副作用
- 正确处理localStorage的数据序列化和反序列化
- 确保localStorage操作的异常处理
- 遵循React最佳实践，保持组件状态与外部存储同步