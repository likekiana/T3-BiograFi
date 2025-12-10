// src/components/visualization/EventDetailView.jsx
import React, { useState, useEffect } from 'react';
import '../../styles/components/Visualization/EventDetailView.css';
import { aiService } from '../../services/aiService';

const EventDetailView = ({ event, characterName, onClose }) => {
  const [details, setDetails] = useState(null);
  const [loading, setLoading] = useState(true);
  const [relatedEvents, setRelatedEvents] = useState([]);

  useEffect(() => {
    fetchEventDetails();
  }, [event, characterName]);

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
      const characterPrompt = `假设您是${characterName}，请从第一人称视角描述：
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
        aiService.askQuestion(event.context, eventPrompt),
        aiService.askQuestion(event.context, characterPrompt),
        aiService.askQuestion(event.context, backgroundPrompt)
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
      const response = await aiService.askQuestion(event.context, prompt);
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
    <div className="event-detail-modal">
      <div className="event-detail-content">
        <div className="detail-header">
          <h3>事件详情 - {characterName}的视角</h3>
          <button className="close-btn" onClick={onClose}>
            <i data-feather="x"></i>
          </button>
        </div>
        
        <div className="detail-body">
          {/* 基本信息 */}
          <section className="detail-section">
            <h4><i data-feather="clock"></i> 事件时间</h4>
            <div className="time-highlight">{event.time}</div>
          </section>

          {/* 事件详情 */}
          <section className="detail-section">
            <h4><i data-feather="book"></i> 事件详情</h4>
            <div className="detail-content">
              {details?.eventDetails || details?.error}
            </div>
          </section>

          {/* 人物视角 */}
          <section className="detail-section">
            <h4><i data-feather="user"></i> {characterName}的视角</h4>
            <div className="character-perspective">
              <div className="perspective-header">
                <span className="character-name">{characterName}</span>
                <span className="perspective-label">第一人称叙述</span>
              </div>
              <div className="perspective-content">
                {details?.characterPerspective}
              </div>
            </div>
          </section>

          {/* 历史背景 */}
          <section className="detail-section">
            <h4><i data-feather="map"></i> 历史背景</h4>
            <div className="background-content">
              {details?.backgroundInfo}
            </div>
          </section>

          {/* 相关事件 */}
          {relatedEvents.length > 0 && (
            <section className="detail-section">
              <h4><i data-feather="link"></i> 相关事件</h4>
              <div className="related-events">
                {relatedEvents.map((relEvent, index) => (
                  <div key={index} className="related-event-card">
                    <h5>{relEvent.title}</h5>
                    <p>{relEvent.description}</p>
                    {relEvent.date && (
                      <span className="related-date">{relEvent.date}</span>
                    )}
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* 时间线位置 */}
          <section className="detail-section">
            <h4><i data-feather="navigation"></i> 在时间轴中的位置</h4>
            <div className="timeline-context">
              <div className="context-info">
                <span>事件顺序：第{event.position}个事件</span>
                <span>上下文长度：{event.context.length}字符</span>
              </div>
            </div>
          </section>
        </div>

        <div className="detail-footer">
          <button className="export-detail-btn" onClick={() => exportEventDetails()}>
            <i data-feather="download"></i> 导出详情
          </button>
          <div className="detail-meta">
            最后更新：{new Date(details?.timestamp).toLocaleString()}
          </div>
        </div>
      </div>
    </div>
  );
};

const exportEventDetails = () => {
  // 导出事件详情的实现
  console.log('导出事件详情');
};

export default EventDetailView;