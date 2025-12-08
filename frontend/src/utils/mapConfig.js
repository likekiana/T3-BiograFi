// 共享的地图配置
export const AMAP_CONFIG = {
  key: '0af744d9c966d1790972694dfa5509d6',
  version: '2.0',
  plugins: 'AMap.ControlBar,AMap.ToolBar,AMap.Buildings,AMap.HeatMap'
};

// 共享的地图样式
export const MAP_STYLES = {
  grey: { name: '商务灰', style: 'amap://styles/grey' },
  light: { name: '清新浅色', style: 'amap://styles/light' },
  normal: { name: '标准蓝', style: 'amap://styles/normal' },
  dark: { name: '深色夜晚', style: 'amap://styles/dark' },
  fresh: { name: '清新绿', style: 'amap://styles/fresh' },
  '8e18d6f3c8e4c24645505580481f8d25': { name: '无底图', style: 'amap://styles/8e18d6f3c8e4c24645505580481f8d25' },
  whitesmoke: { name: '素雅白', style: 'amap://styles/whitesmoke' },
  graffiti: { name: '涂鸦风', style: 'amap://styles/4e349627b3a2e06d4b1b1e6e661c8c09' }
};

export const getStyleById = (id) => {
  return MAP_STYLES[id]?.style || MAP_STYLES.grey.style;
};