// src/components/editor/TextEditor.jsx - 修复格式功能，使其像Word一样工作
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { t } from '../../utils/language';
import '../../styles/components/TextEditor.css';

const TextEditor = ({ 
  content, 
  onChange, 
  placeholder = t('enter_content'),
  readOnly = false,
  textareaRef,
  documentId,
  annotations = [],
  onAddAnnotation,
  onDeleteAnnotation,
  onUpdateAnnotation
}) => {
  const [text, setText] = useState(content || '');
  const [showPreviewInline, setShowPreviewInline] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [pagesContent, setPagesContent] = useState([]);
  const editorRef = useRef(null);
  const previewToggleRef = useRef(null);
  const pageContainerRef = useRef(null);

  // 分页配置 - 调整为更像Word的布局
  const PAGE_CONFIG = {
    HEIGHT: 800, // 页面高度
    WIDTH: 850,  // 页面宽度
    CONTENT_WIDTH: 650, // 文本内容区域宽度（像Word一样居中）
    LINE_HEIGHT: 1.8,
    FONT_SIZE: 16,
    VERTICAL_PADDING: 60, // 上下边距
    HORIZONTAL_PADDING: 100 // 左右边距，文本居中需要更大的边距
  };

  // 默认实体标签
  const defaultEntityLabels = [
    { value: '人物', label: t('person'), color: '#f59e0b' },
    { value: '地名', label: t('place'), color: '#3b82f6' },
    { value: '时间', label: t('time'), color: '#8b5cf6' },
    { value: '器物', label: t('object'), color: '#22c55e' },
    { value: '概念', label: t('concept'), color: '#ec4899' },
    { value: '其他', label: t('other'), color: '#64748b' }
  ];

  const loadCustomLabels = () => {
    try {
      const saved = localStorage.getItem('entity_custom_labels');
      if (saved) {
        const customLabels = JSON.parse(saved);
        return [...defaultEntityLabels, ...customLabels];
      }
    } catch (e) {
      console.error('加载自定义标签失败:', e);
    }
    return defaultEntityLabels;
  };

  const [entityLabels, setEntityLabels] = useState(loadCustomLabels());

  // 验证标注
  const validateAnnotation = useCallback((annotation, plainText) => {
    if (!annotation || !plainText) return false;
    
    const { start, end } = annotation;
    
    if (start === undefined || end === undefined) {
      return false;
    }
    
    if (start < 0 || end < 0 || start >= end) {
      return false;
    }
    
    if (end > plainText.length) {
      return false;
    }
    
    return true;
  }, []);

  // 清理文本中的多余换行符
  const cleanTextContent = useCallback((html) => {
    if (!html) return '';
    
    if (!html.includes('<') && !html.includes('>')) {
      return html
        .replace(/\n\s*\n\s*\n+/g, '\n\n')
        .replace(/\r\n/g, '\n')
        .replace(/\r/g, '\n');
    }
    
    try {
      const tempDiv = document.createElement('div');
      tempDiv.innerHTML = html;
      
      let text = tempDiv.innerText || tempDiv.textContent || '';
      text = text
        .replace(/\n\s*\n\s*\n+/g, '\n\n')
        .replace(/\r\n/g, '\n')
        .replace(/\r/g, '\n');
      
      return text;
    } catch (error) {
      console.error('清理文本失败:', error);
      return html;
    }
  }, []);

  // 更新文本内容
  const updateContent = useCallback((newContent) => {
    const cleanedContent = cleanTextContent(newContent);
    setText(cleanedContent);
    if (onChange) {
      onChange(cleanedContent);
    }
  }, [onChange, cleanTextContent]);

  // 获取纯文本内容
  const getPlainText = useCallback((html) => {
    if (!html) return '';
    
    if (!html.includes('<') && !html.includes('>')) {
      return html
        .replace(/\n\s*\n\s*\n+/g, '\n\n')
        .replace(/\r\n/g, '\n')
        .replace(/\r/g, '\n');
    }
    
    try {
      const tempDiv = document.createElement('div');
      tempDiv.innerHTML = html;
      
      let text = tempDiv.innerText || tempDiv.textContent || '';
      text = text
        .replace(/\n\s*\n\s*\n+/g, '\n\n')
        .replace(/\r\n/g, '\n')
        .replace(/\r/g, '\n');
      
      return text;
    } catch (error) {
      console.error('解析HTML失败:', error);
      return html
        .replace(/<br\s*\/?>/gi, '\n')
        .replace(/<\/p>/gi, '\n\n')
        .replace(/<\/div>/gi, '\n')
        .replace(/<[^>]+>/g, '')
        .replace(/&nbsp;/g, ' ')
        .replace(/\n\s*\n\s*\n+/g, '\n\n');
    }
  }, []);

  // 将文本分割成页
  const splitTextIntoPages = useCallback((content, isPreview = false) => {
    if (!content) return { pages: [''], totalPages: 1 };
    
    const plainText = getPlainText(content);
    if (!plainText) return { pages: [''], totalPages: 1 };
    
    // 计算每页可容纳的字符数（估算）- 使用居中内容的宽度
    const contentWidth = PAGE_CONFIG.CONTENT_WIDTH;
    const lineHeight = PAGE_CONFIG.FONT_SIZE * PAGE_CONFIG.LINE_HEIGHT;
    const pageHeight = PAGE_CONFIG.HEIGHT - 2 * PAGE_CONFIG.VERTICAL_PADDING;
    const linesPerPage = Math.floor(pageHeight / lineHeight);
    const charsPerLine = Math.floor(contentWidth / (PAGE_CONFIG.FONT_SIZE * 0.6)); // 估算每行字符数
    const charsPerPage = linesPerPage * charsPerLine;
    
    // 如果内容很短，只有一页
    if (plainText.length <= charsPerPage) {
      return { pages: [plainText], totalPages: 1 };
    }
    
    // 按字符分割文本到各页
    const pages = [];
    let startIndex = 0;
    
    while (startIndex < plainText.length) {
      // 找到适合分页的位置（尽量在段落结束处分页）
      let endIndex = Math.min(startIndex + charsPerPage, plainText.length);
      
      if (endIndex < plainText.length) {
        // 尝试在段落结束处分页
        const lastNewLine = plainText.lastIndexOf('\n\n', endIndex);
        const lastPeriod = plainText.lastIndexOf('。', endIndex);
        const lastComma = plainText.lastIndexOf('，', endIndex);
        const lastSpace = plainText.lastIndexOf(' ', endIndex);
        
        // 优先在段落结束处分页
        if (lastNewLine > startIndex + charsPerPage * 0.5) {
          endIndex = lastNewLine + 2; // 包括换行符
        } else if (lastPeriod > startIndex + charsPerPage * 0.5) {
          endIndex = lastPeriod + 1;
        } else if (lastComma > startIndex + charsPerPage * 0.5) {
          endIndex = lastComma + 1;
        } else if (lastSpace > startIndex + charsPerPage * 0.5) {
          endIndex = lastSpace + 1;
        }
      }
      
      const pageText = plainText.substring(startIndex, endIndex);
      pages.push(pageText);
      startIndex = endIndex;
    }
    
    return { pages, totalPages: pages.length };
  }, [PAGE_CONFIG, getPlainText]);

  // 为预览模式创建分页内容
  const createPreviewPages = useCallback((plainText) => {
    if (!plainText) return { pages: [], totalPages: 1 };
    
    const { pages: textPages, totalPages } = splitTextIntoPages(plainText, true);
    
    // 为每页创建带标注的HTML
    const pagesWithAnnotations = textPages.map((pageText, pageIndex) => {
      const container = document.createElement('div');
      container.className = 'annotated-text-container';
      
      // 计算该页文本在整个文本中的位置
      const pageStart = textPages.slice(0, pageIndex).reduce((sum, page) => sum + page.length, 0);
      const pageEnd = pageStart + pageText.length;
      
      // 获取该页范围内的标注
      const pageAnnotations = annotations
        .filter(ann => {
          if (!validateAnnotation(ann, plainText)) return false;
          const overlapStart = Math.max(ann.start, pageStart);
          const overlapEnd = Math.min(ann.end, pageEnd);
          return overlapStart < overlapEnd;
        })
        .sort((a, b) => a.start - b.start);
      
      let lastIndex = 0;
      
      pageAnnotations.forEach((annotation) => {
        // 计算标注在当前页中的位置
        const annStart = Math.max(annotation.start - pageStart, 0);
        const annEnd = Math.min(annotation.end - pageStart, pageText.length);
        
        if (annStart > lastIndex) {
          const textSegment = pageText.slice(lastIndex, annStart);
          if (textSegment) {
            const textSpan = document.createElement('span');
            textSpan.className = 'plain-text';
            textSpan.textContent = textSegment;
            container.appendChild(textSpan);
          }
        }
        
        const actualText = pageText.slice(annStart, annEnd);
        if (actualText.trim()) {
          const labelConfig = entityLabels.find(l => l.value === annotation.label);
          const color = labelConfig ? labelConfig.color : '#64748b';
          
          const annotationSpan = document.createElement('span');
          annotationSpan.className = 'entity-annotation preview-mode';
          annotationSpan.style.cssText = `
            background-color: ${color}20;
            border-bottom: 2px solid ${color};
            display: inline;
            padding: 2px 4px;
            border-radius: 4px;
            margin: 0 2px;
            position: relative;
            line-height: inherit;
            font-size: 16px;
          `;
          annotationSpan.textContent = actualText;
          
          const badgeSpan = document.createElement('span');
          badgeSpan.className = 'annotation-label-badge';
          badgeSpan.style.cssText = `
            background-color: ${color};
            color: white;
            font-size: 11px;
            padding: 2px 6px;
            border-radius: 6px;
            margin-left: 6px;
            vertical-align: super;
            line-height: 1;
          `;
          badgeSpan.textContent = annotation.label;
          
          annotationSpan.appendChild(badgeSpan);
          container.appendChild(annotationSpan);
        }
        
        lastIndex = annEnd;
      });
      
      if (lastIndex < pageText.length) {
        const textSegment = pageText.slice(lastIndex);
        if (textSegment) {
          const textSpan = document.createElement('span');
          textSpan.className = 'plain-text';
          textSpan.textContent = textSegment;
          container.appendChild(textSpan);
        }
      }
      
      return container.outerHTML;
    });
    
    return { pages: pagesWithAnnotations, totalPages };
  }, [annotations, entityLabels, splitTextIntoPages, validateAnnotation]);

  // 初始化分页
  useEffect(() => {
    const newContent = content || '';
    setText(newContent);
    
    // 分割文本到页
    const plainText = getPlainText(newContent);
    let newTotalPages = 1;
    let newPagesContent = [];
    
    if (showPreviewInline) {
      const previewResult = createPreviewPages(plainText);
      newPagesContent = previewResult.pages;
      newTotalPages = previewResult.totalPages;
    } else {
      const splitResult = splitTextIntoPages(newContent, false);
      newPagesContent = splitResult.pages;
      newTotalPages = splitResult.totalPages;
    }
    
    setPagesContent(newPagesContent);
    setTotalPages(newTotalPages);
    
    if (currentPage > newTotalPages) {
      setCurrentPage(1);
    }
  }, [content, showPreviewInline]);

  // 当文本或模式变化时更新分页
  useEffect(() => {
    const plainText = getPlainText(text);
    let newTotalPages = 1;
    let newPagesContent = [];
    
    if (showPreviewInline) {
      const previewResult = createPreviewPages(plainText);
      newPagesContent = previewResult.pages;
      newTotalPages = previewResult.totalPages;
    } else {
      const splitResult = splitTextIntoPages(text, false);
      newPagesContent = splitResult.pages;
      newTotalPages = splitResult.totalPages;
    }
    
    setPagesContent(newPagesContent);
    setTotalPages(newTotalPages);
  }, [text, showPreviewInline]);

  // 当当前页变化时，确保editorRef更新内容
  useEffect(() => {
    if (!showPreviewInline && editorRef.current) {
      const currentPageContent = pagesContent[currentPage - 1] || '';
      const currentHTML = editorRef.current.innerHTML;
      
      // 只有当内容不同时才更新，避免光标闪烁
      if (currentHTML !== currentPageContent && document.activeElement !== editorRef.current) {
        editorRef.current.innerHTML = currentPageContent;
      }
    }
  }, [currentPage, pagesContent, showPreviewInline]);

  useEffect(() => {
    if (typeof window !== 'undefined' && window.feather) {
      window.feather.replace();
    }
  });

  const handleInput = (e) => {
    if (showPreviewInline) return;
    
    const newText = e.currentTarget.innerHTML;
    updateContent(newText);
    
    // 重新分割文本
    const splitResult = splitTextIntoPages(newText, false);
    setPagesContent(splitResult.pages);
    setTotalPages(splitResult.totalPages);
  };

  // 分页控制
  const goToPage = (pageNum) => {
    if (pageNum < 1 || pageNum > totalPages) return;
    setCurrentPage(pageNum);
    
    if (pageContainerRef.current) {
      pageContainerRef.current.scrollTop = 0;
    }
  };

  const goToPreviousPage = () => {
    if (currentPage > 1) {
      goToPage(currentPage - 1);
    }
  };

  const goToNextPage = () => {
    if (currentPage < totalPages) {
      goToPage(currentPage + 1);
    }
  };

  // 应用格式
  const applyFormat = (formatType) => {
    if (showPreviewInline) {
      alert('当前为预览模式，请切换到编辑模式进行格式化');
      return;
    }
    
    if (!editorRef.current) return;
    
    editorRef.current.focus();
    
    try {
      let command;
      
      switch (formatType) {
        case 'bold':
          command = 'bold';
          break;
        case 'italic':
          command = 'italic';
          break;
        case 'underline':
          command = 'underline';
          break;
        default:
          return;
      }
      
      const success = document.execCommand(command, false, null);
      
      if (success) {
        const newText = editorRef.current.innerHTML;
        updateContent(newText);
        const splitResult = splitTextIntoPages(newText, false);
        setPagesContent(splitResult.pages);
        setTotalPages(splitResult.totalPages);
      }
    } catch (error) {
      console.error('应用格式失败:', error);
      alert('应用格式失败，请重试');
    }
  };

  // 清除格式
  const clearFormat = () => {
    if (showPreviewInline) {
      alert('当前为预览模式，请切换到编辑模式进行格式化');
      return;
    }
    
    if (!editorRef.current) return;
    
    editorRef.current.focus();
    
    try {
      const success = document.execCommand('removeFormat', false, null);
      
      if (success) {
        const newText = editorRef.current.innerHTML;
        updateContent(newText);
        const splitResult = splitTextIntoPages(newText, false);
        setPagesContent(splitResult.pages);
        setTotalPages(splitResult.totalPages);
      }
    } catch (error) {
      console.error('清除格式失败:', error);
      alert('清除格式失败，请重试');
    }
  };

  // 切换预览模式
  const togglePreviewMode = () => {
    const newPreviewMode = !showPreviewInline;
    setShowPreviewInline(newPreviewMode);
    setCurrentPage(1);
    
    // 重新分割文本
    const plainText = getPlainText(text);
    if (newPreviewMode) {
      const previewResult = createPreviewPages(plainText);
      setPagesContent(previewResult.pages);
      setTotalPages(previewResult.totalPages);
    } else {
      const splitResult = splitTextIntoPages(text, false);
      setPagesContent(splitResult.pages);
      setTotalPages(splitResult.totalPages);
    }
  };

  // 渲染分页控件 - 现在放在页面底部
  const renderPagination = () => {
    if (totalPages <= 1) return null;
    
    return (
      <div className="bottom-pagination-controls">
        <div className="pagination-wrapper">
          <button 
            className="pagination-btn" 
            onClick={goToPreviousPage}
            disabled={currentPage === 1}
            title="上一页"
          >
            <i data-feather="chevron-left"></i>
          </button>
          
          <div className="page-info">
            <span className="current-page">{currentPage}</span>
            <span className="page-separator">/</span>
            <span className="total-pages">{totalPages}</span>
          </div>
          
          <button 
            className="pagination-btn" 
            onClick={goToNextPage}
            disabled={currentPage === totalPages}
            title="下一页"
          >
            <i data-feather="chevron-right"></i>
          </button>
          
          {totalPages > 5 && (
            <div className="page-jump">
              <input
                type="number"
                min="1"
                max={totalPages}
                value={currentPage}
                onChange={(e) => {
                  const page = parseInt(e.target.value);
                  if (!isNaN(page)) {
                    goToPage(Math.max(1, Math.min(totalPages, page)));
                  }
                }}
                className="page-input"
              />
            </div>
          )}
        </div>
      </div>
    );
  };

  // 渲染顶部工具栏（只保留格式工具和预览切换）
  const renderTopToolbar = () => {
    return (
      <div className="editor-toolbar">
        <div className="toolbar-left">
          <button 
            className="toolbar-btn" 
            title="粗体" 
            onClick={() => applyFormat('bold')}
            disabled={showPreviewInline}
          >
            <i data-feather="bold"></i>
          </button>
          <button 
            className="toolbar-btn" 
            title="斜体" 
            onClick={() => applyFormat('italic')}
            disabled={showPreviewInline}
          >
            <i data-feather="italic"></i>
          </button>
          <button 
            className="toolbar-btn" 
            title="下划线" 
            onClick={() => applyFormat('underline')}
            disabled={showPreviewInline}
          >
            <i data-feather="underline"></i>
          </button>
          <button 
            className="toolbar-btn" 
            title="清除格式" 
            onClick={clearFormat}
            disabled={showPreviewInline}
          >
            <i data-feather="type"></i>
          </button>
        </div>
        
        <div className="toolbar-right">
          <button
            ref={previewToggleRef}
            className={`toolbar-btn preview-toggle-btn ${showPreviewInline ? 'active' : ''}`}
            onClick={togglePreviewMode}
            title={showPreviewInline ? "切换到编辑模式" : "显示标注预览"}
          >
            <i data-feather={showPreviewInline ? "edit-2" : "eye"}></i>
          </button>
        </div>
      </div>
    );
  };

  // 渲染编辑器内容
  const renderEditorContent = () => {
    const pageStyle = {
      width: `${PAGE_CONFIG.WIDTH}px`,
      minHeight: `${PAGE_CONFIG.HEIGHT}px`,
      margin: '20px auto',
      backgroundColor: '#ffffff',
      boxShadow: '0 0 10px rgba(0, 0, 0, 0.1)',
      position: 'relative',
      overflow: 'hidden',
      display: 'flex',
      flexDirection: 'column'
    };

    const contentStyle = {
      width: `${PAGE_CONFIG.CONTENT_WIDTH}px`, // 固定内容宽度
      minHeight: '100%',
      margin: '0 auto', // 水平居中
      padding: `${PAGE_CONFIG.VERTICAL_PADDING}px 0`, // 只有上下padding
      boxSizing: 'border-box',
      fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, "Segoe UI Mono", "Roboto Mono", "Helvetica Neue", monospace',
      fontSize: `${PAGE_CONFIG.FONT_SIZE}px`,
      lineHeight: `${PAGE_CONFIG.LINE_HEIGHT}`,
      color: '#000000',
      backgroundColor: 'transparent',
      whiteSpace: 'pre-wrap',
      wordWrap: 'break-word',
      overflow: 'auto',
      border: 'none',
      outline: 'none',
      resize: 'none'
    };

    // 获取当前页内容
    const currentPageContent = pagesContent[currentPage - 1] || '';
    
    if (showPreviewInline) {
      // 预览模式 - 显示当前页的标注内容
      return (
        <div className="page" style={pageStyle}>
          <div className="page-content-wrapper">
            <div 
              className="editor-text-input preview-text"
              style={contentStyle}
              tabIndex={0}
              dangerouslySetInnerHTML={{ __html: currentPageContent || '<div class="empty-preview">暂无内容</div>' }}
            />
          </div>
        </div>
      );
    }
    
    // 编辑模式 - 显示当前页内容
    return (
      <div className="page" style={pageStyle}>
        <div className="page-content-wrapper">
          <div
            ref={(el) => {
              editorRef.current = el;
              if (textareaRef) {
                textareaRef.current = el;
              }
              // 当ref变化时设置内容
              if (el && !el.innerHTML) {
                el.innerHTML = currentPageContent;
              }
            }}
            contentEditable={!readOnly}
            onInput={handleInput}
            className="editor-text-input contenteditable"
            suppressContentEditableWarning={true}
            data-placeholder={currentPage === 1 && !currentPageContent ? placeholder : ''}
            style={contentStyle}
          />
        </div>
      </div>
    );
  };

  return (
    <div className={`text-editor ${showPreviewInline ? 'preview-mode' : 'edit-mode'}`}>
      {renderTopToolbar()}
      
      <div 
        ref={pageContainerRef}
        className="page-container"
      >
        {renderEditorContent()}
      </div>
      
      {renderPagination()}
    </div>
  );
};

export default TextEditor;