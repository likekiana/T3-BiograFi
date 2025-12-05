// src/pages/Editor.js
import React, { useState, useEffect, useRef } from 'react';
import TextEditor from '../components/editor/TextEditor';
import EntityAnnotator from '../components/editor/EntityAnnotator';
import RelationAnnotator from '../components/editor/RelationAnnotator';
import ClassicalAnalysis from '../components/editor/ClassicalAnalysis';
import Segmentation from '../components/editor/Segmentation'; // 导入内联分词组件
import ResizableDivider from '../components/common/ResizableDivider';
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

  const navigate = useNavigate();
  const featherRendered = useRef(false);

  const { leftWidth, dividerProps } = ResizableDivider({
    leftMinWidth: 300,
    rightMinWidth: 300,
    defaultLeftWidth: 50
  });

  // 修复函数声明位置
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
    if (typeof window === 'undefined') return;

    const handleResize = () => {
      setIsNarrow(window.innerWidth <= 1024);
    };

    handleResize();
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  // 初始化文档数据
  useEffect(() => {
    if (document) {
      setContent(document.content || '');
      setDocumentName(document.name || '');
      setAuthor(document.author || '');

      // 加载实体/关系标注
      loadEntityAnnotations();
      loadRelationAnnotations();
    }
  }, [document]);

  // 防抖保存
  const debouncedSave = debounce(async (newContent, newDocName, newAuthor) => {
    await performSave(newContent, newDocName, newAuthor);
  }, 1000);

  // 内容变化处理
  const handleContentChange = (newContent) => {
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
    if (!document) return;

    try {
      await updateDocument(document.id, {
        content: saveContent,
        name: saveDocName,
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
    await performSave(content, documentName, author);
    if (onSave) {
      onSave();
    }
  };

  const getSelectionRange = () => {
    if (!textareaRef.current) return null;
    const textareaElement = textareaRef.current;
    // 确保是DOM元素且有setSelectionRange方法
    if (textareaElement.nodeType !== 1 || typeof textareaElement.setSelectionRange !== 'function') return null;
    const { selectionStart, selectionEnd } = textareaElement;
    return {
      start: selectionStart,
      end: selectionEnd,
      length: selectionEnd - selectionStart
    };
  };

  const focusTextarea = () => {
    if (textareaRef.current && textareaRef.current.nodeType === 1 && typeof textareaRef.current.focus === 'function') {
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
      if (textareaRef.current &&
        textareaRef.current.nodeType === 1 &&
        typeof textareaRef.current.setSelectionRange === 'function') {
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
        if (textareaRef.current &&
          textareaRef.current.nodeType === 1 &&
          typeof textareaRef.current.setSelectionRange === 'function') {
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
    if (textareaRef.current &&
      textareaRef.current.nodeType === 1 &&
      typeof textareaRef.current.select === 'function') {
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
      if (textareaRef.current &&
        textareaRef.current.nodeType === 1 &&
        typeof textareaRef.current.setSelectionRange === 'function') {
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

    // 括号配对映射
    const openBrackets = {
      '(': ')',
      '（': '）',
      '[': ']',
      '【': '】',
      '"': '"',
      '"': '"',
      "'": "'",
      '\u2018': '\u2019'
    };
    const closeBrackets = {};
    Object.entries(openBrackets).forEach(([open, close]) => {
      closeBrackets[close] = open;
    });

    // 检查括号是否配对
    const checkBrackets = (text) => {
      const stack = [];
      for (let i = 0; i < text.length; i++) {
        const char = text[i];
        if (openBrackets[char]) {
          stack.push(char);
        } else if (closeBrackets[char]) {
          const lastOpen = stack[stack.length - 1];
          if (lastOpen && openBrackets[lastOpen] === char) {
            stack.pop();
          } else {
            // 不匹配的闭合括号，可能是多余的，不处理
            // 或者需要补全开始括号（这种情况较少，暂不处理）
          }
        }
      }
      if (stack.length > 0) {
        // 有未闭合的开始括号，返回需要补全的闭合括号
        return { needsClosing: true, missingBracket: openBrackets[stack[stack.length - 1]] };
      }
      return { needsClosing: false, missingBracket: null };
    };

    // 判断应该添加句号还是逗号
    const determinePunctuation = (text, isLastLine) => {
      // 如果已经有句号、问号、感叹号等结束标点，不添加
      if (/[。！？!?；;]$/.test(text)) {
        return '';
      }

      // 如果以逗号结尾，不添加（保持原样）
      if (/[,，]$/.test(text)) {
        return '';
      }

      // 判断句子特征
      const trimmed = text.trim();
      const length = trimmed.length;

      // 常见的句末语气词，通常用句号
      const sentenceEnders = /[也矣乎哉焉耳欤]$/;
      if (sentenceEnders.test(trimmed)) {
        return '。';
      }

      // 如果句子中有逗号，说明是句子中间，末尾应该用句号
      if (trimmed.includes('，') || trimmed.includes(',')) {
        return '。';
      }

      // 如果句子较短（少于8个字符），通常是完整短句，用句号
      if (length < 8) {
        return '。';
      }

      // 如果句子较长（20个字符以上）且没有逗号，需要判断是否应该用逗号
      if (length >= 20) {
        // 检查是否有明显的并列结构或连接词（如"而"、"且"、"又"、"亦"等）
        const conjunctionPattern = /[而且又或及与亦乃则]/;
        // 检查句子后半部分是否有连接词
        const lastHalf = trimmed.slice(Math.floor(length / 2));
        if (conjunctionPattern.test(lastHalf) && !isLastLine) {
          // 如果有连接词且不是最后一行，可能用逗号表示未完
          return '，';
        }
        // 检查是否有明显的停顿词（如"曰"、"云"、"谓"等）
        const pausePattern = /[曰云谓道]/;
        if (pausePattern.test(trimmed) && !isLastLine) {
          // 如果有停顿词，可能在后面用逗号
          const pauseIndex = trimmed.search(pausePattern);
          if (pauseIndex > 0 && pauseIndex < length - 5) {
            return '，';
          }
        }
        // 否则用句号
        return '。';
      }

      // 中等长度句子（10-19字符），根据上下文判断
      if (length >= 10 && length < 20) {
        // 检查是否有连接词
        const conjunctionPattern = /[而且又或及与]/;
        if (conjunctionPattern.test(trimmed) && !isLastLine) {
          // 如果句子中间有连接词，可能在末尾用逗号
          const conjunctionIndex = trimmed.search(conjunctionPattern);
          if (conjunctionIndex > 2 && conjunctionIndex < length - 3) {
            return '，';
          }
        }
        return '。';
      }

      // 默认情况：用句号
      return '。';
    };

    const lines = content.split('\n');
    const processed = lines.map((line, index) => {
      const leading = line.match(/^\s*/)?.[0] || '';
      const trailing = line.match(/\s*$/)?.[0] || '';
      const body = line.trim();

      if (!body) {
        return line;
      }

      // 检查括号配对
      const bracketStatus = checkBrackets(body);
      if (bracketStatus.needsClosing) {
        const punctuation = bracketStatus.missingBracket;
        return `${leading}${body}${punctuation}${trailing}`;
      }

      // 判断标点
      const isLastLine = index === lines.length - 1;
      const punctuation = determinePunctuation(body, isLastLine);

      if (punctuation) {
        return `${leading}${body}${punctuation}${trailing}`;
      }

      return line;
    }).join('\n');

    handleContentChange(processed);
    setTemporaryHint('已自动补全标点');
  };

  // AI分词功能
  const handleAISegmentation = () => {
    if (!content || !content.trim()) {
      alert('请输入要分词的文本');
      return;
    }

    // 这里将调用分词服务并更新编辑器内容
    setTemporaryHint('正在执行AI分词...');
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

    if (findOptions.selectionOnly && textareaRef.current && textareaRef.current.nodeType === 1) {
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

    const textEditor = textareaRef.current;
    if (typeof textEditor.setSelectionRange === 'function') {
      textEditor.setSelectionRange(match.start, match.end);

      // 滚动到匹配位置
      setTimeout(() => {
        const element = document.querySelector('.find-current-highlight');
        if (element) {
          element.scrollIntoView({
            behavior: 'smooth',
            block: 'center',
            inline: 'center'
          });
        }
      }, 50);
    }
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
      if (textareaRef.current &&
        textareaRef.current.nodeType === 1 &&
        typeof textareaRef.current.setSelectionRange === 'function') {
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

  // 删除实体标注 - 修改为根据标注对象查找索引
  const handleDeleteAnnotation = async (annotation) => {
    if (!document) return;

    try {
      // 查找标注的索引
      const currentAnnotations = annotations || [];
      const annotationIndex = currentAnnotations.findIndex(ann =>
        ann.id === annotation.id ||
        (ann.start === annotation.start &&
          ann.end === annotation.end &&
          ann.label === annotation.label &&
          ann.text === annotation.text)
      );

      if (annotationIndex === -1) {
        console.warn('未找到要删除的标注:', annotation);
        return;
      }

      await deleteEntityAnnotation(document.id, annotationIndex);
      await Promise.all([loadEntityAnnotations(), loadRelationAnnotations()]);
    } catch (error) {
      console.error('删除实体标注失败:', error);
    }
  };

  // 更新实体标注
  const handleUpdateAnnotation = async (oldAnnotation, newAnnotation) => {
    if (!document) return;

    try {
      // 先删除旧的
      const currentAnnotations = annotations || [];
      const annotationIndex = currentAnnotations.findIndex(ann =>
        ann.id === oldAnnotation.id ||
        (ann.start === oldAnnotation.start &&
          ann.end === oldAnnotation.end &&
          ann.label === oldAnnotation.label &&
          ann.text === oldAnnotation.text)
      );

      if (annotationIndex !== -1) {
        await deleteEntityAnnotation(document.id, annotationIndex);
      }

      // 再添加新的
      await addEntityAnnotation(document.id, newAnnotation);

      // 重新加载标注
      await Promise.all([loadEntityAnnotations(), loadRelationAnnotations()]);
    } catch (error) {
      console.error('更新实体标注失败:', error);
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

  // AI分词应用回调
  const handleApplySegmentation = (segmentedText) => {
    // 将分词后的文本设置为编辑器内容
    handleContentChange(segmentedText);
    setTemporaryHint('AI分词已完成');
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

  // 统一管理feather图标渲染 - 只在客户端渲染
  useEffect(() => {
    // 只在客户端执行
    if (typeof window === 'undefined' || !window.feather) {
      return;
    }

    const renderFeatherIcons = () => {
      // 避免重复渲染
      if (featherRendered.current) {
        return;
      }

      // 延迟渲染确保DOM已更新
      const timer = setTimeout(() => {
        try {
          // 只在客户端环境下使用document
          if (typeof document !== 'undefined' && document.querySelectorAll) {
            // 只渲染尚未渲染的图标
            const icons = document.querySelectorAll('i[data-feather]:not([data-rendered="true"])');
            if (icons.length > 0) {
              window.feather.replace();

              // 标记已渲染的图标
              icons.forEach(icon => {
                icon.setAttribute('data-rendered', 'true');
              });

              featherRendered.current = true;
            }
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
  }, [activeTab]); // 只在选项卡切换时重新渲染

  // 当内容变化时重置渲染标记
  useEffect(() => {
    featherRendered.current = false;
  }, [content]);

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

  if (!document) {
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
            documentId={document.id}
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
            documentId={document.id}
            documentName={document.name}
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
            {document.name} - {t('document_editor')}
          </h2>

          {/* 可视化按钮 */}
          <button
            className="visualization-btn"
            onClick={() => {
              const documentData = {
                content: content,
                annotations: annotations,
                title: document.name,
                author: author,
                documentId: document.id
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
          <button className="toolbar-btn" title="粘贴" onClick={() => handlePasteFromClipboard(false)}>
            <i data-feather="clipboard" data-rendered="false"></i>
            <span>粘贴</span>
          </button>
          <button className="toolbar-btn" title="粘贴为文本" onClick={() => handlePasteFromClipboard(true)}>
            <i data-feather="file-text" data-rendered="false"></i>
            <span>纯文本</span>
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

          <div className="toolbar-divider" aria-hidden="true"></div>
          <div className="toolbar-more-wrapper">
            <button
              className={`toolbar-btn ${showMoreMenu ? 'active' : ''}`}
              title="显示或隐藏其他工具栏项"
              onClick={handleToolbarMoreToggle}
            >
              <i data-feather="more-horizontal" data-rendered="false"></i>
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
          <div className="sidebar-section document-info">
            <div className="document-info-compact">
              <div className="info-group">
                <label>文档:</label>
                <input
                  type="text"
                  value={documentName}
                  onChange={(e) => handleDocumentNameChange(e.target.value)}
                  placeholder="请输入文档名称"
                  className="author-input-compact"
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
            </div>

            {saveStatus === 'saved' && (
              <div className="save-status success">
                <i data-feather="check" data-rendered="false"></i>
                <span>已保存 {lastSaved}</span>
              </div>
            )}

            {saveStatus === 'error' && (
              <div className="save-status error">
                <i data-feather="alert-circle" data-rendered="false"></i>
                <span>保存失败</span>
              </div>
            )}
          </div>

          <div className="sidebar-section">
            {renderSidebarSection()}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Editor;