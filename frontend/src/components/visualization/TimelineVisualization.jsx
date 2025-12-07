
// src/components/visualization/TimelineVisualization.jsx
import React, { useMemo, useState, useEffect, useCallback } from 'react';
import '../../styles/components/Visualization/TimelineVisualization.css';

const TimelineVisualization = ({ annotations, filters, content }) => {
  const [translatedEvents, setTranslatedEvents] = useState({});
  const [loading, setLoading] = useState({});
  const [error, setError] = useState(null);
  const [translationEnabled, setTranslationEnabled] = useState(true);
  const [expandedEvents, setExpandedEvents] = useState({});

  // DeepSeek API配置
  const DEEPSEEK_API_KEY = "sk-92787f26a97142979d094d5a13d57221";
  const DEEPSEEK_API_URL = "https://api.deepseek.com/chat/completions";

  // 检查API密钥是否有效
  useEffect(() => {
    if (!DEEPSEEK_API_KEY || DEEPSEEK_API_KEY.trim() === "") {
      console.warn("DeepSeek API密钥未配置");
      setTranslationEnabled(false);
    } else {
      setTranslationEnabled(true);
    }
  }, []);

  // 切换事件展开状态
  const toggleEventExpand = useCallback((eventId) => {
    setExpandedEvents(prev => ({
      ...prev,
      [eventId]: !prev[eventId]
    }));
  }, []);

  // 调用DeepSeek API进行概括
  const summarizeEvent = useCallback(async (originalText, eventId) => {
    if (!translationEnabled) {
      return {
        summary: "概括功能未启用",
        success: false
      };
    }

    try {
      setLoading(prev => ({ ...prev, [eventId]: true }));
      setError(null);

      // 清理文本，移除过长内容
      const cleanText = originalText.length > 800 
        ? originalText.substring(0, 800) + "..."
        : originalText;

      const response = await fetch(DEEPSEEK_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${DEEPSEEK_API_KEY}`
        },
        body: JSON.stringify({
          model: "deepseek-chat",
          messages: [
            {
              role: "system",
              content: `你是一个历史文献分析专家。请对以下文本进行核心概括，提取关键信息。
                      要求：
                      1. 用现代汉语概括核心内容
                      2. 控制在30-50字以内
                      3. 突出时间、人物、事件等关键要素
                      4. 语言简洁明了
                      只返回概括内容，不要有其他说明。`
            },
            {
              role: "user",
              content: `请概括以下文本的核心内容：${cleanText}`
            }
          ],
          temperature: 0.3,
          max_tokens: 100
        })
      });

      if (!response.ok) {
        throw new Error(`API请求失败: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      
      if (data.choices && data.choices[0] && data.choices[0].message) {
        let summary = data.choices[0].message.content.trim();
        
        // 清理返回的内容
        summary = summary.replace(/^["']|["']$/g, '').trim();
        
        return {
          summary: summary || "概括内容生成失败",
          success: true
        };
      } else {
        throw new Error("API响应格式错误");
      }
    } catch (error) {
      console.error('概括失败:', error);
      setError(`概括失败: ${error.message}`);
      return {
        summary: "概括失败",
        success: false,
        error: error.message
      };
    } finally {
      setLoading(prev => ({ ...prev, [eventId]: false }));
    }
  }, [translationEnabled]);

  // 处理时间轴事件
  const timelineEvents = useMemo(() => {
    const timeAnnotations = annotations.filter(ann => 
      ann.label === '时间' && filters.times
    );
    
    return timeAnnotations.map((annotation, index) => {
      // 提取时间相关的上下文
      const contextStart = Math.max(0, annotation.start - 150);
      const contextEnd = Math.min(content.length, annotation.end + 150);
      let context = content.substring(contextStart, contextEnd);
      
      // 清理文本，确保有完整句子
      if (contextStart > 0) {
        const prevPeriod = content.lastIndexOf('。', contextStart);
        const prevExclamation = content.lastIndexOf('！', contextStart);
        const prevQuestion = content.lastIndexOf('？', contextStart);
        const prevComma = content.lastIndexOf('，', contextStart);
        const lastSentenceEnd = Math.max(prevPeriod, prevExclamation, prevQuestion, prevComma);
        if (lastSentenceEnd > contextStart - 100 && lastSentenceEnd < contextStart) {
          context = content.substring(lastSentenceEnd + 1, contextEnd);
        }
      }
      
      const eventId = `${annotation.start}-${index}`;
      const eventTranslation = translatedEvents[eventId];
      const isExpanded = expandedEvents[eventId] || false;
      
      return {
        id: eventId,
        originalId: annotation.start,
        time: annotation.text,
        originalContext: context,
        isExpanded,
        type: 'event',
        entities: annotations.filter(ann => 
          ann.start >= contextStart && 
          ann.end <= contextEnd && 
          ann.label !== '时间' &&
          filters[ann.label.toLowerCase()]
        ),
        hasSummary: eventTranslation !== undefined,
        summary: eventTranslation?.summary,
        isLoading: loading[eventId] || false
      };
    });
  }, [annotations, filters, content, translatedEvents, expandedEvents, loading]);

  // 批量处理需要概括的事件
  useEffect(() => {
    const processSummaries = async () => {
      if (!translationEnabled) {
        console.log('概括功能未启用，跳过自动概括');
        return;
      }
      
      const eventsToSummarize = timelineEvents.filter(event => 
        !event.hasSummary && 
        !event.isLoading && 
        event.originalContext.length > 20
      ).slice(0, 3); // 限制每次最多处理3个

      if (eventsToSummarize.length === 0) {
        return;
      }

      for (const event of eventsToSummarize) {
        if (event.isLoading) continue;
        
        const result = await summarizeEvent(event.originalContext, event.id);
        
        if (result.success) {
          setTranslatedEvents(prev => ({
            ...prev,
            [event.id]: {
              summary: result.summary,
              timestamp: new Date().toISOString()
            }
          }));
        }
        
        // 添加延迟避免请求过快
        await new Promise(resolve => setTimeout(resolve, 1500));
      }
    };

    if (timelineEvents.length > 0 && translationEnabled) {
      processSummaries();
    }
  }, [timelineEvents, summarizeEvent, translationEnabled]);

  // 手动触发概括
  const handleSummarizeEvent = useCallback(async (eventId, originalContext) => {
    if (!translationEnabled) {
      setError("概括功能未启用，请检查API密钥配置");
      return;
    }
    
    const result = await summarizeEvent(originalContext, eventId);
    if (result.success) {
      setTranslatedEvents(prev => ({
        ...prev,
        [eventId]: {
          summary: result.summary,
          timestamp: new Date().toISOString()
        }
      }));
    }
  }, [summarizeEvent, translationEnabled]);

  // 高亮显示时间实体
  const highlightTimeInText = (text, timeString) => {
    if (!text || !timeString) return text;
    
    const escapedTime = timeString.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(`(${escapedTime})`, 'gi');
    
    return text.replace(regex, (match) => 
      `<mark class="time-highlight">${match}</mark>`
    );
  };

  // 渲染折叠的事件卡片
  const renderCollapsedEvent = (event) => {
    const highlightedOriginal = highlightTimeInText(event.originalContext, event.time);
    
    return (
      <div className="event-card collapsed">
        <div className="event-header" onClick={() => toggleEventExpand(event.id)}>
          <div className="time-display">
            <i data-feather="clock"></i>
            <strong className="time-text">{event.time}</strong>
            <div className="expand-indicator">
              <i data-feather="chevron-down"></i>
            </div>
          </div>
          
          <div className="event-summary-preview">
            {event.hasSummary ? (
              <div className="summary-preview">
                <span className="summary-text">{event.summary}</span>
              </div>
            ) : event.isLoading ? (
              <div className="summary-loading">
                <div className="mini-spinner"></div>
                <span>生成概括中...</span>
              </div>
            ) : (
              <div className="summary-action">
                <button 
                  className="summarize-btn"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleSummarizeEvent(event.id, event.originalContext);
                  }}
                  title="生成核心概括"
                  disabled={event.isLoading}
                >
                  <i data-feather="sparkles"></i>
                  生成概括
                </button>
              </div>
            )}
          </div>
        </div>

        {/* 实体标签预览 */}
        {event.entities.length > 0 && (
          <div className="entities-preview">
            <div className="entities-list">
              {event.entities.slice(0, 3).map((entity, idx) => (
                <span 
                  key={idx}
                  className={`entity-tag tag-${entity.label}`}
                  title={`${entity.label}: ${entity.text}`}
                >
                  {entity.text}
                </span>
              ))}
              {event.entities.length > 3 && (
                <span className="more-entities">+{event.entities.length - 3}</span>
              )}
            </div>
          </div>
        )}

        
      </div>
    );
  };

  // 渲染展开的事件详情
  const renderExpandedEvent = (event) => {
    const highlightedOriginal = highlightTimeInText(event.originalContext, event.time);
    
    return (
      <div className="event-card expanded">
        <div className="event-header" onClick={() => toggleEventExpand(event.id)}>
          <div className="time-display">
            <i data-feather="clock"></i>
            <strong className="time-text">{event.time}</strong>
            <div className="expand-indicator">
              <i data-feather="chevron-up"></i>
            </div>
          </div>
          
          <div className="event-summary">
            {event.hasSummary ? (
              <div className="summary-display">
                <i data-feather="file-text"></i>
                <span className="summary-text">{event.summary}</span>
              </div>
            ) : event.isLoading ? (
              <div className="summary-loading">
                <div className="mini-spinner"></div>
                <span>生成概括中...</span>
              </div>
            ) : (
              <div className="summary-action">
                <button 
                  className="summarize-btn"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleSummarizeEvent(event.id, event.originalContext);
                  }}
                  title="生成核心概括"
                  disabled={event.isLoading}
                >
                  <i data-feather="sparkles"></i>
                  生成概括
                </button>
              </div>
            )}
          </div>
        </div>

        {/* 原文内容 */}
        <div className="original-content">
          <div className="content-header">
            <i data-feather="book"></i>
            <span className="content-label">原文内容</span>
          </div>
          <div 
            className="content-text"
            dangerouslySetInnerHTML={{ __html: highlightedOriginal }}
          />
        </div>

        {/* 详细实体列表 */}
        {event.entities.length > 0 && (
          <div className="event-entities">
            <div className="entities-header">
              <i data-feather="tag"></i>
              <span>相关实体</span>
              <span className="entities-count">({event.entities.length})</span>
            </div>
            <div className="entities-list detailed">
              {event.entities.map((entity, idx) => (
                <span 
                  key={idx}
                  className={`entity-tag tag-${entity.label}`}
                  title={`${entity.label}: ${entity.text}`}
                >
                  <span className="entity-type">{entity.label}</span>
                  <span className="entity-text">{entity.text}</span>
                </span>
              ))}
            </div>
          </div>
        )}

        <div className="event-actions">
          <button 
            className="action-btn copy-btn"
            onClick={() => {
              navigator.clipboard.writeText(event.originalContext);
              // 这里可以添加复制成功的提示
            }}
            title="复制原文"
          >
            <i data-feather="copy"></i>
            复制原文
          </button>
          
          {!event.hasSummary && !event.isLoading && translationEnabled && (
            <button 
              className="action-btn summarize-action-btn"
              onClick={() => handleSummarizeEvent(event.id, event.originalContext)}
              disabled={event.isLoading}
            >
              <i data-feather="sparkles"></i>
              {event.isLoading ? '生成中...' : '重新生成概括'}
            </button>
          )}
          
          <button 
            className="action-btn collapse-btn"
            onClick={() => toggleEventExpand(event.id)}
          >
            <i data-feather="chevron-up"></i>
            收起
          </button>
        </div>
      </div>
    );
  };

  // 计算概括进度
  const summarizedCount = Object.keys(translatedEvents).length;
  const totalEvents = timelineEvents.length;
  const summaryProgress = totalEvents > 0 ? Math.round((summarizedCount / totalEvents) * 100) : 0;

  return (
    <div className="timeline-visualization">
      <div className="timeline-header">
        <h3>时间事件轴</h3>
        <div className="header-controls">
          <div className="stats-info">
            <span className={`ai-badge ${translationEnabled ? 'enabled' : 'disabled'}`}>
              <i data-feather="cpu"></i>
              {translationEnabled ? '智能概括' : '概括未启用'}
            </span>
            <span className="event-count">
              共 {totalEvents} 个时间点
            </span>
          </div>
          {error && (
            <div className="error-message">
              <i data-feather="alert-triangle"></i>
              {error}
              <button 
                className="error-dismiss"
                onClick={() => setError(null)}
                title="关闭"
              >
                ×
              </button>
            </div>
          )}
        </div>
      </div>
      
      <div className="timeline-container">
        {totalEvents === 0 ? (
          <div className="empty-timeline">
            <i data-feather="clock"></i>
            <p>没有找到时间相关的事件</p>
            <p className="empty-tip">
              请确保文档中包含时间实体标注
            </p>
          </div>
        ) : (
          <>
            <div className="timeline-scroll-container">
              <div className="timeline">
                {timelineEvents.map((event, index) => (
                  <div key={`${event.id}-${index}`} className="timeline-item">
                    <div className="timeline-marker">
                      {event.hasSummary && (
                        <div className="summary-indicator"></div>
                      )}
                    </div>
                    <div className="timeline-content">
                      {event.isExpanded ? renderExpandedEvent(event) : renderCollapsedEvent(event)}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* 底部状态栏 */}
            <div className="timeline-footer">
              <div className="summary-progress">
                <span className="progress-text">
                  概括进度: {summarizedCount}/{totalEvents} ({summaryProgress}%)
                </span>
                <div className="progress-bar">
                  <div 
                    className="progress-fill" 
                    style={{ 
                      width: `${summaryProgress}%` 
                    }}
                  ></div>
                </div>
              </div>
              <div className="footer-tip">
                <i data-feather="info"></i>
                {translationEnabled 
                  ? "点击时间卡片展开查看原文" 
                  : "请配置有效的DeepSeek API密钥以启用AI概括功能"}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default TimelineVisualization;
