// src/components/visualization/BubbleStyleSelector.jsx
import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
    Layers,
    Eye,
    Map,
    Globe,
    Navigation,
    Compass,
    X,
    Star,
    Droplet,
    Sun,
    Moon,
    Move
} from 'react-feather';
import '../../styles/components/Visualization/BubbleStyleSelector.css';

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
        icon: <Sun size={20} />,
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
        icon: <Moon size={20} />,
        color: '#6610f2'
    },
    {
        id: 'fresh',
        name: '清新绿',
        description: '绿色系，舒适护眼',
        style: 'amap://styles/fresh',
        icon: <Droplet size={20} />,
        color: '#28a745'
    },
    {
        id: '8e18d6f3c8e4c24645505580481f8d25',
        name: '无底图',
        description: '纯白背景，适合打印',
        style: 'amap://styles/8e18d6f3c8e4c24645505580481f8d25',
        icon: <Map size={20} />,
        color: '#fd7e14'
    },
    {
        id: 'whitesmoke',
        name: '素雅白',
        description: '简约白色背景',
        style: 'amap://styles/whitesmoke',
        icon: <Star size={20} />,
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

const BubbleStyleSelector = ({ onStyleChange, currentStyle = 'grey' }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [isAnimating, setIsAnimating] = useState(false);
    const [selectedStyle, setSelectedStyle] = useState(currentStyle);
    const [position, setPosition] = useState({ x: 0, y: 0 });
    const [isDragging, setIsDragging] = useState(false);
    const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });

    const mainButtonRef = useRef(null);
    const tooltipRef = useRef(null);
    const selectorRef = useRef(null);

    // 气泡位置配置
    const bubbleCount = AMAP_STYLES.length;
    const radius = 120; // 气泡展开半径

    // 获取气泡位置
    const getBubblePosition = useCallback((index) => {
        if (!isOpen) return { x: 0, y: 0 };

        // 从主气泡向外展开，形成圆形
        const angle = (index * (360 / bubbleCount)) * (Math.PI / 180);
        return {
            x: Math.cos(angle) * radius,
            y: Math.sin(angle) * radius
        };
    }, [isOpen, bubbleCount, radius]);

    // 切换菜单状态
    const toggleMenu = () => {
        if (!isAnimating && !isDragging) {
            setIsAnimating(true);
            setIsOpen(!isOpen);

            setTimeout(() => {
                setIsAnimating(false);
            }, 500);
        }
    };

    // 选择地图样式
    const handleStyleSelect = (style) => {
        if (isDragging) return;

        setSelectedStyle(style.id);
        onStyleChange(style.style);
        toggleMenu();
    };

    // 获取当前选中的样式
    const getCurrentStyle = () => {
        return AMAP_STYLES.find(style => style.id === selectedStyle) || AMAP_STYLES[0];
    };

    const handleDragStart = (e) => {
        if (isOpen) return;

        setIsDragging(true);

        // 直接保存当前元素的 left/top 值和鼠标位置
        const style = window.getComputedStyle(selectorRef.current);
        const currentLeft = parseInt(style.left) || 0;
        const currentTop = parseInt(style.top) || 0;

        const startX = e.type.includes('mouse') ? e.clientX : e.touches[0].clientX;
        const startY = e.type.includes('mouse') ? e.clientY : e.touches[0].clientY;

        // 保存起始信息
        setDragOffset({
            x: startX - currentLeft,
            y: startY - currentTop
        });

        e.preventDefault();
    };

    const handleDrag = useCallback((e) => {
        if (!isDragging) return;

        const clientX = e.type.includes('mouse') ? e.clientX : e.touches[0].clientX;
        const clientY = e.type.includes('mouse') ? e.clientY : e.touches[0].clientY;

        // 直接计算新位置
        const newX = clientX - dragOffset.x;
        const newY = clientY - dragOffset.y;

        // 限制在父容器内
        const parent = selectorRef.current.parentElement;
        if (parent) {
            const parentRect = parent.getBoundingClientRect();
            const elementRect = selectorRef.current.getBoundingClientRect();

            const maxX = parentRect.width - elementRect.width;
            const maxY = parentRect.height - elementRect.height;

            setPosition({
                x: Math.max(0, Math.min(newX, maxX)),
                y: Math.max(0, Math.min(newY, maxY))
            });
        } else {
            setPosition({
                x: newX,
                y: newY
            });
        }
    }, [isDragging, dragOffset]);

    const handleDragEnd = useCallback(() => {
        setIsDragging(false);
    }, []);

    // 添加/移除事件监听器
    useEffect(() => {
        if (isDragging) {
            document.addEventListener('mousemove', handleDrag);
            document.addEventListener('touchmove', handleDrag);
            document.addEventListener('mouseup', handleDragEnd);
            document.addEventListener('touchend', handleDragEnd);
        }

        return () => {
            document.removeEventListener('mousemove', handleDrag);
            document.removeEventListener('touchmove', handleDrag);
            document.removeEventListener('mouseup', handleDragEnd);
            document.removeEventListener('touchend', handleDragEnd);
        };
    }, [isDragging, handleDrag, handleDragEnd]);

    // 点击外部关闭菜单
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (
                mainButtonRef.current &&
                !mainButtonRef.current.contains(event.target) &&
                tooltipRef.current &&
                !tooltipRef.current.contains(event.target) &&
                selectorRef.current &&
                !selectorRef.current.contains(event.target) &&
                isOpen &&
                !isDragging
            ) {
                toggleMenu();
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        document.addEventListener('touchstart', handleClickOutside);

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
            document.removeEventListener('touchstart', handleClickOutside);
        };
    }, [isOpen, isDragging]);

    return (
        <div
            ref={selectorRef}
            className={`bubble-style-selector ${isDragging ? 'dragging' : ''}`}
            style={{
                bottom: 'auto',
                right: 'auto',
                left: `${position.x}px`,
                top: `${position.y}px`,
                cursor: isDragging ? 'grabbing' : 'move'
            }}
        >
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

            {/* 拖动把手 */}
            <div
                className="drag-handle"
                onMouseDown={handleDragStart}
                onTouchStart={handleDragStart}
                title="拖动"
            >
                <Move size={12} />
            </div>

            {/* 气泡菜单 */}
            <div className="bubble-menu">
                {/* 展开的气泡 */}
                {AMAP_STYLES.map((style, index) => {
                    const bubblePos = getBubblePosition(index);
                    const delay = index * 0.05;

                    return (
                        <button
                            key={style.id}
                            className={`style-bubble ${selectedStyle === style.id ? 'selected' : ''}`}
                            onClick={() => handleStyleSelect(style)}
                            style={{
                                '--delay': `${delay}s`,
                                '--tx': `${bubblePos.x}px`,
                                '--ty': `${bubblePos.y}px`,
                                transform: isOpen
                                    ? `translate(${bubblePos.x}px, ${bubblePos.y}px) scale(1)`
                                    : 'translate(-50%, -50%) scale(0)',
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
                    onMouseDown={(e) => e.stopPropagation()}
                    style={{
                        background: `linear-gradient(135deg, ${getCurrentStyle().color}, ${getCurrentStyle().color}80)`,
                        cursor: isDragging ? 'grabbing' : 'pointer'
                    }}
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
                            <feGaussianBlur stdDeviation="2" result="coloredBlur" />
                            <feMerge>
                                <feMergeNode in="coloredBlur" />
                                <feMergeNode in="SourceGraphic" />
                            </feMerge>
                        </filter>
                    </defs>
                    {AMAP_STYLES.map((_, index) => {
                        const bubblePos = getBubblePosition(index);
                        return (
                            <line
                                key={index}
                                x1="150"
                                y1="150"
                                x2={150 + bubblePos.x}
                                y2={150 + bubblePos.y}
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

export default BubbleStyleSelector;