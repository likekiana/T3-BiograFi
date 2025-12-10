// src/components/visualization/TimelineVisualization.jsx
import React, { useMemo, useState, useEffect, useRef } from 'react';
import '../../styles/components/Visualization/TimelineVisualization.css';
import { aiService } from '../../services/aiService';
import html2canvas from 'html2canvas';
import EventDetailView from './EventDetailView'; // 新增导入

const TimelineVisualization = ({ annotations, filters, content, isProjectView = false }) => {
  const [summaries, setSummaries] = useState({});
  const [loading, setLoading] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState(null); // 新增：选中的事件
  const [showDetail, setShowDetail] = useState(false); // 新增：显示详情
  const [characterName, setCharacterName] = useState(''); // 新增：传记人物名称
  const timelineRef = useRef(null);
  
  // 解析时间字符串，用于排序
  const parseTime = (timeStr) => {
    // 简单的时间解析，根据实际数据格式可能需要更复杂的逻辑
    const numMatch = timeStr.match(/\d+/);
    return numMatch ? parseInt(numMatch[0]) : 0;
  };
  
  // 导出为PNG
  const exportAsPNG = async () => {
    if (!timelineRef.current) return;
    
    try {
      const canvas = await html2canvas(timelineRef.current);
      const dataURL = canvas.toDataURL('image/png');
      downloadFile(dataURL, 'timeline-visualization.png', 'image/png');
    } catch (error) {
      console.error('导出PNG失败:', error);
      alert('导出PNG失败，请重试');
    }
  };
  
  // 导出为JSON
  const exportAsJSON = () => {
    const exportData = {
      timelineEvents,
      summaries,
      annotations: annotations.filter(ann => ann.label === '时间' && filters.times),
      content: content.substring(0, 200) + '...' // 只导出部分内容作为参考
    };
    const dataStr = JSON.stringify(exportData, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    downloadFile(URL.createObjectURL(dataBlob), 'timeline-visualization.json', 'application/json');
  };
  
  // 导出为CSV
  const exportAsCSV = () => {
    const headers = ['时间', '事件描述', 'AI概括'];
    const rows = timelineEvents.map(event => [
      event.time,
      event.context.replace(/<[^>]+>/g, ''), // 移除HTML标签
      summaries[event.id] || ''
    ]);
    
    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');
    
    const dataBlob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    downloadFile(URL.createObjectURL(dataBlob), 'timeline-visualization.csv', 'text/csv');
  };
  
  // 通用下载函数
  const downloadFile = (url, filename, mimeType) => {
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.type = mimeType;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    // 如果是Blob URL，释放资源
    if (url.startsWith('blob:')) {
      setTimeout(() => URL.revokeObjectURL(url), 100);
    }
  };

  // 生成时间事件
  const timelineEvents = useMemo(() => {
    const timeAnnotations = annotations.filter(ann => 
      ann.label === '时间' && filters.times
    );
    
    return timeAnnotations.map(annotation => {
      // 提取时间相关的上下文
      const contextStart = Math.max(0, annotation.start - 100);
      const contextEnd = Math.min(content.length, annotation.end + 100);
      const context = content.substring(contextStart, contextEnd);
      
      // 高亮显示时间实体
      const highlightedContext = context.replace(
        annotation.text, 
        `<mark style="background: #ffeb3b; padding: 2px 4px; border-radius: 3px;">${annotation.text}</mark>`
      );
      
      return {
        id: annotation.id || annotation.start,
        original: annotation,
        time: annotation.text,
        context: context,
        description: highlightedContext,
        startTime: annotation.start,
        numericTime: parseTime(annotation.text),
        type: 'event',
        entities: annotations.filter(ann => 
          ann.start >= contextStart && 
          ann.end <= contextEnd && 
          ann.label !== '时间' &&
          filters[ann.label.toLowerCase()]
        )
      };
    }).sort((a, b) => {
      // 按时间数值和出现顺序排序
      if (a.numericTime !== b.numericTime) {
        return a.numericTime - b.numericTime;
      }
      return a.startTime - b.startTime;
    });
  }, [annotations, filters, content]);

  // 为每个时间事件生成AI概括
  useEffect(() => {
    const generateSummaries = async () => {
      if (timelineEvents.length === 0) return;
      
      setLoading(true);
      // 创建一个新对象，避免引用问题
      const newSummaries = {};
      
      for (const event of timelineEvents) {
        try {
          // 使用AI服务生成概括
          const question = `请用简洁的语言概括以下文本中与时间"${event.time}"相关的事件，重点描述发生了什么事情，涉及哪些人物和地点。`;
          
          // 使用aiService的askQuestion方法生成概括
          const summary = await aiService.askQuestion(event.context, question);
          newSummaries[event.id] = summary;
        } catch (error) {
          console.error(`生成时间${event.time}的概括失败:`, error);
          newSummaries[event.id] = '无法生成概括';
        }
        
        // 避免请求过于频繁
        await new Promise(resolve => setTimeout(resolve, 500));
      }
      
      setSummaries(newSummaries);
      setLoading(false);
    };
    
    generateSummaries();
  }, [timelineEvents]);

  // 提取传记人物名称
  useEffect(() => {
    // 从内容中提取可能的传记人物名称
    const extractCharacterName = async () => {
      try {
        // 尝试从标注中获取人物
        const personAnnotations = annotations.filter(ann => 
          ann.label === '人物' && ann.text
        );
        
        if (personAnnotations.length > 0) {
          // 选择出现频率最高的人物
          const nameCounts = {};
          personAnnotations.forEach(ann => {
            nameCounts[ann.text] = (nameCounts[ann.text] || 0) + 1;
          });
          
          const mostFrequent = Object.entries(nameCounts)
            .sort((a, b) => b[1] - a[1])[0];
          
          if (mostFrequent) {
            setCharacterName(mostFrequent[0]);
            return;
          }
        }
        
        // 如果没有标注，使用AI提取
        if (content.length > 0) {
          const question = "请从以上文本中提取主要传记人物的姓名，只返回姓名，不要其他内容";
          const name = await aiService.askQuestion(content.substring(0, 500), question);
          if (name && name.trim().length > 0) {
            setCharacterName(name.trim());
          } else {
            setCharacterName('传记人物');
          }
        }
      } catch (error) {
        console.error('提取传记人物名称失败:', error);
        setCharacterName('传记人物');
      }
    };
    
    if (annotations.length > 0 || content.length > 0) {
      extractCharacterName();
    }
  }, [annotations, content]);

  // 处理事件点击，显示详情
  const handleEventClick = (event, index) => {
    setSelectedEvent({
      ...event,
      position: index + 1,
      totalEvents: timelineEvents.length
    });
    setShowDetail(true);
  };

  return (
    <>
      <div className="timeline-visualization">
        <div className="timeline-header">
          <div className="header-left">
            <h3>时间事件轴</h3>
            {characterName && (
              <div className="character-badge">
                <i data-feather="user"></i>
                <span>{characterName}</span>
              </div>
            )}
          </div>
          <div className="export-buttons">
            <button className="export-btn" onClick={exportAsPNG} title="导出为PNG">
              <i data-feather="download" data-rendered="false"></i>
              导出PNG
            </button>
            <button className="export-btn" onClick={exportAsJSON} title="导出为JSON">
              <i data-feather="download" data-rendered="false"></i>
              导出JSON
            </button>
            <button className="export-btn" onClick={exportAsCSV} title="导出为CSV">
              <i data-feather="download" data-rendered="false"></i>
              导出CSV
            </button>
          </div>
        </div>
        
        {loading && timelineEvents.length > 0 && (
          <div className="loading-summaries">
            <i data-feather="refresh-cw" className="spinning"></i>
            <span>正在生成事件概括...</span>
          </div>
        )}
        
        <div className="timeline-info-bar">
          <div className="info-item">
            <i data-feather="calendar"></i>
            <span>共发现 {timelineEvents.length} 个时间事件</span>
          </div>
          <div className="info-item">
            <i data-feather="info"></i>
            <span>点击任意事件查看详细分析和人物视角</span>
          </div>
        </div>
        
        <div className="timeline-container" ref={timelineRef}>
          {timelineEvents.length === 0 ? (
            <div className="empty-timeline">
              <i data-feather="clock"></i>
              <p>没有找到时间相关的事件</p>
              <p style={{ fontSize: '0.9em', marginTop: '10px', opacity: '0.7' }}>
                请确保文档中包含时间实体标注
              </p>
            </div>
          ) : (
            <div className="timeline-scroll-container">
              <div className="timeline">
                {timelineEvents.map((event, index) => (
                  <div 
                    key={`${event.id}-${index}`} 
                    className="timeline-item"
                    onClick={() => handleEventClick(event, index)}
                  >
                    <div className="timeline-marker"></div>
                    <div className="timeline-content">
                      <div className="timeline-time">
                        {event.time}
                        <span className="click-hint">
                          <i data-feather="chevron-right"></i>
                          <span>查看详情</span>
                        </span>
                      </div>
                      <div 
                        className="timeline-description"
                        dangerouslySetInnerHTML={{ __html: event.description }}
                      />
                      {event.entities.length > 0 && (
                        <div className="timeline-entities">
                          {event.entities.map((entity, idx) => (
                            <span 
                              key={idx}
                              className={`entity-tag tag-${entity.label}`}
                              title={`${entity.label}: ${entity.text}`}
                            >
                              {entity.text}
                            </span>
                          ))}
                        </div>
                      )}
                      {summaries[event.id] && (
                        <div className="timeline-summary">
                          <div className="summary-header">
                            <i data-feather="book-open"></i>
                            <span>AI概括</span>
                          </div>
                          <div className="summary-content">
                            {summaries[event.id]}
                          </div>
                        </div>
                      )}
                      <div className="event-action-hint">
                        <i data-feather="zoom-in"></i>
                        <span>点击查看 {characterName} 在此事件中的详细经历</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 事件详情模态框 */}
      {showDetail && selectedEvent && (
        <EventDetailView
          event={selectedEvent}
          characterName={characterName}
          onClose={() => {
            setShowDetail(false);
            setSelectedEvent(null);
          }}
        />
      )}
    </>
  );
};

export default TimelineVisualization;