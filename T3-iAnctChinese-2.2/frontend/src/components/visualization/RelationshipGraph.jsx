// src/components/visualization/RelationshipGraph.jsx
import React, { useMemo, useRef, useState, useCallback } from 'react';
import '../../styles/components/Visualization/RelationshipGraph.css';

// 获取关系标签
const getRelationshipLabel = (strength) => {
  if (strength >= 5) return '密切';
  if (strength >= 3) return '熟悉';
  if (strength >= 2) return '相识';
  return '关联';
};

const RelationshipGraph = ({ annotations, filters, content }) => {
  const containerRef = useRef(null);
  const [transform, setTransform] = useState({ x: 0, y: 0, scale: 1 });
  const [isDragging, setIsDragging] = useState(false);
  const [lastMousePos, setLastMousePos] = useState({ x: 0, y: 0 });

  // 拖拽处理
  const handleMouseDown = useCallback((e) => {
    if (e.button !== 0) return;
    setIsDragging(true);
    setLastMousePos({ x: e.clientX, y: e.clientY });
    e.preventDefault();
  }, []);

  const handleMouseMove = useCallback((e) => {
    if (!isDragging) return;
    
    const deltaX = e.clientX - lastMousePos.x;
    const deltaY = e.clientY - lastMousePos.y;
    
    setTransform(prev => ({
      ...prev,
      x: prev.x + deltaX,
      y: prev.y + deltaY
    }));
    
    setLastMousePos({ x: e.clientX, y: e.clientY });
    e.preventDefault();
  }, [isDragging, lastMousePos]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  // 缩放处理
  const handleWheel = useCallback((e) => {
    e.preventDefault();
    const scaleDelta = e.deltaY > 0 ? 0.9 : 1.1;
    const newScale = Math.max(0.3, Math.min(3, transform.scale * scaleDelta));
    
    setTransform(prev => ({
      ...prev,
      scale: newScale
    }));
  }, [transform.scale]);

  const relationshipData = useMemo(() => {
    const personAnnotations = annotations.filter(ann => 
      ann.label === '人物' && filters.persons
    );
    
    const relationships = [];
    const persons = [...new Set(personAnnotations.map(ann => ann.text))];
    
    if (persons.length === 0) {
      return { nodes: [], links: [], centerPerson: null };
    }
    
    // 计算人物出现频率
    const personFrequency = {};
    personAnnotations.forEach(ann => {
      personFrequency[ann.text] = (personFrequency[ann.text] || 0) + 1;
    });
    
    // 找到出现最频繁的人物作为中心
    const centerPerson = persons.reduce((max, person) => 
      personFrequency[person] > personFrequency[max] ? person : max, persons[0]
    );
    
    // 更全面的关系分析
    const relationshipStrength = {};
    
    // 方法1：按段落分析
    const paragraphs = content.split('\n').filter(p => p.trim());
    paragraphs.forEach(paragraph => {
      const personsInParagraph = persons.filter(person => 
        paragraph.includes(person)
      );
      
      // 如果中心人物在段落中，建立中心人物与其他人的关系
      if (personsInParagraph.includes(centerPerson)) {
        personsInParagraph.forEach(person => {
          if (person !== centerPerson) {
            const key = `${centerPerson}-${person}`;
            relationshipStrength[key] = (relationshipStrength[key] || 0) + 1;
          }
        });
      }
    });
    
    // 方法2：按句子分析（更细粒度）
    const sentences = content.split(/[。！？.!?]/).filter(s => s.trim());
    sentences.forEach(sentence => {
      const personsInSentence = persons.filter(person => 
        sentence.includes(person)
      );
      
      if (personsInSentence.includes(centerPerson)) {
        personsInSentence.forEach(person => {
          if (person !== centerPerson) {
            const key = `${centerPerson}-${person}`;
            relationshipStrength[key] = (relationshipStrength[key] || 0) + 1;
          }
        });
      }
    });
    
    // 方法3：基于邻近度分析（在相近位置出现）
    const centerPositions = personAnnotations
      .filter(ann => ann.text === centerPerson)
      .map(ann => (ann.start + ann.end) / 2);
    
    persons.forEach(person => {
      if (person !== centerPerson) {
        const personPositions = personAnnotations
          .filter(ann => ann.text === person)
          .map(ann => (ann.start + ann.end) / 2);
        
        // 检查是否有相近的出现位置
        let proximityCount = 0;
        centerPositions.forEach(centerPos => {
          personPositions.forEach(personPos => {
            if (Math.abs(centerPos - personPos) < 100) { // 在100字符范围内
              proximityCount++;
            }
          });
        });
        
        if (proximityCount > 0) {
          const key = `${centerPerson}-${person}`;
          relationshipStrength[key] = (relationshipStrength[key] || 0) + proximityCount;
        }
      }
    });
    
    // 创建关系数据
    Object.entries(relationshipStrength).forEach(([key, strength]) => {
      const [source, target] = key.split('-');
      relationships.push({
        source,
        target,
        strength,
        label: getRelationshipLabel(strength)
      });
    });
    
    // 确保每个其他人物至少有一条连线（即使强度为1）
    persons.forEach(person => {
      if (person !== centerPerson) {
        const exists = relationships.some(link => 
          (link.source === centerPerson && link.target === person) ||
          (link.source === person && link.target === centerPerson)
        );
        
        if (!exists) {
          relationships.push({
            source: centerPerson,
            target: person,
            strength: 1,
            label: getRelationshipLabel(1)
          });
        }
      }
    });
    
    return {
      nodes: persons.map(name => ({ 
        id: name, 
        name,
        isCenter: name === centerPerson,
        frequency: personFrequency[name]
      })),
      links: relationships,
      centerPerson
    };
  }, [annotations, filters, content]);

  // 计算节点位置（固定布局）
  const getNodePositions = () => {
    const positions = {};
    const centerPerson = relationshipData.centerPerson;
    
    if (!centerPerson) return positions;
    
    // 中心节点位置
    positions[centerPerson] = { x: 400, y: 300 };
    
    // 其他节点围绕中心排列
    const otherNodes = relationshipData.nodes.filter(n => n.name !== centerPerson);
    const radius = Math.min(250, Math.max(150, otherNodes.length * 15));
    
    otherNodes.forEach((node, index) => {
      const angle = (2 * Math.PI * index) / otherNodes.length;
      const x = 400 + radius * Math.cos(angle);
      const y = 300 + radius * Math.sin(angle);
      positions[node.name] = { x, y };
    });
    
    return positions;
  };

  const nodePositions = getNodePositions();

  // 获取节点大小
  const getNodeSize = (frequency) => {
    const baseSize = 40;
    const frequencyBonus = Math.min(frequency * 3, 20);
    return baseSize + frequencyBonus;
  };

  // 获取连线宽度
  const getLinkWidth = (strength) => {
    return Math.max(1, Math.min(strength * 1.5, 5));
  };

  // 计算连线起点和终点（从节点边缘开始）
  const calculateLinePoints = (sourcePos, targetPos, sourceSize, targetSize) => {
    const dx = targetPos.x - sourcePos.x;
    const dy = targetPos.y - sourcePos.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    
    if (distance === 0) return null;
    
    const unitX = dx / distance;
    const unitY = dy / distance;
    
    const startX = sourcePos.x + unitX * (sourceSize / 2);
    const startY = sourcePos.y + unitY * (sourceSize / 2);
    const endX = targetPos.x - unitX * (targetSize / 2);
    const endY = targetPos.y - unitY * (targetSize / 2);
    
    const actualDx = endX - startX;
    const actualDy = endY - startY;
    const actualDistance = Math.sqrt(actualDx * actualDx + actualDy * actualDy);
    const angle = Math.atan2(actualDy, actualDx) * 180 / Math.PI;
    
    return {
      startX,
      startY,
      endX,
      endY,
      distance: actualDistance,
      angle,
      midX: (startX + endX) / 2,
      midY: (startY + endY) / 2
    };
  };

  // 重置视图
  const handleResetView = () => {
    setTransform({ x: 0, y: 0, scale: 1 });
  };

  // 调试信息
  console.log('关系图数据:', relationshipData);

  return (
    <div className="relationship-graph">
      <div className="graph-header">
        <h3>人物关系图</h3>
        <div className="header-controls">
          <button className="reset-btn" onClick={handleResetView}>
            <i data-feather="refresh-cw"></i>
            重置视图
          </button>
          <div className="debug-info">
            中心人物: {relationshipData.centerPerson} | 
            节点: {relationshipData.nodes.length} | 
            连线: {relationshipData.links.length}
          </div>
        </div>
      </div>
      
      <div 
        className="graph-container"
        ref={containerRef}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onWheel={handleWheel}
        style={{ cursor: isDragging ? 'grabbing' : 'grab' }}
      >
        {relationshipData.nodes.length === 0 ? (
          <div className="empty-graph">
            <i data-feather="users"></i>
            <p>没有找到人物关系</p>
            <p style={{ fontSize: '0.9em', marginTop: '10px', opacity: '0.7' }}>
              请确保文档中包含人物实体标注
            </p>
          </div>
        ) : (
          <div 
            className="graph-visualization"
            style={{
              transform: `translate(${transform.x}px, ${transform.y}px) scale(${transform.scale})`,
              transformOrigin: 'center center'
            }}
          >
            {/* 连线容器 */}
            <div className="links-container">
              {relationshipData.links.map((link, index) => {
                const sourcePos = nodePositions[link.source];
                const targetPos = nodePositions[link.target];
                
                if (!sourcePos || !targetPos) {
                  console.log('缺少位置信息:', link);
                  return null;
                }
                
                const sourceNode = relationshipData.nodes.find(n => n.name === link.source);
                const targetNode = relationshipData.nodes.find(n => n.name === link.target);
                const sourceSize = getNodeSize(sourceNode?.frequency || 1);
                const targetSize = getNodeSize(targetNode?.frequency || 1);
                
                const linePoints = calculateLinePoints(sourcePos, targetPos, sourceSize, targetSize);
                
                if (!linePoints) return null;
                
                return (
                  <div key={`${link.source}-${link.target}-${index}`} className="link-group">
                    {/* 连线 */}
                    <div 
                      className="relationship-line"
                      style={{
                        left: `${linePoints.startX}px`,
                        top: `${linePoints.startY}px`,
                        width: `${linePoints.distance}px`,
                        transform: `rotate(${linePoints.angle}deg)`,
                        height: `${getLinkWidth(link.strength)}px`,
                        backgroundColor: link.strength >= 3 ? 'rgba(220, 53, 69, 0.8)' : 'rgba(0, 123, 255, 0.7)'
                      }}
                    />
                    
                    {/* 关系标签 */}
                    {link.strength > 1 && (
                      <div 
                        className="relationship-label"
                        style={{
                          left: `${linePoints.midX}px`,
                          top: `${linePoints.midY}px`,
                          backgroundColor: link.strength >= 3 ? 'rgba(220, 53, 69, 0.1)' : 'rgba(0, 123, 255, 0.1)',
                          borderColor: link.strength >= 3 ? 'rgba(220, 53, 69, 0.3)' : 'rgba(0, 123, 255, 0.3)',
                          color: link.strength >= 3 ? '#dc3545' : '#007bff'
                        }}
                      >
                        {link.label}({link.strength})
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* 人物节点 */}
            <div className="graph-nodes">
              {relationshipData.nodes.map((node) => {
                const position = nodePositions[node.name];
                if (!position) return null;
                
                const nodeSize = getNodeSize(node.frequency);
                
                return (
                  <div
                    key={node.id}
                    className={`graph-node ${node.isCenter ? 'center-node' : ''}`}
                    style={{
                      left: `${position.x}px`,
                      top: `${position.y}px`,
                      width: `${nodeSize}px`,
                      height: `${nodeSize}px`
                    }}
                    title={`${node.name} (出现${node.frequency}次)`}
                  >
                    <div className="node-content">
                      <div className="node-name">{node.name}</div>
                      {node.frequency > 1 && (
                        <div className="node-frequency">{node.frequency}</div>
                      )}
                    </div>
                    {node.isCenter && (
                      <div className="center-badge">中心</div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* 图例 */}
        <div className="graph-legend">
          <h4>关系图例</h4>
          <div className="legend-item">
            <div className="legend-color center-color"></div>
            <span>中心人物</span>
          </div>
          <div className="legend-item">
            <div className="legend-line normal-line"></div>
            <span>普通关系</span>
          </div>
          <div className="legend-item">
            <div className="legend-line strong-line"></div>
            <span>密切关系</span>
          </div>
          <div className="legend-stats">
            <p>共 {relationshipData.nodes.length} 个人物</p>
            <p>共 {relationshipData.links.length} 条关系</p>
            <p>中心: {relationshipData.centerPerson}</p>
          </div>
          <div className="zoom-hint">
            <p>拖拽移动 • 滚轮缩放</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RelationshipGraph;