// src/pages/Editor.js
import React, { useState, useEffect } from 'react';
import TextEditor from '../components/editor/TextEditor';
import EntityAnnotator from '../components/editor/EntityAnnotator';
import ClassicalAnalysis from '../components/editor/ClassicalAnalysis';
import Segmentation from '../components/editor/Segmentation';
import { useDocuments } from '../hooks/useDocuments';
import { useAuth } from '../hooks/useAuth';
import { t } from '../utils/language';
import { debounce } from '../utils';
import '../styles/pages/Editor.css';
import { useNavigate } from 'react-router-dom';

const Editor = ({ document, project, onBack, onSave }) => {
  const { updateDocument, getEntityAnnotations, addEntityAnnotation, deleteEntityAnnotation, loading: docsLoading, error: docsError } = useDocuments();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('entity');
  const [content, setContent] = useState('');
  const [author, setAuthor] = useState('');
  const [annotations, setAnnotations] = useState([]);
  const [saveStatus, setSaveStatus] = useState('');
  const [lastSaved, setLastSaved] = useState('');

  const navigate = useNavigate();

  // 初始化文档数据
  useEffect(() => {
    if (document) {
      setContent(document.content || '');
      setAuthor(document.author || '');
      
      // 加载实体标注
      loadEntityAnnotations();
    }
  }, [document]);

  // 防抖保存
  const debouncedSave = debounce(async (newContent, newAuthor) => {
    await performSave(newContent, newAuthor);
  }, 1000);

  // 内容变化处理
  const handleContentChange = (newContent) => {
    setContent(newContent);
    setSaveStatus('saving');
    debouncedSave(newContent, author);
  };

  const handleAuthorChange = (newAuthor) => {
    setAuthor(newAuthor);
    setSaveStatus('saving');
    debouncedSave(content, newAuthor);
  };

  // 执行保存
  const performSave = async (saveContent, saveAuthor) => {
    if (!document) return;

    try {
      await updateDocument(document.id, {
        content: saveContent,
        author: saveAuthor
      });
      setSaveStatus('saved');
      setLastSaved(new Date().toLocaleTimeString());
      
      // 3秒后清除保存状态
      setTimeout(() => {
        setSaveStatus('');
      }, 3000);
    } catch (error) {
      console.error('保存文档失败:', error);
      setSaveStatus('error');
    }
  };

  // 手动保存
  const handleManualSave = async () => {
    setSaveStatus('saving');
    await performSave(content, author);
    if (onSave) {
      onSave();
    }
  };

  // 加载实体标注
  const loadEntityAnnotations = async () => {
    if (!document) return;
    
    try {
      const entityAnnotations = await getEntityAnnotations(document.id);
      setAnnotations(entityAnnotations);
    } catch (error) {
      console.error('加载实体标注失败:', error);
    }
  };

  // 添加实体标注
  const handleAddAnnotation = async (annotation) => {
    if (!document) return;

    try {
      await addEntityAnnotation(document.id, annotation);
      await loadEntityAnnotations(); // 重新加载标注
    } catch (error) {
      console.error('添加实体标注失败:', error);
    }
  };

  // 删除实体标注
  const handleDeleteAnnotation = async (index) => {
    if (!document) return;

    try {
      await deleteEntityAnnotation(document.id, index);
      await loadEntityAnnotations(); // 重新加载标注
    } catch (error) {
      console.error('删除实体标注失败:', error);
    }
  };

  // 键盘快捷键
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        handleManualSave();
      }
    };

    if (typeof window !== 'undefined' && window.document) {
    window.document.addEventListener('keydown', handleKeyDown);
    
    return () => {
      window.document.removeEventListener('keydown', handleKeyDown);
    };
  }
}, [content, author, handleManualSave]);

  // 显示加载状态或错误 - 移到所有 Hook 之后
  if (docsLoading) {
    return (
      <div className="editor-container">
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <p>加载文档中...</p>
        </div>
      </div>
    );
  }

  if (docsError) {
    return (
      <div className="editor-container">
        <div className="error-container">
          <h3>加载失败</h3>
          <p>{docsError}</p>
          <button className="action-btn" onClick={onBack}>
            <i data-feather="arrow-left"></i> 返回
          </button>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="editor-container">
        <div className="error-container">
          <h3>未登录</h3>
          <p>请先登录再访问文档</p>
          <button className="action-btn" onClick={onBack}>
            <i data-feather="arrow-left"></i> 返回
          </button>
        </div>
      </div>
    );
  }

  if (!document) {
    return (
      <div className="editor-container">
        <div className="editor-error">
          <h3>文档加载失败</h3>
          <p>无法加载文档信息，请返回重试</p>
          <button className="action-btn" onClick={onBack}>
            <i data-feather="arrow-left"></i> 返回
          </button>
        </div>
      </div>
    );
  }

  const tabs = [
    { id: 'entity', name: t('entity_annotation'), component: EntityAnnotator },
    { id: 'analysis', name: t('classical_analysis'), component: ClassicalAnalysis },
    { id: 'segmentation', name: t('auto_segmentation'), component: Segmentation }
  ];

  const ActiveComponent = tabs.find(tab => tab.id === activeTab)?.component;

  return (
    <div className="editor-container">
      <div className="editor-header">
        <div className="header-top">
          <h2 className="editor-title">
            {document.name} - {t('document_editor')}
          </h2>
          
          {/* 在这里添加可视化按钮 */}
          <button 
            className="action-btn visualization-btn"
            onClick={() => {
              const documentData = {
                content: content,
                annotations: annotations,
                title: document.name,
                author: author,
                documentId: document.id // 添加文档ID
              };
              localStorage.setItem('currentDocument', JSON.stringify(documentData));
              navigate('/visualization');
            }}
            disabled={!content.trim()}
          >
            <i data-feather="bar-chart-2"></i>
            数据可视化
          </button>
        </div>
        

        <div className="editor-tabs">
          {tabs.map(tab => (
            <button
              key={tab.id}
              className={`tab-btn ${activeTab === tab.id ? 'active' : ''}`}
              onClick={() => setActiveTab(tab.id)}
            >
              {tab.name}
            </button>
          ))}
        </div>
      </div>

      <div className="editor-content">
        <div className="editor-main">
          <div className="editor-section">
            <TextEditor
              content={content}
              onChange={handleContentChange}
              placeholder={getEditorPlaceholder(activeTab)}
            />
          </div>
        </div>

        <div className="editor-sidebar">
          <div className="sidebar-section document-info">
            <h3>{t('document_name')}</h3>
            <div className="info-item">
              <label>文档名称:</label>
              <span>{document.name}</span>
            </div>
            <div className="info-item">
              <label>{t('author')}</label>
              <input
                type="text"
                value={author}
                onChange={(e) => handleAuthorChange(e.target.value)}
                placeholder={t('enter_author')}
              />
            </div>
            <div className="info-item">
              <label>{t('created_at')}</label>
              <span>{document.createdAt}</span>
            </div>
            
            <div className="save-section">
              <button 
                className="action-btn primary save-btn"
                onClick={handleManualSave}
                disabled={saveStatus === 'saving'}
              >
                <i data-feather="save"></i>
                {saveStatus === 'saving' ? '保存中...' : t('save')}
              </button>
              
              {saveStatus === 'saved' && (
                <div className="save-status success">
                  <i data-feather="check"></i>
                  <span>已保存 {lastSaved}</span>
                </div>
              )}
              
              {saveStatus === 'error' && (
                <div className="save-status error">
                  <i data-feather="alert-circle"></i>
                  <span>保存失败</span>
                </div>
              )}
              
              <div className="shortcut-hint">
                {t('shortcut_key')}
              </div>
            </div>
          </div>

          <div className="sidebar-section">
            {ActiveComponent && (
              <ActiveComponent
                documentId={document.id}
                content={content}
                annotations={annotations}
                onAddAnnotation={handleAddAnnotation}
                onDeleteAnnotation={handleDeleteAnnotation}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

// 根据激活的标签返回对应的占位符文本
const getEditorPlaceholder = (activeTab) => {
  switch (activeTab) {
    case 'entity':
      return t('enter_entity_content');
    case 'analysis':
      return t('enter_analysis_content');
    case 'segmentation':
      return t('enter_segmentation_content');
    default:
      return t('enter_content');
  }
};

export default Editor;