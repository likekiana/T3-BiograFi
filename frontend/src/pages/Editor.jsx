// src/pages/Editor.js
import React, { useState, useEffect, useRef } from 'react';
import TextEditor from '../components/editor/TextEditor';
import EntityAnnotator from '../components/editor/EntityAnnotator';
import RelationAnnotator from '../components/editor/RelationAnnotator';
import ClassicalAnalysis from '../components/editor/ClassicalAnalysis';
import Segmentation from '../components/editor/Segmentation';
import { useDocuments } from '../hooks/useDocuments';
import { useAuth } from '../hooks/useAuth';
import { t } from '../utils/language';
import { debounce } from '../utils';
import '../styles/pages/Editor.css';
import { useNavigate } from 'react-router-dom';

const Editor = ({ document, project, onBack, onSave }) => {
  const {
    updateDocument,
    getEntityAnnotations,
    addEntityAnnotation,
    deleteEntityAnnotation,
    getRelationAnnotations,
    addRelationAnnotation,
    deleteRelationAnnotation,
    loading: docsLoading,
    error: docsError
  } = useDocuments();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('entity');
  const [content, setContent] = useState('');
  const [author, setAuthor] = useState('');
  const [annotations, setAnnotations] = useState([]);
  const [relationAnnotations, setRelationAnnotations] = useState([]);
  const [saveStatus, setSaveStatus] = useState('');
  const [lastSaved, setLastSaved] = useState('');
  const textareaRef = useRef(null);
  const [showFindReplace, setShowFindReplace] = useState(false);
  const [showFindOptions, setShowFindOptions] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [replaceTerm, setReplaceTerm] = useState('');
  const [findOptions, setFindOptions] = useState({
    matchCase: false,
    wholeWord: false,
    selectionOnly: false
  });
  const [matchPositions, setMatchPositions] = useState([]);
  const [currentMatchIdx, setCurrentMatchIdx] = useState(-1);
  const [findMessage, setFindMessage] = useState('');
  const [toolbarHint, setToolbarHint] = useState('');
  const hintTimerRef = useRef(null);
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const [showSegmentationPanel, setShowSegmentationPanel] = useState(false);

  const navigate = useNavigate();

  // 初始化文档数据
  useEffect(() => {
    if (document) {
      setContent(document.content || '');
      setAuthor(document.author || '');
      
      // 加载实体/关系标注
      loadEntityAnnotations();
      loadRelationAnnotations();
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

  const getSelectionRange = () => {
    if (!textareaRef.current) return null;
    const { selectionStart, selectionEnd } = textareaRef.current;
    return {
      start: selectionStart,
      end: selectionEnd,
      length: selectionEnd - selectionStart
    };
  };

  const focusTextarea = () => {
    if (textareaRef.current) {
      textareaRef.current.focus();
    }
  };

  const setTemporaryHint = (message) => {
    setToolbarHint(message);
    if (hintTimerRef.current) {
      clearTimeout(hintTimerRef.current);
    }
    hintTimerRef.current = setTimeout(() => {
      setToolbarHint('');
      hintTimerRef.current = null;
    }, 2200);
  };

  useEffect(() => {
    return () => {
      if (hintTimerRef.current) {
        clearTimeout(hintTimerRef.current);
      }
    };
  }, []);

  const insertTextAtSelection = (text) => {
    const range = getSelectionRange();
    if (!range) return;

    const before = content.slice(0, range.start);
    const after = content.slice(range.end);
    const newValue = `${before}${text}${after}`;
    handleContentChange(newValue);

    requestAnimationFrame(() => {
      if (textareaRef.current) {
        const cursor = range.start + text.length;
        textareaRef.current.setSelectionRange(cursor, cursor);
      }
    });
  };

  const copyTextToClipboard = async (text) => {
    if (!text) {
      alert('请先选择文本');
      return false;
    }

    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
      } else {
        throw new Error('clipboard api unavailable');
      }
      return true;
    } catch (error) {
      console.error('复制失败', error);
      alert('复制失败，请检查浏览器权限');
      return false;
    }
  };

  const handleCopySelection = async () => {
    const range = getSelectionRange();
    if (!range || range.length === 0) {
      alert('请选择需要复制的文本');
      return;
    }

    const success = await copyTextToClipboard(content.slice(range.start, range.end));
    if (success) {
      setTemporaryHint('已复制选中文本');
    }
  };

  const handleCutSelection = async () => {
    const range = getSelectionRange();
    if (!range || range.length === 0) {
      alert('请选择需要剪切的文本');
      return;
    }

    const selectedText = content.slice(range.start, range.end);
    const success = await copyTextToClipboard(selectedText);
    if (success) {
      const newValue = `${content.slice(0, range.start)}${content.slice(range.end)}`;
      handleContentChange(newValue);
      requestAnimationFrame(() => {
        if (textareaRef.current) {
          textareaRef.current.setSelectionRange(range.start, range.start);
        }
      });
      setTemporaryHint('已剪切选中文本');
    }
  };

  const stripHtml = (text) => text.replace(/<[^>]+>/g, '');

  const handlePasteFromClipboard = async (asPlain = false) => {
    if (!navigator.clipboard?.readText) {
      alert('浏览器无法读取剪贴板，请使用快捷键粘贴');
      return;
    }

    try {
      const text = await navigator.clipboard.readText();
      if (!text) {
        alert('剪贴板中没有文本内容');
        return;
      }
      insertTextAtSelection(asPlain ? stripHtml(text) : text);
      setTemporaryHint(asPlain ? '已以纯文本粘贴' : '已粘贴剪贴板内容');
    } catch (error) {
      console.error('粘贴失败', error);
      alert('粘贴失败，请检查浏览器权限');
    }
  };

  const handleSelectAll = () => {
    focusTextarea();
    if (textareaRef.current) {
      textareaRef.current.select();
      setTemporaryHint('已选中文档全部内容');
    }
  };

  const handleDeleteSelection = () => {
    const range = getSelectionRange();
    if (!range) return;

    if (range.length === 0) {
      if (!content) return;
      if (window.confirm('未选择内容，是否清空整篇文档？')) {
        handleContentChange('');
        setTemporaryHint('已清空文档内容');
      }
      return;
    }

    const newValue = `${content.slice(0, range.start)}${content.slice(range.end)}`;
    handleContentChange(newValue);
    requestAnimationFrame(() => {
      if (textareaRef.current) {
        textareaRef.current.setSelectionRange(range.start, range.start);
      }
    });
    setTemporaryHint('已删除选中文本');
  };

  const handleAutoPunctuation = () => {
    if (!content.trim()) {
      alert('暂无文本可自动标点');
      return;
    }

    const processed = content.split('\n').map(line => {
      const leading = line.match(/^\s*/)?.[0] || '';
      const trailing = line.match(/\s*$/)?.[0] || '';
      const body = line.trim();
      if (!body) {
        return line;
      }
      if (/[。！？!?；;:,，、）)】】]$/.test(body)) {
        return line;
      }
      return `${leading}${body}。${trailing}`;
    }).join('\n');

    handleContentChange(processed);
    setTemporaryHint('已自动补全标点');
  };

  const toggleSegmentationPanel = () => {
    setShowSegmentationPanel(prev => !prev);
  };

  const escapeRegExp = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

  const isWordBoundary = (char) => {
    if (!char) return true;
    return /\s|[\p{P}\p{S}]/u.test(char);
  };

  const computeMatchPositions = () => {
    if (!searchTerm) return [];

    const baseText = content || '';
    let searchAreaStart = 0;
    let searchAreaEnd = baseText.length;

    if (findOptions.selectionOnly && textareaRef.current) {
      const { selectionStart, selectionEnd } = textareaRef.current;
      if (selectionEnd > selectionStart) {
        searchAreaStart = selectionStart;
        searchAreaEnd = selectionEnd;
      }
    }

    const targetSlice = baseText.slice(searchAreaStart, searchAreaEnd);
    const compareSlice = findOptions.matchCase ? targetSlice : targetSlice.toLowerCase();
    const needle = findOptions.matchCase ? searchTerm : searchTerm.toLowerCase();

    if (!needle) return [];

    const matches = [];
    let offset = 0;
    while (offset <= compareSlice.length) {
      const idx = compareSlice.indexOf(needle, offset);
      if (idx === -1) break;

      const absoluteStart = searchAreaStart + idx;
      const absoluteEnd = absoluteStart + searchTerm.length;

      if (findOptions.wholeWord) {
        const prevChar = baseText[absoluteStart - 1];
        const nextChar = baseText[absoluteEnd];
        if (!isWordBoundary(prevChar) || !isWordBoundary(nextChar)) {
          offset = idx + 1;
          continue;
        }
      }

      matches.push({ start: absoluteStart, end: absoluteEnd });
      offset = idx + Math.max(needle.length, 1);
    }

    return matches;
  };

  const focusMatch = (match) => {
    if (!textareaRef.current || !match) return;
    focusTextarea();
    textareaRef.current.setSelectionRange(match.start, match.end);
  };

  const handleFind = (direction = 'next') => {
    const matches = computeMatchPositions();
    setMatchPositions(matches);

    if (matches.length === 0) {
      setFindMessage('未找到匹配项');
      setCurrentMatchIdx(-1);
      return;
    }

    let nextIndex = currentMatchIdx;
    if (direction === 'next') {
      nextIndex = (currentMatchIdx + 1) % matches.length;
    } else {
      nextIndex = currentMatchIdx <= 0 ? matches.length - 1 : currentMatchIdx - 1;
    }

    setCurrentMatchIdx(nextIndex);
    focusMatch(matches[nextIndex]);
    setFindMessage(`匹配 ${nextIndex + 1}/${matches.length}`);
  };

  const handleReplaceCurrent = () => {
    if (!searchTerm) {
      alert('请输入要查找的文本');
      return;
    }

    if (!matchPositions.length || currentMatchIdx === -1) {
      handleFind('next');
      return;
    }

    const targetMatch = matchPositions[currentMatchIdx];
    if (!targetMatch) return;

    const newValue = `${content.slice(0, targetMatch.start)}${replaceTerm}${content.slice(targetMatch.end)}`;
    handleContentChange(newValue);
    setTimeout(() => {
      if (textareaRef.current) {
        const cursorEnd = targetMatch.start + replaceTerm.length;
        textareaRef.current.setSelectionRange(targetMatch.start, cursorEnd);
      }
    }, 0);

    setFindMessage('已替换当前匹配');
    setMatchPositions([]);
    setCurrentMatchIdx(-1);
  };

  const handleReplaceAll = () => {
    if (!searchTerm) {
      alert('请输入要查找的文本');
      return;
    }

    const matches = computeMatchPositions();
    if (!matches.length) {
      setFindMessage('未找到可替换内容');
      return;
    }

    let lastIndex = 0;
    let result = '';
    matches.forEach(match => {
      result += content.slice(lastIndex, match.start) + replaceTerm;
      lastIndex = match.end;
    });
    result += content.slice(lastIndex);

    handleContentChange(result);
    setFindMessage(`已替换 ${matches.length} 处`);
    setMatchPositions([]);
    setCurrentMatchIdx(-1);
  };

  const toggleFindReplacePanel = () => {
    setShowFindReplace(prev => !prev);
    setShowFindOptions(false);
    if (!showFindReplace) {
      setTimeout(() => focusTextarea(), 0);
    }
  };

  const handleToolbarMoreToggle = () => {
    setShowMoreMenu(prev => !prev);
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

  const loadRelationAnnotations = async () => {
    if (!document) return;

    try {
      const relations = await getRelationAnnotations(document.id);
      setRelationAnnotations(relations);
    } catch (error) {
      console.error('加载关系标注失败:', error);
    }
  };

  // 添加实体标注
  const handleAddAnnotation = async (annotation) => {
    if (!document) return;

    try {
      await addEntityAnnotation(document.id, annotation);
      await loadEntityAnnotations(); // 重新加载标注
      await loadRelationAnnotations(); // 实体变化后刷新关系
    } catch (error) {
      console.error('添加实体标注失败:', error);
    }
  };

  // 删除实体标注
  const handleDeleteAnnotation = async (index) => {
    if (!document) return;

    try {
      await deleteEntityAnnotation(document.id, index);
      await Promise.all([loadEntityAnnotations(), loadRelationAnnotations()]);
    } catch (error) {
      console.error('删除实体标注失败:', error);
    }
  };

  // 添加关系标注
  const handleAddRelation = async (relation) => {
    if (!document) return;

    try {
      await addRelationAnnotation(document.id, relation);
      await loadRelationAnnotations();
    } catch (error) {
      console.error('添加关系标注失败:', error);
      alert(error.message || t('add_relation_failed'));
    }
  };

  // 删除关系标注
  const handleDeleteRelation = async (relationId) => {
    if (!document) return;

    try {
      await deleteRelationAnnotation(document.id, relationId);
      await loadRelationAnnotations();
    } catch (error) {
      console.error('删除关系标注失败:', error);
      alert(error.message || t('delete_relation_failed'));
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

  useEffect(() => {
    if (typeof window !== 'undefined' && window.feather) {
      window.feather.replace();
    }
  }, [showFindReplace, showMoreMenu, showSegmentationPanel, relationAnnotations]);

  // 确保图标在任何更新后都能正确渲染
  useEffect(() => {
    const timer = setTimeout(() => {
      if (typeof window !== 'undefined' && window.feather) {
        window.feather.replace();
      }
    }, 100);
    return () => clearTimeout(timer);
  });

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
    { id: 'entity', name: t('entity_annotation') },
    { id: 'relation', name: t('relation_annotation') },
    { id: 'analysis', name: t('classical_analysis') }
  ];

  const renderSidebarSection = () => {
    switch (activeTab) {
      case 'entity':
        return (
          <EntityAnnotator
            documentId={document.id}
            content={content}
            annotations={annotations}
            onAddAnnotation={handleAddAnnotation}
            onDeleteAnnotation={handleDeleteAnnotation}
            textareaRef={textareaRef}
          />
        );
      case 'relation':
        return (
          <RelationAnnotator
            documentId={document.id}
            documentName={document.name}
            entityAnnotations={annotations}
            relations={relationAnnotations}
            onAddRelation={handleAddRelation}
            onDeleteRelation={handleDeleteRelation}
          />
        );
      case 'analysis':
        return <ClassicalAnalysis content={content} />;
      default:
        return null;
    }
  };

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

        <div className="editor-secondary-toolbar">
          <button
            className={`toolbar-btn ${showFindReplace ? 'active' : ''}`}
            title="查找与替换"
            onClick={toggleFindReplacePanel}
          >
            <i data-feather="search"></i>
            <span>查找</span>
          </button>
          <button className="toolbar-btn" title="复制" onClick={handleCopySelection}>
            <i data-feather="copy"></i>
            <span>复制</span>
          </button>
          <button className="toolbar-btn" title="剪切" onClick={handleCutSelection}>
            <i data-feather="scissors"></i>
            <span>剪切</span>
          </button>
          <button className="toolbar-btn" title="粘贴" onClick={() => handlePasteFromClipboard(false)}>
            <i data-feather="clipboard"></i>
            <span>粘贴</span>
          </button>
          <button className="toolbar-btn" title="粘贴为文本" onClick={() => handlePasteFromClipboard(true)}>
            <i data-feather="file-text"></i>
            <span>纯文本</span>
          </button>
          <button className="toolbar-btn" title="全选" onClick={handleSelectAll}>
            <i data-feather="square"></i>
            <span>全选</span>
          </button>
          <button className="toolbar-btn" title="删除" onClick={handleDeleteSelection}>
            <i data-feather="trash-2"></i>
            <span>删除</span>
          </button>
          <button className="toolbar-btn" title="自动标点" onClick={handleAutoPunctuation}>
            <i data-feather="code"></i>
            <span>标点</span>
          </button>
          <button
            className={`toolbar-btn ${showSegmentationPanel ? 'active' : ''}`}
            title="自动分词"
            onClick={toggleSegmentationPanel}
          >
            <i data-feather="divide-square"></i>
            <span>分词</span>
          </button>
          <div className="toolbar-divider" aria-hidden="true"></div>
          <div className="toolbar-more-wrapper">
            <button
              className={`toolbar-btn ${showMoreMenu ? 'active' : ''}`}
              title="显示或隐藏其他工具栏项"
              onClick={handleToolbarMoreToggle}
            >
              <i data-feather="more-horizontal"></i>
            </button>
            {showMoreMenu && (
              <div className="toolbar-more-popover">
                <div className="toolbar-more-group">
                  {['卷', '篇', '章', '节', '小节'].map(item => (
                    <button key={item} className="toolbar-more-item" onClick={() => setTemporaryHint(`已选择 ${item}`)}>
                      {item}
                    </button>
                  ))}
                </div>
                <div className="toolbar-more-group">
                  {['注', '疏', '引', '作者', '目录'].map(item => (
                    <button key={item} className="toolbar-more-item" onClick={() => setTemporaryHint(`已选择 ${item}`)}>
                      {item}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {toolbarHint && (
          <div className="toolbar-hint-banner">{toolbarHint}</div>
        )}
      </div>

      <div className="editor-content">
        <div className="editor-main">
          <div className="editor-section">
            <TextEditor
              content={content}
              onChange={handleContentChange}
              placeholder={getEditorPlaceholder(activeTab)}
              textareaRef={textareaRef}
            />

            {showFindReplace && (
              <div className="floating-panel find-replace-panel">
                <div className="panel-header">
                  <span>查找和替换</span>
                  <button className="panel-close" onClick={toggleFindReplacePanel} title="关闭">
                    ×
                  </button>
                </div>

                <div className="panel-body">
                  <label>寻找</label>
                  <div className="input-with-controls">
                    <input
                      type="text"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      placeholder="输入要查找的内容"
                    />
                    <div className="input-controls">
                      <button onClick={() => handleFind('prev')} title="上一个">
                        <i data-feather="chevron-up"></i>
                      </button>
                      <button onClick={() => handleFind('next')} title="下一个">
                        <i data-feather="chevron-down"></i>
                      </button>
                    </div>
                  </div>

                  <label>替换为</label>
                  <input
                    type="text"
                    value={replaceTerm}
                    onChange={(e) => setReplaceTerm(e.target.value)}
                    placeholder="替换后的内容"
                  />

                  <div className="panel-actions">
                    <button className="primary" onClick={() => handleFind('next')}>寻找</button>
                    <button onClick={handleReplaceCurrent}>替换</button>
                    <button onClick={handleReplaceAll}>替换全部</button>
                  </div>

                  <div className="panel-footer">
                    <button
                      className="options-trigger"
                      onClick={() => setShowFindOptions(prev => !prev)}
                    >
                      <i data-feather="settings"></i>
                      {showFindOptions ? '隐藏选项' : '更多选项'}
                    </button>
                    {findMessage && <span className="find-status">{findMessage}</span>}
                  </div>

                  {showFindOptions && (
                    <div className="find-options">
                      <label>
                        <input
                          type="checkbox"
                          checked={findOptions.matchCase}
                          onChange={(e) => setFindOptions(prev => ({ ...prev, matchCase: e.target.checked }))}
                        />
                        大小写匹配
                      </label>
                      <label>
                        <input
                          type="checkbox"
                          checked={findOptions.wholeWord}
                          onChange={(e) => setFindOptions(prev => ({ ...prev, wholeWord: e.target.checked }))}
                        />
                        全字匹配
                      </label>
                      <label>
                        <input
                          type="checkbox"
                          checked={findOptions.selectionOnly}
                          onChange={(e) => setFindOptions(prev => ({ ...prev, selectionOnly: e.target.checked }))}
                        />
                        在选中范围内搜索
                      </label>
                    </div>
                  )}
                </div>
              </div>
            )}

            {showSegmentationPanel && (
              <div className="floating-panel segmentation-panel">
                <div className="panel-header">
                  <span>自动分词</span>
                  <button className="panel-close" onClick={toggleSegmentationPanel} title="关闭">
                    ×
                  </button>
                </div>
                <div className="panel-scroll">
                  <Segmentation content={content} />
                </div>
              </div>
            )}
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
            {renderSidebarSection()}
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
    case 'relation':
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