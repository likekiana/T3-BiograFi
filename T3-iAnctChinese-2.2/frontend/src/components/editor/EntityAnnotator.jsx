import React, { useState, useEffect, useRef, useCallback } from 'react';
import { t } from '../../utils/language';
import { aiService } from '../../services/aiService';
import '../../styles/components/EntityAnnotator.css';

const EntityAnnotator = ({ 
  documentId, 
  content, 
  annotations = [], 
  onAddAnnotation,
  onDeleteAnnotation,
  onUpdateAnnotation,
  textareaRef,
  readOnly = false
}) => {
  // 预定义的标签和颜色
  const defaultEntityLabels = [
    { value: '人物', label: t('person'), color: '#f59e0b' },
    { value: '地名', label: t('place'), color: '#3b82f6' },
    { value: '时间', label: t('time'), color: '#8b5cf6' },
    { value: '器物', label: t('object'), color: '#22c55e' },
    { value: '概念', label: t('concept'), color: '#ec4899' },
    { value: '其他', label: t('other'), color: '#64748b' }
  ];

  // 从 localStorage 加载自定义标签或使用默认值
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

  const [selectedLabel, setSelectedLabel] = useState('人物');
  const [selectedText, setSelectedText] = useState('');
  const [selectionStart, setSelectionStart] = useState(-1);
  const [selectionEnd, setSelectionEnd] = useState(-1);
  const [autoAnnotating, setAutoAnnotating] = useState(false);
  const [isSelecting, setIsSelecting] = useState(false);
  const [currentHoverAnnotation, setCurrentHoverAnnotation] = useState(null);
  const [editingAnnotation, setEditingAnnotation] = useState(null);
  const [showQuickActions, setShowQuickActions] = useState(false);
  const [quickActionsPosition, setQuickActionsPosition] = useState({ x: 0, y: 0 });
  const [showCustomLabelModal, setShowCustomLabelModal] = useState(false);
  const [customLabelInput, setCustomLabelInput] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [labelToDelete, setLabelToDelete] = useState(null);
  const [entityLabels, setEntityLabels] = useState(loadCustomLabels());
  
  const annotatedTextRef = useRef(null);
  const quickActionsRef = useRef(null);
  const selectionCheckInterval = useRef(null);

  // 获取文本内容（去除HTML标签但保留格式）
  const getPlainText = useCallback((html) => {
    if (!html) return '';
    
    // 如果是纯文本，直接返回
    if (!html.includes('<') && !html.includes('>')) {
      return html;
    }
    
    try {
      const tempDiv = document.createElement('div');
      tempDiv.innerHTML = html;
      
      // 使用 innerText 保留换行和格式
      let text = tempDiv.innerText || tempDiv.textContent || '';
      
      // 清理多余的空白字符但保留换行
      text = text
        .replace(/\r\n/g, '\n')        // 统一换行符
        .replace(/\r/g, '\n')          // 统一换行符
        .replace(/[ \t]+/g, ' ')       // 合并多个空格和制表符
        .replace(/^[ \t]+/gm, '')      // 移除行首空白
        .replace(/[ \t]+$/gm, '');     // 移除行尾空白
      
      return text;
    } catch (error) {
      console.error('解析HTML失败:', error);
      // 回退到简单替换
      return html
        .replace(/<br\s*\/?>/gi, '\n')
        .replace(/<\/p>/gi, '\n\n')
        .replace(/<\/div>/gi, '\n')
        .replace(/<[^>]+>/g, '')
        .replace(/&nbsp;/g, ' ');
    }
  }, []);

  // 生成随机颜色
  const generateRandomColor = () => {
    const hue = Math.floor(Math.random() * 360);
    const saturation = 70 + Math.floor(Math.random() * 20); // 70-90%
    const lightness = 50 + Math.floor(Math.random() * 20); // 50-70%
    return `hsl(${hue}, ${saturation}%, ${lightness}%)`;
  };

  // 保存自定义标签到 localStorage
  const saveCustomLabels = (labels) => {
    try {
      // 只保存自定义标签，排除默认标签
      const customOnly = labels.filter(label => 
        !defaultEntityLabels.some(defaultLabel => defaultLabel.value === label.value)
      );
      localStorage.setItem('entity_custom_labels', JSON.stringify(customOnly));
    } catch (e) {
      console.error('保存自定义标签失败:', e);
    }
  };

  // 添加自定义标签
  const handleAddCustomLabel = () => {
    if (!customLabelInput.trim()) {
      alert('请输入标签名称');
      return;
    }

    const newLabel = {
      value: customLabelInput.trim(),
      label: customLabelInput.trim(),
      color: generateRandomColor(),
      isCustom: true
    };

    // 检查是否已存在
    if (entityLabels.some(label => label.value === newLabel.value)) {
      alert('该标签已存在');
      return;
    }

    const updatedLabels = [...entityLabels, newLabel];
    setEntityLabels(updatedLabels);
    saveCustomLabels(updatedLabels);
    setSelectedLabel(newLabel.value);
    setCustomLabelInput('');
    setShowCustomLabelModal(false);
  };

  // 删除自定义标签
  const handleDeleteCustomLabel = (labelValue) => {
    // 检查是否有标注使用该标签
    const isInUse = annotations.some(ann => ann.label === labelValue);
    
    if (isInUse) {
      alert('该标签已被使用，无法删除');
      return;
    }

    const updatedLabels = entityLabels.filter(label => label.value !== labelValue);
    setEntityLabels(updatedLabels);
    saveCustomLabels(updatedLabels);
    
    // 如果当前选中的是被删除的标签，切换到默认标签
    if (selectedLabel === labelValue) {
      setSelectedLabel('人物');
    }
    
    setShowDeleteConfirm(false);
    setLabelToDelete(null);
  };

  // 确认删除自定义标签
  const confirmDeleteCustomLabel = (labelValue, e) => {
    if (e) e.stopPropagation();
    
    // 检查是否有标注使用该标签
    const isInUse = annotations.some(ann => ann.label === labelValue);
    
    if (isInUse) {
      alert('该标签已被标注使用，无法删除。请先删除所有相关标注。');
      return;
    }

    setLabelToDelete(labelValue);
    setShowDeleteConfirm(true);
  };

  // 重置选择
  const resetSelection = useCallback(() => {
    setSelectedText('');
    setSelectionStart(-1);
    setSelectionEnd(-1);
    setIsSelecting(false);
    setEditingAnnotation(null);
    setShowQuickActions(false);
    
    if (textareaRef?.current && !readOnly) {
      textareaRef.current.focus();
      const selection = window.getSelection();
      selection.removeAllRanges();
    }
  }, [textareaRef, readOnly]);

  // 监听文本选择的变化
  const checkSelection = useCallback(() => {
    if (!textareaRef?.current || readOnly) return;
    
    const editor = textareaRef.current;
    const selection = window.getSelection();
    
    if (!selection.rangeCount || selection.isCollapsed || 
        !editor.contains(selection.anchorNode)) {
      if (isSelecting) {
        setIsSelecting(false);
        setSelectedText('');
        setSelectionStart(-1);
        setSelectionEnd(-1);
        setShowQuickActions(false);
        setEditingAnnotation(null);
      }
      return;
    }
    
    const range = selection.getRangeAt(0);
    const selectedHTML = range.cloneContents();
    const tempDiv = document.createElement('div');
    tempDiv.appendChild(selectedHTML);
    const selectedPlainText = tempDiv.textContent || tempDiv.innerText || '';
    
    if (!selectedPlainText.trim()) {
      setIsSelecting(false);
      setSelectedText('');
      setSelectionStart(-1);
      setSelectionEnd(-1);
      setShowQuickActions(false);
      return;
    }
    
    const plainText = getPlainText(editor.innerHTML);
    const selectedText = selectedPlainText;
    
    let start = -1;
    let end = -1;
    
    const tempRange = document.createRange();
    tempRange.selectNodeContents(editor);
    tempRange.setEnd(range.startContainer, range.startOffset);
    
    const beforeRange = tempRange.cloneContents();
    const beforeDiv = document.createElement('div');
    beforeDiv.appendChild(beforeRange);
    const beforeText = beforeDiv.textContent || beforeDiv.innerText || '';
    
    start = beforeText.length;
    end = start + selectedText.length;
    
    // 检查是否与现有标注重叠
    const overlappingAnnotation = annotations.find(ann => 
      (start >= ann.start && start < ann.end) ||
      (end > ann.start && end <= ann.end) ||
      (start <= ann.start && end >= ann.end)
    );

    if (overlappingAnnotation) {
      setSelectedText(overlappingAnnotation.text);
      setSelectionStart(overlappingAnnotation.start);
      setSelectionEnd(overlappingAnnotation.end);
      setSelectedLabel(overlappingAnnotation.label);
      setEditingAnnotation(overlappingAnnotation);
      setIsSelecting(true);
      
      const rect = range.getBoundingClientRect();
      if (rect.width > 0 && rect.height > 0) {
        const menuHeight = 40;
        const yPosition = rect.top - menuHeight - 10;
        
        setQuickActionsPosition({
          x: rect.left + rect.width / 2,
          y: Math.max(20, yPosition)
        });
        setShowQuickActions(true);
      }
      return;
    }

    setSelectedText(selectedText);
    setSelectionStart(start);
    setSelectionEnd(end);
    setIsSelecting(true);
    setEditingAnnotation(null);
    
    const rect = range.getBoundingClientRect();
    if (rect.width > 0 && rect.height > 0) {
      const menuHeight = 40;
      const yPosition = rect.top - menuHeight - 10;
      
      setQuickActionsPosition({
        x: rect.left + rect.width / 2,
        y: Math.max(20, yPosition)
      });
      setShowQuickActions(true);
    }
  }, [textareaRef, content, annotations, readOnly, isSelecting, getPlainText]);

  // 设置定时检查选择状态
  useEffect(() => {
    if (readOnly) return;
    
    const handleSelectionChange = () => {
      setTimeout(() => {
        checkSelection();
      }, 10);
    };
    
    const handleMouseUp = (e) => {
      if (textareaRef?.current && textareaRef.current.contains(e.target)) {
        setTimeout(() => {
          checkSelection();
        }, 50);
      }
    };
    
    if (textareaRef?.current) {
      const editor = textareaRef.current;
      editor.addEventListener('mouseup', handleMouseUp);
      editor.addEventListener('keyup', handleSelectionChange);
      editor.addEventListener('click', handleSelectionChange);
    }
    
    document.addEventListener('selectionchange', handleSelectionChange);
    
    selectionCheckInterval.current = setInterval(() => {
      if (textareaRef?.current && document.activeElement === textareaRef.current) {
        checkSelection();
      }
    }, 300);
    
    return () => {
      if (selectionCheckInterval.current) {
        clearInterval(selectionCheckInterval.current);
      }
      
      if (textareaRef?.current) {
        const editor = textareaRef.current;
        editor.removeEventListener('mouseup', handleMouseUp);
        editor.removeEventListener('keyup', handleSelectionChange);
        editor.removeEventListener('click', handleSelectionChange);
      }
      
      document.removeEventListener('selectionchange', handleSelectionChange);
    };
  }, [textareaRef, checkSelection, readOnly]);

  // 添加标注（使用当前选中的标签）
  const handleAddAnnotation = useCallback(() => {
    if (!selectedText || selectionStart === -1 || selectionEnd === -1 || readOnly) {
      alert(t('select_text_first'));
      return;
    }

    const existingAnnotation = annotations.find(ann => 
      ann.start === selectionStart && ann.end === selectionEnd
    );

    if (existingAnnotation) {
      if (window.confirm(`该位置已有标注"${existingAnnotation.text}"(${existingAnnotation.label})，是否替换？`)) {
        if (onUpdateAnnotation) {
          onUpdateAnnotation(existingAnnotation, {
            start: selectionStart,
            end: selectionEnd,
            label: selectedLabel,
            text: selectedText,
            id: existingAnnotation.id
          });
        }
      }
      return;
    }

    if (onAddAnnotation) {
      const newAnnotation = {
        start: selectionStart,
        end: selectionEnd,
        label: selectedLabel,
        text: selectedText,
        id: `ann_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        createdAt: new Date().toISOString()
      };
      onAddAnnotation(newAnnotation);
    }

    resetSelection();
    setShowQuickActions(false);
  }, [selectedText, selectionStart, selectionEnd, selectedLabel, annotations, onAddAnnotation, onUpdateAnnotation, readOnly, resetSelection]);

  // 快速添加标注
  const handleQuickAddAnnotation = useCallback((label) => {
    if (!selectedText || selectionStart === -1 || selectionEnd === -1 || readOnly) {
      alert(t('select_text_first'));
      return;
    }

    const existingAnnotation = annotations.find(ann => 
      ann.start === selectionStart && ann.end === selectionEnd
    );

    if (existingAnnotation) {
      if (window.confirm(`该位置已有标注"${existingAnnotation.text}"(${existingAnnotation.label})，是否替换？`)) {
        if (onUpdateAnnotation) {
          onUpdateAnnotation(existingAnnotation, {
            start: selectionStart,
            end: selectionEnd,
            label: label,
            text: selectedText,
            id: existingAnnotation.id
          });
        }
      }
      return;
    }

    if (onAddAnnotation) {
      const newAnnotation = {
        start: selectionStart,
        end: selectionEnd,
        label: label,
        text: selectedText,
        id: `ann_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        createdAt: new Date().toISOString()
      };
      onAddAnnotation(newAnnotation);
    }

    resetSelection();
    setShowQuickActions(false);
  }, [selectedText, selectionStart, selectionEnd, annotations, onAddAnnotation, onUpdateAnnotation, readOnly, resetSelection]);

  // 更新现有标注
  const handleUpdateAnnotationLabel = useCallback((newLabel) => {
    if (!editingAnnotation || readOnly) return;
    
    if (onUpdateAnnotation) {
      onUpdateAnnotation(editingAnnotation, {
        ...editingAnnotation,
        label: newLabel
      });
    }
    
    resetSelection();
    setShowQuickActions(false);
  }, [editingAnnotation, onUpdateAnnotation, readOnly, resetSelection]);

  // 删除标注
  const handleDeleteAnnotation = useCallback((annotation) => {
    if (readOnly) return;
    
    if (onDeleteAnnotation) {
      onDeleteAnnotation(annotation);
    }
    
    resetSelection();
    setShowQuickActions(false);
  }, [onDeleteAnnotation, readOnly, resetSelection]);

  // 验证标注是否有效
  const validateAnnotation = useCallback((annotation, plainText) => {
    if (!annotation || !plainText) return false;
    
    const { start, end } = annotation;
    
    // 检查基本属性
    if (start === undefined || end === undefined) {
      console.warn('标注缺少位置信息:', annotation);
      return false;
    }
    
    // 检查位置是否有效
    if (start < 0 || end < 0 || start >= end) {
      console.warn('标注位置无效:', annotation);
      return false;
    }
    
    // 检查是否超出文本范围
    if (end > plainText.length) {
      console.warn('标注超出文本范围:', annotation);
      return false;
    }
    
    return true;
  }, []);

  // 清理和修正标注
  const cleanAndFixAnnotations = useCallback((annotations, plainText) => {
    return annotations
      .filter(ann => {
        if (!ann) return false;
        
        // 过滤掉无效的标注
        if (ann.start >= ann.end) return false;
        if (ann.end > plainText.length) return false;
        
        const actualText = plainText.slice(ann.start, ann.end);
        
        // 过滤掉过短的标注和纯标点符号
        const trimmedText = actualText.trim();
        if (trimmedText.length <= 1) return false;
        
        // 过滤掉只有标点符号的标注
        const punctuationRegex = /^[，。；：！？、,.!?:;'\"]+$/;
        if (punctuationRegex.test(trimmedText)) return false;
        
        return true;
      })
      .map(ann => {
        const actualText = plainText.slice(ann.start, ann.end);
        return {
          ...ann,
          text: actualText, // 确保使用正确的文本
          label: ann.label || '其他' // 确保有标签
        };
      });
  }, []);

  // 自动标注
  const handleAutoAnnotate = async () => {
    if (!content.trim() || readOnly) {
      alert(t('input_text_first'));
      return;
    }

    setAutoAnnotating(true);
    try {
      const plainText = getPlainText(content);
      console.log('原始文本长度:', plainText.length);
      console.log('前100字符:', plainText.substring(0, 100));
      
      const aiAnnotations = await aiService.autoAnnotateEntities(plainText);
      console.log('AI 返回的标注:', aiAnnotations);
      
      // 验证每个标注的文本是否正确
      const validatedAnnotations = aiAnnotations.map((ann, index) => {
        if (!ann) return null;
        
        const actualText = plainText.slice(ann.start, ann.end);
        console.log(`标注 ${index}: start=${ann.start}, end=${ann.end}, AI文本="${ann.text}", 实际文本="${actualText}"`);
        
        // 如果文本不匹配，使用实际文本
        if (ann.text !== actualText) {
          console.warn(`标注 ${index} 文本不匹配，修正为实际文本`);
          return {
            ...ann,
            text: actualText
          };
        }
        return ann;
      }).filter(Boolean);

      // 清理和修正标注
      const cleanedAnnotations = cleanAndFixAnnotations(validatedAnnotations, plainText);
      console.log('清理后的标注:', cleanedAnnotations);

      const uniqueAnnotations = cleanedAnnotations.filter(aiAnn => 
        !annotations.some(existingAnn => 
          (aiAnn.start >= existingAnn.start && aiAnn.start < existingAnn.end) ||
          (aiAnn.end > existingAnn.start && aiAnn.end <= existingAnn.end)
        )
      );
      
      console.log('过滤后的标注:', uniqueAnnotations);

      for (const ann of uniqueAnnotations) {
        if (onAddAnnotation) {
          onAddAnnotation({
            ...ann,
            id: `ai_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            source: 'ai',
            confidence: ann.confidence || 0.8
          });
        }
      }

      alert(`AI 自动标注完成，共标注 ${uniqueAnnotations.length} 个实体（过滤了${aiAnnotations.length - uniqueAnnotations.length}个重叠标注）`);
    } catch (error) {
      console.error('自动标注失败:', error);
      alert(`自动标注失败: ${error.message}`);
    } finally {
      setAutoAnnotating(false);
    }
  };

  // 快速清除所有标注
  const handleClearAllAnnotations = () => {
    if (annotations.length === 0 || readOnly) return;
    
    if (window.confirm(`确定要删除全部 ${annotations.length} 个标注吗？`)) {
      annotations.forEach((annotation) => {
        if (onDeleteAnnotation) {
          onDeleteAnnotation(annotation);
        }
      });
    }
  };

  // 处理标注点击
  const handleAnnotationClick = (annotation, index, e) => {
    if (readOnly) return;
    
    if (e.target.closest('.annotation-delete-btn')) return;
    
    if (textareaRef?.current) {
      textareaRef.current.focus();
      
      setSelectedText(annotation.text);
      setSelectionStart(annotation.start);
      setSelectionEnd(annotation.end);
      setSelectedLabel(annotation.label);
      setEditingAnnotation(annotation);
      setIsSelecting(true);
      
      const rect = e.currentTarget.getBoundingClientRect();
      const menuHeight = 40;
      const yPosition = rect.top - menuHeight - 10;
      
      setQuickActionsPosition({
        x: rect.left + rect.width / 2,
        y: Math.max(20, yPosition)
      });
      setShowQuickActions(true);
    }
  };

  // 渲染快速操作菜单
  const renderQuickActions = () => {
    if (!showQuickActions || readOnly || !isSelecting) return null;

    const isEditing = !!editingAnnotation;
    const labelCount = entityLabels.length;
    const menuWidth = Math.min(400, Math.max(300, labelCount * 70 + 40));
    const menuHeight = 40;
    
    const left = Math.max(menuWidth / 2 + 10, Math.min(window.innerWidth - menuWidth / 2 - 10, quickActionsPosition.x));
    const top = Math.max(menuHeight + 30, quickActionsPosition.y);
    
    const positionStyle = {
      position: 'fixed',
      left: `${left}px`,
      top: `${top}px`,
      transform: 'translateX(-50%)',
      zIndex: 9999,
      minWidth: '280px',
      maxWidth: '450px'
    };

    return (
      <div 
        ref={quickActionsRef}
        className="quick-actions-menu"
        style={positionStyle}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="quick-actions-content">
          <div className="label-buttons-container">
            <div className="label-buttons-scroll">
              {entityLabels.map((label) => {
                const isSelected = isEditing ? 
                  editingAnnotation.label === label.value : 
                  false;
                const isCustom = label.isCustom;
                
                return (
                  <div 
                    key={label.value} 
                    className={`label-button-wrapper ${isCustom ? 'custom-label-wrapper' : ''}`}
                  >
                    <button
                      className={`label-button-inline ${isSelected ? 'selected' : ''} ${isCustom ? 'custom-label' : ''}`}
                      style={{ 
                        backgroundColor: isSelected ? label.color : `${label.color}20`,
                        color: isSelected ? 'white' : label.color,
                        borderColor: label.color
                      }}
                      onClick={() => {
                        if (isEditing) {
                          handleUpdateAnnotationLabel(label.value);
                        } else {
                          handleQuickAddAnnotation(label.value);
                        }
                      }}
                      title={label.label}
                    >
                      {isEditing ? (
                        editingAnnotation.label === label.value ? 
                        label.label : `设为${label.label}`
                      ) : label.label}
                    </button>
                    {isCustom && (
                      <button
                        className="delete-label-btn"
                        onClick={(e) => confirmDeleteCustomLabel(label.value, e)}
                        title="删除此标签"
                      >
                        <span className="delete-icon">×</span>
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    );
  };

  // 在标注列表中显示
  const renderAnnotationList = () => {
    const plainText = getPlainText(content);
    
    return annotations.length === 0 ? (
      <div className="empty-annotations">
        <i data-feather="inbox"></i>
        <p>暂无标注</p>
        {!readOnly && <small>在文本中选择文字进行标注</small>}
      </div>
    ) : (
      annotations.map((annotation, index) => {
        const plainText = getPlainText(content);
        const isValid = validateAnnotation(annotation, plainText);
        
        if (!isValid) {
          return null; // 跳过无效标注
        }
        
        const actualText = plainText.slice(annotation.start, annotation.end);
        const labelConfig = entityLabels.find(l => l.value === annotation.label);
        const color = labelConfig ? labelConfig.color : '#64748b';
        const isCustom = labelConfig?.isCustom || false;
        
        return (
          <div 
            key={annotation.id || index} 
            className={`annotation-item ${
              currentHoverAnnotation?.id === annotation.id ? 'item-highlight' : ''
            }`}
            onMouseEnter={() => setCurrentHoverAnnotation(annotation)}
            onMouseLeave={() => setCurrentHoverAnnotation(null)}
          >
            <div className="annotation-badge-content">
              <span 
                className={`annotation-badge ${isCustom ? 'badge-custom' : ''}`}
                style={{ 
                  backgroundColor: `${color}20`,
                  color: color
                }}
              >
                {annotation.label}
                {annotation.source === 'ai' && (
                  <span className="ai-badge">AI</span>
                )}
              </span>
            </div>
            <span className="annotation-text" title={`位置: ${annotation.start}-${annotation.end}`}>
              "{actualText}" {/* 使用实际文本 */}
              {annotation.confidence && (
                <span className="confidence-badge">
                  {(annotation.confidence * 100).toFixed(0)}%
                </span>
              )}
            </span>
            {!readOnly && (
              <div className="annotation-actions">
                <button
                  className="delete-annotation-btn"
                  onClick={() => handleDeleteAnnotation(annotation)}
                  title="删除标注"
                >
                  <i data-feather="trash-2"></i>
                </button>
              </div>
            )}
          </div>
        );
      }).filter(Boolean) // 过滤掉null
    );
  };

  // 渲染标注文本 - 保持原始格式
  const renderAnnotatedText = () => {
    const plainText = getPlainText(content);
    if (!plainText) return null;

    let lastIndex = 0;
    const elements = [];
    
    // 先按开始位置排序
    const sortedAnnotations = [...annotations].sort((a, b) => a.start - b.start);

    sortedAnnotations.forEach((annotation, index) => {
      // 验证标注范围是否有效
      if (!validateAnnotation(annotation, plainText)) {
        console.warn('无效的标注，跳过:', annotation);
        return;
      }

      // 添加未标注的文本 - 处理换行
      if (annotation.start > lastIndex) {
        const textSegment = plainText.slice(lastIndex, annotation.start);
        const lines = textSegment.split('\n');
        
        lines.forEach((line, lineIndex) => {
          if (lineIndex > 0) {
            elements.push(<br key={`br-${lastIndex}-${lineIndex}`} />);
          }
          elements.push(
            <span key={`text-${lastIndex}-${lineIndex}`}>
              {line}
            </span>
          );
        });
      }

      // 获取实际的标注文本
      const actualText = plainText.slice(annotation.start, annotation.end);
      
      // 处理标注文本中的换行
      const annotationLines = actualText.split('\n');
      
      annotationLines.forEach((line, lineIndex) => {
        if (lineIndex > 0) {
          elements.push(<br key={`annotation-br-${index}-${lineIndex}`} />);
        }
        
        if (line.trim()) {
          // 获取标签颜色
          const labelConfig = entityLabels.find(l => l.value === annotation.label);
          const color = labelConfig ? labelConfig.color : '#64748b'; // 默认灰色
          
          elements.push(
            <span
              key={`annotation-${annotation.id || index}-${lineIndex}`}
              className={`entity-annotation ${
                currentHoverAnnotation?.id === annotation.id ? 'annotation-highlight' : ''
              } ${editingAnnotation?.id === annotation.id ? 'annotation-editing' : ''}`}
              style={{
                backgroundColor: `${color}20`,
                borderColor: color,
                borderBottom: `2px solid ${color}`
              }}
              title={`${annotation.label}: ${annotation.text}${
                annotation.source ? ` (${annotation.source})` : ''
              }${annotation.confidence ? ` 置信度: ${(annotation.confidence * 100).toFixed(1)}%` : ''}`}
              onClick={(e) => handleAnnotationClick(annotation, index, e)}
              onMouseEnter={() => setCurrentHoverAnnotation(annotation)}
              onMouseLeave={() => setCurrentHoverAnnotation(null)}
            >
              {line}
              {!readOnly && (
                <button
                  className="annotation-delete-btn"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDeleteAnnotation(annotation);
                  }}
                  title="删除标注"
                >
                  <i data-feather="x"></i>
                </button>
              )}
            </span>
          );
        } else {
          elements.push(
            <span key={`annotation-empty-${index}-${lineIndex}`}>
              {line}
            </span>
          );
        }
      });

      lastIndex = annotation.end;
    });

    // 添加剩余的文本
    if (lastIndex < plainText.length) {
      const textSegment = plainText.slice(lastIndex);
      const lines = textSegment.split('\n');
      
      lines.forEach((line, lineIndex) => {
        if (lineIndex > 0) {
          elements.push(<br key={`remaining-br-${lastIndex}-${lineIndex}`} />);
        }
        elements.push(
          <span key={`remaining-text-${lastIndex}-${lineIndex}`}>
            {line}
          </span>
        );
      });
    }

    return elements;
  };

  // 渲染确认删除模态框
  const renderDeleteConfirmModal = () => {
    if (!showDeleteConfirm || !labelToDelete) return null;

    const labelName = entityLabels.find(l => l.value === labelToDelete)?.label || labelToDelete;

    return (
      <div className="modal-overlay" onClick={() => setShowDeleteConfirm(false)}>
        <div className="modal-content small-modal" onClick={(e) => e.stopPropagation()}>
          <div className="modal-header">
            <h5>删除标签</h5>
            <button 
              className="modal-close" 
              onClick={() => setShowDeleteConfirm(false)}
            >
              <i data-feather="x"></i>
            </button>
          </div>
          <div className="modal-body">
            <div className="delete-confirm-content">
              <div className="warning-icon">
                <i data-feather="alert-triangle"></i>
              </div>
              <p>确定要删除标签 <strong>"{labelName}"</strong> 吗？</p>
              <p className="warning-text">此操作不可撤销，删除后将无法使用此标签进行标注。</p>
            </div>
          </div>
          <div className="modal-footer">
            <button 
              className="btn btn-outline" 
              onClick={() => setShowDeleteConfirm(false)}
            >
              取消
            </button>
            <button 
              className="btn btn-danger" 
              onClick={() => handleDeleteCustomLabel(labelToDelete)}
            >
              <i data-feather="trash-2"></i> 确认删除
            </button>
          </div>
        </div>
      </div>
    );
  };

  // 渲染统计区域
  const renderStats = () => {
    return (
      <div className="annotation-stats">
        {entityLabels.map(label => {
          const count = annotations.filter(a => a.label === label.value).length;
          return count > 0 ? (
            <span 
              key={label.value} 
              className="stat-badge"
              style={{ backgroundColor: label.color }}
            >
              {label.label}: {count}
            </span>
          ) : null;
        })}
      </div>
    );
  };

  return (
    <>
      <div className="entity-annotator">
        {!readOnly && (
          <div className="annotator-controls">
            <div className="control-group">
              <label>标签：</label>
              <div className="label-select-container">
                <select
                  value={selectedLabel}
                  onChange={(e) => setSelectedLabel(e.target.value)}
                  className="label-select"
                  disabled={!isSelecting}
                >
                  {entityLabels.map(label => (
                    <option key={label.value} value={label.value}>
                      {label.label} {label.isCustom ? '(自定义)' : ''}
                    </option>
                  ))}
                </select>
                <button
                  className="custom-label-toggle"
                  onClick={() => setShowCustomLabelModal(true)}
                  title="添加自定义标签"
                >
                  <i data-feather="plus"></i>
                </button>
              </div>
            </div>

            <div className="control-buttons">
              <button
                className="action-btn primary"
                onClick={handleAddAnnotation}
                disabled={!isSelecting || !selectedText}
                title="对选中文本打标"
              >
                <i data-feather="tag"></i> 对选中文本打标
              </button>
              <button
                className="action-btn"
                onClick={handleAutoAnnotate}
                disabled={autoAnnotating || !content.trim()}
                title="AI自动标注"
              >
                <i data-feather="zap"></i> 
                {autoAnnotating ? '标注中...' : 'AI自动标注'}
              </button>
              {annotations.length > 0 && (
                <button
                  className="action-btn danger"
                  onClick={handleClearAllAnnotations}
                  title="清除所有标注"
                >
                  <i data-feather="trash-2"></i> 清除全部
                </button>
              )}
            </div>
          </div>
        )}

        {renderQuickActions()}

        <div className="annotation-preview">
          <div className="preview-header">
            <h4>{t('annotation_list')} ({annotations.length})</h4>
            {renderStats()}
          </div>
          <div className="annotation-list" ref={annotatedTextRef}>
            {renderAnnotationList()}
          </div>
        </div>

        <div className="text-preview">
          <div className="preview-header">
            <h4>文本预览（带标注）</h4>
            <div className="legend">
              {entityLabels.map(label => (
                <span key={label.value} className="legend-item">
                  <span 
                    className="legend-color" 
                    style={{ backgroundColor: label.color }}
                  ></span>
                  {label.label}
                  {label.isCustom && <span className="custom-dot">•</span>}
                </span>
              ))}
            </div>
          </div>
          <div className="annotated-text">
            {renderAnnotatedText()}
          </div>
        </div>
      </div>

      {/* 自定义标签模态框 */}
      {showCustomLabelModal && (
        <div className="modal-overlay" onClick={() => setShowCustomLabelModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h5>添加自定义标签</h5>
              <button 
                className="modal-close" 
                onClick={() => setShowCustomLabelModal(false)}
              >
                <i data-feather="x"></i>
              </button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label>标签名称</label>
                <input
                  type="text"
                  value={customLabelInput}
                  onChange={(e) => setCustomLabelInput(e.target.value)}
                  placeholder="例如：机构、产品、事件、职位等"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      handleAddCustomLabel();
                    }
                  }}
                  autoFocus
                />
                <div className="input-hint">
                  标签颜色将自动生成，支持中文、英文、数字和常用符号
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button 
                className="btn btn-outline" 
                onClick={() => setShowCustomLabelModal(false)}
              >
                取消
              </button>
              <button 
                className="btn btn-primary" 
                onClick={handleAddCustomLabel}
                disabled={!customLabelInput.trim()}
              >
                <i data-feather="plus"></i> 添加标签
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 删除确认模态框 */}
      {renderDeleteConfirmModal()}
    </>
  );
};

export default EntityAnnotator;