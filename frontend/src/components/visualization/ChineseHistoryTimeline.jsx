import React, { useRef, useEffect, useState } from 'react';
import { t } from '../../utils/language';
import '../../styles/components/Visualization/ChineseHistoryTimeline.css';

// 中国历史朝代时间数据
const chineseDynasties = [
  { name: '先秦', start: -221, end: -770, color: '#8B4513' },
  { name: '秦', start: -221, end: -206, color: '#DC143C' },
  { name: '西汉', start: -206, end: 25, color: '#4169E1' },
  { name: '东汉', start: 25, end: 220, color: '#4682B4' },
  { name: '三国', start: 220, end: 280, color: '#FF8C00' },
  { name: '西晋', start: 265, end: 316, color: '#DA70D6' },
  { name: '东晋', start: 317, end: 420, color: '#9370DB' },
  { name: '南北朝', start: 420, end: 589, color: '#32CD32' },
  { name: '隋', start: 581, end: 618, color: '#20B2AA' },
  { name: '唐', start: 618, end: 907, color: '#FFD700' },
  { name: '五代十国', start: 907, end: 979, color: '#FF6347' },
  { name: '北宋', start: 960, end: 1127, color: '#87CEEB' },
  { name: '南宋', start: 1127, end: 1279, color: '#87CEFA' },
  { name: '元', start: 1271, end: 1368, color: '#708090' },
  { name: '明', start: 1368, end: 1644, color: '#32CD32' },
  { name: '清', start: 1644, end: 1912, color: '#4682B4' },
  { name: '近代', start: 1912, end: 1949, color: '#FF6B6B' }
];

const ChineseHistoryTimeline = ({ annotations, filters }) => {
  const containerRef = useRef(null);
  const canvasRef = useRef(null);
  const tooltipRef = useRef(null);
  const [scale, setScale] = useState(1);
  const [offset, setOffset] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [lastMouseX, setLastMouseX] = useState(0);
  const [events, setEvents] = useState([]);
  const [hoveredDynasty, setHoveredDynasty] = useState(null);
  const [hoveredEvent, setHoveredEvent] = useState(null);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [dynastyPositions, setDynastyPositions] = useState([]);
  const [eventPositions, setEventPositions] = useState([]);
  
  // 过滤并解析时间事件
  useEffect(() => {
    if (!annotations) return;
    
    const filteredAnnotations = annotations.filter(ann => 
      ann.label === '时间' && filters.times
    );
    
    // 简单的时间解析（这里可以根据实际需求扩展更复杂的解析）
    const parsedEvents = filteredAnnotations.map(ann => {
      // 这里只是一个示例，实际需要根据文本内容解析具体年份
      // 简单处理：假设文本中包含年份信息
      const yearMatch = ann.text.match(/(公元前)?(\d{1,4})年/);
      let year = 0;
      
      if (yearMatch) {
        const isBC = yearMatch[1] === '公元前';
        year = parseInt(yearMatch[2], 10);
        if (isBC) year = -year;
      }
      
      return {
        ...ann,
        year,
        expanded: false // 添加展开状态
      };
    });
    
    // 按年份排序事件
    const sortedEvents = parsedEvents.sort((a, b) => a.year - b.year);
    
    // 优化事件位置，避免挤压
    const optimizedEvents = optimizeEventPositions(sortedEvents);
    
    setEvents(optimizedEvents);
  }, [annotations, filters]);
  
  // 优化事件位置，避免挤压
  const optimizeEventPositions = (events) => {
    if (events.length === 0) return [];
    
    // 按年份排序事件
    const sortedEvents = [...events].sort((a, b) => a.year - b.year);
    
    // 动态轨道分配算法：将事件分组到不同轨道，避免重叠
    const tracks = [];
    const trackHeight = 50; // 每个轨道的像素高度
    const eventsWithPositions = [];
    
    // 为每个事件分配轨道
    sortedEvents.forEach(event => {
      let assigned = false;
      
      // 尝试分配到现有轨道
      for (let i = 0; i < tracks.length; i++) {
        const track = tracks[i];
        const lastEvent = track[track.length - 1];
        
        // 简单实现：按年份分组，不同年份可以分配到同一轨道
        // 这里使用年份差作为判断依据，超过一定年份差可以分配到同一轨道
        const yearDiff = Math.abs(event.year - lastEvent.year);
        
        if (yearDiff > 50) { // 年份差大于50年可以分配到同一轨道
          track.push(event);
          assigned = true;
          break;
        }
      }
      
      // 如果没有分配到现有轨道，创建新轨道
      if (!assigned) {
        tracks.push([event]);
      }
    });
    
    // 计算每个事件的垂直位置
    tracks.forEach((track, trackIndex) => {
      // 计算轨道的垂直位置 (0-1 范围)
      // 轨道从中间向上下扩展
      const centerTrack = Math.floor(tracks.length / 2);
      const relativeTrack = trackIndex - centerTrack;
      const position = 0.5 + (relativeTrack * 0.15);
      
      track.forEach(event => {
        eventsWithPositions.push({
          ...event,
          position,
          trackIndex
        });
      });
    });
    
    return eventsWithPositions;
  };
  
  // 绘制时间轴
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !containerRef.current) return;
    
    // 获取容器尺寸
    const containerWidth = containerRef.current.offsetWidth;
    
    const ctx = canvas.getContext('2d');
    canvas.width = containerWidth;
    
    // 根据轨道数量动态调整画布高度
    const tracks = [...new Set(events.map(e => e.trackIndex))];
    const trackCount = Math.max(tracks.length, 1);
    const baseHeight = 400;
    const additionalHeight = Math.max(0, (trackCount - 3) * 50); // 每条轨道额外50px高度
    const canvasHeight = baseHeight + additionalHeight;
    canvas.height = Math.max(canvasHeight, 400); // 最小400px高度
    
    // 清空画布
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // 计算时间轴范围
    const minYear = Math.min(...chineseDynasties.map(d => d.start));
    const maxYear = Math.max(...chineseDynasties.map(d => d.end));
    const yearRange = maxYear - minYear;
    
    // 计算每个年份对应的像素位置
    const timelineHeight = canvas.height * 0.5;
    const timelineY = canvas.height * 0.5;
    const yearToPixel = (year) => {
      const relativePos = (year - minYear) / yearRange;
      return offset + relativePos * canvas.width * scale;
    };
    
    // 绘制背景
    ctx.fillStyle = '#f8f9fa';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // 绘制时间轴线
    ctx.strokeStyle = '#007bff';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(0, timelineY);
    ctx.lineTo(canvas.width, timelineY);
    ctx.stroke();
    
    // 记录朝代位置
    const positions = [];
    
    // 绘制朝代区块
    chineseDynasties.forEach(dynasty => {
      const startX = yearToPixel(dynasty.start);
      const endX = yearToPixel(dynasty.end);
      const midX = (startX + endX) / 2;
      
      // 绘制朝代背景带
      ctx.fillStyle = `${dynasty.color}20`;
      ctx.fillRect(startX, timelineY - 15, endX - startX, 30);
      
      // 绘制朝代名称
      ctx.fillStyle = '#333';
      ctx.font = '12px Arial';
      ctx.textAlign = 'center';
      
      // 只有当区块足够宽时才显示名称
      if (endX - startX > 60) {
        ctx.fillText(dynasty.name, midX, timelineY + 5);
      }
      
      // 绘制年份标记
      ctx.fillStyle = '#666';
      ctx.font = '10px Arial';
      if (dynasty.start > 0) {
        ctx.fillText(dynasty.start + '年', startX, timelineY + 20);
      } else {
        ctx.fillText('公元前' + Math.abs(dynasty.start) + '年', startX, timelineY + 20);
      }
      
      // 记录朝代位置信息，用于鼠标悬停检测
      positions.push({
        dynasty,
        startX,
        endX,
        y: timelineY - 15,
        height: 30
      });
    });
    
    // 更新朝代位置状态
    setDynastyPositions(positions);
    
    // 记录事件位置
    const eventPositions = [];
    
    // 绘制时间事件
    // 始终显示所有事件，通过垂直滚动查看
    events.forEach(event => {
      const eventX = yearToPixel(event.year);
      const eventY = timelineY + (event.position - 0.5) * timelineHeight;
      
      // 绘制连接线
      ctx.strokeStyle = '#ff6b6b80'; // 半透明红色
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(eventX, timelineY);
      ctx.lineTo(eventX, eventY);
      ctx.stroke();
      
      // 绘制事件节点
      ctx.fillStyle = '#ff6b6b';
      ctx.beginPath();
      ctx.arc(eventX, eventY, 5, 0, Math.PI * 2);
      ctx.fill();
      
      // 绘制节点边框
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(eventX, eventY, 5, 0, Math.PI * 2);
      ctx.stroke();
      
      // 绘制节点发光效果
      ctx.shadowBlur = 8;
      ctx.shadowColor = '#ff6b6b';
      ctx.fillStyle = '#ff6b6b';
      ctx.beginPath();
      ctx.arc(eventX, eventY, 3, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;
      
      // 简化事件文本显示，只显示简短信息
      let shortText = event.text;
      // 提取年份信息
      const yearMatch = event.text.match(/(公元前)?(\d{1,4})年/);
      if (yearMatch) {
        shortText = yearMatch[0];
      } else {
        // 限制文本长度
        shortText = shortText.length > 10 ? shortText.substring(0, 10) + '...' : shortText;
      }
      
      // 绘制简化的事件文本
      ctx.fillStyle = '#333';
      ctx.font = '11px Arial';
      ctx.textAlign = 'left';
      ctx.fillText(shortText, eventX + 12, eventY + 3);
      
      // 记录事件位置信息，用于鼠标悬停检测
      eventPositions.push({
        event,
        x: eventX,
        y: eventY,
        radius: 15 // 检测半径，比实际节点大，便于点击
      });
    });
    
    // 更新事件位置状态
    setEventPositions(eventPositions);
    
    // 绘制标题
    ctx.fillStyle = '#333';
    ctx.font = '16px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('中国历史时间轴', canvas.width / 2, 30);
    
  }, [scale, offset, events]);
  
  // 处理鼠标事件
  const handleMouseDown = (e) => {
    setIsDragging(true);
    setLastMouseX(e.clientX);
    setHoveredDynasty(null);
    setHoveredEvent(null);
  };
  
  const handleMouseMove = (e) => {
    if (isDragging) {
      const deltaX = e.clientX - lastMouseX;
      setOffset(prev => prev + deltaX);
      setLastMouseX(e.clientX);
      setHoveredDynasty(null);
      setHoveredEvent(null);
      return;
    }
    
    // 获取鼠标在画布上的位置
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    setMousePos({ x, y });
    
    // 检测是否悬停在朝代区块上
    const hoveredDynasty = dynastyPositions.find(pos => {
      return x >= pos.startX && x <= pos.endX && 
             y >= pos.y && y <= pos.y + pos.height;
    });
    
    setHoveredDynasty(hoveredDynasty?.dynasty || null);
    
    // 检测是否悬停在事件节点上
    const hoveredEvent = eventPositions.find(pos => {
      const dx = x - pos.x;
      const dy = y - pos.y;
      return Math.sqrt(dx * dx + dy * dy) <= pos.radius;
    });
    
    setHoveredEvent(hoveredEvent?.event || null);
  };
  
  const handleMouseUp = () => {
    setIsDragging(false);
  };
  
  const handleMouseLeave = () => {
    setHoveredDynasty(null);
    setHoveredEvent(null);
    setIsDragging(false);
  };
  
  const handleWheel = (e) => {
    e.preventDefault();
    const zoomFactor = e.deltaY > 0 ? 0.9 : 1.1;
    setScale(prev => Math.max(0.5, Math.min(10, prev * zoomFactor)));
  };
  
  return (
    <div className="chinese-history-timeline" ref={containerRef}>
      <div className="timeline-header">
        <h3>中国历史时间轴</h3>
        <p className="timeline-info">从秦国到近代的中国历史时间轴，展示文本中提及的时间事件</p>
      </div>
      
      {/* 时间轴画布 */}
      <div className="timeline-canvas-wrapper">
        <canvas
          ref={canvasRef}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseLeave}
          onWheel={handleWheel}
          className="timeline-canvas"
        />
        
        {/* 朝代提示框 */}
        {hoveredDynasty && (
          <div
            ref={tooltipRef}
            className="timeline-tooltip"
            style={{
              left: `${mousePos.x + 10}px`,
              top: `${mousePos.y - 10}px`
            }}
          >
            <div className="tooltip-content">
              <div className="tooltip-title">{hoveredDynasty.name}</div>
              <div className="tooltip-year">
                {hoveredDynasty.start < 0 ? `公元前${Math.abs(hoveredDynasty.start)}年` : `${hoveredDynasty.start}年`} - 
                {hoveredDynasty.end < 0 ? `公元前${Math.abs(hoveredDynasty.end)}年` : `${hoveredDynasty.end}年`}
              </div>
              <div className="tooltip-duration">
                持续约 {Math.abs(hoveredDynasty.end - hoveredDynasty.start)} 年
              </div>
            </div>
          </div>
        )}
        
        {/* 事件提示框 */}
        {hoveredEvent && (
          <div
            className="timeline-tooltip event-tooltip"
            style={{
              left: `${mousePos.x + 10}px`,
              top: `${mousePos.y - 10}px`
            }}
          >
            <div className="tooltip-content">
              <div className="tooltip-title" style={{ color: '#ff6b6b' }}>事件信息</div>
              <div className="tooltip-event-text">{hoveredEvent.text}</div>
              {hoveredEvent.year !== 0 && (
                <div className="tooltip-event-year">
                  对应年份: {hoveredEvent.year < 0 ? `公元前${Math.abs(hoveredEvent.year)}年` : `${hoveredEvent.year}年`}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
      
      {/* 控制按钮 */}
      <div className="timeline-controls-simple">
        <button 
          className="timeline-btn"
          onClick={() => {
            setScale(1);
            setOffset(0);
          }}
        >
          重置视图
        </button>
        <span className="timeline-hint">
          拖拽可平移，滚轮可缩放
        </span>
      </div>
      
      {/* 朝代图例 */}
      <div className="timeline-legend-simple">
        <h4>朝代图例</h4>
        <div className="legend-grid">
          {chineseDynasties.map(dynasty => (
            <div key={dynasty.name} className="legend-item-simple">
              <span 
                className="legend-color-simple" 
                style={{ backgroundColor: dynasty.color }}
              ></span>
              <span className="legend-text-simple">{dynasty.name}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default ChineseHistoryTimeline;