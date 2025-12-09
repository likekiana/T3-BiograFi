// src/components/visualization/DataVisualization.jsx
import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { t } from '../../utils/language';
import TimelineVisualization from './TimelineVisualization';
import LocationMap from './LocationMap';
import RelationshipGraph from './RelationshipGraph';
import '../../styles/components/Visualization/DataVisualization.css';
import HeatmapVisualization from './HeatmapVisualization';
import ChineseHistoryTimeline from './ChineseHistoryTimeline';
import { Thermometer, MapPin, Clock, GitBranch, Clock as HistoryClock } from 'react-feather';

const DataVisualization = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('timeline');
  const [documentData, setDocumentData] = useState(null);
  const [filters, setFilters] = useState({
    persons: true,
    places: true,
    times: true,
    objects: true,
    concepts: true
  });

  useEffect(() => {
    const data = location.state?.documentData || 
                 JSON.parse(localStorage.getItem('currentDocument'));
    if (data) {
      setDocumentData(data);
    } else {
      alert('没有找到文档数据');
      navigate('/editor');
    }
  }, [location, navigate]);

  const handleFilterChange = (filterType) => {
    setFilters(prev => ({
      ...prev,
      [filterType]: !prev[filterType]
    }));
  };

  const extractEntitiesByType = (type) => {
    if (!documentData?.annotations) return [];
    return documentData.annotations.filter(ann => ann.label === type);
  };

  // 统计信息
  const getStats = () => {
    if (!documentData) return {};
    
    const totalEntities = documentData.annotations?.length || 0;
    const uniquePersons = new Set(extractEntitiesByType('人物').map(p => p.text)).size;
    const uniquePlaces = new Set(extractEntitiesByType('地名').map(p => p.text)).size;
    const uniqueTimes = new Set(extractEntitiesByType('时间').map(p => p.text)).size;
    
    return {
      totalEntities,
      uniquePersons,
      uniquePlaces,
      uniqueTimes,
      contentLength: documentData.content?.length || 0
    };
  };

  if (!documentData) {
    return <div className="loading">{t('loading')}</div>;
  }

  const stats = getStats();
  const tabs = [
    { 
      id: 'timeline', 
      name: t('timeline'), 
      icon: 'clock', 
      description: t('timeline_description') 
    },
    { 
      id: 'locations', 
      name: t('locations'), 
      icon: 'map-pin', 
      description: t('locations_description') 
    },
    { 
      id: 'heatmap', 
      name: '时空热力图', 
      icon: 'thermometer', 
      description: 'AI分析的人物时空分布热力图' 
    },
    { 
      id: 'relationships', 
      name: t('relationships'), 
      icon: 'git-branch', 
      description: t('relationships_description') 
    },
    { 
      id: 'chinese-history', 
      name: '中国历史时间轴', 
      icon: 'clock', 
      description: '从秦国到近代的中国历史时间轴可视化' 
    }
  ];

  // 修复：直接使用中文标签映射
  const getEntityCount = (filterKey) => {
    const typeMap = {
      'persons': '人物',
      'places': '地名',
      'times': '时间',
      'objects': '物品',
      'concepts': '概念'
    };
    return extractEntitiesByType(typeMap[filterKey]).length;
  };

  // 获取实体类型的中文标签
  const getEntityLabel = (filterKey) => {
    const labelMap = {
      'persons': '人物',
      'places': '地名',
      'times': '时间', 
      'objects': '物品',
      'concepts': '概念'
    };
    return labelMap[filterKey];
  };

  // 根据当前选项卡显示对应的图标
  const getTabIcon = (tabId) => {
    switch(tabId) {
      case 'timeline': return 'clock';
      case 'locations': return 'map-pin';
      case 'heatmap': return 'thermometer';
      case 'relationships': return 'git-branch';
      case 'chinese-history': return 'clock';
      default: return 'bar-chart-2';
    }
  };

  
  return (
    <div className="data-visualization">
      {/* 顶部标题栏 */}
      <div className="visualization-header">
        <button 
          className="back-btn"
          onClick={() => window.history.back()}
        >
          <i data-feather="arrow-left"></i>
          {t('back_to_editor')}
        </button>
        
        <div className="document-info">
          <h2>{documentData.title || t('untitled_document')}</h2>
          {documentData.author && (
            <p className="document-author">作者: {documentData.author}</p>
          )}
        </div>
        
        <div style={{ width: '100px' }}></div>
      </div>

      {/* 主要内容区域 */}
      <div className="visualization-main">
        {/* 左侧控制面板 */}
        <div className="control-panel">
          {/* 实体筛选区域 */}
          <div className="control-section">
            <h3>
              <i data-feather="filter"></i>
              {t('entity_filter')}
            </h3>
            <div className="filter-controls">
              {Object.entries(filters).map(([key, value]) => {
                const count = getEntityCount(key);
                const label = getEntityLabel(key);
                return (
                  <label key={key} className="filter-checkbox">
                    <input
                      type="checkbox"
                      checked={value}
                      onChange={() => handleFilterChange(key)}
                    />
                    <span className="filter-label">
                      {label}
                    </span>
                    <span className="filter-count">
                      {count}
                    </span>
                  </label>
                );
              })}
            </div>
          </div>

          {/* 可视化类型选择 */}
          <div className="control-section">
            <h3>
              <i data-feather="bar-chart-2"></i>
              {t('visualization_type')}
            </h3>
            <div className="tab-controls">
              {tabs.map(tab => (
                <button
                  key={tab.id}
                  className={`tab-btn ${activeTab === tab.id ? 'active' : ''}`}
                  onClick={() => setActiveTab(tab.id)}
                >
                  <i data-feather={getTabIcon(tab.id)}></i>
                  <div className="tab-text">
                    <div className="tab-title">{tab.name}</div>
                    <div className="tab-description">
                      {tab.description}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* 统计概览 */}
          <div className="control-section">
            <h3>
              <i data-feather="pie-chart"></i>
              {t('data_overview')}
            </h3>
            <div className="stats-overview">
              <div className="stat-card">
                <div className="stat-value">{stats.uniquePersons}</div>
                <div className="stat-label">人物</div>
              </div>
              <div className="stat-card">
                <div className="stat-value">{stats.uniquePlaces}</div>
                <div className="stat-label">地名</div>
              </div>
              <div className="stat-card">
                <div className="stat-value">{stats.uniqueTimes}</div>
                <div className="stat-label">时间</div>
              </div>
              <div className="stat-card">
                <div className="stat-value">{stats.totalEntities}</div>
                <div className="stat-label">总计</div>
              </div>
            </div>
          </div>

          {/* 当前模式说明 */}
          <div className="control-section">
            <h3>
              <i data-feather="info"></i>
              当前模式说明
            </h3>
            <div className="mode-description">
              {activeTab === 'locations' && (
                <div className="mode-info">
                  <div className="mode-icon">
                    <MapPin size={20} />
                  </div>
                  <div className="mode-content">
                    <h4>地点分布图模式</h4>
                    <p>显示文本中提及的所有地点及其出现频率</p>
                    <ul>
                      <li>• 智能地名匹配（历史/现代）</li>
                      <li>• 3D建筑物显示</li>
                      <li>• 精确的地理坐标定位</li>
                      <li>• 按出现次数大小标记</li>
                    </ul>
                  </div>
                </div>
              )}
              {activeTab === 'heatmap' && (
                <div className="mode-info">
                  <div className="mode-icon">
                    <Thermometer size={20} />
                  </div>
                  <div className="mode-content">
                    <h4>时空热力图模式</h4>
                    <p>AI分析人物在时空维度上的分布密度</p>
                    <ul>
                      <li>• AI智能时空分析</li>
                      <li>• 人物活动密度可视化</li>
                      <li>• 多维数据分析（频率、时长、强度）</li>
                      <li>• 可折叠控制面板</li>
                    </ul>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* 右侧可视化内容 */}
        <div className="visualization-content">
          <div className="visualization-display">
            {activeTab === 'timeline' && (
              <TimelineVisualization 
                annotations={documentData.annotations}
                filters={filters}
                content={documentData.content}
              />
            )}
            {activeTab === 'locations' && (
              <LocationMap 
                annotations={documentData.annotations}
                filters={filters}
              />
            )}
            {activeTab === 'heatmap' && (
              <HeatmapVisualization 
                annotations={documentData.annotations}
                filters={filters}
                content={documentData.content}
              />
            )}
            {activeTab === 'relationships' && (
              <RelationshipGraph 
                annotations={documentData.annotations}
                filters={filters}
                content={documentData.content}
              />
            )}
            {activeTab === 'chinese-history' && (
              <ChineseHistoryTimeline 
                annotations={documentData.annotations}
                filters={filters}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default DataVisualization;