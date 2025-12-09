// src/components/visualization/ProjectVisualization.jsx
import React, { useState, useEffect, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { t } from '../../utils/language';
import TimelineVisualization from './TimelineVisualization';
import LocationMap from './LocationMap';
import RelationshipGraph from './RelationshipGraph';
import HeatmapVisualization from './HeatmapVisualization';
import ChineseHistoryTimeline from './ChineseHistoryTimeline';
import { Thermometer, MapPin } from 'react-feather';
import { useDocuments } from '../../hooks/useDocuments';
import { documentService } from '../../services/documentService';
import '../../styles/components/Visualization/DataVisualization.css';

const ProjectVisualization = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('timeline');
  const [filters, setFilters] = useState({
    persons: true,
    places: true,
    times: true,
    objects: true,
    concepts: true
  });
  const [allAnnotations, setAllAnnotations] = useState([]);
  const [allDocuments, setAllDocuments] = useState([]);
  const [annotationsLoading, setAnnotationsLoading] = useState(false);
  
  // 从location.state获取projectId
  const projectId = location.state?.projectId;
  const projectName = location.state?.projectName || '未知项目';
  
  // 使用useDocuments钩子获取项目的所有文档
  const { documents, loading, error, refresh } = useDocuments(projectId);
  
  // 收集所有文档的实体标注（包括从API获取）
  const collectAllAnnotations = useCallback(async () => {
    if (!documents || documents.length === 0) {
      setAllAnnotations([]);
      setAllDocuments([]);
      return;
    }
    
    setAnnotationsLoading(true);
    
    // 收集所有文档的实体标注
    const annotations = [];
    const allDocs = [...documents];
    
    // 为每个文档获取完整的实体标注
    for (const doc of allDocs) {
      console.log('Processing document:', doc.id, doc.name);
      
      try {
        // 调用API获取该文档的实体标注
        const entityAnnotations = await documentService.getEntityAnnotations(doc.id);
        console.log('Got entity annotations from API:', entityAnnotations.length, 'for document', doc.id);
        
        // 更新文档的实体标注
        doc.entityAnnotations = entityAnnotations;
        
        // 处理实体标注
        if (Array.isArray(doc.entityAnnotations) && doc.entityAnnotations.length > 0) {
          console.log('Found', doc.entityAnnotations.length, 'entity annotations in document', doc.id);
          
          doc.entityAnnotations.forEach((ann, index) => {
            console.log('Processing entity annotation', index, ':', ann);
            
            // 确保标注有必要的字段
            if (ann.label && (ann.text || (ann.start !== undefined && ann.end !== undefined))) {
              const text = ann.text || (doc.content || '').slice(ann.start, ann.end);
              annotations.push({
                ...ann,
                id: ann.id || `${doc.id}-entity-${index}`,
                documentId: doc.id,
                documentName: doc.name,
                text: text,
                start: ann.start || 0,
                end: ann.end || text.length
              });
            }
          });
        }
        
        // 处理关系标注（如果有的话）
        if (Array.isArray(doc.relationAnnotations) && doc.relationAnnotations.length > 0) {
          console.log('Found', doc.relationAnnotations.length, 'relation annotations in document', doc.id);
          
          doc.relationAnnotations.forEach((rel, index) => {
            console.log('Processing relation annotation', index, ':', rel);
            
            // 关系标注中可能包含实体信息
            if (rel.entity1 && rel.entity1.label && rel.entity1.text) {
              annotations.push({
                ...rel.entity1,
                id: `${doc.id}-relation-${index}-entity1`,
                label: rel.entity1.label || '实体',
                documentId: doc.id,
                documentName: doc.name,
                isFromRelation: true
              });
            }
            if (rel.entity2 && rel.entity2.label && rel.entity2.text) {
              annotations.push({
                ...rel.entity2,
                id: `${doc.id}-relation-${index}-entity2`,
                label: rel.entity2.label || '实体',
                documentId: doc.id,
                documentName: doc.name,
                isFromRelation: true
              });
            }
          });
        }
      } catch (err) {
        console.error('Error getting entity annotations for document', doc.id, ':', err);
        // 继续处理其他文档
      }
    }
    
    console.log('Total annotations collected:', annotations.length);
    setAllAnnotations(annotations);
    setAllDocuments(allDocs);
    setAnnotationsLoading(false);
  }, [documents]);
  
  useEffect(() => {
    if (!projectId) {
      alert('没有找到项目ID');
      navigate('/dashboard');
      return;
    }
    
    // 刷新文档列表
    refresh();
  }, [projectId, navigate, refresh]);
  
  useEffect(() => {
    // 当文档列表更新时，重新收集所有标注
    collectAllAnnotations();
  }, [collectAllAnnotations]);
  
  const handleFilterChange = (filterType) => {
    setFilters(prev => ({
      ...prev,
      [filterType]: !prev[filterType]
    }));
  };
  
  const extractEntitiesByType = (type) => {
    if (!allAnnotations) return [];
    return allAnnotations.filter(ann => ann.label === type);
  };
  
  // 项目级统计信息
  const getStats = () => {
    if (!allAnnotations || allAnnotations.length === 0) return {};
    
    const totalEntities = allAnnotations.length;
    const uniquePersons = new Set(extractEntitiesByType('人物').map(p => p.text)).size;
    const uniquePlaces = new Set(extractEntitiesByType('地名').map(p => p.text)).size;
    const uniqueTimes = new Set(extractEntitiesByType('时间').map(p => p.text)).size;
    const totalDocuments = allDocuments.length;
    
    return {
      totalEntities,
      uniquePersons,
      uniquePlaces,
      uniqueTimes,
      totalDocuments
    };
  };
  
  if (loading) {
    return <div className="loading">{t('loading')}</div>;
  }
  
  if (error) {
    return <div className="error">{t('error')}: {error}</div>;
  }
  
  if (annotationsLoading) {
    return <div className="loading">{t('loading_entity_annotations')}</div>;
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
  
  // 合并所有文档内容，用于可视化组件
  const combinedContent = allDocuments.map(doc => doc.content || '').join('\n\n');
  
  return (
    <div className="data-visualization">
      {/* 顶部标题栏 */}
      <div className="visualization-header">
        <button 
          className="back-btn"
          onClick={() => window.history.back()}
        >
          <i data-feather="arrow-left"></i>
          {t('back_to_project')}
        </button>
        
        <div className="document-info">
          <h2>{projectName} - {t('project_visualization')}</h2>
          <p className="document-author">{t('total_documents')}: {allDocuments.length}</p>
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
              {t('project_overview')}
            </h3>
            <div className="stats-overview">
              <div className="stat-card">
                <div className="stat-value">{stats.totalDocuments}</div>
                <div className="stat-label">{t('documents')}</div>
              </div>
              <div className="stat-card">
                <div className="stat-value">{stats.uniquePersons}</div>
                <div className="stat-label">{t('persons')}</div>
              </div>
              <div className="stat-card">
                <div className="stat-value">{stats.uniquePlaces}</div>
                <div className="stat-label">{t('places')}</div>
              </div>
              <div className="stat-card">
                <div className="stat-value">{stats.uniqueTimes}</div>
                <div className="stat-label">{t('times')}</div>
              </div>
              <div className="stat-card">
                <div className="stat-value">{stats.totalEntities}</div>
                <div className="stat-label">{t('total_entities')}</div>
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
                annotations={allAnnotations}
                filters={filters}
                content={combinedContent}
                isProjectView={true}
              />
            )}
            {activeTab === 'locations' && (
              <LocationMap 
                annotations={allAnnotations}
                filters={filters}
                isProjectView={true}
              />
            )}
            {activeTab === 'heatmap' && (
              <HeatmapVisualization 
                annotations={allAnnotations}
                filters={filters}
                content={combinedContent}
                isProjectView={true}
              />
            )}
            {activeTab === 'relationships' && (
              <RelationshipGraph 
                annotations={allAnnotations}
                filters={filters}
                content={combinedContent}
                isProjectView={true}
              />
            )}
            {activeTab === 'chinese-history' && (
              <ChineseHistoryTimeline 
                annotations={allAnnotations}
                filters={filters}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProjectVisualization;