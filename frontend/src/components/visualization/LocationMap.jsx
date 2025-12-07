// src/components/visualization/LocationMap.jsx
import '../../styles/components/Visualization/LocationMap.css';
import BubbleStyleSelector from './BubbleStyleSelector';
import React, { useMemo, useState, useCallback, useEffect, useRef } from 'react'; //添加React导入，用于data-feather图标
// 导入 react-feather 图标
import {
  Plus,
  Minus,
  Maximize2,
  RefreshCw,
  MapPin,
  Cpu,
  Layers,
  Eye,
  Compass,
  Navigation,
  Globe,
  Map
} from 'react-feather';

// 高德地图API配置
const AMAP_CONFIG = {
  key: '0af744d9c966d1790972694dfa5509d6',
  version: '2.0'
};

// 地图样式配置（与样式选择器保持一致）
const MAP_STYLES = {
  grey: { name: '商务灰', icon: null, style: 'amap://styles/grey' },
  light: { name: '清新浅色', icon: null, style: 'amap://styles/light' },
  normal: { name: '标准蓝', icon: null, style: 'amap://styles/normal' },
  dark: { name: '深色夜晚', icon: null, style: 'amap://styles/dark' },
  fresh: { name: '清新绿', icon: null, style: 'amap://styles/fresh' },
  '8e18d6f3c8e4c24645505580481f8d25': { name: '无底图', icon: null, style: 'amap://styles/8e18d6f3c8e4c24645505580481f8d25' },
  whitesmoke: { name: '素雅白', icon: null, style: 'amap://styles/whitesmoke' },
  graffiti: { name: '涂鸦风', icon: null, style: 'amap://styles/4e349627b3a2e06d4b1b1e6e661c8c09' }
};

const getStyleById = (id) => {
  return MAP_STYLES[id]?.style || MAP_STYLES.grey.style;
};

// 全局状态管理 - 优化为立即加载
let globalMapInstance = null;
let isAMapLoaded = false;
let isMapInitializing = false;
let _locationsCache = null;

// 获取缓存的函数
function getLocationsCache() {
  if (!_locationsCache) {
    // 延迟初始化，确保在正确的环境中
    if (typeof window !== 'undefined' && typeof Map === 'function') {
      try {
        _locationsCache = new Map();
      } catch (e) {
        console.warn('Failed to create Map, using fallback:', e);
        // 服务器端或兼容环境
        _locationsCache = {
          _data: {},
          set: function (k, v) { this._data[k] = v; return this; },
          get: function (k) { return this._data[k]; },
          has: function (k) { return k in this._data; },
          delete: function (k) { return delete this._data[k]; },
          clear: function () { this._data = {}; }
        };
      }
    } else {
      // 服务器端或兼容环境
      _locationsCache = {
        _data: {},
        set: function (k, v) { this._data[k] = v; return this; },
        get: function (k) { return this._data[k]; },
        has: function (k) { return k in this._data; },
        delete: function (k) { return delete this._data[k]; },
        clear: function () { this._data = {}; }
      };
    }
  }
  return _locationsCache;
}

// 预加载地图API - 组件加载前就执行
const preloadAMap = () => {
  if (typeof window === 'undefined' || isAMapLoaded || window.AMap) {
    return;
  }

  const script = document.createElement('script');
  script.src = `https://webapi.amap.com/maps?v=2.0&key=${AMAP_CONFIG.key}`;
  script.async = true;
  script.defer = true;
  script.crossOrigin = 'anonymous';

  script.onload = () => {
    console.log('AMap preloaded');
    isAMapLoaded = true;
  };

  script.onerror = (error) => {
    console.error('Failed to load AMap:', error);
    // 可以在这里添加重试逻辑
    setTimeout(() => {
      preloadAMap();
    }, 3000);
  };

  script.className = 'amap-preload-script';
  document.head.appendChild(script);

  console.log('AMap preloading started');
};

// 立即预加载
if (typeof window !== 'undefined') {
  preloadAMap();
}

// 地名智能匹配服务
class LocationMatcher {
  // 历史地名到现代地名的映射（简化版，提高匹配速度）
  static historicalToModern = {
    '洛阳': '洛阳',
    '长安': '西安',
    '许昌': '许昌',
    '成都': '成都',
    '建业': '南京',
    '襄阳': '襄阳',
    '荆州': '荆州',
    '赤壁': '赤壁',
    '益州': '成都',
    '咸阳': '咸阳',
    '邯郸': '邯郸',
    '姑苏': '苏州',
    '会稽': '绍兴',
    '汴京': '开封',
    '临安': '杭州',
    '金陵': '南京',
    '京师': '北京',
    '中原': '郑州',
    '江南': '苏州',
  };

  // 快速地名规范化
  static normalizeLocationName(name) {
    if (!name || typeof name !== 'string') return name;

    let normalized = name.trim();

    // 快速移除常见后缀
    const suffixRegex = /(之地|一带|地区|附近|周边|境内)$/;
    normalized = normalized.replace(suffixRegex, '');

    return normalized;
  }

  // 智能匹配地名 - 添加批量处理优化
  static async smartGeocode(name) {
    const normalizedName = this.normalizeLocationName(name);

    // 1. 首先尝试直接匹配历史地名
    if (this.historicalToModern[normalizedName]) {
      const modernName = this.historicalToModern[normalizedName];
      const coordinates = await this.quickGeocode(modernName);
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
    const directCoordinates = await this.quickGeocode(normalizedName);
    if (directCoordinates) {
      return {
        original: name,
        matched: normalizedName,
        coordinates: directCoordinates,
        confidence: 'medium',
        type: 'direct'
      };
    }

    // 3. 返回默认坐标（中国中心）
    return {
      original: name,
      matched: normalizedName,
      coordinates: [104.1954, 35.8617], // 中国中心
      confidence: 'low',
      type: 'default'
    };
  }

  // 快速地理编码，添加超时控制
  static async quickGeocode(name) {
    try {
      // 使用Promise.race添加超时控制
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Timeout')), 3000);
      });

      const geocodePromise = fetch(
        `https://restapi.amap.com/v3/geocode/geo?key=${AMAP_CONFIG.key}&address=${encodeURIComponent(name)}`
      ).then(response => response.json());

      const data = await Promise.race([geocodePromise, timeoutPromise]);

      if (data.status === '1' && data.geocodes && data.geocodes.length > 0) {
        const location = data.geocodes[0].location.split(',');
        return [parseFloat(location[0]), parseFloat(location[1])];
      }
    } catch (error) {
      console.warn(`地理编码失败 ${name}:`, error);
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

  //当前地图样式状态
  const [currentMapStyle, setCurrentMapStyle] = useState('grey');

  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      // 清理时保留地图实例，以便复用
      markersRef.current.forEach(marker => {
        if (marker && marker.setMap) {
          marker.setMap(null);
        }
      });
    };
  }, []);

  // 优化：检查AMap是否已加载
  useEffect(() => {
    const checkAMap = () => {
      if (window.AMap && window.AMap.Map) {
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

    // 如果未加载，设置轮询检查
    let checkInterval;
    const maxChecks = 30; // 最多检查30次，每次200ms，总共6秒
    let checkCount = 0;

    checkInterval = setInterval(() => {
      checkCount++;
      if (checkAMap() || checkCount >= maxChecks) {
        clearInterval(checkInterval);
        if (!isAMapLoaded) {
          console.error('AMap加载失败，请检查网络连接');
          // 可以在这里显示错误提示
        }
      }
    }, 200);

    return () => clearInterval(checkInterval);
  }, []);

  // 优化：立即初始化地图
  useEffect(() => {
    if (!isAMapReady || !mapRef.current || globalMapInstance || isMapInitializing) {
      return;
    }

    console.log('Initializing map...');
    isMapInitializing = true;

    try {
      // 再次检查 AMap 是否存在
      if (!window.AMap || !window.AMap.Map) {
        console.error('AMap not found, retrying...');
        setIsAMapReady(false);
        isMapInitializing = false;
        // 重新触发检查
        const script = document.createElement('script');
        script.src = `https://webapi.amap.com/maps?v=2.0&key=${AMAP_CONFIG.key}`;
        script.async = true;
        script.defer = true;
        script.crossOrigin = 'anonymous';

        script.onload = () => {
          console.log('AMap loaded via retry');
          setIsAMapReady(true);
        };

        document.head.appendChild(script);
        return;
      }

      // 使用更简单的配置加快初始化
      const mapOptions = {
        zoom: 5,
        center: [116.397428, 39.90923],
        viewMode: '2D',
        mapStyle: getStyleById(currentMapStyle),
        resizeEnable: true,
        animateEnable: false,
        doubleClickZoom: false, // 可以改为 true 以启用双击缩放
        keyboardEnable: false,
        scrollWheel: true,     // 这里改为 true 启用鼠标滚轮缩放
        touchZoom: false        // 可以改为 true 以启用手势缩放
      };

      console.log('Creating AMap with options:', mapOptions);
      const map = new window.AMap.Map(mapRef.current, mapOptions);

      globalMapInstance = map;

      if (isMountedRef.current) {
        setMapInstance(map);
      }

      console.log('Map initialized successfully');
    } catch (error) {
      console.error('Map initialization failed:', error);
      isMapInitializing = false;

      // 显示错误信息
      if (mapRef.current) {
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
          <div style="font-size: 48px; margin-bottom: 20px;">🗺️</div>
          <h3 style="margin-bottom: 10px;">地图加载失败</h3>
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

    return () => {
      // 不清除全局地图实例，以便复用
      isMapInitializing = false;
    };
  }, [isAMapReady, currentMapStyle]);

  // 优化：快速处理地点数据
  const locations = useMemo(() => {
    if (!filters.places) return [];

    const locationCount = {};
    let count = 0;

    // 快速统计
    for (let i = 0; i < annotations.length; i++) {
      const ann = annotations[i];
      if (ann.label === '地名') {
        locationCount[ann.text] = (locationCount[ann.text] || 0) + 1;
        count++;
      }
      // 只处理前100个，避免性能问题
      if (count >= 100) break;
    }

    const cache = getLocationsCache();
    return Object.entries(locationCount).map(([name, count]) => ({
      name,
      count,
      coordinates: cache.get(name)?.coordinates || null,
      matchInfo: cache.get(name)?.matchInfo || null
    }));
  }, [annotations, filters]);

  // 优化：批量智能匹配地名坐标
  const smartGeocodeLocations = useCallback(async (locations) => {
    if (locations.length === 0) return [];

    setIsLoading(true);
    setMatchingProgress({ current: 0, total: locations.length });

    const results = [];
    const newMatchResults = {};
    const cache = getLocationsCache();

    // 批量处理，避免频繁的状态更新
    const batchSize = 5;

    for (let i = 0; i < locations.length; i += batchSize) {
      if (!isMountedRef.current) break;

      const batch = locations.slice(i, i + batchSize);
      const batchPromises = batch.map(async (location) => {
        // 如果缓存中有，直接使用
        if (cache.has(location.name)) {
          const cached = cache.get(location.name);
          newMatchResults[location.name] = cached.matchInfo;
          return {
            ...location,
            coordinates: cached.coordinates,
            matchInfo: cached.matchInfo
          };
        }

        try {
          // 智能匹配
          const matchResult = await LocationMatcher.smartGeocode(location.name);

          // 缓存结果
          cache.set(location.name, {
            coordinates: matchResult.coordinates,
            matchInfo: matchResult
          });

          newMatchResults[location.name] = matchResult;

          return {
            ...location,
            coordinates: matchResult.coordinates,
            matchInfo: matchResult
          };
        } catch (error) {
          console.error(`智能匹配失败 ${location.name}:`, error);
          const defaultResult = {
            original: location.name,
            matched: location.name,
            coordinates: [104.1954, 35.8617],
            confidence: 'low',
            type: 'error'
          };

          newMatchResults[location.name] = defaultResult;
          return {
            ...location,
            coordinates: defaultResult.coordinates,
            matchInfo: defaultResult
          };
        }
      });

      const batchResults = await Promise.all(batchPromises);
      results.push(...batchResults);

      // 批量更新进度
      setMatchingProgress({ current: Math.min(i + batchSize, locations.length), total: locations.length });

      // 添加微小延迟，避免阻塞UI
      if (i + batchSize < locations.length) {
        await new Promise(resolve => setTimeout(resolve, 50));
      }
    }

    if (isMountedRef.current) {
      setMatchResults(newMatchResults);
      setIsLoading(false);
    }

    return results.filter(loc => loc && loc.coordinates);
  }, []);

  // 优化：立即获取坐标数据
  useEffect(() => {
    if (locations.length === 0) {
      if (isMountedRef.current) {
        setLocationsWithCoords([]);
      }
      return;
    }

    const fetchCoordinates = async () => {
      if (!isMountedRef.current) return;

      const cache = getLocationsCache();

      // 先显示缓存的数据（如果有）
      const cachedLocations = locations.filter(loc => cache.has(loc.name));
      if (cachedLocations.length > 0) {
        const cachedWithCoords = cachedLocations.map(loc => ({
          ...loc,
          coordinates: cache.get(loc.name).coordinates,
          matchInfo: cache.get(loc.name).matchInfo
        }));
        if (isMountedRef.current) {
          setLocationsWithCoords(cachedWithCoords);
        }
      }

      // 异步获取剩余地点的坐标
      const uncachedLocations = locations.filter(loc => !cache.has(loc.name));
      if (uncachedLocations.length > 0) {
        const results = await smartGeocodeLocations(uncachedLocations);
        if (isMountedRef.current && results.length > 0) {
          setLocationsWithCoords(prev => [...prev, ...results]);
        }
      }
    };

    fetchCoordinates();
  }, [locations, smartGeocodeLocations]);

  // 优化：延迟添加标记到地图
  useEffect(() => {
    if (!mapInstance || locationsWithCoords.length === 0) return;

    // 延迟添加标记，避免阻塞UI
    const timer = setTimeout(() => {
      console.log('Adding markers to map:', locationsWithCoords.length);

      // 清除旧标记
      markersRef.current.forEach(marker => {
        if (marker && marker.setMap) {
          marker.setMap(null);
        }
      });

      const newMarkers = [];

      // 分批添加标记
      const addMarkersBatch = (start, end) => {
        for (let i = start; i < Math.min(end, locationsWithCoords.length); i++) {
          const location = locationsWithCoords[i];
          try {
            const markerContent = createMarkerContent(location);
            const marker = new window.AMap.Marker({
              position: location.coordinates,
              content: markerContent,
              offset: new window.AMap.Pixel(-15, -42),
              animation: false // 禁用动画
            });

            marker.on('click', () => {
              handleMarkerClick(location, marker);
            });

            marker.setMap(mapInstance);
            newMarkers.push(marker);
          } catch (error) {
            console.error('创建标记失败:', error);
          }
        }
      };

      // 第一批立即添加
      addMarkersBatch(0, Math.min(20, locationsWithCoords.length));
      markersRef.current = newMarkers;

      // 如果有更多标记，分批添加
      if (locationsWithCoords.length > 20) {
        let batchIndex = 20;
        const batchTimer = setInterval(() => {
          if (batchIndex >= locationsWithCoords.length) {
            clearInterval(batchTimer);
            return;
          }

          const nextBatch = Math.min(batchIndex + 10, locationsWithCoords.length);
          addMarkersBatch(batchIndex, nextBatch);
          batchIndex = nextBatch;

          // 更新标记数组
          markersRef.current = markersRef.current.concat(newMarkers.slice(-10));

          // 调整视野
          try {
            mapInstance.setFitView(markersRef.current, false, [50, 50, 50, 50]);
          } catch (error) {
            console.error('调整视野失败:', error);
          }
        }, 200);

        return () => clearInterval(batchTimer);
      } else {
        // 调整视野
        setTimeout(() => {
          if (newMarkers.length > 0 && mapInstance) {
            try {
              mapInstance.setFitView(newMarkers, false, [50, 50, 50, 50]);
            } catch (error) {
              console.error('调整视野失败:', error);
            }
          }
        }, 300);
      }
    }, 100);

    return () => clearTimeout(timer);
  }, [mapInstance, locationsWithCoords]);

  // 创建标记内容（不变）
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

  // 新增：切换地图样式
  // 新的气泡样式选择器切换函数
  const handleChangeMapStyle = useCallback((styleUrl) => {
    if (mapInstance) {
      try {
        mapInstance.setMapStyle(styleUrl);
        // 找到对应的样式ID
        const styleEntry = Object.entries(MAP_STYLES).find(([_, value]) => value.style === styleUrl);
        if (styleEntry) {
          setCurrentMapStyle(styleEntry[0]);
        }
      } catch (error) {
        console.error('切换地图样式失败:', error);
      }
    }
  }, [mapInstance]);

  // 优化渲染逻辑
  if (!isAMapReady) {
    return (
      <div className="location-map">
        <h3>地点事件分布图</h3>
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
    <div className="location-map">
      <h3>地点事件分布图</h3>
      <div className="map-container">
        <div className="amap-container" style={{ position: 'relative' }}>
          {/* 地图容器 */}
          <div
            ref={mapRef}
            className="amap-component"
            style={{
              width: '100%',
              height: '100%',
              opacity: isLoading ? 0.7 : 1
            }}
          ></div>

          {isLoading && (
            <div className="loading-overlay" style={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              background: 'rgba(255, 255, 255, 0.9)',
              padding: '20px',
              borderRadius: '8px',
              zIndex: 1000
            }}>
              <div className="loading-spinner"></div>
              <p>正在智能匹配地名...</p>
              <div className="matching-progress">
                <progress value={matchingProgress.current} max={matchingProgress.total} />
                <span>{matchingProgress.current} / {matchingProgress.total}</span>
              </div>
            </div>
          )}

          <div className="map-controls">
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
          </div>

          {/* 气泡式样式选择器 */}
          {mapInstance && (
            <BubbleStyleSelector
              onStyleChange={handleChangeMapStyle}
              currentStyle={currentMapStyle}
            />
          )}

          {locationsWithCoords.length > 0 && (
            <div className="map-legend">
              <h4><MapPin size={16} />地点分布</h4>

              <div className="legend-scale">
                <div className="scale-title">出现频率:</div>
                <div className="legend-item">
                  <div className="marker-sample small" style={{ backgroundColor: '#28a745' }}></div>
                  <span>1-4次</span>
                </div>
                <div className="legend-item">
                  <div className="marker-sample medium" style={{ backgroundColor: '#ffc107' }}></div>
                  <span>5-9次</span>
                </div>
                <div className="legend-item">
                  <div className="marker-sample large" style={{ backgroundColor: '#dc3545' }}></div>
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
                        style={{ backgroundColor: getMarkerColor(location.count) }}
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
                  <Cpu size={14} />
                  AI智能地名匹配
                </p>
                {/* 新增：当前地图样式信息 */}
                <div className="map-style-info">
                  <span className="style-label">地图样式:</span>
                  <span className="style-name">{MAP_STYLES[currentMapStyle].name}</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default LocationMap;