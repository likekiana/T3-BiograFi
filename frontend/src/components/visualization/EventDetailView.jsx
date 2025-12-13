// src/components/visualization/EventDetailView.jsx
import React, { useState, useEffect } from 'react';
import '../../styles/components/Visualization/EventDetailView.css';
import { aiService } from '../../services/aiService';

const EventDetailView = ({ event, characterName: propCharacterName, onClose, documentId }) => {
  // 生成唯一的localStorage键名，用于保存事件详情
  const DETAILS_KEY = `event_details_${event?.id || 'default'}_${documentId || 'default'}`;
  const RELATED_EVENTS_KEY = `related_events_${event?.id || 'default'}_${documentId || 'default'}`;
  
  // 从事件中提取涉及的人物列表
  const extractEventCharacters = () => {
    if (!event?.entities) return [propCharacterName];
    
    const characters = new Set();
    event.entities.forEach(entity => {
      if (entity.label === '人物' && entity.text) {
        characters.add(entity.text);
      }
    });
    
    // 确保propCharacterName在列表中
    if (propCharacterName) {
      characters.add(propCharacterName);
    }
    
    return Array.from(characters);
  };
  
  const [details, setDetails] = useState(null);
  const [loading, setLoading] = useState(true);
  const [relatedEvents, setRelatedEvents] = useState([]);
  // 使用状态管理当前选择的人物
  const [selectedCharacter, setSelectedCharacter] = useState(propCharacterName || '传记人物');

  useEffect(() => {
    // 组件加载时，从localStorage读取保存的详情
    console.log('EventDetailView useEffect called:', event?.id, 'character:', selectedCharacter, 'document:', documentId);
    
    // 使用包含人物名称的键名，确保不同人物的详情独立保存
    const characterDetailsKey = `${DETAILS_KEY}_${selectedCharacter}`;
    const characterRelatedEventsKey = `${RELATED_EVENTS_KEY}_${selectedCharacter}`;
    
    const savedDetails = localStorage.getItem(characterDetailsKey);
    const savedRelatedEvents = localStorage.getItem(characterRelatedEventsKey);
    
    if (savedDetails) {
      try {
        const parsedDetails = JSON.parse(savedDetails);
        console.log('Loaded saved details:', parsedDetails);
        setDetails(parsedDetails);
        setLoading(false);
      } catch (error) {
        console.error('Failed to parse saved details:', error);
      }
    }
    
    if (savedRelatedEvents) {
      try {
        const parsedRelatedEvents = JSON.parse(savedRelatedEvents);
        console.log('Loaded saved related events:', parsedRelatedEvents);
        setRelatedEvents(parsedRelatedEvents);
      } catch (error) {
        console.error('Failed to parse saved related events:', error);
      }
    }
    
    // 没有保存的详情，生成新的
    if (!savedDetails) {
      console.log('No saved details, calling fetchEventDetails');
      fetchEventDetails();
    }
  }, [event, selectedCharacter, documentId]);
  
  // 当details变化时，保存到localStorage
  useEffect(() => {
    if (details && !details.error) {
      // 使用包含人物名称的键名，确保不同人物的详情独立保存
      const characterDetailsKey = `${DETAILS_KEY}_${selectedCharacter}`;
      console.log('Saving event details for event:', event?.id, 'character:', selectedCharacter, 'document:', documentId);
      localStorage.setItem(characterDetailsKey, JSON.stringify(details));
    }
  }, [details, event, selectedCharacter, documentId]);
  
  // 当relatedEvents变化时，保存到localStorage
  useEffect(() => {
    if (relatedEvents.length > 0) {
      // 使用包含人物名称的键名，确保不同人物的相关事件独立保存
      const characterRelatedEventsKey = `${RELATED_EVENTS_KEY}_${selectedCharacter}`;
      console.log('Saving related events for event:', event?.id, 'character:', selectedCharacter, 'document:', documentId);
      localStorage.setItem(characterRelatedEventsKey, JSON.stringify(relatedEvents));
    }
  }, [relatedEvents, event, selectedCharacter, documentId]);

  const fetchEventDetails = async () => {
    setLoading(true);
    try {
      // 合并AI请求，减少调用次数
      const combinedPrompt = `事件背景：${event.context}
      事件时间：${event.time}
      传记人物：${selectedCharacter}
      
      请按照以下格式返回JSON：
      {
        "eventDetails": "[事件详情，包括背景、经过、人物、结果]",
        "characterPerspective": "[从${selectedCharacter}第一人称视角描述的经历]",
        "backgroundInfo": "[相关历史背景和社会环境]"
      }
      
      要求：
      1. eventDetails：详细描述事件的背景、经过、涉及人物和结果影响
      2. characterPerspective：从${selectedCharacter}第一人称视角描述其在事件中的行为、动机和影响
      3. backgroundInfo：提供相关历史背景和社会环境信息
      4. 只返回JSON，不要其他任何内容`;

      // 只调用一次AI服务
      const combinedResponse = await aiService.askQuestion(event.context, combinedPrompt, 'xunzi-qwen2', documentId);
      
      // 解析JSON响应
      const parsedResponse = JSON.parse(combinedResponse);
      
      setDetails({
        eventDetails: parsedResponse.eventDetails,
        characterPerspective: parsedResponse.characterPerspective,
        backgroundInfo: parsedResponse.backgroundInfo,
        timestamp: new Date().toISOString()
      });

      // 异步获取相关事件，不阻塞主界面显示
      fetchRelatedEvents();
    } catch (error) {
      console.error('获取事件详情失败:', error);
      setDetails({
        error: '无法获取事件详情，请稍后重试'
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchRelatedEvents = async () => {
    try {
      // 这里可以根据时间或关键词查找相关事件
      const prompt = `基于事件"${event.time}: ${event.context.substring(0, 100)}..."，请列出3个相关的历史事件或背景事件，格式为JSON数组
      只返回JSON，不要其他任何内容`;
      
      const response = await aiService.askQuestion(event.context, prompt, 'xunzi-qwen2', documentId);
      // 解析AI返回的JSON数据
      const events = JSON.parse(response || '[]');
      setRelatedEvents(events);
    } catch (error) {
      console.error('获取相关事件失败:', error);
      // 失败不影响主界面，静默处理
    }
  };

  if (loading) {
    return (
      <div className="event-detail-modal">
        <div className="event-detail-content">
          <div className="loading-details">
            <i data-feather="refresh-cw" className="spinning"></i>
            <span>正在获取事件详情...</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="event-detail-modal" style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 999999 }}>
      <div className="event-detail-content" style={{ background: 'white', padding: '20px', borderRadius: '8px', width: '80%', maxWidth: '800px', maxHeight: '80vh', overflowY: 'auto' }}>
        <div className="detail-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', paddingBottom: '10px', borderBottom: '1px solid #eee' }}>
          <h3>事件详情 - {selectedCharacter}的视角</h3>
          <button className="close-btn" onClick={onClose} style={{ background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer' }}>
            ×
          </button>
        </div>
        
        <div className="detail-body">
          {/* 基本信息 */}
          <div style={{ marginBottom: '20px' }}>
            <h4>事件时间</h4>
            <div style={{ background: '#f0f0f0', padding: '10px', borderRadius: '4px' }}>{event.time}</div>
          </div>

          {/* 事件详情 */}
          <div style={{ marginBottom: '20px' }}>
            <h4>事件详情</h4>
            <div>{details?.eventDetails || details?.error}</div>
          </div>

          {/* 人物选择和视角 */}
          <div style={{ marginBottom: '20px' }}>
            <h4>选择人物视角</h4>
            <div style={{ display: 'flex', gap: '10px', marginBottom: '15px' }}>
              {extractEventCharacters().map(character => (
                <button 
                  key={character}
                  className={`character-btn ${selectedCharacter === character ? 'active' : ''}`}
                  onClick={() => setSelectedCharacter(character)}
                  style={{ padding: '5px 15px', borderRadius: '20px', border: '1px solid #ddd', cursor: 'pointer', backgroundColor: selectedCharacter === character ? '#007bff' : 'white', color: selectedCharacter === character ? 'white' : '#333' }}
                >
                  {character}
                </button>
              ))}
            </div>
            
            <div style={{ background: '#f8f9fa', padding: '15px', borderRadius: '4px', borderLeft: '4px solid #007bff' }}>
              <div style={{ marginBottom: '10px', fontWeight: 'bold' }}>{selectedCharacter}的视角</div>
              <div>{details?.characterPerspective}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EventDetailView;