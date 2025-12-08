// src/components/visualization/HeatmapVisualization.jsx
import React, { useMemo, useState, useCallback, useEffect, useRef } from 'react';
import '../../styles/components/Visualization/HeatmapVisualization.css';
import BubbleStyleSelector from './BubbleStyleSelector';
import { heatmapAIService } from '../../services/heatmapAIService';
import { AMAP_CONFIG, MAP_STYLES, getStyleById } from '../../utils/mapConfig';
import {
  Plus,
  Minus,
  Maximize2,
  RefreshCw,
  MapPin,
  Cpu,
  Thermometer,
  Activity,
  Clock,
  Users,
  Target,
  BarChart2
} from 'react-feather';

// 与LocationMap共享全局状态
let isAMapLoaded = false;

// 预加载地图API（如果需要）
const preloadAMapForHeatmap = () => {
  if (typeof window === 'undefined' || isAMapLoaded || window.AMap) {
    return;
  }

  const script = document.createElement('script');
  script.src = `https://webapi.amap.com/maps?v=2.0&key=${AMAP_CONFIG.key}&plugin=AMap.HeatMap`;
  script.async = true;
  script.defer = true;
  script.crossOrigin = 'anonymous';

  script.onload = () => {
    console.log('AMap with HeatMap plugin loaded');
    isAMapLoaded = true;
  };

  script.onerror = (error) => {
    console.error('Failed to load AMap for heatmap:', error);
  };

  script.className = 'amap-heatmap-script';
  document.head.appendChild(script);
};

const HeatmapVisualization = ({ annotations, filters, content }) => {
  const mapRef = useRef(null);
  const [mapInstance, setMapInstance] = useState(null);
  const [heatmapInstance, setHeatmapInstance] = useState(null);
  const [isAMapReady, setIsAMapReady] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [heatmapData, setHeatmapData] = useState(null);
  const [personActivities, setPersonActivities] = useState([]);
  const [selectedPerson, setSelectedPerson] = useState('all');
  const [currentMapStyle, setCurrentMapStyle] = useState('dark');
  const [analysisResult, setAnalysisResult] = useState('');
  const [analysisProgress, setAnalysisProgress] = useState({
    step: 0,
    totalSteps: 3,
    message: ''
  });

  // 控制面板可见性状态
  const [panelVisibility, setPanelVisibility] = useState({
    mapControls: true,
    aiSummary: true,
    personFilter: true,
    heatmapLegend: true,
    dataAnalysis: true
  });

  // 折叠面板状态
  const [collapsedPanels, setCollapsedPanels] = useState({
    aiSummary: false,
    personFilter: false,
    dataAnalysis: false
  });

  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      // 清理热力图实例
      if (heatmapInstance) {
        try {
          heatmapInstance.setMap(null);
        } catch (error) {
          console.warn('清理热力图时出错:', error);
        }
      }
    };
  }, [heatmapInstance]);

  // 检查AMap是否已加载 - 使用与LocationMap相似的逻辑
  useEffect(() => {
    const checkAMap = () => {
      if (window.AMap && window.AMap.Map && window.AMap.HeatMap) {
        isAMapLoaded = true;
        setIsAMapReady(true);
        return true;
      }
      return false;
    };

    // 立即检查
    if (checkAMap()) {
      return;
    }

    // 如果未加载，尝试预加载
    preloadAMapForHeatmap();

    // 设置轮询检查
    let checkInterval;
    const maxChecks = 30;
    let checkCount = 0;

    checkInterval = setInterval(() => {
      checkCount++;
      if (checkAMap() || checkCount >= maxChecks) {
        clearInterval(checkInterval);
        if (!isAMapLoaded) {
          console.error('AMap加载失败，请检查网络连接');
        }
      }
    }, 200);

    return () => clearInterval(checkInterval);
  }, []);

  // 初始化地图 - 参考LocationMap的稳定初始化方式
  useEffect(() => {
    if (!isAMapReady || !mapRef.current || mapInstance) {
      return;
    }

    console.log('Initializing heatmap map...');

    let map = null;

    try {
      if (!window.AMap || !window.AMap.Map) {
        console.error('AMap not found, retrying...');
        setIsAMapReady(false);
        
        // 重试加载AMap
        const retryScript = document.createElement('script');
        retryScript.src = `https://webapi.amap.com/maps?v=2.0&key=${AMAP_CONFIG.key}&plugin=AMap.HeatMap`;
        retryScript.async = true;
        retryScript.defer = true;
        retryScript.crossOrigin = 'anonymous';
        retryScript.onload = () => {
          console.log('AMap loaded via retry');
          setIsAMapReady(true);
        };
        document.head.appendChild(retryScript);
        return;
      }

      const mapOptions = {
        zoom: 5,
        center: [116.397428, 39.90923],
        viewMode: '2D',
        mapStyle: getStyleById(currentMapStyle),
        resizeEnable: true,
        animateEnable: false,
        doubleClickZoom: false,
        keyboardEnable: false,
        scrollWheel: true,
        touchZoom: false,
        zooms: [2, 20],
      };

      console.log('Creating AMap for heatmap...');
      map = new window.AMap.Map(mapRef.current, mapOptions);


      // 监听地图加载完成
      map.on('complete', () => {
        console.log('Heatmap map loaded completely');
      });

      if (isMountedRef.current) {
        setMapInstance(map);
      }

      console.log('Heatmap map initialized successfully');

    } catch (error) {
      console.error('Heatmap map initialization failed:', error);
      if (mapRef.current && isMountedRef.current) {
        mapRef.current.innerHTML = `
        <div style="
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          height: 100%;
          color: #666;
          text-align: center;
          padding: 20px;
        ">
          <div style="font-size: 48px; margin-bottom: 20px;">🔥</div>
          <h3 style="margin-bottom: 10px;">热力图加载失败</h3>
          <p style="margin-bottom: 20px;">${error.message}</p>
          <button onclick="location.reload()" style="
            padding: 8px 16px;
            background: #007bff;
            color: white;
            border: none;
            border-radius: 4px;
            cursor: pointer;
          ">
            重新加载
          </button>
        </div>
      `;
      }
    }

    // 简化清理逻辑，不在这里销毁地图
    return () => {
      // 保持地图实例不被销毁
    };
  }, [isAMapReady, currentMapStyle]);

  // 使用AI分析数据并生成热力图
  useEffect(() => {
    if (!content || !annotations || !filters.persons || !filters.places) return;

    const analyzeAndGenerateHeatmap = async () => {
      setIsAnalyzing(true);
      setAnalysisProgress({
        step: 1,
        totalSteps: 3,
        message: '正在使用AI分析人物时空分布...'
      });

      try {
        const result = await heatmapAIService.generateHeatmapData(content, annotations);

        setAnalysisProgress({
          step: 2,
          totalSteps: 3,
          message: '正在处理地理坐标...'
        });

        setHeatmapData(result.heatmapPoints);
        setAnalysisResult(result.aiAnalysis);
        setPersonActivities(result.personActivities);

        console.log('AI分析完成:', result);

        setAnalysisProgress({
          step: 3,
          totalSteps: 3,
          message: '正在生成热力图...'
        });

      } catch (error) {
        console.error('热力图数据分析失败:', error);
        setAnalysisResult('分析失败: ' + error.message);
      } finally {
        if (isMountedRef.current) {
          setIsAnalyzing(false);
          setAnalysisProgress({
            step: 0,
            totalSteps: 3,
            message: ''
          });
        }
      }
    };

    analyzeAndGenerateHeatmap();
  }, [content, annotations, filters]);

  // 创建热力图
  useEffect(() => {
    if (!mapInstance || !heatmapData || heatmapData.length === 0) {
      return;
    }

    // 清理现有热力图
    if (heatmapInstance) {
      try {
        heatmapInstance.setMap(null);
      } catch (error) {
        console.warn('清理热力图时出错:', error);
      }
    }

    try {
      // 过滤数据
      const points = heatmapData
        .filter(item => selectedPerson === 'all' || item.person === selectedPerson)
        .map(item => ({
          lng: item.lng,
          lat: item.lat,
          count: item.value,
          person: item.person,
          place: item.place,
          frequency: item.frequency,
          duration: item.duration,
          intensity: item.intensity
        }));

      if (points.length === 0) return;

      // 创建热力图
      const heatmap = new window.AMap.HeatMap(mapInstance, {
        radius: 40,
        opacity: [0, 0.8],
        gradient: {
          0.1: 'rgb(0, 255, 0)',
          0.3: 'rgb(255, 255, 0)',
          0.5: 'rgb(255, 165, 0)',
          0.8: 'rgb(255, 69, 0)',
          1.0: 'rgb(139, 0, 0)'
        },
        zIndex: 100,
        zooms: [3, 18]
      });

      // 计算最大值
      const maxCount = Math.max(...points.map(p => p.count));
      heatmap.setDataSet({
        data: points,
        max: maxCount > 0 ? maxCount * 1.2 : 10
      });

      if (isMountedRef.current) {
        setHeatmapInstance(heatmap);
      }

      // 调整视野显示所有数据点
      const bounds = new window.AMap.Bounds();
      points.forEach(point => {
        bounds.extend(new window.AMap.LngLat(point.lng, point.lat));
      });

      setTimeout(() => {
        if (mapInstance && bounds.getSouthWest() && isMountedRef.current) {
          mapInstance.setBounds(bounds, false, [50, 50, 50, 50]);
        }
      }, 500);

      console.log('热力图创建成功，数据点数量:', points.length);

    } catch (error) {
      console.error('创建热力图失败:', error);
    }
  }, [mapInstance, heatmapData, selectedPerson]);

  // 切换面板可见性
  const togglePanel = useCallback((panelName) => {
    setPanelVisibility(prev => ({
      ...prev,
      [panelName]: !prev[panelName]
    }));
  }, []);

  // 切换面板折叠状态
  const togglePanelCollapse = useCallback((panelName) => {
    setCollapsedPanels(prev => ({
      ...prev,
      [panelName]: !prev[panelName]
    }));
  }, []);

  // 切换所有面板可见性
  const toggleAllPanels = useCallback(() => {
    const allVisible = Object.values(panelVisibility).every(v => v === true);
    const allCollapsed = Object.values(collapsedPanels).every(v => v === true);

    if (allVisible && !allCollapsed) {
      setCollapsedPanels({
        aiSummary: true,
        personFilter: true,
        dataAnalysis: true
      });
    } else if (allCollapsed) {
      setPanelVisibility({
        mapControls: true,
        aiSummary: true,
        personFilter: true,
        heatmapLegend: true,
        dataAnalysis: true
      });
      setCollapsedPanels({
        aiSummary: false,
        personFilter: false,
        dataAnalysis: false
      });
    } else {
      setPanelVisibility({
        mapControls: true,
        aiSummary: true,
        personFilter: true,
        heatmapLegend: true,
        dataAnalysis: true
      });
      setCollapsedPanels({
        aiSummary: false,
        personFilter: false,
        dataAnalysis: false
      });
    }
  }, [panelVisibility, collapsedPanels]);

  // 隐藏所有面板
  const hideAllPanels = useCallback(() => {
    setPanelVisibility({
      mapControls: false,
      aiSummary: false,
      personFilter: false,
      heatmapLegend: false,
      dataAnalysis: false
    });
  }, []);

  // 地图控制函数
  const handleZoomIn = useCallback(() => {
    if (mapInstance) {
      mapInstance.zoomIn();
    }
  }, [mapInstance]);

  const handleZoomOut = useCallback(() => {
    if (mapInstance) {
      mapInstance.zoomOut();
    }
  }, [mapInstance]);

  const handleFitView = useCallback(() => {
    if (mapInstance && heatmapData && heatmapData.length > 0) {
      const bounds = new window.AMap.Bounds();
      heatmapData.forEach(point => {
        bounds.extend(new window.AMap.LngLat(point.lng, point.lat));
      });
      mapInstance.setBounds(bounds, false, [50, 50, 50, 50]);
    }
  }, [mapInstance, heatmapData]);

  const handleResetView = useCallback(() => {
    if (mapInstance) {
      mapInstance.setZoomAndCenter(5, [116.397428, 39.90923]);
    }
  }, [mapInstance]);

  // 切换地图样式
  const handleChangeMapStyle = useCallback((styleUrl) => {
    if (!mapInstance) return;
    
    try {
      mapInstance.setMapStyle(styleUrl);
      
      // 更新当前选中的样式
      const styleEntry = Object.entries(MAP_STYLES).find(([_, value]) => value.style === styleUrl);
      if (styleEntry) {
        setCurrentMapStyle(styleEntry[0]);
        console.log('Map style changed to:', styleEntry[0]);
      }
    } catch (error) {
      console.error('切换地图样式失败:', error);
    }
  }, [mapInstance]);

  // 重新分析数据
  const handleReanalyze = useCallback(async () => {
    if (!content || !annotations) return;

    setIsAnalyzing(true);
    setAnalysisProgress({
      step: 1,
      totalSteps: 3,
      message: '重新分析中...'
    });

    try {
      const result = await heatmapAIService.generateHeatmapData(content, annotations);
      
      if (isMountedRef.current) {
        setHeatmapData(result.heatmapPoints);
        setAnalysisResult(result.aiAnalysis);
        setPersonActivities(result.personActivities);
      }
    } catch (error) {
      console.error('重新分析失败:', error);
    } finally {
      if (isMountedRef.current) {
        setIsAnalyzing(false);
        setAnalysisProgress({
          step: 0,
          totalSteps: 3,
          message: ''
        });
      }
    }
  }, [content, annotations]);

  // 获取所有人物
  const allPersons = useMemo(() => {
    if (!heatmapData) return ['all'];

    const personsSet = new Set();
    heatmapData.forEach(item => {
      personsSet.add(item.person);
    });
    return ['all', ...Array.from(personsSet)];
  }, [heatmapData]);

  // 获取统计数据
  const stats = useMemo(() => {
    if (!heatmapData) {
      return {
        totalPoints: 0,
        totalPersons: 0,
        totalPlaces: 0,
        maxHeatValue: 0
      };
    }

    const filteredData = selectedPerson === 'all'
      ? heatmapData
      : heatmapData.filter(item => item.person === selectedPerson);

    const persons = new Set(filteredData.map(item => item.person));
    const places = new Set(filteredData.map(item => item.place));

    return {
      totalPoints: filteredData.length,
      totalPersons: persons.size,
      totalPlaces: places.size,
      maxHeatValue: filteredData.reduce((max, item) => Math.max(max, item.value), 0)
    };
  }, [heatmapData, selectedPerson]);

  // 获取当前选中人物的活动详情
  const currentPersonActivities = useMemo(() => {
    if (!personActivities || selectedPerson === 'all') return [];

    const person = personActivities.find(p => p.person === selectedPerson);
    return person ? person.activities : [];
  }, [personActivities, selectedPerson]);

  if (!isAMapReady) {
    return (
      <div className="heatmap-visualization">
        <div className="map-container">
          <div className="loading-map">
            <div className="loading-spinner"></div>
            <p>正在加载地图引擎...</p>
            <p className="loading-tip">如果长时间未加载，请检查网络连接</p>
            <button
              onClick={() => window.location.reload()}
              style={{
                marginTop: '20px',
                padding: '8px 16px',
                background: '#007bff',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer'
              }}
            >
              重新加载
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="heatmap-visualization">
      <div className="heatmap-title">
        <span style={{
          fontWeight: 700,
          fontSize: '2rem',
          background: 'linear-gradient(90deg, #dc3545 0%, #ff6b6b 100%)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          letterSpacing: '2px'
        }}>
          人物时空热力图
        </span>
        <div style={{
          height: 2,
          width: 120,
          background: 'linear-gradient(90deg, #dc3545 0%, #ff6b6b 100%)',
          borderRadius: 2,
          margin: '8px auto 0'
        }} />
      </div>

      <div className="map-container">
        <div className="amap-container" style={{ position: 'relative' }}>
          {/* 地图容器 */}
          <div
            ref={mapRef}
            className="amap-component"
            style={{
              width: '100%',
              height: '100%',
              opacity: isAnalyzing ? 0.7 : 1
            }}
          ></div>

          {isAnalyzing && (
            <div className="loading-overlay">
              <div className="loading-spinner"></div>
              <p>{analysisProgress.message}</p>
              <div className="analysis-progress">
                <div className="progress-bar">
                  <div
                    className="progress-fill"
                    style={{ width: `${(analysisProgress.step / analysisProgress.totalSteps) * 100}%` }}
                  ></div>
                </div>
                <span>步骤 {analysisProgress.step} / {analysisProgress.totalSteps}</span>
              </div>
              <p className="analysis-note">正在使用AI分析人物时空分布...</p>
            </div>
          )}

          {/* 气泡式样式选择器 */}
          {mapInstance && (
            <BubbleStyleSelector
              onStyleChange={handleChangeMapStyle}
              currentStyle={currentMapStyle}
            />
          )}

          {/* 地图控制按钮 */}
          {panelVisibility.mapControls && (
            <div className="map-controls">
              <div className="controls-buttons">
                <button className="control-btn" onClick={handleZoomIn} title="放大">
                  <Plus size={18} />
                </button>
                <button className="control-btn" onClick={handleZoomOut} title="缩小">
                  <Minus size={18} />
                </button>
                <button className="control-btn" onClick={handleFitView} title="适应视野">
                  <Maximize2 size={18} />
                </button>
                <button className="control-btn" onClick={handleResetView} title="重置视图">
                  <RefreshCw size={18} />
                </button>
                <button
                  className="control-btn analyze-btn"
                  onClick={handleReanalyze}
                  title="重新分析"
                  disabled={isAnalyzing}
                >
                  <Cpu size={18} />
                </button>
              </div>
            </div>
          )}

          {/* AI分析结果摘要 */}
          {analysisResult && !isAnalyzing && panelVisibility.aiSummary && (
            <div className={`ai-analysis-summary ${collapsedPanels.aiSummary ? 'collapsed' : ''}`}>
              <div className="summary-header">
                <Cpu size={16} />
                <h4>AI时空分析</h4>
                <span className="ai-badge">AI生成</span>
                <div className="panel-controls">
                  <button
                    className="panel-collapse-btn"
                    onClick={() => togglePanelCollapse('aiSummary')}
                    title={collapsedPanels.aiSummary ? '展开' : '折叠'}
                  >
                    {collapsedPanels.aiSummary ? (
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <polyline points="6 9 12 15 18 9"></polyline>
                      </svg>
                    ) : (
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <polyline points="18 15 12 9 6 15"></polyline>
                      </svg>
                    )}
                  </button>
                  <button
                    className="panel-hide-btn"
                    onClick={() => togglePanel('aiSummary')}
                    title="隐藏"
                  >
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M18 6L6 18"></path>
                      <path d="M6 6l12 12"></path>
                    </svg>
                  </button>
                </div>
              </div>
              {!collapsedPanels.aiSummary && (
                <div className="summary-content">
                  <p>{analysisResult}</p>
                </div>
              )}
            </div>
          )}

          {/* 人物筛选控件 */}
          {heatmapData && heatmapData.length > 0 && panelVisibility.personFilter && (
            <div className={`person-filter-controls ${collapsedPanels.personFilter ? 'collapsed' : ''}`}>
              <div className="filter-header">
                <Users size={16} />
                <h4>人物筛选</h4>
                <div className="panel-controls">
                  <button
                    className="panel-collapse-btn"
                    onClick={() => togglePanelCollapse('personFilter')}
                    title={collapsedPanels.personFilter ? '展开' : '折叠'}
                  >
                    {collapsedPanels.personFilter ? (
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <polyline points="6 9 12 15 18 9"></polyline>
                      </svg>
                    ) : (
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <polyline points="18 15 12 9 6 15"></polyline>
                      </svg>
                    )}
                  </button>
                  <button
                    className="panel-hide-btn"
                    onClick={() => togglePanel('personFilter')}
                    title="隐藏"
                  >
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M18 6L6 18"></path>
                      <path d="M6 6l12 12"></path>
                    </svg>
                  </button>
                </div>
              </div>
              {!collapsedPanels.personFilter && (
                <>
                  <div className="person-selector">
                    <select
                      value={selectedPerson}
                      onChange={(e) => setSelectedPerson(e.target.value)}
                      className="person-dropdown"
                      disabled={isAnalyzing}
                    >
                      {allPersons.map(person => (
                        <option key={person} value={person}>
                          {person === 'all' ? '全部人物' : person}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="filter-stats">
                    <div className="stat-item">
                      <Target size={14} />
                      <span>数据点: {stats.totalPoints}</span>
                    </div>
                    <div className="stat-item">
                      <Users size={14} />
                      <span>人物: {stats.totalPersons}</span>
                    </div>
                    <div className="stat-item">
                      <MapPin size={14} />
                      <span>地点: {stats.totalPlaces}</span>
                    </div>
                  </div>
                </>
              )}
            </div>
          )}

          {/* 热力图图例 */}
          {panelVisibility.heatmapLegend && (
            <div className="heatmap-legend">
              <div className="legend-header">
                <Thermometer size={16} />
                <h4>热力图例</h4>
                <button
                  className="panel-hide-btn"
                  onClick={() => togglePanel('heatmapLegend')}
                  title="隐藏"
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M18 6L6 18"></path>
                    <path d="M6 6l12 12"></path>
                  </svg>
                </button>
              </div>

              <div className="legend-gradient">
                <div className="gradient-bar">
                  <div className="gradient-colors"></div>
                </div>
                <div className="gradient-labels">
                  <span>活动较少</span>
                  <span>活动中等</span>
                  <span>活动密集</span>
                </div>
                <div className="gradient-explanation">
                  <p>颜色越深表示人物在时空中的活动越密集</p>
                </div>
              </div>

              {selectedPerson !== 'all' && currentPersonActivities.length > 0 && (
                <div className="person-activity-details">
                  <h5>{selectedPerson}的活动详情:</h5>
                  <div className="activities-list">
                    {currentPersonActivities
                      .sort((a, b) => b.intensity - a.intensity)
                      .slice(0, 4)
                      .map((activity, index) => (
                        <div key={index} className="activity-item">
                          <div className="activity-place">{activity.place}</div>
                          <div className="activity-metrics">
                            <span className="metric frequency" title="出现频率">
                              <BarChart2 size={10} /> {activity.frequency}次
                            </span>
                            <span className="metric duration" title="停留时长">
                              <Clock size={10} /> {activity.duration}/10
                            </span>
                            <span className="metric intensity" title="活动强度">
                              <Activity size={10} /> {activity.intensity}/10
                            </span>
                          </div>
                        </div>
                      ))}
                  </div>
                </div>
              )}

              <div className="legend-stats">
                <div className="stat-item">
                  <Cpu size={14} />
                  <span>AI时空分析已启用</span>
                </div>
                <div className="legend-info">
                  <p>基于AI分析的人物时空分布热力图</p>
                  <p>综合频率、时长、强度三维分析</p>
                </div>
              </div>
            </div>
          )}

          {/* 数据分析面板 */}
          {heatmapData && heatmapData.length > 0 && panelVisibility.dataAnalysis && (
            <div className={`data-analysis-panel ${collapsedPanels.dataAnalysis ? 'collapsed' : ''}`}>
              <div className="panel-header">
                <BarChart2 size={16} />
                <h4>数据分析</h4>
                <div className="panel-controls">
                  <button
                    className="panel-collapse-btn"
                    onClick={() => togglePanelCollapse('dataAnalysis')}
                    title={collapsedPanels.dataAnalysis ? '展开' : '折叠'}
                  >
                    {collapsedPanels.dataAnalysis ? (
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <polyline points="6 9 12 15 18 9"></polyline>
                      </svg>
                    ) : (
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <polyline points="18 15 12 9 6 15"></polyline>
                      </svg>
                    )}
                  </button>
                  <button
                    className="panel-hide-btn"
                    onClick={() => togglePanel('dataAnalysis')}
                    title="隐藏"
                  >
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M18 6L6 18"></path>
                      <path d="M6 6l12 12"></path>
                    </svg>
                  </button>
                </div>
              </div>

              {!collapsedPanels.dataAnalysis && (
                <>
                  <div className="data-stats">
                    <div className="stat-card">
                      <div className="stat-value">{stats.totalPoints}</div>
                      <div className="stat-label">数据点</div>
                    </div>
                    <div className="stat-card">
                      <div className="stat-value">{stats.totalPersons}</div>
                      <div className="stat-label">人物</div>
                    </div>
                    <div className="stat-card">
                      <div className="stat-value">{stats.totalPlaces}</div>
                      <div className="stat-label">地点</div>
                    </div>
                    <div className="stat-card">
                      <div className="stat-value">{Math.round(stats.maxHeatValue)}</div>
                      <div className="stat-label">最大热力值</div>
                    </div>
                  </div>

                  <div className="data-description">
                    <p>热力图显示人物在时空维度上的分布密度</p>
                    <p>每个热区代表一个活动热点，颜色越深活动越密集</p>
                    <button
                      className="reanalyze-btn"
                      onClick={handleReanalyze}
                      disabled={isAnalyzing}
                    >
                      {isAnalyzing ? '分析中...' : '重新分析'}
                    </button>
                  </div>
                </>
              )}
            </div>
          )}

          {/* 面板显示控制面板 */}
          {Object.values(panelVisibility).some(v => !v) && (
            <div className="panel-restore-controls">
              <button
                className="restore-btn"
                onClick={toggleAllPanels}
                title="显示所有隐藏的面板"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="3" y="3" width="7" height="7"></rect>
                  <rect x="14" y="3" width="7" height="7"></rect>
                  <rect x="14" y="14" width="7" height="7"></rect>
                  <rect x="3" y="14" width="7" height="7"></rect>
                </svg>
                <span>显示面板</span>
              </button>
            </div>
          )}

          {/* 地图控制按钮（底部） */}
          <div className="map-controls-bottom">
            <div className="control-btn-group">
              <button className="control-btn" onClick={handleZoomIn} title="放大">
                <Plus size={18} />
              </button>
              <button className="control-btn" onClick={handleZoomOut} title="缩小">
                <Minus size={18} />
              </button>
              <button className="control-btn" onClick={handleFitView} title="适应视野">
                <Maximize2 size={18} />
              </button>
              <button className="control-btn" onClick={handleResetView} title="重置视图">
                <RefreshCw size={18} />
              </button>
              <button
                className="control-btn analyze-btn"
                onClick={handleReanalyze}
                title="重新分析"
                disabled={isAnalyzing}
              >
                <Cpu size={18} />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HeatmapVisualization;