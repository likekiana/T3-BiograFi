// src/components/visualization/LocationMap.jsx
import React, { useMemo, useState, useCallback, useEffect, useRef } from 'react';
import '../../styles/components/Visualization/LocationMap.css';

// 高德地图API配置
const AMAP_CONFIG = {
  key: '0af744d9c966d1790972694dfa5509d6',
  version: '2.0'
};

// 全局状态管理
let globalMapInstance = null;
let isAMapLoaded = false;
let isMapInitializing = false;
let locationsCache = new Map();

// 地名智能匹配服务
class LocationMatcher {
  // 历史地名到现代地名的映射
  static historicalToModern = {
    // 三国时期地名
    '洛阳': '洛阳',
    '长安': '西安',
    '许昌': '许昌',
    '邺城': '安阳',
    '成都': '成都',
    '建业': '南京',
    '襄阳': '襄阳',
    '荆州': '荆州',
    '赤壁': '赤壁',
    '华容道': '华容县',
    '麦城': '当阳市',
    '当阳长坂坡': '当阳市',
    '益州': '成都',
    '蜀': '成都',
    
    // 秦汉时期地名
    '咸阳': '咸阳',
    '邯郸': '邯郸',
    '临淄': '淄博',
    '郢都': '荆州',
    '姑苏': '苏州',
    '会稽': '绍兴',
    '吴': '苏州',
    '越': '绍兴',
    
    // 唐宋时期地名
    '汴京': '开封',
    '东京': '开封',
    '临安': '杭州',
    '金陵': '南京',
    '广陵': '扬州',
    '江都': '扬州',
    '浔阳': '九江',
    
    // 常用古代地名
    '京师': '北京',
    '京畿': '北京',
    '中州': '郑州',
    '中原': '郑州',
    '江南': '苏州',
    '塞北': '呼和浩特',
    '西域': '乌鲁木齐',
    '关东': '沈阳',
    '关西': '西安'
  };

  // 地名后缀处理
  static normalizeLocationName(name) {
    if (!name || typeof name !== 'string') return name;
    
    let normalized = name.trim();
    
    // 移除常见后缀
    const suffixes = ['之地', '一带', '地区', '附近', '周边', '境内'];
    suffixes.forEach(suffix => {
      if (normalized.endsWith(suffix)) {
        normalized = normalized.slice(0, -suffix.length);
      }
    });
    
    // 处理方向词
    const directions = {
      '东': '东部',
      '南': '南部', 
      '西': '西部',
      '北': '北部',
      '中': '中部'
    };
    
    Object.entries(directions).forEach(([short, full]) => {
      if (normalized.endsWith(short)) {
        normalized = normalized + '部';
      }
    });
    
    return normalized;
  }

  // 智能匹配地名
  static async smartGeocode(name) {
    const normalizedName = this.normalizeLocationName(name);
    
    // 1. 首先尝试直接匹配历史地名
    if (this.historicalToModern[normalizedName]) {
      const modernName = this.historicalToModern[normalizedName];
      const coordinates = await this.geocodeWithAMap(modernName);
      if (coordinates) {
        return {
          original: name,
          matched: modernName,
          coordinates,
          confidence: 'high',
          type: 'historical'
        };
      }
    }
    
    // 2. 尝试直接地理编码
    const directCoordinates = await this.geocodeWithAMap(normalizedName);
    if (directCoordinates) {
      return {
        original: name,
        matched: normalizedName,
        coordinates: directCoordinates,
        confidence: 'medium',
        type: 'direct'
      };
    }
    
    // 3. 尝试模糊匹配
    const fuzzyMatch = await this.fuzzyGeocode(normalizedName);
    if (fuzzyMatch) {
      return fuzzyMatch;
    }
    
    // 4. 返回默认坐标（中国中心）
    return {
      original: name,
      matched: normalizedName,
      coordinates: [104.1954, 35.8617], // 中国中心
      confidence: 'low',
      type: 'default'
    };
  }

  // 高德地图地理编码
  static async geocodeWithAMap(name) {
    try {
      const response = await fetch(
        `https://restapi.amap.com/v3/geocode/geo?key=${AMAP_CONFIG.key}&address=${encodeURIComponent(name)}`
      );
      const data = await response.json();
      
      if (data.status === '1' && data.geocodes && data.geocodes.length > 0) {
        const location = data.geocodes[0].location.split(',');
        return [parseFloat(location[0]), parseFloat(location[1])];
      }
    } catch (error) {
      console.warn(`地理编码失败 ${name}:`, error);
    }
    return null;
  }

  // 模糊匹配
  static async fuzzyGeocode(name) {
    // 尝试移除常见前缀
    const prefixes = ['古', '旧', '前', '后', '大', '小'];
    let cleanedName = name;
    
    for (const prefix of prefixes) {
      if (name.startsWith(prefix)) {
        cleanedName = name.slice(prefix.length);
        const coordinates = await this.geocodeWithAMap(cleanedName);
        if (coordinates) {
          return {
            original: name,
            matched: cleanedName,
            coordinates,
            confidence: 'medium',
            type: 'fuzzy'
          };
        }
      }
    }
    
    return null;
  }
}

const LocationMap = ({ annotations, filters }) => {
  const mapRef = useRef(null);
  const [mapInstance, setMapInstance] = useState(null);
  const [selectedLocation, setSelectedLocation] = useState(null);
  const [isAMapReady, setIsAMapReady] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [matchingProgress, setMatchingProgress] = useState({ current: 0, total: 0 });
  const markersRef = useRef([]);
  const infoWindowRef = useRef(null);
  const [locationsWithCoords, setLocationsWithCoords] = useState([]);
  const [matchResults, setMatchResults] = useState({});
  
  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  // 加载高德地图JS
  useEffect(() => {
    if (isAMapLoaded) {
      setIsAMapReady(true);
      return;
    }

    if (window.AMap) {
      isAMapLoaded = true;
      setIsAMapReady(true);
      return;
    }

    const script = document.createElement('script');
    script.src = `https://webapi.amap.com/maps?v=2.0&key=${AMAP_CONFIG.key}`;
    script.onload = () => {
      isAMapLoaded = true;
      if (isMountedRef.current) {
        setIsAMapReady(true);
      }
    };
    script.onerror = () => {
      console.error('Failed to load AMap');
      if (isMountedRef.current) {
        setIsAMapReady(false);
      }
    };
    document.head.appendChild(script);
  }, []);

  // 初始化地图
  useEffect(() => {
    if (!isAMapReady || !mapRef.current || globalMapInstance || isMapInitializing) {
      return;
    }

    console.log('Initializing map...');
    isMapInitializing = true;

    try {
      const map = new window.AMap.Map(mapRef.current, {
        zoom: 5,
        center: [116.397428, 39.90923],
        viewMode: '2D',
        mapStyle: 'amap://styles/normal'
      });

      globalMapInstance = map;
      
      if (isMountedRef.current) {
        setMapInstance(map);
      }

      console.log('Map initialized successfully');
    } catch (error) {
      console.error('Map initialization failed:', error);
      isMapInitializing = false;
    }

    return () => {
      markersRef.current.forEach(marker => {
        if (marker && marker.setMap) {
          marker.setMap(null);
        }
      });
      markersRef.current = [];

      if (infoWindowRef.current) {
        infoWindowRef.current.close();
        infoWindowRef.current = null;
      }
    };
  }, [isAMapReady]);

  // 处理地点数据
  const locations = useMemo(() => {
    const placeAnnotations = annotations.filter(ann => 
      ann.label === '地名' && filters.places
    );
    
    const locationCount = {};
    placeAnnotations.forEach(ann => {
      locationCount[ann.text] = (locationCount[ann.text] || 0) + 1;
    });
    
    return Object.entries(locationCount).map(([name, count]) => ({
      name,
      count,
      coordinates: locationsCache.get(name)?.coordinates || null,
      matchInfo: locationsCache.get(name)?.matchInfo || null
    }));
  }, [annotations, filters]);

  // AI 智能匹配地名坐标
  const smartGeocodeLocations = useCallback(async (locations) => {
    if (locations.length === 0) return [];
    
    setIsLoading(true);
    setMatchingProgress({ current: 0, total: locations.length });
    
    const results = [];
    const newMatchResults = {};
    
    for (let i = 0; i < locations.length; i++) {
      if (!isMountedRef.current) break;
      
      const location = locations[i];
      setMatchingProgress({ current: i + 1, total: locations.length });
      
      try {
        // 如果缓存中有，直接使用
        if (locationsCache.has(location.name)) {
          const cached = locationsCache.get(location.name);
          results.push({
            ...location,
            coordinates: cached.coordinates,
            matchInfo: cached.matchInfo
          });
          newMatchResults[location.name] = cached.matchInfo;
          continue;
        }
        
        // 智能匹配
        const matchResult = await LocationMatcher.smartGeocode(location.name);
        
        // 缓存结果
        locationsCache.set(location.name, {
          coordinates: matchResult.coordinates,
          matchInfo: matchResult
        });
        
        results.push({
          ...location,
          coordinates: matchResult.coordinates,
          matchInfo: matchResult
        });
        
        newMatchResults[location.name] = matchResult;
        
        // 添加延迟避免请求过快
        await new Promise(resolve => setTimeout(resolve, 100));
        
      } catch (error) {
        console.error(`智能匹配失败 ${location.name}:`, error);
        // 使用默认坐标
        const defaultResult = {
          original: location.name,
          matched: location.name,
          coordinates: [104.1954, 35.8617],
          confidence: 'low',
          type: 'error'
        };
        
        results.push({
          ...location,
          coordinates: defaultResult.coordinates,
          matchInfo: defaultResult
        });
        
        newMatchResults[location.name] = defaultResult;
      }
    }
    
    if (isMountedRef.current) {
      setMatchResults(newMatchResults);
      setIsLoading(false);
    }
    
    return results.filter(loc => loc && loc.coordinates);
  }, []);

  // 获取坐标数据
  useEffect(() => {
    if (locations.length === 0) {
      if (isMountedRef.current) {
        setLocationsWithCoords([]);
      }
      return;
    }

    // 检查是否所有坐标都已缓存
    const allCached = locations.every(loc => locationsCache.has(loc.name));
    if (allCached) {
      const cachedLocations = locations.map(loc => ({
        ...loc,
        coordinates: locationsCache.get(loc.name).coordinates,
        matchInfo: locationsCache.get(loc.name).matchInfo
      }));
      if (isMountedRef.current) {
        setLocationsWithCoords(cachedLocations);
      }
      return;
    }

    const fetchCoordinates = async () => {
      if (!isMountedRef.current) return;
      
      const results = await smartGeocodeLocations(locations);
      if (isMountedRef.current) {
        setLocationsWithCoords(results);
      }
    };

    const timer = setTimeout(fetchCoordinates, 300);
    return () => clearTimeout(timer);
  }, [locations, smartGeocodeLocations]);

  // 添加标记到地图
  useEffect(() => {
    if (!mapInstance || locationsWithCoords.length === 0) return;

    console.log('Adding markers to map:', locationsWithCoords.length);

    // 清除旧标记
    markersRef.current.forEach(marker => {
      if (marker && marker.setMap) {
        marker.setMap(null);
      }
    });

    const newMarkers = [];

    locationsWithCoords.forEach((location) => {
      try {
        const markerContent = createMarkerContent(location);
        const marker = new window.AMap.Marker({
          position: location.coordinates,
          content: markerContent,
          offset: new window.AMap.Pixel(-15, -42),
          animation: 'AMAP_ANIMATION_NONE'
        });

        marker.on('click', () => {
          handleMarkerClick(location, marker);
        });

        marker.setMap(mapInstance);
        newMarkers.push(marker);
      } catch (error) {
        console.error('创建标记失败:', error);
      }
    });

    markersRef.current = newMarkers;

    // 延迟调整视野
    const fitViewTimer = setTimeout(() => {
      if (newMarkers.length > 0 && mapInstance) {
        try {
          mapInstance.setFitView(newMarkers, false, [50, 50, 50, 50]);
        } catch (error) {
          console.error('调整视野失败:', error);
        }
      }
    }, 500);

    return () => clearTimeout(fitViewTimer);
  }, [mapInstance, locationsWithCoords]);

  // 创建标记内容
  const createMarkerContent = useCallback((location) => {
    const size = getMarkerSize(location.count);
    const color = getMarkerColor(location.count);
    const confidence = location.matchInfo?.confidence || 'low';
    
    return `
      <div class="custom-marker ${size} confidence-${confidence}" style="--marker-color: ${color}">
        <div class="marker-pin">
          <span class="marker-count">${location.count}</span>
        </div>
        ${confidence === 'high' ? '<div class="accuracy-badge">准</div>' : ''}
      </div>
    `;
  }, []);

  const handleMarkerClick = useCallback((location, marker) => {
    setSelectedLocation(location);
    
    if (infoWindowRef.current) {
      infoWindowRef.current.close();
    }
    
    try {
      const matchInfo = location.matchInfo;
      const confidenceText = {
        'high': '高精度',
        'medium': '中等精度', 
        'low': '低精度'
      }[matchInfo?.confidence] || '未知精度';
      
      const typeText = {
        'historical': '历史地名匹配',
        'direct': '直接匹配',
        'fuzzy': '模糊匹配',
        'default': '默认位置'
      }[matchInfo?.type] || '未知类型';
      
      const newInfoWindow = new window.AMap.InfoWindow({
        content: `
          <div class="location-info-window">
            <h4>${location.name}</h4>
            <div class="info-content">
              <p><strong>出现次数:</strong> ${location.count}</p>
              <p><strong>匹配地名:</strong> ${matchInfo?.matched || location.name}</p>
              <p><strong>匹配精度:</strong> <span class="confidence-${matchInfo?.confidence}">${confidenceText}</span></p>
              <p><strong>匹配类型:</strong> ${typeText}</p>
              <p><strong>坐标:</strong> ${location.coordinates[0].toFixed(4)}, ${location.coordinates[1].toFixed(4)}</p>
              ${matchInfo?.original !== matchInfo?.matched ? 
                `<p><strong>原始名称:</strong> ${matchInfo.original}</p>` : ''}
            </div>
          </div>
        `,
        offset: new window.AMap.Pixel(0, -45),
        closeWhenClickMap: true
      });
      
      newInfoWindow.open(mapInstance, marker.getPosition());
      infoWindowRef.current = newInfoWindow;
    } catch (error) {
      console.error('打开信息窗口失败:', error);
    }
  }, [mapInstance]);

  const getMarkerSize = useCallback((count) => {
    if (count >= 10) return 'large';
    if (count >= 5) return 'medium';
    return 'small';
  }, []);

  const getMarkerColor = useCallback((count) => {
    if (count >= 10) return '#dc3545';
    if (count >= 5) return '#ffc107';
    return '#28a745';
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
    if (mapInstance && markersRef.current.length > 0) {
      mapInstance.setFitView(markersRef.current, false, [50, 50, 50, 50]);
    }
  }, [mapInstance]);

  const handleResetView = useCallback(() => {
    if (mapInstance) {
      mapInstance.setZoomAndCenter(5, [116.397428, 39.90923]);
    }
  }, [mapInstance]);

  // 只在组件挂载后执行一次地图刷新
  useEffect(() => {
    const timer = setTimeout(() => {
      if (mapInstance) {
        try {
          mapInstance.resize();
        } catch (error) {
          console.error('地图重绘失败:', error);
        }
      }
    }, 1000);

    return () => clearTimeout(timer);
  }, [mapInstance]);

  // 渲染逻辑
  if (!isAMapReady) {
    return (
      <div className="location-map">
        <h3>地点事件分布图</h3>
        <div className="map-container">
          <div className="loading-map">
            <div className="loading-spinner"></div>
            <p>正在加载地图...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="location-map">
      <h3>地点事件分布图</h3>
      <div className="map-container">
        {isLoading ? (
          <div className="loading-map">
            <div className="loading-spinner"></div>
            <p>正在智能匹配地名...</p>
            <div className="matching-progress">
              <progress value={matchingProgress.current} max={matchingProgress.total} />
              <span>{matchingProgress.current} / {matchingProgress.total}</span>
            </div>
          </div>
        ) : locationsWithCoords.length === 0 ? (
          <div className="empty-map">
            <i data-feather="map"></i>
            <p>没有找到地点信息</p>
            <p className="empty-tip">请确保文档中包含地名实体标注</p>
          </div>
        ) : (
          <div className="amap-container">
            <div 
              ref={mapRef} 
              className="amap-component"
              style={{ 
                width: '100%', 
                height: '100%'
              }}
            ></div>
            
            <div className="map-controls">
              <button className="control-btn" onClick={handleZoomIn} title="放大">
                <i data-feather="plus"></i>
              </button>
              <button className="control-btn" onClick={handleZoomOut} title="缩小">
                <i data-feather="minus"></i>
              </button>
              <button className="control-btn" onClick={handleFitView} title="适应视野">
                <i data-feather="maximize"></i>
              </button>
              <button className="control-btn" onClick={handleResetView} title="重置视图">
                <i data-feather="refresh-cw"></i>
              </button>
            </div>

            <div className="map-legend">
              <h4><i data-feather="map-pin"></i>地点分布</h4>
              
              <div className="legend-scale">
                <div className="scale-title">出现频率:</div>
                <div className="legend-item">
                  <div className="marker-sample small" style={{backgroundColor: '#28a745'}}></div>
                  <span>1-4次</span>
                </div>
                <div className="legend-item">
                  <div className="marker-sample medium" style={{backgroundColor: '#ffc107'}}></div>
                  <span>5-9次</span>
                </div>
                <div className="legend-item">
                  <div className="marker-sample large" style={{backgroundColor: '#dc3545'}}></div>
                  <span>10次以上</span>
                </div>
              </div>

              <div className="legend-accuracy">
                <div className="accuracy-title">匹配精度:</div>
                <div className="legend-item">
                  <div className="accuracy-dot high"></div>
                  <span>高精度匹配</span>
                </div>
                <div className="legend-item">
                  <div className="accuracy-dot medium"></div>
                  <span>中等精度</span>
                </div>
                <div className="legend-item">
                  <div className="accuracy-dot low"></div>
                  <span>低精度/默认</span>
                </div>
              </div>

              <div className="legend-locations">
                <div className="locations-title">地点列表:</div>
                <div className="locations-list">
                  {locationsWithCoords.slice(0, 8).map(location => (
                    <div key={location.name} className="legend-location-item">
                      <span 
                        className="legend-color" 
                        style={{backgroundColor: getMarkerColor(location.count)}}
                      ></span>
                      <span className="location-name">{location.name}</span>
                      <span className="location-count">({location.count})</span>
                      {location.matchInfo?.confidence === 'high' && (
                        <span className="accuracy-indicator" title="高精度匹配">✓</span>
                      )}
                    </div>
                  ))}
                  {locationsWithCoords.length > 8 && (
                    <div className="more-locations">
                      还有 {locationsWithCoords.length - 8} 个地点...
                    </div>
                  )}
                </div>
              </div>

              <div className="legend-stats">
                <p>共发现 {locationsWithCoords.length} 个地点</p>
                <p>总计 {annotations.filter(ann => ann.label === '地名').length} 次提及</p>
                <p className="ai-match-info">
                  <i data-feather="cpu"></i>
                  AI智能地名匹配
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default LocationMap;