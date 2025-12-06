import React, { useState, useEffect, useRef } from 'react';
import { 
  Layers, 
  Eye, 
  Map, 
  Globe, 
  Navigation, 
  Compass,
  Palette,
  X,
  Sparkles
} from 'react-feather';
import '../../styles/components/Visualization/MapStyleSelector.css';

// 高德地图官方样式配置
const AMAP_STYLES = [
  {
    id: 'grey',
    name: '商务灰',
    description: '简洁灰色主题，适合数据分析',
    style: 'amap://styles/grey',
    icon: <Eye size={20} />,
    color: '#6c757d'
  },
  {
    id: 'light',
    name: '清新浅色',
    description: '明亮清新，适合白天使用',
    style: 'amap://styles/light',
    icon: <Map size={20} />,
    color: '#20c997'
  },
  {
    id: 'normal',
    name: '标准蓝',
    description: '官方默认蓝色主题',
    style: 'amap://styles/normal',
    icon: <Globe size={20} />,
    color: '#0d6efd'
  },
  {
    id: 'dark',
    name: '深色夜晚',
    description: '暗色主题，减少视觉疲劳',
    style: 'amap://styles/dark',
    icon: <Navigation size={20} />,
    color: '#6610f2'
  },
  {
    id: 'fresh',
    name: '清新绿',
    description: '绿色系，舒适护眼',
    style: 'amap://styles/fresh',
    icon: <Compass size={20} />,
    color: '#28a745'
  },
  {
    id: '8e18d6f3c8e4c24645505580481f8d25',
    name: '无底图',
    description: '纯白背景，适合打印',
    style: 'amap://styles/8e18d6f3c8e4c24645505580481f8d25',
    icon: <Palette size={20} />,
    color: '#fd7e14'
  },
  {
    id: 'whitesmoke',
    name: '素雅白',
    description: '简约白色背景',
    style: 'amap://styles/whitesmoke',
    icon: <Sparkles size={20} />,
    color: '#17a2b8'
  },
  {
    id: 'graffiti',
    name: '涂鸦风',
    description: '艺术涂鸦风格',
    style: 'amap://styles/4e349627b3a2e06d4b1b1e6e661c8c09',
    icon: <Layers size={20} />,
    color: '#e83e8c'
  }
];

const MapStyleSelector = ({ onStyleChange, currentStyle = 'grey' }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);
  const [selectedStyle, setSelectedStyle] = useState(currentStyle);
  const mainButtonRef = useRef(null);
  const tooltipRef = useRef(null);
  
  // 气泡位置配置
  const bubbleCount = AMAP_STYLES.length;
  const radius = 120; // 气泡展开半径
  
  // 获取气泡位置
  const getBubblePosition = (index) => {
    if (!isOpen) return { x: 0, y: 0 };
    
    const angle = (index * (360 / bubbleCount)) * (Math.PI / 180);
    return {
      x: Math.cos(angle) * radius,
      y: Math.sin(angle) * radius
    };
  };

  // 切换菜单状态
  const toggleMenu = () => {
    if (!isAnimating) {
      setIsAnimating(true);
      setIsOpen(!isOpen);
      
      // 动画结束后重置动画状态
      setTimeout(() => {
        setIsAnimating(false);
      }, 500);
    }
  };

  // 选择地图样式
  const handleStyleSelect = (style) => {
    setSelectedStyle(style.id);
    onStyleChange(style.style);
    toggleMenu(); // 选择后自动关闭菜单
  };

  // 获取当前选中的样式
  const getCurrentStyle = () => {
    return AMAP_STYLES.find(style => style.id === selectedStyle) || AMAP_STYLES[0];
  };

  // 点击外部关闭菜单
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        mainButtonRef.current && 
        !mainButtonRef.current.contains(event.target) &&
        tooltipRef.current && 
        !tooltipRef.current.contains(event.target) &&
        isOpen
      ) {
        toggleMenu();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  return (
    <div className="map-style-selector">
      {/* 当前样式提示 */}
      <div 
        ref={tooltipRef}
        className={`current-style-tooltip ${isOpen ? 'visible' : ''}`}
      >
        <div className="tooltip-header">
          <span>当前样式: {getCurrentStyle().name}</span>
          <button 
            className="close-tooltip" 
            onClick={() => setIsOpen(false)}
            title="关闭提示"
          >
            <X size={12} />
          </button>
        </div>
        <div className="tooltip-body">
          <div 
            className="style-color-preview" 
            style={{ backgroundColor: getCurrentStyle().color }}
          ></div>
          <div className="style-info">
            <span className="style-name">{getCurrentStyle().name}</span>
            <span className="style-desc">{getCurrentStyle().description}</span>
          </div>
        </div>
      </div>

      {/* 气泡菜单 */}
      <div className="bubble-menu">
        {/* 展开的气泡 */}
        {AMAP_STYLES.map((style, index) => {
          const position = getBubblePosition(index);
          const delay = index * 0.05; // 延迟效果
          
          return (
            <button
              key={style.id}
              className={`style-bubble ${selectedStyle === style.id ? 'selected' : ''}`}
              onClick={() => handleStyleSelect(style)}
              style={{
                '--delay': `${delay}s`,
                transform: isOpen 
                  ? `translate(${position.x}px, ${position.y}px) scale(1)` 
                  : 'translate(0, 0) scale(0)',
                opacity: isOpen ? 1 : 0,
                backgroundColor: style.color
              }}
              title={`${style.name}: ${style.description}`}
              data-tooltip={style.name}
            >
              <div className="bubble-icon">
                {style.icon}
              </div>
              <span className="bubble-name">{style.name}</span>
            </button>
          );
        })}
        
        {/* 主按钮 */}
        <button
          ref={mainButtonRef}
          className={`main-bubble-button ${isOpen ? 'open' : ''}`}
          onClick={toggleMenu}
          style={{ backgroundColor: getCurrentStyle().color }}
        >
          <div className="button-icon">
            {isOpen ? <X size={24} /> : <Layers size={24} />}
          </div>
          <span className="button-text">
            {isOpen ? '关闭' : '样式'}
          </span>
        </button>
      </div>

      {/* 气泡连接线（装饰效果） */}
      {isOpen && (
        <svg className="bubble-lines" width="300" height="300">
          <defs>
            <filter id="glow">
              <feGaussianBlur stdDeviation="2" result="coloredBlur"/>
              <feMerge>
                <feMergeNode in="coloredBlur"/>
                <feMergeNode in="SourceGraphic"/>
              </feMerge>
            </filter>
          </defs>
          {AMAP_STYLES.map((_, index) => {
            const position = getBubblePosition(index);
            return (
              <line
                key={index}
                x1="150"
                y1="150"
                x2={150 + position.x}
                y2={150 + position.y}
                stroke="rgba(13, 110, 253, 0.2)"
                strokeWidth="1"
                strokeDasharray="5,5"
                filter="url(#glow)"
              />
            );
          })}
        </svg>
      )}
    </div>
  );
};

export default MapStyleSelector;