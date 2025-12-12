# 实现AI关系标注功能

## 1. 需求分析
目前前端已有关系标注组件 `RelationAnnotator`，但只能手动添加关系。需要扩展为支持AI自动生成关系标注。

## 2. 实现方案

### 2.1 后端AI服务集成
在 `aiService.js` 中添加自动关系标注功能：
- 添加 `autoAnnotateRelations` 函数，调用AI服务生成关系标注
- 支持处理实体标注数据，生成实体间的关系

### 2.2 前端组件修改
修改 `RelationAnnotator` 组件：
- 添加AI辅助标注按钮
- 实现AI生成关系的展示和确认机制
- 支持批量添加AI生成的关系

### 2.3 集成到Editor页面
在 `Editor.jsx` 中：
- 确保AI生成的关系能正确保存到后端
- 处理AI生成关系的冲突和重复

## 3. 技术实现

### 3.1 AI服务调用
- 利用现有的AI API `api.ai.askQuestion` 或 `api.ai.autoAnnotate`
- 设计合适的提示词，让AI生成符合要求的关系数据
- 支持处理长文本和大量实体

### 3.2 数据格式设计
AI生成的关系数据格式：
```json
[
  {
    "entity1Index": 0,
    "entity2Index": 1,
    "relationName": "父子关系"
  }
]
```

### 3.3 交互流程
1. 用户在实体标注完成后，点击"AI辅助标注"按钮
2. 系统调用AI服务生成关系建议
3. 展示生成的关系列表，用户可选择确认或修改
4. 用户确认后，批量添加关系标注

## 4. 代码修改点

1. **`src/services/aiService.js`**：添加 `autoAnnotateRelations` 函数
2. **`src/components/editor/RelationAnnotator.jsx`**：添加AI辅助标注按钮和相关逻辑
3. **`src/pages/Editor.jsx`**：确保AI生成关系能正确保存
4. **`src/styles/components/RelationAnnotator.css`**：添加相关样式

## 5. 测试和优化
- 测试不同文本长度下的AI生成效果
- 优化AI提示词，提高关系生成的准确性
- 处理实体数量过多时的性能问题
- 确保用户体验流畅，添加加载状态和错误处理