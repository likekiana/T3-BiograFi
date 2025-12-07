// src/services/relationshipAIService.js

import axios from 'axios';
const AI_BASE_URL = 'http://localhost:5004';

// 人物关系图专用的AI分析服务

export const relationshipAIService = {
    
    /**
     * 智能分析人物关系数据
     * 这是核心功能：使用AI分析人物之间的关系强度、互动类型等
     */
    async analyzeRelationships(content, annotations) {
        
        try {
            const persons = annotations
                .filter(ann => ann.label === '人物')
                .map(ann => ann.text)
                .filter((value, index, self) => self.indexOf(value) === index);
            
            if (persons.length === 0) {
                return this.generateFallbackData(content, annotations);
            }
            
            const times = annotations
                .filter(ann => ann.label === '时间')
                .map(ann => ann.text)
                .filter((value, index, self) => self.indexOf(value) === index);
            
            console.log('关系分析参数:', { 
                personsCount: persons.length,
                timesCount: times.length 
            });

            const prompt = `
请根据以下文本中人物的互动和关系：
文本内容：
"""
${content.substring(0, 3000)}
"""
文中包含的人物：${persons.join('、')}
${times.length > 0 ? `文中包含的时间：${times.join('、')}` : ''}

请分析：
1. 主要人物及其关系网络
2. 人物之间的互动关系类型（如：亲属、朋友、同事、敌人、上下级等）
3. 关系强度（1-10分，1表示关系最弱，10表示关系最密切）
4. 正面和负面互动情况
5. 关系随时间的变化（如果有时间信息）

请以JSON格式返回分析结果，格式如下：
{
  "analysis": "一段总体分析文字",
  "person_activities": [
    {
      "person": "人物名",
      "activities": [
        {
          "relationship": "与相关人物的关系",
          "intensity": 关系强度（1-10分，1表示最弱，10表示最强）,
          "times": ["相关时间点1", "相关时间点2"],
          "description": "简要描述人物之间的关系",
          "Good": "正面互动描述",
          "Bad": "负面互动描述",
          "goodIntensity": 正面互动强度（1-5分）,
          "badIntensity": 负面互动强度（1-5分）
        }
      ]
    }
  ]
}

注意：
1. 只返回JSON，确保JSON格式正确无误，不要有其他内容。
2. 如果文本中没有明确信息，请根据上下文进行合理推断。
3. intensity应为1-10之间的整数，至少为1。
4. goodIntensity和badIntensity应为1-5之间的整数。
5. 如果找不到时间信息，times可以为空数组。
6. Good和Bad字段可以为空字符串。
7. 每个人物与其他所有人物的关系都应该包含在activities中。
8. relationship字段应明确描述关系类型，如："与XX的父子关系"、"与XX的同事关系"等。
`;
            
            // 只调用通用QA接口，不再尝试关系分析专用接口
            let response;
            response = await axios.post(`${AI_BASE_URL}/api/qa`, {
                text: content.substring(0, 3000),
                question: prompt
            }, {
                timeout: 30000
            });
            
            const result = response.data.result || response.data;
            
            try {
                // 尝试解析AI返回的JSON
                let jsonResult;
                // 清理可能的markdown代码块
                const cleaned = result.replace(/```json\n|\n```|```/g, '').trim();
                jsonResult = JSON.parse(cleaned);
                
                // 验证返回的数据结构
                if (!jsonResult.person_activities || !Array.isArray(jsonResult.person_activities)) {
                    console.warn('AI返回的JSON格式不正确，缺少person_activities数组');
                    return this.generateFallbackData(content, annotations);
                }
                
                // 确保所有必需字段都有值
                jsonResult.person_activities.forEach(personActivity => {
                    personActivity.activities.forEach(activity => {
                        activity.intensity = Math.min(Math.max(activity.intensity || 1, 1), 10);
                        activity.times = activity.times || [];
                        activity.description = activity.description || `${personActivity.person}与${activity.relationship.split('的')[1] || '某人'}的关系`;
                        activity.Good = activity.Good || '';
                        activity.Bad = activity.Bad || '';
                        activity.goodIntensity = Math.min(Math.max(activity.goodIntensity || 0, 0), 5);
                        activity.badIntensity = Math.min(Math.max(activity.badIntensity || 0, 0), 5);
                    });
                });
                
                return jsonResult;
                
            } catch (jsonError) {
                console.error('AI返回JSON解析失败:', jsonError);
                console.log('AI返回的原始内容:', result);
                
                // 如果JSON解析失败，使用备用算法
                return this.generateFallbackData(content, annotations);
            }
            
        } catch (error) {
            console.error('AI关系分析失败:', error);
            // 返回备用数据
            return this.generateFallbackData(content, annotations);
        }
    },
    
    /**
     * 备用算法：当AI分析失败时使用基于规则的分析
     */
    generateFallbackData(content, annotations) {
        console.log('使用备用算法生成关系数据');
        
        const persons = annotations
            .filter(ann => ann.label === '人物')
            .map(ann => ann.text)
            .filter((value, index, self) => self.indexOf(value) === index);
        
        if (persons.length === 0) {
            return {
                analysis: '没有找到人物数据',
                person_activities: []
            };
        }
        
        // 基于文本的简单分析
        const sentences = content.split(/[。！？.!?]/).filter(s => s.trim());
        
        // 计算人物出现频率
        const personFrequency = {};
        persons.forEach(person => {
            const frequency = sentences.filter(s => s.includes(person)).length;
            personFrequency[person] = frequency;
        });
        
        // 分析人物关系
        const personActivities = persons.map(person => {
            const activities = [];
            
            persons.forEach(otherPerson => {
                if (otherPerson !== person) {
                    // 统计在同一句子中出现的次数
                    let coOccurrence = 0;
                    sentences.forEach(sentence => {
                        if (sentence.includes(person) && sentence.includes(otherPerson)) {
                            coOccurrence++;
                        }
                    });
                    
                    if (coOccurrence > 0) {
                        // 计算关系强度
                        const intensity = Math.min(coOccurrence * 2, 10);
                        const relationshipType = this.inferRelationshipType(content, person, otherPerson);
                        
                        // 简单判断正负面互动
                        const interactionText = sentences
                            .filter(s => s.includes(person) && s.includes(otherPerson))
                            .join(' ');
                        
                        let good = '';
                        let bad = '';
                        let goodIntensity = 0;
                        let badIntensity = 0;
                        
                        if (interactionText.includes('帮助') || interactionText.includes('支持') || 
                            interactionText.includes('友好') || interactionText.includes('合作')) {
                            good = `${person}与${otherPerson}有合作关系`;
                            goodIntensity = Math.min(Math.floor(coOccurrence / 2) + 1, 5);
                        }
                        
                        if (interactionText.includes('冲突') || interactionText.includes('矛盾') || 
                            interactionText.includes('反对') || interactionText.includes('竞争')) {
                            bad = `${person}与${otherPerson}存在冲突`;
                            badIntensity = Math.min(Math.floor(coOccurrence / 2) + 1, 5);
                        }
                        
                        activities.push({
                            relationship: relationshipType,
                            intensity: Math.max(intensity, 1),
                            times: [],
                            description: `${person}与${otherPerson}在文中共同出现${coOccurrence}次`,
                            Good: good,
                            Bad: bad,
                            goodIntensity: goodIntensity,
                            badIntensity: badIntensity
                        });
                    }
                }
            });
            
            return {
                person: person,
                activities: activities
            };
        }).filter(personActivity => personActivity.activities.length > 0);
        
        // 计算中心人物
        const centerPerson = persons.reduce((max, person) => 
            personFrequency[person] > personFrequency[max] ? person : max, persons[0]
        );
        
        return {
            analysis: `基于文本分析，共发现${persons.length}个人物。中心人物为"${centerPerson}"，出现${personFrequency[centerPerson]}次。共发现${personActivities.reduce((sum, pa) => sum + pa.activities.length, 0)}条关系。`,
            person_activities: personActivities
        };
    },
    
    /**
     * 推断关系类型
     */
    inferRelationshipType(content, personA, personB) {
        const sentences = content.split(/[。！？.!?]/);
        const relevantSentences = sentences.filter(s => 
            s.includes(personA) && s.includes(personB)
        );
        
        if (relevantSentences.length === 0) return `与${personB}的关系`;
        
        const text = relevantSentences.join(' ');
        
        // 关键词匹配
        const relationshipKeywords = {
            '父子': ['父亲', '儿子', '父子', '父女'],
            '母子': ['母亲', '儿子', '母子', '母女'],
            '夫妻': ['夫妻', '夫妇', '结婚', '妻子', '丈夫'],
            '兄弟': ['兄弟', '哥哥', '弟弟', '姐妹', '姐姐', '妹妹'],
            '亲属': ['亲戚', '亲属', '家人', '家族'],
            '朋友': ['朋友', '好友', '伙伴', '同伴'],
            '同事': ['同事', '工作', '公司', '单位', '同事'],
            '上下级': ['领导', '上司', '下级', '部下', '老板', '员工'],
            '敌对': ['敌人', '对手', '仇人', '敌对', '对抗'],
            '师生': ['老师', '学生', '师生', '教授', '弟子']
        };
        
        for (const [type, keywords] of Object.entries(relationshipKeywords)) {
            for (const keyword of keywords) {
                if (text.includes(keyword)) {
                    return `与${personB}的${type}关系`;
                }
            }
        }
        
        return `与${personB}的关系`;
    },
    
    /**
     * 转换关系数据为3D图数据
     * 将关系数据转换为适合3D可视化的格式
     */
    async convertTo3DData(content, annotations) {
        try {
            // 1. 使用AI分析关系
            const aiAnalysis = await this.analyzeRelationships(content, annotations);
            
            // 2. 提取所有人物
            const allPersons = aiAnalysis.person_activities.map(pa => pa.person);
            
            // 3. 构建节点数据
            const nodes = allPersons.map(person => {
                const personData = aiAnalysis.person_activities.find(pa => pa.person === person);
                const centrality = personData ? personData.activities.length : 1;
                
                // 计算正负面互动总分
                let totalGood = 0;
                let totalBad = 0;
                
                if (personData) {
                    personData.activities.forEach(activity => {
                        totalGood += activity.goodIntensity || 0;
                        totalBad += activity.badIntensity || 0;
                    });
                }
                
                return {
                    id: person,
                    name: person,
                    centrality: Math.min(centrality, 10),
                    color: this.getColorByInteractions(totalGood, totalBad),
                    size: 20 + centrality * 2,
                    tags: this.generatePersonTags(content, person),
                    totalGood: totalGood,
                    totalBad: totalBad,
                    interactionScore: totalGood - totalBad
                };
            });
            
            // 4. 构建关系链接数据
            const links = [];
            const processedPairs = new Set();
            
            aiAnalysis.person_activities.forEach(personActivity => {
                const { person, activities } = personActivity;
                
                activities.forEach(activity => {
                    // 提取关系对象
                    const relationshipMatch = activity.relationship.match(/与(.+?)的(.+)关系/);
                    const targetPerson = relationshipMatch ? relationshipMatch[1] : 
                                       activity.relationship.replace(/与|的关系/g, '');
                    
                    if (targetPerson && targetPerson !== person) {
                        const pairKey = [person, targetPerson].sort().join('-');
                        
                        if (!processedPairs.has(pairKey)) {
                            processedPairs.add(pairKey);
                            
                            // 计算综合关系强度
                            const intensity = activity.intensity || 1;
                            const goodIntensity = activity.goodIntensity || 0;
                            const badIntensity = activity.badIntensity || 0;
                            
                            // 距离与强度成反比，关系越强距离越近
                            const distance = Math.max(10, Math.round(100 / intensity));
                            
                            // 确定关系类型颜色
                            let linkType = 'unknown';
                            if (goodIntensity > badIntensity) {
                                linkType = 'positive';
                            } else if (badIntensity > goodIntensity) {
                                linkType = 'negative';
                            } else {
                                linkType = 'neutral';
                            }
                            
                            links.push({
                                source: person,
                                target: targetPerson,
                                strength: intensity,
                                distance: distance,
                                type: linkType,
                                color: this.getLinkColor(linkType),
                                width: Math.max(1, Math.floor(intensity / 2)),
                                description: activity.description || `${person}与${targetPerson}的关系`,
                                goodIntensity: goodIntensity,
                                badIntensity: badIntensity,
                                netIntensity: goodIntensity - badIntensity
                            });
                        }
                    }
                });
            });
            
            // 5. 生成3D布局
            const layout = this.generate3DLayout(nodes, links);
            
            return {
                nodes: nodes,
                links: links,
                analysis: aiAnalysis.analysis,
                layout: layout,
                statistics: {
                    totalNodes: nodes.length,
                    totalLinks: links.length,
                    positiveLinks: links.filter(l => l.type === 'positive').length,
                    negativeLinks: links.filter(l => l.type === 'negative').length,
                    neutralLinks: links.filter(l => l.type === 'neutral').length,
                    avgStrength: links.reduce((sum, l) => sum + l.strength, 0) / links.length,
                    mostConnectedNode: nodes.reduce((max, node) => 
                        node.centrality > max.centrality ? node : max, nodes[0]
                    )
                },
                success: true,
                generatedAt: new Date().toISOString()
            };
            
        } catch (error) {
            console.error('转换3D数据失败:', error);
            
            return {
                nodes: [],
                links: [],
                analysis: '生成3D关系图数据时发生错误',
                layout: {
                    type: 'force-directed-3d',
                    description: '默认3D力导向布局',
                    center: { x: 0, y: 0, z: 0 },
                    radius: 100
                },
                statistics: {},
                success: false,
                error: error.message
            };
        }
    },
    
    /**
     * 根据互动情况获取节点颜色
     */
    getColorByInteractions(goodIntensity, badIntensity) {
        if (goodIntensity > badIntensity * 2) {
            return '#4CAF50'; // 绿色，正面为主
        } else if (badIntensity > goodIntensity * 2) {
            return '#F44336'; // 红色，负面为主
        } else if (goodIntensity > badIntensity) {
            return '#8BC34A'; // 浅绿色，稍微正面
        } else if (badIntensity > goodIntensity) {
            return '#FF9800'; // 橙色，稍微负面
        } else {
            return '#2196F3'; // 蓝色，中性
        }
    },
    
    /**
     * 根据关系类型获取连线颜色
     */
    getLinkColor(type) {
        const colors = {
            'positive': '#4CAF50', // 绿色
            'negative': '#F44336', // 红色
            'neutral': '#9E9E9E',  // 灰色
            'unknown': '#607D8B'   // 蓝灰色
        };
        return colors[type] || colors.unknown;
    },
    
    /**
     * 生成人物标签
     */
    generatePersonTags(content, person) {
        const tags = [];
        const sentences = content.split(/[。！？.!?]/).filter(s => s.includes(person));
        
        // 简单关键词匹配
        const tagPatterns = [
            { tag: '主角', keywords: ['主角', '主要人物', '主人公'] },
            { tag: '勇敢', keywords: ['勇敢', '英勇', '无畏'] },
            { tag: '聪明', keywords: ['聪明', '智慧', '机智'] },
            { tag: '善良', keywords: ['善良', '仁慈', '好心'] },
            { tag: '反派', keywords: ['反派', '邪恶', '坏人', '恶人'] },
            { tag: '领导', keywords: ['领导', '领袖', '首领'] },
            { tag: '辅助', keywords: ['助手', '帮手', '辅助'] }
        ];
        
        tagPatterns.forEach(pattern => {
            pattern.keywords.forEach(keyword => {
                if (sentences.some(s => s.includes(keyword))) {
                    if (!tags.includes(pattern.tag)) {
                        tags.push(pattern.tag);
                    }
                }
            });
        });
        
        return tags.length > 0 ? tags : ['普通角色'];
    },
    
    /**
     * 生成3D布局
     */
    generate3DLayout(nodes, links) {
        // 如果有中心节点（度最高的节点）
        const centerNode = nodes.reduce((max, node) => 
            node.centrality > max.centrality ? node : max, nodes[0]
        );
        
        return {
            type: 'force-directed-3d',
            description: '3D力导向布局，关系越密切的节点距离越近',
            center: { x: 0, y: 0, z: 0 },
            radius: 100,
            centerPerson: centerNode.name,
            forces: {
                linkDistance: 40,
                linkStrength: 0.3,
                chargeStrength: -70,
                centerStrength: 0.1,
                gravity: 0.03,
                friction: 0.85,
                alpha: 1.0,
                alphaDecay: 0.02,
                velocityDecay: 0.7
            },
            animation: {
                rotationSpeed: 0.001,
                nodeFloatSpeed: 0.0005,
                pulseSpeed: 0.003,
                hoverEffect: true
            }
        };
    },
    
    /**
     * 主要入口函数：生成关系图数据
     */
    async generateRelationshipData(content, annotations, options = {}) {
        console.log('开始生成关系图数据...');
        
        const { use3D = false } = options;
        
        try {
            if (use3D) {
                // 生成3D数据
                return await this.convertTo3DData(content, annotations);
            } else {
                // 生成2D数据
                const aiAnalysis = await this.analyzeRelationships(content, annotations);
                
                // 转换为适合2D图的数据格式
                const nodes = aiAnalysis.person_activities.map(pa => ({
                    id: pa.person,
                    name: pa.person,
                    value: pa.activities.length || 1
                }));
                
                const links = [];
                aiAnalysis.person_activities.forEach(pa => {
                    pa.activities.forEach(activity => {
                        const targetMatch = activity.relationship.match(/与(.+?)的/);
                        if (targetMatch) {
                            links.push({
                                source: pa.person,
                                target: targetMatch[1],
                                value: activity.intensity || 1
                            });
                        }
                    });
                });
                
                return {
                    nodes: nodes,
                    links: links,
                    analysis: aiAnalysis.analysis,
                    success: true
                };
            }
            
        } catch (error) {
            console.error('生成关系图数据失败:', error);
            
            return {
                nodes: [],
                links: [],
                analysis: '生成关系图数据时发生错误',
                success: false,
                error: error.message
            };
        }
    }
};