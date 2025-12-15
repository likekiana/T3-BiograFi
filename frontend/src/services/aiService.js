// src/services/aiService.js
// AI 服务

import api from './api';

export const aiService = {
  /**
   * 古文解析
   * @param {string} text - 要解析的文本
   * @param {string} model - 模型名称
   * @returns {Promise<string>} 解析结果
   */
  async analyzeClassicalText(text, model = 'deepseek-chat', roomId = 0) {
    try {
      const result = await api.ai.analyzeText(text, model, roomId);
      return result.result || '';
    } catch (error) {
      console.error('古文解析失败:', error);
      throw new Error(`解析失败: ${error.message}`);
    }
  },

  /**
   * 古文答疑
   * @param {string} text - 古文文本
   * @param {string} question - 问题
   * @param {string} model - 模型名称
   * @returns {Promise<string>} 答案
   */
  async askQuestion(text, question, model = 'deepseek-chat', roomId = 0) {
    try {
      const result = await api.ai.askQuestion(text, question, model, roomId);
      return result.result || '';
    } catch (error) {
      console.error('古文答疑失败:', error);
      throw new Error(`答疑失败: ${error.message}`);
    }
  },

  /**
   * 自动实体标注
   * @param {string} text - 要标注的文本
   * @param {string} model - 使用的模型
   * @returns {Promise<Array>} 标注结果
   */
  async autoAnnotateEntities(text, model = 'xunzi-qwen2', roomId = 0) {
    try {
      console.log('发送自动标注请求，文本长度:', text.length, '模型:', model);
      
      // 对于长文本，进行分块处理
      if (text.length > 500) {
        console.log('文本过长，启用分块处理');
        return await this.autoAnnotateLongText(text, model, 500, 100, roomId);
      }
      
      const result = await api.ai.autoAnnotate(text, model, roomId);
      console.log('AI 返回结果:', result);
      
      if (!result || !result.annotations) {
        throw new Error('AI返回的数据格式不正确');
      }
      
      return result.annotations;
    } catch (error) {
      console.error('自动标注失败:', error);
      
      // 提供更友好的错误信息
      if (error.message.includes('格式无法解析')) {
        throw new Error('AI服务返回的数据格式有误，可能是文本过长导致的。请尝试使用较短的文本，或联系系统管理员。');
      } else if (error.message.includes('timed out') || error.message.includes('timeout')) {
        throw new Error('AI服务响应超时，可能是文本过长或服务器繁忙。请稍后再试或缩短文本长度。');
      } else if (error.message.includes('network') || error.message.includes('Network')) {
        throw new Error('网络连接错误，请检查网络连接后重试。');
      }
      
      throw new Error(`自动标注失败: ${error.message}`);
    }
  },

  /**
   * 长文本自动标注（分块处理）- 修复版本
   * @param {string} text - 长文本
   * @param {string} model - 模型名称
   * @param {number} chunkSize - 分块大小，默认500字符
   * @param {number} overlap - 重叠字符数，默认100字符
   * @returns {Promise<Array>} 标注结果
   */
  async autoAnnotateLongText(text, model = 'xunzi-qwen2', chunkSize = 500, overlap = 100, roomId = 0) {
    try {
      console.log(`开始分块处理长文本，总长度: ${text.length}, 分块大小: ${chunkSize}, 重叠: ${overlap}`);
      
      const chunks = [];
      let start = 0;
      
      // 修复分块逻辑 - 确保分块大小合理
      while (start < text.length) {
        let end = Math.min(start + chunkSize, text.length);
        
        // 如果是最后一块，直接使用文本末尾
        if (end === text.length) {
          const chunk = text.slice(start, end);
          if (chunk.trim().length > 0) {
            chunks.push({
              text: chunk,
              start: start,
              end: end,
              index: chunks.length
            });
            console.log(`最后分块 ${chunks.length}: 位置 ${start}-${end}, 长度: ${chunk.length}`);
          }
          break;
        }
        
        // 尝试在句子边界处截断
        let boundaryFound = false;
        const boundaryChars = ['。', '.', '！', '!', '？', '?', '；', ';', '，', ',', ' ', '\n', '\r'];
        
        for (const char of boundaryChars) {
          const lastIndex = text.lastIndexOf(char, end - 1);
          if (lastIndex > start + (chunkSize * 0.5)) {
            end = lastIndex + char.length;
            boundaryFound = true;
            break;
          }
        }
        
        // 如果没找到合适边界，尝试找汉字边界
        if (!boundaryFound && end < text.length) {
          // 避免在汉字中间截断
          const charCode = text.charCodeAt(end);
          if (charCode >= 0x4E00 && charCode <= 0x9FFF) {
            // 如果是汉字，往前找一个非汉字或标点
            for (let i = end - 1; i > start + (chunkSize * 0.7); i--) {
              const prevChar = text.charAt(i);
              if (!prevChar.match(/[\u4e00-\u9fff]/)) {
                end = i + 1;
                boundaryFound = true;
                break;
              }
            }
          }
        }
        
        // 确保分块不会太小（最小20字符）
        const minChunkSize = 20;
        if (end - start < minChunkSize && end < text.length) {
          // 如果分块太小，向后扩展直到达到最小大小
          end = Math.min(start + minChunkSize, text.length);
        }
        
        const chunk = text.slice(start, end);
        
        // 跳过过小的分块
        if (chunk.trim().length >= minChunkSize) {
          chunks.push({
            text: chunk,
            start: start,
            end: end,
            index: chunks.length
          });
          
          console.log(`分块 ${chunks.length}: 位置 ${start}-${end}, 长度: ${chunk.length}`);
        }
        
        // 关键修复：计算下一个分块的开始位置
        // 使用 end - overlap，但确保不会倒退
        const nextStart = Math.max(start + 1, end - overlap);
        
        // 确保有向前进展
        if (nextStart <= start) {
          console.warn(`分块 ${chunks.length} 无法前进，强制前进到 ${end}`);
          start = end;
        } else {
          start = nextStart;
        }
        
        // 如果已经到达文本末尾，退出循环
        if (start >= text.length) {
          break;
        }
        
        // 安全限制：最多分200个块
        if (chunks.length >= 200) {
          console.warn('已达到最大分块数200，停止分块');
          break;
        }
      }
      
      console.log(`共分成 ${chunks.length} 个块`);
      
      if (chunks.length === 0) {
        console.log('没有创建任何分块，处理前500字符');
        const shortText = text.substring(0, Math.min(500, text.length));
        const result = await api.ai.autoAnnotate(shortText, model, roomId);
        return result?.annotations || [];
      }
      
      // 串行处理
      let allAnnotations = [];
      let processedCount = 0;
      
      for (let i = 0; i < chunks.length; i++) {
        const chunk = chunks[i];
        processedCount++;
        console.log(`处理块 ${i + 1}/${chunks.length}: 位置 ${chunk.start}-${chunk.end}, 长度: ${chunk.text.length}`);
        
        try {
          // 添加延迟
          if (i > 0) {
            await new Promise(resolve => setTimeout(resolve, 200));
          }
          
          const result = await api.ai.autoAnnotate(chunk.text, model, roomId);
          
          if (result && result.annotations) {
            const adjustedAnnotations = result.annotations.map(ann => ({
              ...ann,
              start: ann.start + chunk.start,
              end: ann.end + chunk.start
            }));
            
            allAnnotations = [...allAnnotations, ...adjustedAnnotations];
            console.log(`块 ${i + 1} 获得 ${adjustedAnnotations.length} 个标注`);
          }
        } catch (error) {
          console.error(`处理块 ${i + 1} 失败:`, error.message);
        }
        
        // 进度反馈
        if ((i + 1) % 10 === 0) {
          console.log(`已处理 ${i + 1}/${chunks.length} 个块`);
          await new Promise(resolve => setTimeout(resolve, 300));
        }
      }
      
      // 去重处理
      const uniqueAnnotations = this.removeDuplicateAnnotations(allAnnotations);
      console.log(`分块处理完成，共获得 ${allAnnotations.length} 个标注，去重后 ${uniqueAnnotations.length} 个`);
      
      return uniqueAnnotations;
      
    } catch (error) {
      console.error('长文本自动标注失败:', error);
      throw new Error(`长文本标注失败: ${error.message}`);
    }
  },

  /**
   * 安全版本的自动实体标注
   * @param {string} text - 要标注的文本
   * @param {string} model - 使用的模型
   * @param {function} onProgress - 进度回调函数
   * @param {AbortSignal} signal - 取消信号
   * @returns {Promise<Array>} 标注结果
   */
  async autoAnnotateEntitiesSafe(text, model = 'xunzi-qwen2', onProgress = null, signal = null, roomId = 0) {
    try {
      console.log('安全版本自动标注，文本长度:', text.length, '模型:', model);
      
      // 检查取消信号
      if (signal?.aborted) {
        throw new DOMException('请求已取消', 'AbortError');
      }
      
      // 对于短文本，直接调用原方法
      if (text.length <= 500) {
        if (onProgress) onProgress(1, 1);
        return await this.autoAnnotateEntities(text, model, roomId);
      }
      
      // 使用小分块处理（500字符）
      const result = await this.autoAnnotateLongText(text, model, 500, 100, roomId);
      
      if (onProgress) onProgress(1, 1);
      return result;
      
    } catch (error) {
      console.error('安全自动标注失败:', error);
      throw error;
    }
  },

  /**
   * 移除重复的标注
   * @param {Array} annotations - 标注数组
   * @returns {Array} 去重后的标注数组
   */
  removeDuplicateAnnotations(annotations) {
    const uniqueMap = new Map();
    
    annotations.forEach(ann => {
      const key = `${ann.start}-${ann.end}-${ann.label}-${ann.text}`;
      if (!uniqueMap.has(key)) {
        uniqueMap.set(key, ann);
      }
    });
    
    return Array.from(uniqueMap.values());
  },

  /**
   * 获取可用模型列表
   * @returns {Array} 模型列表
   */
  getAvailableModels() {
    return [
      {
        id: 'xunzi-qwen2',
        name: '荀子古汉语大模型',
        description: '云端部署的荀子大模型，专为古汉语设计，古文理解更准确',
        recommended: true
      },
      {
        id: 'deepseek-chat',
        name: 'DeepSeek-V3',
        description: '最新V3模型，速度快，效果好'
      },
      {
        id: 'deepseek-reasoner',
        name: 'DeepSeek-R1',
        description: '推理模型，深度分析，速度较慢'
      }
    ];
  },

  /**
   * 自动关系标注 
   * @param {string} text - 要标注的文本
   * @param {Array} entityAnnotations - 实体标注列表
   * @param {string} model - 使用的模型
   * @returns {Promise<Array>} 关系标注结果
   */
  async autoAnnotateRelations(text, entityAnnotations, model = 'xunzi-qwen2', roomId = 0) {
    try {
      console.log('发送自动关系标注请求，实体数量:', entityAnnotations.length, '模型:', model);
      
      // 如果实体数量少于2，无法生成关系
      if (entityAnnotations.length < 2) {
        return [];
      }
      
      // 准备实体信息，增强上下文信息
      const entitiesInfo = entityAnnotations.map((ann, index) => {
        // 提取实体前后各50字符的上下文，帮助AI理解
        const contextStart = Math.max(0, ann.start - 50);
        const contextEnd = Math.min(text.length, ann.end + 50);
        const context = text.substring(contextStart, contextEnd);
        return `${index + 1}. [${ann.label || '其他'}] "${ann.text || ''}" (上下文: "${context}...")`;
      }).join('\n');
      
      // 优化提示词，针对古代人物传记特点设计
      const prompt = `
你现在是一位古代人物传记研究专家，需要分析古代文献中人物实体之间的关系。请严格按照要求进行分析：

### 文本信息
这是一段古代人物传记文本，主要记载了人物的生平事迹、家族关系、社会交往等内容：

${text}

### 已识别的人物实体
${entitiesInfo}

### 关系类型示例（古代人物传记常见）
请重点关注以下类型的关系，但不限于这些。每个关系类型都有具体的古代传记示例：

1. **家族关系**
   - 父子关系：如“孔子”与“孔鲤”
   - 母子关系：如“孟子”与“仉氏”
   - 兄弟关系：如“曹丕”与“曹植”
   - 祖孙关系：如“司马懿”与“司马炎”
   - 夫妻关系：如“诸葛亮”与“黄月英”
   - 叔侄关系：如“曹操”与“夏侯渊”（表兄弟关系）
   - 远亲关系：如“苏轼”与“苏辙”（兄弟）

2. **社会关系**
   - 师生关系：如“韩愈”与“李翱”
   - 朋友关系：如“李白”与“杜甫”
   - 上下级关系：如“曾国藩”与“李鸿章”
   - 同袍关系：如“关羽”与“张飞”
   - 同事关系：如“王安石”与“司马光”（同朝为官）
   - 知己关系：如“伯牙”与“子期”

3. **身份关系**
   - 君臣关系：如“唐太宗”与“魏征”
   - 主仆关系：如“卫青”与“汉武帝”（早期为主仆，后为君臣）
   - 师徒关系：如“鬼谷子”与“苏秦”
   - 主客关系：如“孟尝君”与“冯谖”
   - 从属关系：如“岳飞”与“宋高宗”

4. **活动关系**
   - 共事关系：如“房玄龄”与“杜如晦”（房谋杜断）
   - 交往关系：如“柳宗元”与“刘禹锡”（永贞革新伙伴）
   - 敌对关系：如“刘邦”与“项羽”
   - 合作关系：如“孙权”与“刘备”（赤壁之战）
   - 对立关系：如“王安石”与“欧阳修”（变法争论）

5. **称谓关系**
   - 字号关系：如“李白”与“李太白”（字太白）
   - 官职称谓：如“杜甫”与“杜工部”（曾任工部员外郎）
   - 谥号关系：如“范仲淹”与“范文正公”（谥号文正）
   - 别称关系：如“苏轼”与“苏东坡”（号东坡居士）

6. **其他重要关系**
   - 同乡关系：如“康有为”与“梁启超”（广东同乡）
   - 同年关系：如“韩愈”与“柳宗元”（同榜进士）
   - 世交关系：如“杨家将”与“潘美”（世代交往）
   - 举荐关系：如“左光斗”与“史可法”
   - 赏识关系：如“萧何”与“韩信”（萧何月下追韩信）

### 输出格式要求
请根据文本内容，分析实体之间明确存在的关系，并按照以下JSON格式返回结果：

{
  "relations": [
    {
      "entity1Index": 0,      // 第一个实体在实体列表中的索引（从0开始）
      "entity2Index": 1,      // 第二个实体在实体列表中的索引（从0开始）
      "relationName": "父子关系"  // 实体之间的关系名称，必须简洁准确
    }
  ]
}

### 重要注意事项
1. **只返回JSON格式**，不要包含任何解释、说明或其他文本
2. **严格基于原文**：只分析文本中明确提到的关系，不要进行推理或猜测
3. **关系名称准确**：使用古代人物传记中常用的关系术语，保持简洁明了
4. **避免重复**：每个关系只返回一次，不要重复标注
5. **索引有效**：确保实体索引在有效范围内，且entity1Index≠entity2Index
6. **注意方向**：关系是有方向的，如“父子关系”中，entity1是父，entity2是子
7. **人物为主**：重点关注人物实体之间的关系，兼顾与其他实体的关系
8. **古代语境**：结合古代社会背景理解关系，如“君臣”、“师徒”等特定称谓

请开始分析并输出JSON结果：
`;


      
      // 调用AI服务
      const result = await api.ai.askQuestion(text, prompt, model, roomId);
      console.log('AI关系标注返回结果:', result);
      
      // 提取JSON结果
      let relationsResult;
      try {
        // 清理可能的markdown代码块
        const cleanedResult = result.result.replace(/```json\n|\n```|```/g, '').trim();
        relationsResult = JSON.parse(cleanedResult);
      } catch (jsonError) {
        console.error('AI关系标注JSON解析失败:', jsonError);
        console.log('AI返回的原始内容:', result.result);
        return [];
      }
      
      // 验证结果格式
      if (!relationsResult.relations || !Array.isArray(relationsResult.relations)) {
        console.error('AI关系标注结果格式不正确:', relationsResult);
        return [];
      }
      
      // 关系合理性验证函数
      const validateRelation = (rel) => {
        // 1. 基本有效性检查
        if (rel.entity1Index < 0 || 
            rel.entity1Index >= entityAnnotations.length || 
            rel.entity2Index < 0 || 
            rel.entity2Index >= entityAnnotations.length ||
            rel.entity1Index === rel.entity2Index ||
            !rel.relationName || !rel.relationName.trim()) {
          return false;
        }
        
        const entity1 = entityAnnotations[rel.entity1Index];
        const entity2 = entityAnnotations[rel.entity2Index];
        
        // 2. 实体类型合理性检查
        const personEntityTypes = ['人物', 'PERSON', 'person'];
        const isEntity1Person = personEntityTypes.includes(entity1.label || '');
        const isEntity2Person = personEntityTypes.includes(entity2.label || '');
        
        // 家族关系、社会关系、身份关系等必须是人物之间的关系
        const personOnlyRelations = ['父子', '母子', '兄弟', '祖孙', '夫妻', '师生', '朋友', '君臣', '师徒', '主仆'];
        const relationType = rel.relationName;
        const needsPersonEntities = personOnlyRelations.some(type => relationType.includes(type));
        
        if (needsPersonEntities && (!isEntity1Person || !isEntity2Person)) {
          console.warn('关系类型需要人物实体:', rel);
          return false;
        }
        
        // 3. 上下文相关性检查 - 确保关系在文本中有相关提及
        const context1 = text.substring(
          Math.max(0, entity1.start - 100), 
          Math.min(text.length, entity1.end + 100)
        );
        const context2 = text.substring(
          Math.max(0, entity2.start - 100), 
          Math.min(text.length, entity2.end + 100)
        );
        
        // 检查两个实体的上下文是否有重叠或关联
        const hasContextOverlap = context1.includes(entity2.text) || context2.includes(entity1.text);
        const entitiesInSameParagraph = Math.abs(entity1.start - entity2.start) < 500;
        
        if (!hasContextOverlap && !entitiesInSameParagraph) {
          console.warn('实体上下文无关联，可能关系错误:', rel);
          return false;
        }
        
        return true;
      };
      
      // 处理结果，确保索引有效且关系合理
      const validRelations = relationsResult.relations.filter(rel => {
        const isValid = validateRelation(rel);
        if (!isValid) {
          console.warn('无效或不合理的关系:', rel);
        }
        return isValid;
      });
      
      // 去重处理
      const uniqueRelations = this.removeDuplicateRelations(validRelations);
      console.log(`AI关系标注完成，共生成 ${relationsResult.relations.length} 个关系，验证后 ${validRelations.length} 个有效，去重后 ${uniqueRelations.length} 个`);
      
      return uniqueRelations;
      
    } catch (error) {
      console.error('自动关系标注失败:', error);
      throw new Error(`关系标注失败: ${error.message}`);
    }
  },
  
  /**
   * 移除重复的关系
   * @param {Array} relations - 关系数组
   * @returns {Array} 去重后的关系数组
   */
  removeDuplicateRelations(relations) {
    const uniqueMap = new Map();
    
    relations.forEach(rel => {
      // 关系是有方向的，所以 (A,B,关系) 和 (B,A,关系) 是不同的关系
      const key = `${rel.entity1Index}-${rel.entity2Index}-${rel.relationName}`;
      if (!uniqueMap.has(key)) {
        uniqueMap.set(key, rel);
      }
    });
    
    return Array.from(uniqueMap.values());
  }
};