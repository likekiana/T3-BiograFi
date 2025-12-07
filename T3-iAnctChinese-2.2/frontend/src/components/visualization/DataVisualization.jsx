// src/components/visualization/DataVisualization.jsx
import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { t } from '../../utils/language';
import TimelineVisualization from './TimelineVisualization';
import LocationMap from './LocationMap';
import RelationshipGraph from './RelationshipGraph';
import '../../styles/components/Visualization/DataVisualization.css';

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
    { id: 'timeline', name: t('timeline'), icon: 'clock', description: t('timeline_description') },
    { id: 'locations', name: t('locations'), icon: 'map-pin', description: t('locations_description') },
    { id: 'relationships', name: t('relationships'), icon: 'git-branch', description: t('relationships_description') }
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
                  <i data-feather={tab.icon}></i>
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
            {activeTab === 'relationships' && (
              <RelationshipGraph 
                annotations={documentData.annotations}
                filters={filters}
                content={documentData.content}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default DataVisualization;