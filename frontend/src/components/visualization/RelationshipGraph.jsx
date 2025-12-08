// src/components/visualization/RelationshipGraph.jsx
import React, { useMemo, useRef, useState, useCallback, useEffect } from 'react';
import { OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import '../../styles/components/Visualization/RelationshipGraph.css';

import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Text } from '@react-three/drei';
import { EffectComposer, Bloom, Vignette } from '@react-three/postprocessing'; // 添加postprocessing
import { BlendFunction } from 'postprocessing';

// 获取关系标签
const getRelationshipLabel = (strength) => {
  if (strength >= 5) return '密切';
  if (strength >= 3) return '熟悉';
  if (strength >= 2) return '相识';
  return '关联';
};

// 2D 图形组件
const Graph2D = ({ data, transform, isDragging, onNodeClick }) => {
  const containerRef = useRef(null);

  // 计算节点位置（固定布局）
  const getNodePositions = () => {
    const positions = {};
    const centerPerson = data.centerPerson;

    if (!centerPerson) return positions;

    // 中心节点位置
    positions[centerPerson] = { x: 400, y: 300 };

    // 其他节点围绕中心排列
    const otherNodes = data.nodes.filter(n => n.name !== centerPerson);
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

  // 计算连线起点和终点
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

  return (
    <div
      className="graph-visualization"
      style={{
        transform: `translate(${transform.x}px, ${transform.y}px) scale(${transform.scale})`,
        transformOrigin: 'center center'
      }}
    >
      {/* 连线容器 */}
      <div className="links-container">
        {data.links.map((link, index) => {
          const sourcePos = nodePositions[link.source];
          const targetPos = nodePositions[link.target];

          if (!sourcePos || !targetPos) return null;

          const sourceNode = data.nodes.find(n => n.name === link.source);
          const targetNode = data.nodes.find(n => n.name === link.target);
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
        {data.nodes.map((node) => {
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
              onClick={() => onNodeClick && onNodeClick(node)}
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
  );
};

// 3D 节点组件（增强版）
const Node3D = ({ node, position, isCenter, onClick, hoveredNode, setHoveredNode }) => {
  const meshRef = useRef();
  const glowRef = useRef();
  const particleRef = useRef();

  // 计算节点大小
  const size = useMemo(() => {
    return 0.4 + (node.frequency * 0.08);
  }, [node.frequency]);

  // 动态颜色
  const color = useMemo(() => {
    if (isCenter) return '#FF416C'; // 中心节点用红色
    const hue = (node.id.length * 137) % 360; // 根据ID生成不同颜色
    return `hsl(${hue}, 70%, 60%)`;
  }, [isCenter, node.id]);

  // 浮动动画
  const [timeOffset] = useState(Math.random() * Math.PI * 2);
  useFrame((state) => {
    const time = state.clock.getElapsedTime();

    // 浮动效果
    if (meshRef.current) {
      const floatAmount = 0.1;
      const floatSpeed = 1;
      meshRef.current.position.y = position[1] + Math.sin(time * floatSpeed + timeOffset) * floatAmount;

      // 自转
      meshRef.current.rotation.y += 0.005;

      // 悬停时放大
      if (hoveredNode === node.id) {
        meshRef.current.scale.lerp(new THREE.Vector3(1.3, 1.3, 1.3), 0.1);
      } else {
        meshRef.current.scale.lerp(new THREE.Vector3(1, 1, 1), 0.1);
      }
    }

    // 光晕效果
    if (glowRef.current && isCenter) {
      glowRef.current.scale.x = 1 + Math.sin(time * 2) * 0.1;
      glowRef.current.scale.y = 1 + Math.sin(time * 2) * 0.1;
      glowRef.current.scale.z = 1 + Math.sin(time * 2) * 0.1;
    }
  });

  return (
    <group position={position}>
      {/* 粒子光环 */}
      {isCenter && (
        <mesh ref={particleRef} rotation={[Math.PI / 2, 0, 0]}>
          <ringGeometry args={[size * 2, size * 2.2, 32]} />
          <meshBasicMaterial
            color="#FFD700"
            transparent
            opacity={0.3}
            side={THREE.DoubleSide}
          />
        </mesh>
      )}

      {/* 主节点 */}
      <mesh
        ref={meshRef}
        onClick={(e) => {
          e.stopPropagation();
          onClick && onClick(node);
        }}
        onPointerOver={(e) => {
          e.stopPropagation();
          setHoveredNode(node.id);
        }}
        onPointerOut={(e) => {
          e.stopPropagation();
          setHoveredNode(null);
        }}
      >
        <icosahedronGeometry args={[size, 2]} /> {/* 使用二十面体代替球体，更有科技感 */}
        <meshPhysicalMaterial
          color={color}
          emissive={color}
          emissiveIntensity={0.3}
          roughness={0.2}
          metalness={0.9}
          clearcoat={1}
          clearcoatRoughness={0}
          transmission={0.2}
          opacity={0.9}
          transparent
        />
      </mesh>

      {/* 外发光效果 */}
      <mesh ref={glowRef}>
        <sphereGeometry args={[size * 1.5, 32, 32]} />
        <meshBasicMaterial
          color={isCenter ? "#FF416C" : color}
          transparent
          opacity={0.15}
          side={THREE.BackSide}
        />
      </mesh>

      {/* 悬停标签 */}
      {hoveredNode === node.id && (
        <mesh position={[0, size + 0.3, 0]}>
          <Text
            fontSize={0.15}
            color="white"
            anchorX="center"
            anchorY="middle"
            outlineWidth={0.02}
            outlineColor="#000"
          >
            {node.name}
          </Text>
        </mesh>
      )}
    </group>
  );
};

// 简化Link3D组件中的材质部分
const Link3D = ({ source, target, strength, label, isActive }) => {
  const lineRef = useRef();
  const labelRef = useRef();

  const [curvePoints] = useState(() => {
    // 创建贝塞尔曲线使连线更自然
    const start = new THREE.Vector3(...source);
    const end = new THREE.Vector3(...target);
    const mid = new THREE.Vector3().addVectors(start, end).multiplyScalar(0.5);

    // 添加一些曲率
    const curve = new THREE.QuadraticBezierCurve3(
      start,
      mid.clone().add(new THREE.Vector3(0, Math.random() * 0.5, 0)),
      end
    );

    return curve.getPoints(20);
  });

  const color = strength >= 3 ? '#FF416C' : '#4A90E2';
  const lineWidth = Math.max(0.02, Math.min(strength * 0.03, 0.1));

  // 流动动画
  useFrame((state) => {
    if (lineRef.current) {
      const time = state.clock.getElapsedTime();
      const material = lineRef.current.material;

      // 简单的透明度动画
      material.opacity = 0.7 + Math.sin(time * 2) * 0.2;
    }
  });

  return (
    <group>
      {/* 流动线条 */}
      <line ref={lineRef}>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            count={curvePoints.length}
            array={new Float32Array(curvePoints.flatMap(p => [p.x, p.y, p.z]))}
            itemSize={3}
          />
        </bufferGeometry>
        <lineBasicMaterial
          color={color}
          linewidth={lineWidth}
          transparent
          opacity={0.7}
        />
      </line>

      {/* 线上小颗粒 */}
      <points>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            count={curvePoints.length}
            array={new Float32Array(curvePoints.flatMap(p => [p.x, p.y, p.z]))}
            itemSize={3}
          />
        </bufferGeometry>
        <pointsMaterial
          size={0.05}
          color={color}
          transparent
          opacity={0.7}
          sizeAttenuation
        />
      </points>

      {/* 关系标签 */}
      <mesh ref={labelRef} position={curvePoints[Math.floor(curvePoints.length / 2)]}>
        <Text
          fontSize={0.1}
          color={color}
          anchorX="center"
          anchorY="middle"
          outlineWidth={0.01}
          outlineColor="#000"
        >
          {label}
        </Text>
      </mesh>
    </group>
  );
};

// 3D 背景粒子系统
const ParticleSystem = ({ count = 500 }) => {
  const pointsRef = useRef();

  const [particles] = useState(() => {
    const positions = new Float32Array(count * 3);
    for (let i = 0; i < count * 3; i += 3) {
      positions[i] = (Math.random() - 0.5) * 10;
      positions[i + 1] = (Math.random() - 0.5) * 10;
      positions[i + 2] = (Math.random() - 0.5) * 10;
    }
    return positions;
  });

  useFrame((state) => {
    if (pointsRef.current) {
      pointsRef.current.rotation.x = state.clock.getElapsedTime() * 0.05;
      pointsRef.current.rotation.y = state.clock.getElapsedTime() * 0.03;
    }
  });

  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={count}
          array={particles}
          itemSize={3}
        />
      </bufferGeometry>
      <pointsMaterial
        size={0.03}
        color="#6C63FF"
        transparent
        opacity={0.4}
        sizeAttenuation
        blending={THREE.AdditiveBlending}
      />
    </points>
  );
};

// 环境光效
const AmbientEffects = () => {
  return (
    <>
      {/* 多光源 */}
      <ambientLight intensity={0.3} color="#4A90E2" />
      <directionalLight
        position={[5, 5, 5]}
        intensity={0.8}
        color="#FFD700"
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
      />
      <directionalLight
        position={[-5, 3, -5]}
        intensity={0.4}
        color="#6C63FF"
      />
      <pointLight
        position={[0, 0, 5]}
        intensity={0.6}
        color="#FF416C"
        distance={10}
        decay={1}
      />

      {/* 聚光灯 */}
      <spotLight
        position={[3, 5, 2]}
        angle={0.3}
        penumbra={1}
        intensity={0.5}
        color="#00C9FF"
        castShadow
      />
    </>
  );
};

// 3D 场景组件（增强版）
const Graph3D = ({ data, onNodeClick, autoRotate }) => {
  const [hoveredNode, setHoveredNode] = useState(null);
  const controlsRef = useRef();

  // 计算3D位置（更动态的布局）
  const nodePositions = useMemo(() => {
    const positions = {};
    const centerPerson = data.centerPerson;

    if (!centerPerson) return positions;

    // 中心节点位置
    positions[centerPerson] = [0, 0, 0];

    // 其他节点分层排列
    const otherNodes = data.nodes.filter(n => n.name !== centerPerson);
    const layers = 3;
    const radius = [2, 4, 6];

    otherNodes.forEach((node, index) => {
      const layer = index % layers;
      const layerIndex = Math.floor(index / (otherNodes.length / layers));
      const layerRadius = radius[layer];

      const angle = (2 * Math.PI * layerIndex) / (otherNodes.length / layers);
      const x = layerRadius * Math.cos(angle);
      const y = (Math.random() - 0.5) * 2; // 一些Y轴变化
      const z = layerRadius * Math.sin(angle);

      positions[node.name] = [x, y, z];
    });

    return positions;
  }, [data]);

  if (data.nodes.length === 0) return null;

  return (
    <>
      {/* 环境光效 */}
      <ambientLight intensity={0.3} color="#4A90E2" />
      <directionalLight
        position={[5, 5, 5]}
        intensity={0.8}
        color="#FFD700"
      />
      <directionalLight
        position={[-5, 3, -5]}
        intensity={0.4}
        color="#6C63FF"
      />
      <pointLight
        position={[0, 0, 5]}
        intensity={0.6}
        color="#FF416C"
        distance={10}
        decay={1}
      />

      {/* 背景粒子 */}
      <ParticleSystem count={300} />

      {/* 节点 */}
      {data.nodes.map((node) => {
        const position = nodePositions[node.name];
        if (!position) return null;

        return (
          <Node3D
            key={node.id}
            node={node}
            position={position}
            isCenter={node.isCenter}
            onClick={onNodeClick}
            hoveredNode={hoveredNode}
            setHoveredNode={setHoveredNode}
          />
        );
      })}

      {/* 连线 */}
      {data.links.map((link, index) => {
        const sourcePos = nodePositions[link.source];
        const targetPos = nodePositions[link.target];

        if (!sourcePos || !targetPos) return null;

        const isActive = hoveredNode === link.source || hoveredNode === link.target;

        return (
          <Link3D
            key={`${link.source}-${link.target}-${index}`}
            source={sourcePos}
            target={targetPos}
            strength={link.strength}
            label={link.label}
            isActive={isActive}
          />
        );
      })}

      {/* 地面网格 */}
      <gridHelper args={[20, 20, '#4A90E2', '#6C63FF']} />

      {/* 轨道控制 */}
      <OrbitControls
        ref={controlsRef}
        enablePan={true}
        enableZoom={true}
        enableRotate={true}
        autoRotate={autoRotate}
        autoRotateSpeed={0.8}
        maxDistance={15}
        minDistance={3}
        maxPolarAngle={Math.PI}
        minPolarAngle={0}
        dampingFactor={0.05}
      />

      {/* 后处理效果 */}
      <EffectComposer>
        <Bloom
          intensity={0.5}
          luminanceThreshold={0.9}
          luminanceSmoothing={0.025}
        />
        <Vignette
          darkness={0.3}
          offset={0.3}
          blendFunction={BlendFunction.NORMAL}
        />
      </EffectComposer>
    </>
  );
};

// 主组件
const RelationshipGraph = ({ annotations, filters, content, isProjectView = false }) => {
  const containerRef = useRef(null);
  const [viewMode, setViewMode] = useState('2D'); // '2D' 或 '3D'
  const [autoRotate, setAutoRotate] = useState(true);

  // 2D视图状态
  const [transform, setTransform] = useState({ x: 0, y: 0, scale: 1 });
  const [isDragging, setIsDragging] = useState(false);
  const [lastMousePos, setLastMousePos] = useState({ x: 0, y: 0 });

  // 计算关系数据
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

    // 关系分析
    const relationshipStrength = {};

    // 段落分析
    const paragraphs = content.split('\n').filter(p => p.trim());
    paragraphs.forEach(paragraph => {
      const personsInParagraph = persons.filter(person =>
        paragraph.includes(person)
      );
      if (personsInParagraph.includes(centerPerson)) {
        personsInParagraph.forEach(person => {
          if (person !== centerPerson) {
            const key = `${centerPerson}-${person}`;
            relationshipStrength[key] = (relationshipStrength[key] || 0) + 1;
          }
        });
      }
    });

    // 句子分析
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

    // 邻近度分析
    const centerPositions = personAnnotations
      .filter(ann => ann.text === centerPerson)
      .map(ann => (ann.start + ann.end) / 2);

    persons.forEach(person => {
      if (person !== centerPerson) {
        const personPositions = personAnnotations
          .filter(ann => ann.text === person)
          .map(ann => (ann.start + ann.end) / 2);

        let proximityCount = 0;
        centerPositions.forEach(centerPos => {
          personPositions.forEach(personPos => {
            if (Math.abs(centerPos - personPos) < 100) {
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

    // 确保每个其他人物至少有一条连线
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

  // 2D 拖拽处理
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

  // 2D 缩放处理
  const handleWheel = useCallback((e) => {
    if (viewMode !== '2D') return;
    e.preventDefault();
    const scaleDelta = e.deltaY > 0 ? 0.9 : 1.1;
    const newScale = Math.max(0.3, Math.min(3, transform.scale * scaleDelta));

    setTransform(prev => ({
      ...prev,
      scale: newScale
    }));
  }, [transform.scale, viewMode]);

  // 节点点击处理
  const handleNodeClick = (node) => {
    console.log('选中节点:', node);
    // 这里可以添加节点选中后的处理逻辑
  };

  // 重置视图
  const handleResetView = () => {
    if (viewMode === '2D') {
      setTransform({ x: 0, y: 0, scale: 1 });
    } else {
      setAutoRotate(!autoRotate);
    }
  };

  // 切换视图模式
  const handleToggleViewMode = (mode) => {
    setViewMode(mode);
  };

  // 更新图标（如果使用了feather图标）
  useEffect(() => {
    if (window.feather) {
      window.feather.replace();
    }
  }, [viewMode]);

  return (
    <div className="relationship-graph">
      <div className="graph-header">
        {/* 标题 */}
        <div className="relationship-title">
          <h3>人物关系图</h3>
          <div className="title-line"></div>
        </div>

        {/* 视图切换 */}
        <div className="view-toggle-container">
          <span className="view-toggle-label">视图:</span>
          <div className="view-toggle-buttons">
            <button
              className={`view-toggle-btn ${viewMode === '2D' ? 'active' : ''}`}
              onClick={() => handleToggleViewMode('2D')}
            >
              <i data-feather="grid"></i>
              2D
            </button>
            <button
              className={`view-toggle-btn ${viewMode === '3D' ? 'active' : ''}`}
              onClick={() => handleToggleViewMode('3D')}
            >
              <i data-feather="box"></i>
              3D
            </button>
          </div>
        </div>

        {/* 控制按钮 */}
        <div className="header-controls">
          <div className="debug-info">
            中心: {relationshipData.centerPerson} |
            节点: {relationshipData.nodes.length} |
            连线: {relationshipData.links.length} |
            模式: {viewMode}
          </div>
          <button
            className={`reset-btn ${viewMode === '3D' && autoRotate ? 'auto-rotate-btn' : ''}`}
            onClick={handleResetView}
          >
            {viewMode === '2D' ? (
              <>
                <i data-feather="refresh-cw"></i>
                重置视图
              </>
            ) : (
              <>
                <i data-feather={autoRotate ? "pause" : "play"}></i>
                {autoRotate ? "暂停旋转" : "自动旋转"}
              </>
            )}
          </button>
        </div>
      </div>

      <div
        className="graph-container"
        ref={containerRef}
        onMouseDown={viewMode === '2D' ? handleMouseDown : undefined}
        onMouseMove={viewMode === '2D' ? handleMouseMove : undefined}
        onMouseUp={viewMode === '2D' ? handleMouseUp : undefined}
        onMouseLeave={viewMode === '2D' ? handleMouseUp : undefined}
        onWheel={viewMode === '2D' ? handleWheel : undefined}
        style={{ cursor: viewMode === '2D' && isDragging ? 'grabbing' : 'default' }}
      >
        {relationshipData.nodes.length === 0 ? (
          <div className="empty-graph">
            <i data-feather="users"></i>
            <p>没有找到人物关系</p>
            <p style={{ fontSize: '0.9em', marginTop: '10px', opacity: '0.7' }}>
              请确保文档中包含人物实体标注
            </p>
          </div>
        ) : viewMode === '2D' ? (
          <Graph2D
            data={relationshipData}
            transform={transform}
            isDragging={isDragging}
            onNodeClick={handleNodeClick}
          />
        ) : (
          // 修改Canvas配置
          <Canvas
            className="three-canvas"
            camera={{ position: [8, 5, 8], fov: 60 }}
            shadows
            gl={{
              alpha: false,
              antialias: true
            }}
          >
            <Graph3D
              data={relationshipData}
              onNodeClick={handleNodeClick}
              autoRotate={autoRotate}
            />
          </Canvas>
        )}

        {/* 图例 */}
        <div className="graph-legend">
          <h4>{viewMode === '2D' ? '2D' : '3D'}图例</h4>
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
            <p>
              {viewMode === '2D'
                ? '拖拽移动 • 滚轮缩放'
                : '拖拽旋转 • 滚轮缩放 • 右键平移'}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RelationshipGraph;