// src/components/visualization/TimelineVisualization.jsx
import React, { useMemo } from 'react';
import '../../styles/components/Visualization/TimelineVisualization.css';

const TimelineVisualization = ({ annotations, filters, content }) => {
  const timelineEvents = useMemo(() => {
    const timeAnnotations = annotations.filter(ann => 
      ann.label === '时间' && filters.times
    );
    
    return timeAnnotations.map(annotation => {
      // 提取时间相关的上下文
      const contextStart = Math.max(0, annotation.start - 50);
      const contextEnd = Math.min(content.length, annotation.end + 50);
      const context = content.substring(contextStart, contextEnd);
      
      // 高亮显示时间实体
      const highlightedContext = context.replace(
        annotation.text, 
        `<mark style="background: #ffeb3b; padding: 2px 4px; border-radius: 3px;">${annotation.text}</mark>`
      );
      
      return {
        id: annotation.start,
        time: annotation.text,
        description: highlightedContext,
        type: 'event',
        entities: annotations.filter(ann => 
          ann.start >= contextStart && 
          ann.end <= contextEnd && 
          ann.label !== '时间' &&
          filters[ann.label.toLowerCase()]
        )
      };
    });
  }, [annotations, filters, content]);

  return (
    <div className="timeline-visualization">
      <h3>时间事件轴</h3>
      <div className="timeline-container">
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
                <div key={`${event.id}-${index}`} className="timeline-item">
                  <div className="timeline-marker"></div>
                  <div className="timeline-content">
                    <div className="timeline-time">
                      {event.time}
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
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default TimelineVisualization;