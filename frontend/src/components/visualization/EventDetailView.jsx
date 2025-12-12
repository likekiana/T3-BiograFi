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
    
    if (savedDetails && savedRelatedEvents) {
      try {
        const parsedDetails = JSON.parse(savedDetails);
        const parsedRelatedEvents = JSON.parse(savedRelatedEvents);
        console.log('Loaded saved details:', parsedDetails);
        console.log('Loaded saved related events:', parsedRelatedEvents);
        setDetails(parsedDetails);
        setRelatedEvents(parsedRelatedEvents);
        setLoading(false);
        return;
      } catch (error) {
        console.error('Failed to parse saved details:', error);
      }
    }
    
    // 没有保存的详情，生成新的
    console.log('No saved details, calling fetchEventDetails');
    fetchEventDetails();
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
      // 1. 获取事件的基本信息
      const eventPrompt = `事件背景：${event.context}
      事件时间：${event.time}
      
      请从以下方面详细描述此事件：
      1. 事件发生的具体背景和原因
      2. 事件的主要经过
      3. 事件涉及的主要人物及其角色
      4. 事件的结果和影响`;

      // 2. 从传记人物视角分析
      const characterPrompt = `假设您是${selectedCharacter}，请从第一人称视角描述：
      1. 您在这个事件中的具体行为和决策
      2. 您的动机和考虑因素
      3. 事件对您个人的影响
      4. 您从中学到的经验教训`;

      // 3. 获取相关资料和背景信息
      const backgroundPrompt = `基于历史事实和公开资料，请提供：
      1. 相关的历史背景信息
      2. 事件的关键细节补充
      3. 当时的社会环境和影响因素`;

      const [eventDetails, characterPerspective, backgroundInfo] = await Promise.all([
        aiService.askQuestion(event.context, eventPrompt, 'xunzi-qwen2', documentId),
        aiService.askQuestion(event.context, characterPrompt, 'xunzi-qwen2', documentId),
        aiService.askQuestion(event.context, backgroundPrompt, 'xunzi-qwen2', documentId)
      ]);

      setDetails({
        eventDetails,
        characterPerspective,
        backgroundInfo,
        timestamp: new Date().toISOString()
      });

      // 4. 查找相关事件
      await fetchRelatedEvents();
    } catch (error) {
      console.error('获取事件详情失败:', error);
      setDetails({
        error: '无法获取事件详情，请稍后重试'
      });
    }
    setLoading(false);
  };

  const fetchRelatedEvents = async () => {
    // 这里可以根据时间或关键词查找相关事件
    const prompt = `基于事件"${event.time}: ${event.context.substring(0, 100)}..."，请列出3个相关的历史事件或背景事件，格式为JSON数组`;
    
    try {
      const response = await aiService.askQuestion(event.context, prompt, 'xunzi-qwen2', documentId);
      // 解析AI返回的JSON数据
      const events = JSON.parse(response || '[]');
      setRelatedEvents(events);
    } catch (error) {
      console.error('获取相关事件失败:', error);
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