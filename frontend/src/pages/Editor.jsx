// src/pages/Editor.js
import React, { useState, useEffect, useRef, useCallback } from 'react';
import TextEditor from '../components/editor/TextEditor';
import EntityAnnotator from '../components/editor/EntityAnnotator';
import RelationAnnotator from '../components/editor/RelationAnnotator';
import ClassicalAnalysis from '../components/editor/ClassicalAnalysis';
import Segmentation from '../components/editor/Segmentation';
import ResizableDivider from '../components/common/ResizableDivider';
import { useDocuments } from '../hooks/useDocuments';
import { useAuth } from '../hooks/useAuth';
import { t } from '../utils/language';
import { debounce } from '../utils';
import '../styles/pages/Editor.css';
import { useNavigate } from 'react-router-dom';

const Editor = ({ document: doc, project, onBack, onSave }) => {
  const {
    updateDocument,
    deleteDocument,
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
  const [isNarrow, setIsNarrow] = useState(false);
  const [documentName, setDocumentName] = useState('');
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
  const [readOnly, setReadOnly] = useState(false);
  
  // 撤销功能相关状态
  const [history, setHistory] = useState([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const maxHistoryLength = 50;

  // 检查是否在浏览器环境中
  const isBrowser = typeof window !== 'undefined';
  
  // 获取当前选区
  const getCurrentSelection = () => {
    if (!isBrowser || !document.getSelection) return null;
    
    const selection = document.getSelection();
    if (selection.rangeCount > 0) {
      const range = selection.getRangeAt(0);
      return {
        text: selection.toString(),
        range: range,
        selection: selection
      };
    }
    return null;
  };

  // 设置选区
  const setSelection = (range) => {
    if (!isBrowser || !document.getSelection) return;
    
    const selection = document.getSelection();
    selection.removeAllRanges();
    selection.addRange(range);
  };

  // 从HTML获取纯文本（安全的SSR版本）
  const getPlainTextFromHtml = (html) => {
    if (!html) return '';
    
    // 如果不在浏览器环境中，使用简单的正则替换
    if (!isBrowser) {
      return html
        .replace(/<[^>]*>/g, '')
        .replace(/&nbsp;/g, ' ')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&amp;/g, '&')
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .replace(/\r\n/g, '\n')
        .replace(/\r/g, '\n')
        .replace(/\n\s*\n/g, '\n\n');
    }
    
    // 在浏览器环境中使用DOM解析
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = html;
    
    let text = tempDiv.textContent || tempDiv.innerText || '';
    text = text.replace(/\r\n/g, '\n')
               .replace(/\r/g, '\n')
               .replace(/\n\s*\n/g, '\n\n');
    
    return text;
  };

  // 添加当前状态到历史记录
  const addToHistory = useCallback(() => {
    const currentState = {
      content,
      annotations: [...annotations],
      relationAnnotations: [...relationAnnotations]
    };

    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push(currentState);
    
    if (newHistory.length > maxHistoryLength) {
      newHistory.shift();
    }
    
    setHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);
  }, [content, annotations, relationAnnotations, history, historyIndex]);

  // 撤销操作
  const handleUndo = useCallback(() => {
    if (historyIndex <= 0) return;
    
    const newIndex = historyIndex - 1;
    const prevState = history[newIndex];
    
    if (prevState) {
      setContent(prevState.content);
      setAnnotations([...prevState.annotations]);
      setRelationAnnotations([...prevState.relationAnnotations]);
      setHistoryIndex(newIndex);
      setTemporaryHint('已撤销操作');
    }
  }, [history, historyIndex]);

  const navigate = useNavigate();
  const featherRendered = useRef(false);

  const { leftWidth, dividerProps } = ResizableDivider({
    leftMinWidth: 300,
    rightMinWidth: 300,
    defaultLeftWidth: 50
  });

  const getEditorPlaceholder = (activeTab) => {
    switch (activeTab) {
      case 'entity':
        return t('enter_entity_content');
      case 'relation':
        return t('enter_entity_content');
      case 'analysis':
        return t('enter_analysis_content');
      default:
        return t('enter_content');
    }
  };

  useEffect(() => {
    if (!isBrowser) return;

    const handleResize = () => {
      setIsNarrow(window.innerWidth <= 1024);
    };

    handleResize();
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, [isBrowser]);

  // 初始化文档数据
  useEffect(() => {
    if (doc) {
      setContent(doc.content || '');
      setDocumentName(doc.name || '');
      setAuthor(doc.author || '');
      loadEntityAnnotations();
      loadRelationAnnotations();
    }
  }, [doc]);

  // 防抖保存
  const debouncedSave = debounce(async (newContent, newDocName, newAuthor) => {
    await performSave(newContent, newDocName, newAuthor);
  }, 1000);

  // 内容变化处理
  const handleContentChange = (newContent) => {
    if (newContent !== content) {
      addToHistory();
    }
    setContent(newContent);
    setSaveStatus('saving');
    debouncedSave(newContent, documentName, author);
  };

  const handleDocumentNameChange = (newDocName) => {
    setDocumentName(newDocName);
    setSaveStatus('saving');
    debouncedSave(content, newDocName, author);
  };

  const handleAuthorChange = (newAuthor) => {
    setAuthor(newAuthor);
    setSaveStatus('saving');
    debouncedSave(content, documentName, newAuthor);
  };

  // 执行保存
  const performSave = async (saveContent, saveDocName, saveAuthor) => {
    if (!doc) return;

    try {
      await updateDocument(doc.id, {
        content: saveContent,
        name: saveDocName,
        author: saveAuthor
      });
      setSaveStatus('saved');
      setLastSaved(new Date().toLocaleTimeString());

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
    await performSave(content, documentName, author);
    if (onSave) {
      onSave();
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

  // ========== 查找与替换功能 ==========
  
  // 计算匹配位置
  const computeMatchPositions = () => {
    if (!searchTerm || !isBrowser) return [];
    
    const baseText = content || '';
    let searchAreaStart = 0;
    let searchAreaEnd = baseText.length;

    const targetSlice = baseText.slice(searchAreaStart, searchAreaEnd);
    const compareSlice = findOptions.matchCase ? targetSlice : targetSlice.toLowerCase();
    const needle = findOptions.matchCase ? searchTerm : searchTerm.toLowerCase();

    if (!needle) return [];

    const matches = [];
    let offset = 0;
    
    // 辅助函数：检查单词边界
    const isWordBoundary = (char) => {
      if (!char) return true;
      return /\s|[.,!?;:，。！？；："'()\[\]{}]/.test(char);
    };

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

      matches.push({ 
        start: absoluteStart, 
        end: absoluteEnd,
        text: baseText.substring(absoluteStart, absoluteEnd)
      });
      offset = idx + Math.max(needle.length, 1);
    }

    return matches;
  };

  // 查找下一个
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
    
    // 滚动到匹配位置
    const match = matches[nextIndex];
    if (match) {
      highlightMatch(match);
      setFindMessage(`匹配 ${nextIndex + 1}/${matches.length}`);
    }
  };

  // 高亮显示匹配项
  const highlightMatch = (match) => {
    if (!match || !textareaRef.current || !isBrowser) return;
    
    const editor = textareaRef.current;
    const textContent = getPlainTextFromHtml(editor.innerHTML);
    
    try {
      // 尝试滚动到大致位置
      const lineHeight = 24;
      const estimatedScrollTop = Math.max(0, (match.start / 100) * lineHeight - 200);
      editor.scrollTop = estimatedScrollTop;
      
      // 创建高亮效果
      const selection = document.getSelection();
      const range = document.createRange();
      
      // 简化处理：只滚动到位置，不实际高亮
      setTimeout(() => {
        editor.focus();
      }, 100);
    } catch (error) {
      console.error('高亮匹配项失败:', error);
    }
  };

  // 替换当前匹配
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

    const newContent = content.substring(0, targetMatch.start) + 
                      replaceTerm + 
                      content.substring(targetMatch.end);
    
    handleContentChange(newContent);
    setFindMessage('已替换当前匹配');
    
    // 重新计算匹配
    const newMatches = computeMatchPositions();
    setMatchPositions(newMatches);
    if (newMatches.length === 0) {
      setCurrentMatchIdx(-1);
    }
  };

  // 替换全部
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

    let result = content;
    // 从后往前替换，避免索引变化
    matches.sort((a, b) => b.start - a.start).forEach(match => {
      result = result.substring(0, match.start) + 
               replaceTerm + 
               result.substring(match.end);
    });

    handleContentChange(result);
    setFindMessage(`已替换 ${matches.length} 处`);
    setMatchPositions([]);
    setCurrentMatchIdx(-1);
  };

  const toggleFindReplacePanel = () => {
    setShowFindReplace(prev => !prev);
    setShowFindOptions(false);
    if (!showFindReplace) {
      setTimeout(() => {
        if (textareaRef.current) {
          textareaRef.current.focus();
        }
      }, 0);
    }
  };

  // ========== 复制功能 ==========
  const handleCopySelection = async () => {
    if (!isBrowser || !navigator.clipboard) {
      alert('您的浏览器不支持剪贴板功能');
      return;
    }

    const selection = getCurrentSelection();
    if (!selection || !selection.text) {
      alert('请先选择要复制的文本');
      return;
    }

    try {
      await navigator.clipboard.writeText(selection.text);
      setTemporaryHint('已复制选中文本');
    } catch (error) {
      console.error('复制失败:', error);
      
      // 降级方案
      try {
        const success = document.execCommand('copy');
        if (success) {
          setTemporaryHint('已复制选中文本');
        } else {
          alert('复制失败，请检查浏览器权限');
        }
      } catch (fallbackError) {
        alert('复制失败，请手动复制或检查浏览器权限');
      }
    }
  };

  // ========== 剪切功能 ==========
  const handleCutSelection = async () => {
    if (!isBrowser || !navigator.clipboard) {
      alert('您的浏览器不支持剪贴板功能');
      return;
    }

    const selection = getCurrentSelection();
    if (!selection || !selection.text) {
      alert('请先选择要剪切的文本');
      return;
    }

    try {
      // 先复制到剪贴板
      await navigator.clipboard.writeText(selection.text);
      
      // 然后从文档中删除
      if (selection.range) {
        selection.range.deleteContents();
        
        // 更新内容
        if (textareaRef.current) {
          const newHtml = textareaRef.current.innerHTML;
          const newText = getPlainTextFromHtml(newHtml);
          handleContentChange(newText);
        }
        
        setTemporaryHint('已剪切选中文本');
      }
    } catch (error) {
      console.error('剪切失败:', error);
      
      // 降级方案
      try {
        const copySuccess = document.execCommand('copy');
        const cutSuccess = document.execCommand('cut');
        
        if (copySuccess && cutSuccess) {
          setTemporaryHint('已剪切选中文本');
        } else {
          alert('剪切失败，请检查浏览器权限');
        }
      } catch (fallbackError) {
        alert('剪切失败，请手动操作或检查浏览器权限');
      }
    }
  };

  // ========== 粘贴功能 ==========
  const handlePasteFromClipboard = async (asPlain = false) => {
    if (!isBrowser || !navigator.clipboard) {
      alert('您的浏览器不支持剪贴板功能');
      return;
    }

    try {
      let text = await navigator.clipboard.readText();
      
      if (!text) {
        alert('剪贴板中没有文本内容');
        return;
      }

      if (asPlain) {
        // 转换为纯文本
        text = text.replace(/<[^>]*>/g, '')
                   .replace(/&nbsp;/g, ' ')
                   .replace(/&lt;/g, '<')
                   .replace(/&gt;/g, '>')
                   .replace(/&amp;/g, '&')
                   .replace(/&quot;/g, '"')
                   .replace(/&#39;/g, "'");
      }

      // 插入到当前选区
      const selection = getCurrentSelection();
      if (selection && selection.range) {
        // 删除当前选区内容
        selection.range.deleteContents();
        
        // 创建文本节点并插入
        const textNode = document.createTextNode(text);
        selection.range.insertNode(textNode);
        
        // 将光标移到插入的文本之后
        selection.range.setStartAfter(textNode);
        selection.range.setEndAfter(textNode);
        setSelection(selection.range);
        
        // 更新内容
        if (textareaRef.current) {
          const newHtml = textareaRef.current.innerHTML;
          const newText = getPlainTextFromHtml(newHtml);
          handleContentChange(newText);
        }
        
        setTemporaryHint(asPlain ? '已以纯文本粘贴' : '已粘贴剪贴板内容');
      } else {
        // 没有选区，直接添加到文档末尾
        const newContent = content + '\n' + text;
        handleContentChange(newContent);
        setTemporaryHint(asPlain ? '已以纯文本粘贴' : '已粘贴到文档末尾');
      }
    } catch (error) {
      console.error('粘贴失败:', error);
      
      // 降级方案
      try {
        if (asPlain) {
          alert('纯文本粘贴需要使用快捷键 Ctrl+Shift+V');
        } else {
          const success = document.execCommand('paste');
          if (!success) {
            alert('粘贴失败，请使用快捷键 Ctrl+V 或检查浏览器权限');
          }
        }
      } catch (fallbackError) {
        alert('粘贴失败，请使用快捷键 Ctrl+V 或检查浏览器权限');
      }
    }
  };

  // ========== 全选功能 ==========
  const handleSelectAll = () => {
    if (textareaRef.current && isBrowser) {
      const editor = textareaRef.current;
      
      try {
        const selection = window.getSelection();
        const range = document.createRange();
        
        range.selectNodeContents(editor);
        selection.removeAllRanges();
        selection.addRange(range);
        
        setTemporaryHint('已选中文档全部内容');
      } catch (error) {
        console.error('全选失败:', error);
        // 降级方案
        editor.focus();
        if (typeof editor.select === 'function') {
          editor.select();
          setTemporaryHint('已选中文档全部内容');
        }
      }
    }
  };

  // ========== 删除功能 ==========
  const handleDeleteSelection = () => {
    const selection = getCurrentSelection();
    
    if (selection && selection.text) {
      // 删除选中的内容
      selection.range.deleteContents();
      
      // 更新内容
      if (textareaRef.current) {
        const newHtml = textareaRef.current.innerHTML;
        const newText = getPlainTextFromHtml(newHtml);
        handleContentChange(newText);
      }
      
      setTemporaryHint('已删除选中文本');
    } else {
      // 没有选中内容，询问是否清空文档
      if (content && content.trim()) {
        if (window.confirm('未选择内容，是否清空整篇文档？')) {
          handleContentChange('');
          setTemporaryHint('已清空文档内容');
        }
      } else {
        setTemporaryHint('文档为空，无需清空');
      }
    }
  };

  // ========== 自动标点功能 ==========
  const handleAutoPunctuation = () => {
    if (!content.trim()) {
      alert('暂无文本可自动标点');
      return;
    }

    // 简化的自动标点逻辑
    const punctuationRules = [
      { pattern: /([^。！？;；])(\n|$)/g, replacement: '$1。$2' },
      { pattern: /([，,])([^ \n])/g, replacement: '$1 $2' },
      { pattern: /([^.,])([,，])([^ \n])/g, replacement: '$1$2 $3' }
    ];

    let processed = content;
    punctuationRules.forEach(rule => {
      processed = processed.replace(rule.pattern, rule.replacement);
    });

    handleContentChange(processed);
    setTemporaryHint('已自动补全标点');
  };

  // ========== 更多菜单功能 ==========
  const handleToolbarMoreToggle = () => {
    setShowMoreMenu(prev => !prev);
  };

  const handleMoreItemClick = (item) => {
    if (!isBrowser) return;
    
    // 插入结构标记
    const markers = {
      '卷': '【卷】',
      '篇': '【篇】',
      '章': '【章】',
      '节': '【节】',
      '小节': '【小节】',
      '注': '【注】',
      '疏': '【疏】',
      '引': '【引】',
      '作者': '【作者】',
      '目录': '【目录】'
    };

    const marker = markers[item] || `【${item}】`;
    
    // 插入到当前选区
    const selection = getCurrentSelection();
    if (selection && selection.range) {
      const textNode = document.createTextNode(marker);
      selection.range.insertNode(textNode);
      
      // 更新光标位置
      selection.range.setStartAfter(textNode);
      selection.range.setEndAfter(textNode);
      setSelection(selection.range);
      
      // 更新内容
      if (textareaRef.current) {
        const newHtml = textareaRef.current.innerHTML;
        const newText = getPlainTextFromHtml(newHtml);
        handleContentChange(newText);
      }
    } else {
      // 插入到文档末尾
      const newContent = content + '\n' + marker;
      handleContentChange(newContent);
    }
    
    setTemporaryHint(`已插入${item}标记`);
    setShowMoreMenu(false);
  };

  // ========== 其他原有函数 ==========
  
  const loadEntityAnnotations = async () => {
    if (!doc) return;
    try {
      const entityAnnotations = await getEntityAnnotations(doc.id);
      setAnnotations(entityAnnotations);
    } catch (error) {
      console.error('加载实体标注失败:', error);
    }
  };

  const loadRelationAnnotations = async () => {
    if (!doc) return;
    try {
      const relations = await getRelationAnnotations(doc.id);
      setRelationAnnotations(relations);
    } catch (error) {
      console.error('加载关系标注失败:', error);
    }
  };

  const handleAddAnnotation = async (annotation) => {
    if (!doc) return;
    try {
      await addEntityAnnotation(doc.id, annotation);
      await loadEntityAnnotations();
      await loadRelationAnnotations();
      addToHistory();
    } catch (error) {
      console.error('添加实体标注失败:', error);
    }
  };

  const handleDeleteAnnotation = async (annotation) => {
    if (!doc || !annotation) return;
    try {
      await deleteEntityAnnotation(doc.id, annotation);
      await Promise.all([loadEntityAnnotations(), loadRelationAnnotations()]);
      addToHistory();
    } catch (error) {
      console.error('删除实体标注失败:', error);
      alert(`删除标注失败: ${error.message || '未知错误'}`);
    }
  };

  const handleUpdateAnnotation = async (oldAnnotation, newAnnotation) => {
    if (!doc || !oldAnnotation || !newAnnotation) return;
    try {
      await deleteEntityAnnotation(doc.id, oldAnnotation);
      await addEntityAnnotation(doc.id, newAnnotation);
      await Promise.all([loadEntityAnnotations(), loadRelationAnnotations()]);
      addToHistory();
    } catch (error) {
      console.error('更新实体标注失败:', error);
      alert(`更新标注失败: ${error.message || '未知错误'}`);
    }
  };

  const handleAddRelation = async (relation) => {
    if (!doc) return;
    try {
      await addRelationAnnotation(doc.id, relation);
      await loadRelationAnnotations();
      addToHistory();
    } catch (error) {
      console.error('添加关系标注失败:', error);
      alert(error.message || t('add_relation_failed'));
    }
  };

  const handleDeleteRelation = async (relationId) => {
    if (!doc) return;
    try {
      await deleteRelationAnnotation(doc.id, relationId);
      await loadRelationAnnotations();
      addToHistory();
    } catch (error) {
      console.error('删除关系标注失败:', error);
      alert(error.message || t('delete_relation_failed'));
    }
  };

  const handleApplySegmentation = (segmentedText) => {
    handleContentChange(segmentedText);
    setTemporaryHint('AI分词已完成');
  };

  // 键盘快捷键
  useEffect(() => {
    if (!isBrowser) return;

    const handleKeyDown = (e) => {
      // 检查是否在编辑器内
      const isInEditor = e.target.closest('.editor-text-input') || 
                         e.target.closest('.contenteditable') ||
                         e.target.closest('.page');
      
      if (isInEditor) {
        // 处理编辑器内的快捷键
        if ((e.ctrlKey || e.metaKey) && e.key === 'a') {
          e.preventDefault();
          handleSelectAll();
          return;
        }
        
        if ((e.ctrlKey || e.metaKey) && e.key === 'f') {
          e.preventDefault();
          toggleFindReplacePanel();
          return;
        }
      }

      // 全局快捷键
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        handleManualSave();
      }
      
      if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
        e.preventDefault();
        handleUndo();
      }
    };

    window.document.addEventListener('keydown', handleKeyDown);
    return () => {
      window.document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isBrowser, content, author, handleManualSave, handleUndo]);

  // 统一管理feather图标渲染
  useEffect(() => {
    if (!isBrowser || !window.feather) {
      return;
    }

    const renderFeatherIcons = () => {
      if (featherRendered.current) {
        return;
      }

      const timer = setTimeout(() => {
        try {
          const icons = document.querySelectorAll('i[data-feather]:not([data-rendered="true"])');
          if (icons.length > 0) {
            window.feather.replace();
            icons.forEach(icon => {
              icon.setAttribute('data-rendered', 'true');
            });
            featherRendered.current = true;
          }
        } catch (error) {
          console.error('渲染feather图标失败:', error);
        }
      }, 150);

      return timer;
    };

    const timer = renderFeatherIcons();
    return () => {
      if (timer) clearTimeout(timer);
      featherRendered.current = false;
    };
  }, [isBrowser, activeTab]);

  useEffect(() => {
    featherRendered.current = false;
  }, [content]);

  // 显示加载状态或错误
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
            <i data-feather="arrow-left" data-rendered="false"></i> 返回
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
            <i data-feather="arrow-left" data-rendered="false"></i> 返回
          </button>
        </div>
      </div>
    );
  }

  if (!doc) {
    return (
      <div className="editor-container">
        <div className="editor-error">
          <h3>文档加载失败</h3>
          <p>无法加载文档信息，请返回重试</p>
          <button className="action-btn" onClick={onBack}>
            <i data-feather="arrow-left" data-rendered="false"></i> 返回
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
            documentId={doc.id}
            content={content}
            annotations={annotations}
            onAddAnnotation={handleAddAnnotation}
            onDeleteAnnotation={handleDeleteAnnotation}
            onUpdateAnnotation={handleUpdateAnnotation}
            textareaRef={textareaRef}
            readOnly={readOnly}
          />
        );
      case 'relation':
        return (
          <RelationAnnotator
            documentId={doc.id}
            documentName={doc.name}
            entityAnnotations={annotations}
            relations={relationAnnotations}
            onAddRelation={handleAddRelation}
            onDeleteRelation={handleDeleteRelation}
            readOnly={readOnly}
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
            {doc.name} - {t('document_editor')}
          </h2>

          {/* 可视化按钮 */}
          <button
            className="visualization-btn"
            onClick={() => {
              const documentData = {
                content: content,
                annotations: annotations,
                title: doc.name,
                author: author,
                documentId: doc.id
              };
              localStorage.setItem('currentDocument', JSON.stringify(documentData));
              navigate('/visualization');
            }}
            disabled={!content.trim()}
          >
            <i data-feather="bar-chart-2" data-rendered="false"></i>
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

        {/* 文档信息行 */}
        <div className="editor-document-info-row">
          <div className="document-info-compact">
            <div className="info-group">
              <label>文档:</label>
              <input
                type="text"
                value={documentName}
                onChange={(e) => handleDocumentNameChange(e.target.value)}
                placeholder="请输入文档名称"
                className="author-input-compact"
                style={{ width: '250px' }}
              />
            </div>
            <div className="info-group">
              <label>作者:</label>
              <input
                type="text"
                value={author}
                onChange={(e) => handleAuthorChange(e.target.value)}
                placeholder={t('enter_author')}
                className="author-input-compact"
              />
            </div>
            <button
              className="save-btn-compact"
              onClick={handleManualSave}
              disabled={saveStatus === 'saving'}
              title={saveStatus === 'saving' ? '保存中...' : '保存文档'}
            >
              <i data-feather="save" data-rendered="false"></i>
              {saveStatus === 'saving' ? '保存中' : t('save')}
            </button>
            
            <button
              className="delete-btn-compact"
              onClick={async () => {
                if (window.confirm('确定要删除此文档吗？删除后无法恢复。')) {
                  try {
                    await deleteDocument(doc.id);
                    if (onBack) {
                      onBack();
                    } else {
                      navigate('/projects');
                    }
                  } catch (error) {
                    console.error('删除文档失败:', error);
                    alert(`删除文档失败: ${error.message || '未知错误'}`);
                  }
                }
              }}
              title="删除文档"
            >
              <i data-feather="trash-2" data-rendered="false"></i>
              删除文档
            </button>
            
            {saveStatus === 'saved' && (
              <div className="save-status success compact">
                <i data-feather="check" data-rendered="false"></i>
                <span>已保存 {lastSaved}</span>
              </div>
            )}

            {saveStatus === 'error' && (
              <div className="save-status error compact">
                <i data-feather="alert-circle" data-rendered="false"></i>
                <span>保存失败</span>
              </div>
            )}
          </div>
        </div>

        {/* 工具栏按钮行 */}
        <div className="editor-secondary-toolbar">
          <button
            className={`toolbar-btn ${showFindReplace ? 'active' : ''}`}
            title="查找与替换"
            onClick={toggleFindReplacePanel}
          >
            <i data-feather="search" data-rendered="false"></i>
            <span>查找</span>
          </button>
          <button className="toolbar-btn" title="复制" onClick={handleCopySelection}>
            <i data-feather="copy" data-rendered="false"></i>
            <span>复制</span>
          </button>
          <button className="toolbar-btn" title="剪切" onClick={handleCutSelection}>
            <i data-feather="scissors" data-rendered="false"></i>
            <span>剪切</span>
          </button>
          <button className="toolbar-btn" title="全选" onClick={handleSelectAll}>
            <i data-feather="square" data-rendered="false"></i>
            <span>全选</span>
          </button>
          <button className="toolbar-btn" title="删除" onClick={handleDeleteSelection}>
            <i data-feather="trash-2" data-rendered="false"></i>
            <span>删除</span>
          </button>
          <button className="toolbar-btn" title="自动标点" onClick={handleAutoPunctuation}>
            <i data-feather="code" data-rendered="false"></i>
            <span>标点</span>
          </button>

          {/* AI分词按钮 - 内联版本 */}
          <Segmentation
            content={content}
            onApplySegmentation={handleApplySegmentation}
          />
          
        </div>

        {toolbarHint && (
          <div className="toolbar-hint-banner">{toolbarHint}</div>
        )}
      </div>

      <div className="editor-content">
        <div
          className="editor-main"
          style={isNarrow ? undefined : { width: `${leftWidth}%` }}
        >
          <div className="editor-section">
            <TextEditor
              content={content}
              onChange={handleContentChange}
              placeholder={getEditorPlaceholder(activeTab)}
              textareaRef={textareaRef}
              readOnly={readOnly}
              documentId={doc?.id}
              annotations={annotations}
              onAddAnnotation={handleAddAnnotation}
              onDeleteAnnotation={handleDeleteAnnotation}
              onUpdateAnnotation={handleUpdateAnnotation}
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
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          handleFind('next');
                        }
                      }}
                      placeholder="输入要查找的内容"
                      autoFocus
                    />
                    <div className="input-controls">
                      <button onClick={() => handleFind('prev')} title="上一个">
                        <i data-feather="chevron-up" data-rendered="false"></i>
                      </button>
                      <button onClick={() => handleFind('next')} title="下一个">
                        <i data-feather="chevron-down" data-rendered="false"></i>
                      </button>
                    </div>
                  </div>

                  <label>替换为</label>
                  <input
                    type="text"
                    value={replaceTerm}
                    onChange={(e) => setReplaceTerm(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        handleReplaceCurrent();
                      }
                    }}
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
                      <i data-feather="settings" data-rendered="false"></i>
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
          </div>
        </div>

        {!isNarrow && (
          <div {...dividerProps}>
            <div className="divider-handle"></div>
          </div>
        )}

        <div
          className="editor-sidebar"
          style={isNarrow ? undefined : { width: `${100 - leftWidth}%` }}
        >
          <div className="sidebar-section">
            {renderSidebarSection()}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Editor;