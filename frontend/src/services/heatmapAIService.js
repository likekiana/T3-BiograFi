// src/services/heatmapAIService.js

// 首先尝试调用 /api/heatmap-analyze 接口
// 如果失败，自动回退到现有的 /api/qa 接口

import axios from 'axios';

const AI_BASE_URL = 'http://localhost:5004';

/**
 * 热力图专用的AI分析服务
 */
export const heatmapAIService = {
  
  /**
   * 智能分析人物时空分布数据
   * 这是核心功能：使用AI分析人物在什么时间、什么地点、停留多长时间
   */
  async analyzePersonTimeLocation(content, annotations) {
    try {
      // 从标注中提取人物和地点
      const persons = annotations
        .filter(ann => ann.label === '人物')
        .map(ann => ann.text)
        .filter((value, index, self) => self.indexOf(value) === index); // 去重
      
      const places = annotations
        .filter(ann => ann.label === '地名')
        .map(ann => ann.text)
        .filter((value, index, self) => self.indexOf(value) === index);
      
      const times = annotations
        .filter(ann => ann.label === '时间')
        .map(ann => ann.text)
        .filter((value, index, self) => self.indexOf(value) === index);
      
      console.log('AI分析参数:', { 
        personsCount: persons.length, 
        placesCount: places.length,
        timesCount: times.length 
      });
      
      // 构建详细的AI提示词
      const prompt = `
请分析以下文本中人物的时空分布情况：

文本内容：
"""
${content.substring(0, 3000)}  // 限制长度避免过长
"""

文中包含的人物：${persons.join('、')}
文中包含的地点：${places.join('、')}
文中包含的时间：${times.join('、')}

请分析：
1. 每个人物在哪些地点出现？
2. 他们在每个地点的出现频率（次数）
3. 他们在每个地点的停留时间或活动强度（根据上下文推断）
4. 如果有时间信息，请标注大概的时间段

请以JSON格式返回分析结果，格式如下：
{
  "analysis": "一段总体分析文字",
  "person_activities": [
    {
      "person": "人物名",
      "activities": [
        {
          "place": "地点名",
          "frequency": 出现次数,
          "duration": 停留时长（1-10分，1表示短暂，10表示长期居住）,
          "intensity": 活动强度（1-10分，1表示轻微，10表示强烈）,
          "times": ["相关时间点1", "相关时间点2"],
          "description": "简要描述人物在此地的活动"
        }
      ]
    }
  ]
}

注意：
1. 只返回JSON，不要有其他内容。
2. 如果文本中没有明确信息，请根据上下文进行合理推断。
3. frequency应为正整数，至少为1。
4. duration和intensity应为1-10之间的整数。
5. 如果找不到时间信息，times可以为空数组。
`;
      
      // 尝试使用新的热力图分析接口，如果失败则使用通用的qa接口
      let response;
      try {
        // 先尝试调用新的热力图分析接口
        response = await axios.post(`${AI_BASE_URL}/api/heatmap-analyze`, {
          content: content.substring(0, 3000),
          annotations: annotations
        });
      } catch (heatmapError) {
        console.log('热力图专用接口调用失败，使用通用QA接口:', heatmapError.message);
        
        // 如果专用接口失败，使用通用QA接口
        response = await axios.post(`${AI_BASE_URL}/api/qa`, {
          text: content.substring(0, 3000),
          question: prompt
        });
      }
      
      const result = response.data.result;
      
      try {
        // 尝试解析AI返回的JSON
        let jsonResult;
        // 清理可能的markdown代码块
        const cleaned = result.replace(/```json\n|\n```/g, '').trim();
        jsonResult = JSON.parse(cleaned);
        
        // 验证返回的数据结构
        if (!jsonResult.person_activities || !Array.isArray(jsonResult.person_activities)) {
          console.warn('AI返回的JSON格式不正确，缺少person_activities数组');
          return this.generateFallbackData(content, annotations);
        }
        
        // 确保所有必需字段都有值
        jsonResult.person_activities.forEach(personActivity => {
          personActivity.activities.forEach(activity => {
            activity.frequency = activity.frequency || 1;
            activity.duration = Math.min(Math.max(activity.duration || 1, 1), 10);
            activity.intensity = Math.min(Math.max(activity.intensity || 1, 1), 10);
            activity.times = activity.times || [];
            activity.description = activity.description || `${personActivity.person}在${activity.place}活动`;
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
      console.error('AI时空分析失败:', error);
      // 返回备用数据
      return this.generateFallbackData(content, annotations);
    }
  },
  
  /**
   * 备用算法：当AI分析失败时使用基于规则的分析
   */
  generateFallbackData(content, annotations) {
    console.log('使用备用算法生成热力图数据');
    
    const persons = annotations
      .filter(ann => ann.label === '人物')
      .map(ann => ann.text)
      .filter((value, index, self) => self.indexOf(value) === index);
    
    const places = annotations
      .filter(ann => ann.label === '地名')
      .map(ann => ann.text)
      .filter((value, index, self) => self.indexOf(value) === index);
    
    // 简化的分析：统计人物和地点在句子中的共现
    const sentences = content.split(/[。！？.!?]/).filter(s => s.trim());
    
    const personActivities = persons.map(person => {
      const activities = places.map(place => {
        // 统计该人物和地点在同一句子中出现的次数
        let frequency = 0;
        sentences.forEach(sentence => {
          if (sentence.includes(person) && sentence.includes(place)) {
            frequency++;
          }
        });
        
        // 简化的停留时长和活动强度计算
        const duration = Math.min(frequency * 2, 10);
        const intensity = Math.min(frequency * 3, 10);
        
        return {
          place,
          frequency,
          duration: frequency > 0 ? Math.max(duration, 1) : 0,
          intensity: frequency > 0 ? Math.max(intensity, 1) : 0,
          times: [],
          description: frequency > 0 
            ? `${person}在${place}出现${frequency}次` 
            : `未发现${person}在${place}的活动`
        };
      }).filter(activity => activity.frequency > 0); // 只保留有活动的记录
      
      return {
        person,
        activities
      };
    }).filter(personActivity => personActivity.activities.length > 0); // 只保留有活动的人物
    
    return {
      analysis: `基于文本分析，共发现${persons.length}个人物和${places.length}个地点之间的时空关系。`,
      person_activities: personActivities
    };
  },
  
  /**
   * 批量地理编码地点
   * 使用高德地图API将地名转换为坐标
   */
  async geocodePlaces(places) {
    const API_KEY = '0af744d9c966d1790972694dfa5509d6';
    const coordinates = {};
    
    // 如果地点为空，直接返回空对象
    if (!places || places.length === 0) {
      return coordinates;
    }
    
    // 分批处理避免请求过多
    const batchSize = 5;
    for (let i = 0; i < places.length; i += batchSize) {
      const batch = places.slice(i, i + batchSize);
      
      const promises = batch.map(async place => {
        try {
          const response = await axios.get(
            `https://restapi.amap.com/v3/geocode/geo?key=${API_KEY}&address=${encodeURIComponent(place)}`
          );
          
          if (response.data.status === '1' && response.data.geocodes && response.data.geocodes.length > 0) {
            const location = response.data.geocodes[0].location.split(',');
            coordinates[place] = {
              lng: parseFloat(location[0]),
              lat: parseFloat(location[1]),
              formattedAddress: response.data.geocodes[0].formatted_address,
              isEstimated: false
            };
          } else {
            // 使用默认坐标（以北京为中心随机分布）
            coordinates[place] = {
              lng: 116.397428 + (Math.random() * 10 - 5),
              lat: 39.90923 + (Math.random() * 8 - 4),
              formattedAddress: place,
              isEstimated: true
            };
          }
        } catch (error) {
          console.warn(`地理编码失败 ${place}:`, error);
          coordinates[place] = {
            lng: 116.397428 + (Math.random() * 10 - 5),
            lat: 39.90923 + (Math.random() * 8 - 4),
            formattedAddress: place,
            isEstimated: true
          };
        }
      });
      
      await Promise.all(promises);
      // 添加延迟避免请求过快
      if (i + batchSize < places.length) {
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }
    
    return coordinates;
  },
  
  /**
   * 生成热力图数据
   * 这是主要入口函数，整合AI分析和地理编码
   */
  async generateHeatmapData(content, annotations) {
    console.log('开始生成热力图数据...');
    
    try {
      // 1. 使用AI分析人物时空分布
      const aiAnalysis = await this.analyzePersonTimeLocation(content, annotations);
      
      // 2. 提取所有地点进行地理编码
      const allPlaces = new Set();
      aiAnalysis.person_activities.forEach(personActivity => {
        personActivity.activities.forEach(activity => {
          if (activity.place && activity.frequency > 0) {
            allPlaces.add(activity.place);
          }
        });
      });
      
      let placeCoordinates = {};
      if (allPlaces.size > 0) {
        placeCoordinates = await this.geocodePlaces(Array.from(allPlaces));
      } else {
        console.warn('没有发现有效的地点数据');
      }
      
      // 3. 转换为热力图数据格式
      const heatmapData = [];
      
      aiAnalysis.person_activities.forEach(personActivity => {
        const { person, activities } = personActivity;
        
        activities.forEach(activity => {
          const { place, frequency, duration, intensity } = activity;
          
          // 检查是否有坐标信息
          let coords = placeCoordinates[place];
          
          if (!coords) {
            // 如果没有坐标，创建一个估算的坐标
            coords = {
              lng: 116.397428 + (Math.random() * 10 - 5),
              lat: 39.90923 + (Math.random() * 8 - 4),
              formattedAddress: place,
              isEstimated: true
            };
            placeCoordinates[place] = coords;
          }
          
          // 确保数值有效
          const validFrequency = frequency || 1;
          const validDuration = Math.min(Math.max(duration || 1, 1), 10);
          const validIntensity = Math.min(Math.max(intensity || 1, 1), 10);
          
          // 计算热力值：综合考虑频率、停留时长和活动强度
          const heatValue = validFrequency * 0.3 + validDuration * 0.4 + validIntensity * 0.3;
          
          heatmapData.push({
            lng: coords.lng,
            lat: coords.lat,
            value: heatValue * 10, // 放大以便在热力图上显示
            person,
            place,
            frequency: validFrequency,
            duration: validDuration,
            intensity: validIntensity,
            coordinates: coords,
            description: activity.description || `${person}在${place}活动`,
            isEstimated: coords.isEstimated || false
          });
        });
      });
      
      console.log('热力图数据生成完成:', {
        totalPoints: heatmapData.length,
        placesCount: Object.keys(placeCoordinates).length,
        personsCount: aiAnalysis.person_activities.length
      });
      
      return {
        heatmapPoints: heatmapData,
        aiAnalysis: aiAnalysis.analysis || 'AI分析完成，生成热力图数据。',
        personActivities: aiAnalysis.person_activities,
        placeCoordinates,
        success: true
      };
    } catch (error) {
      console.error('生成热力图数据失败:', error);
      
      // 返回一个基本的空结构，避免前端崩溃
      return {
        heatmapPoints: [],
        aiAnalysis: '生成热力图数据时发生错误，请检查网络连接或稍后重试。',
        personActivities: [],
        placeCoordinates: {},
        success: false,
        error: error.message
      };
    }
  }
};