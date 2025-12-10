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
  const [selectedModel, setSelectedModel] = useState('xunzi-qwen2');
  const [availableModels, setAvailableModels] = useState([]);
  const [progress, setProgress] = useState(0);
  const [cancelRequest, setCancelRequest] = useState(false);
  
  // 加载可用模型列表
  useEffect(() => {
    setAvailableModels(aiService.getAvailableModels());
  }, []);
  
  const annotatedTextRef = useRef(null);
  const quickActionsRef = useRef(null);
  const selectionCheckInterval = useRef(null);
  const abortControllerRef = useRef(null);

  // 取消自动标注
  const cancelAutoAnnotate = () => {
    setCancelRequest(true);
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
  };

  // 应用格式化（粗体、斜体、下划线、清除格式）
  const applyFormat = (formatType) => {
    if (!textareaRef.current) return;
    
    const editor = textareaRef.current;
    editor.focus();
    
    try {
      document.execCommand('formatBlock', false, 'div');
      
      switch (formatType) {
        case 'bold':
          document.execCommand('bold', false, null);
          break;
        case 'italic':
          document.execCommand('italic', false, null);
          break;
        case 'underline':
          document.execCommand('underline', false, null);
          break;
        default:
          return;
      }
      
      const inputEvent = new Event('input', { bubbles: true });
      editor.dispatchEvent(inputEvent);
    } catch (error) {
      console.error('应用格式失败:', error);
      alert('应用格式失败，请重试');
    }
  };

  // 清除格式
  const clearFormat = () => {
    if (!textareaRef.current) return;
    
    const editor = textareaRef.current;
    editor.focus();
    
    try {
      document.execCommand('removeFormat', false, null);
      
      const inputEvent = new Event('input', { bubbles: true });
      editor.dispatchEvent(inputEvent);
    } catch (error) {
      console.error('清除格式失败:', error);
      alert('清除格式失败，请重试');
    }
  };

  // 获取文本内容（去除HTML标签但保留格式）
  const getPlainText = useCallback((html) => {
    if (!html) return '';
    
    if (!html.includes('<') && !html.includes('>')) {
      return html;
    }
    
    try {
      const tempDiv = document.createElement('div');
      tempDiv.innerHTML = html;
      
      let text = tempDiv.innerText || tempDiv.textContent || '';
      
      text = text
        .replace(/\r\n/g, '\n')
        .replace(/\r/g, '\n')
        .replace(/[ \t]+/g, ' ')
        .replace(/^[ \t]+/gm, '')
        .replace(/[ \t]+$/gm, '');
      
      return text;
    } catch (error) {
      console.error('解析HTML失败:', error);
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
    const saturation = 70 + Math.floor(Math.random() * 20);
    const lightness = 50 + Math.floor(Math.random() * 20);
    return `hsl(${hue}, ${saturation}%, ${lightness}%)`;
  };

  // 保存自定义标签到 localStorage
  const saveCustomLabels = (labels) => {
    try {
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
    const isInUse = annotations.some(ann => ann.label === labelValue);
    
    if (isInUse) {
      alert('该标签已被使用，无法删除');
      return;
    }

    const updatedLabels = entityLabels.filter(label => label.value !== labelValue);
    setEntityLabels(updatedLabels);
    saveCustomLabels(updatedLabels);
    
    if (selectedLabel === labelValue) {
      setSelectedLabel('人物');
    }
    
    setShowDeleteConfirm(false);
    setLabelToDelete(null);
  };

  // 确认删除自定义标签
  const confirmDeleteCustomLabel = (labelValue, e) => {
    if (e) e.stopPropagation();
    
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
    
    const selection = window.getSelection();
    selection.removeAllRanges();
    
    if (textareaRef?.current && !readOnly) {
      textareaRef.current.focus();
    }
  }, [textareaRef, readOnly]);

  // 监听文本选择的变化
  const checkSelection = useCallback(() => {
    if (readOnly) return;
    
    const selection = window.getSelection();
    
    if (!selection.rangeCount || selection.isCollapsed) {
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
    
    const isInEditor = textareaRef?.current && textareaRef.current.contains(selection.anchorNode);
    const isInPreview = document.querySelector('.annotated-text')?.contains(selection.anchorNode);
    
    if (!isInEditor && !isInPreview) {
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
    
    const plainText = getPlainText(content);
    const selectedText = selectedPlainText;
    
    let start = -1;
    let end = -1;
    
    start = plainText.indexOf(selectedText);
    if (start !== -1) {
      end = start + selectedText.length;
    } else {
      const textBeforeSelection = plainText.slice(0, Math.min(1000, plainText.length));
      start = textBeforeSelection.length;
      end = start + selectedText.length;
    }
    
    if (start < 0 || end <= start) {
      start = 0;
      end = Math.min(selectedText.length, plainText.length);
    }
    
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

  // 渲染feather图标
  useEffect(() => {
    if (typeof window !== 'undefined' && window.feather) {
      const timer = setTimeout(() => {
        const annotatorElement = document.querySelector('.entity-annotator');
        if (annotatorElement) {
          const icons = annotatorElement.querySelectorAll('[data-feather]');
          window.feather.replace(icons);
        }
      }, 150);
      return () => clearTimeout(timer);
    }
  }, [entityLabels, annotations]);

  useEffect(() => {
    if (readOnly) return;
    
    let annotatedTextElement = null;
    
    const handleSelectionChange = () => {
      setTimeout(() => {
        checkSelection();
      }, 10);
    };
    
    const handleMouseUp = (e) => {
      const isInEditor = textareaRef?.current && textareaRef.current.contains(e.target);
      const isInPreview = annotatedTextElement && annotatedTextElement.contains(e.target);
      
      if (isInEditor || isInPreview) {
        setTimeout(() => {
          checkSelection();
        }, 50);
      }
    };
    
    const handleClick = (e) => {
      const isInPreview = annotatedTextElement && annotatedTextElement.contains(e.target);
      if (isInPreview) {
        handleSelectionChange();
      }
    };
    
    if (textareaRef?.current) {
      const editor = textareaRef.current;
      editor.addEventListener('mouseup', handleMouseUp);
      editor.addEventListener('keyup', handleSelectionChange);
      editor.addEventListener('click', handleSelectionChange);
    }
    
    annotatedTextElement = document.querySelector('.annotated-text');
    if (annotatedTextElement) {
      annotatedTextElement.addEventListener('mouseup', handleMouseUp);
      annotatedTextElement.addEventListener('click', handleClick);
    }
    
    document.addEventListener('selectionchange', handleSelectionChange);
    
    selectionCheckInterval.current = setInterval(() => {
      checkSelection();
    }, 300);
    
    return () => {
      if (selectionCheckInterval.current) {
        clearInterval(selectionCheckInterval.current);
        selectionCheckInterval.current = null;
      }
      
      if (textareaRef?.current) {
        const editor = textareaRef.current;
        editor.removeEventListener('mouseup', handleMouseUp);
        editor.removeEventListener('keyup', handleSelectionChange);
        editor.removeEventListener('click', handleSelectionChange);
      }
      
      if (annotatedTextElement) {
        annotatedTextElement.removeEventListener('mouseup', handleMouseUp);
        annotatedTextElement.removeEventListener('click', handleClick);
        annotatedTextElement = null;
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
    
    if (start === undefined || end === undefined) {
      console.warn('标注缺少位置信息:', annotation);
      return false;
    }
    
    if (start < 0 || end < 0 || start >= end) {
      console.warn('标注位置无效:', annotation);
      return false;
    }
    
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
        
        if (ann.start >= ann.end) return false;
        if (ann.end > plainText.length) return false;
        
        const actualText = plainText.slice(ann.start, ann.end);
        const trimmedText = actualText.trim();
        if (trimmedText.length <= 1) return false;
        
        const punctuationRegex = /^[，。；：！？、,.!?:;'\"]+$/;
        if (punctuationRegex.test(trimmedText)) return false;
        
        return true;
      })
      .map(ann => {
        const actualText = plainText.slice(ann.start, ann.end);
        return {
          ...ann,
          text: actualText,
          label: ann.label || '其他'
        };
      });
  }, []);

  // 自动标注 - 优化版本
  const handleAutoAnnotate = async () => {
    if (!content.trim() || readOnly) {
      alert(t('input_text_first'));
      return;
    }

    // 重置状态
    setAutoAnnotating(true);
    setProgress(0);
    setCancelRequest(false);
    
    // 创建AbortController用于取消请求
    abortControllerRef.current = new AbortController();
    
    try {
      const plainText = getPlainText(content);
      console.log('原始文本长度:', plainText.length);
      
      // 检查文本长度，如果太长给出警告
      if (plainText.length > 5000) {
        const shouldContinue = window.confirm(
          `文本长度较长（${plainText.length}字符），自动标注可能需要一些时间。\n是否继续？`
        );
        if (!shouldContinue) {
          setAutoAnnotating(false);
          setProgress(0);
          return;
        }
      }
      
      // 显示进度
      setProgress(10);
      
      // 使用安全版本，传递取消信号
      const aiAnnotations = await aiService.autoAnnotateEntitiesSafe(
        plainText, 
        selectedModel, 
        (current, total) => {
          // 进度回调
          const percent = Math.floor((current / total) * 80) + 10;
          setProgress(percent);
        }, 
        abortControllerRef.current?.signal
      );
      
      setProgress(90);
      
      console.log('AI 返回的标注:', aiAnnotations);
      
      // 验证每个标注的文本是否正确
      const validatedAnnotations = aiAnnotations.map((ann, index) => {
        if (!ann) return null;
        
        const actualText = plainText.slice(ann.start, ann.end);
        
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

      // 批量添加标注
      let addedCount = 0;
      for (const ann of uniqueAnnotations) {
        if (cancelRequest) break;
        
        if (onAddAnnotation) {
          onAddAnnotation({
            ...ann,
            id: `ai_${Date.now()}_${Math.random().toString(36).substr(2, 9)}_${addedCount}`,
            source: 'ai',
            confidence: ann.confidence || 0.8
          });
          addedCount++;
        }
        
        // 每添加50个标注，更新一次进度并让出主线程
        if (addedCount % 50 === 0) {
          const annotationProgress = 90 + Math.floor((addedCount / uniqueAnnotations.length) * 10);
          setProgress(annotationProgress);
          // 让出主线程，避免卡顿
          await new Promise(resolve => setTimeout(resolve, 0));
        }
      }

      setProgress(100);
      
      if (cancelRequest) {
        alert('自动标注已取消');
      } else {
        alert(`AI 自动标注完成，共标注 ${uniqueAnnotations.length} 个实体`);
      }
    } catch (error) {
      console.error('自动标注失败:', error);
      if (error.name === 'AbortError') {
        alert('自动标注已取消');
      } else {
        alert(`自动标注失败: ${error.message}`);
      }
    } finally {
      setTimeout(() => {
        setAutoAnnotating(false);
        setProgress(0);
        abortControllerRef.current = null;
      }, 500);
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
          return null;
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
              "{actualText}"
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
      }).filter(Boolean)
    );
  };

  // 预览框输入事件处理
  const handlePreviewInput = (e) => {
    if (readOnly) return;
    
    const newContent = e.target.innerHTML;
    if (textareaRef.current) {
      textareaRef.current.innerHTML = newContent;
      const inputEvent = new Event('input', { bubbles: true });
      textareaRef.current.dispatchEvent(inputEvent);
    }
  };

  // 预览框按键事件处理
  const handlePreviewKeyDown = (e) => {
    if (readOnly) return;
    
    if ((e.ctrlKey || e.metaKey) && e.key === 's') {
      e.preventDefault();
    }
  };

  // 渲染标注文本 - 可编辑版本
  const renderAnnotatedText = () => {
    const plainText = getPlainText(content);
    if (!plainText) return null;

    let lastIndex = 0;
    const elements = [];
    let elementCounter = 0;
    
    const sortedAnnotations = [...annotations].sort((a, b) => a.start - b.start);

    sortedAnnotations.forEach((annotation, annotationIndex) => {
      if (!validateAnnotation(annotation, plainText)) {
        console.warn('无效的标注，跳过:', annotation);
        return;
      }

      if (annotation.start > lastIndex) {
        const textSegment = plainText.slice(lastIndex, annotation.start);
        const lines = textSegment.split('\n');
        
        lines.forEach((line, lineIndex) => {
          if (lineIndex > 0) {
            elements.push(<br key={`br-${elementCounter++}`} />);
          }
          elements.push(
            <span key={`text-${elementCounter++}`}>
              {line}
            </span>
          );
        });
      }

      const actualText = plainText.slice(annotation.start, annotation.end);
      const annotationLines = actualText.split('\n');
      
      annotationLines.forEach((line, lineIndex) => {
        if (lineIndex > 0) {
          elements.push(<br key={`annotation-br-${elementCounter++}`} />);
        }
        
        if (line.trim()) {
          const labelConfig = entityLabels.find(l => l.value === annotation.label);
          const color = labelConfig ? labelConfig.color : '#64748b';
          
          const annotationKey = annotation.id ? `annotation-${annotation.id}-${lineIndex}` : `annotation-${annotationIndex}-${lineIndex}-${elementCounter++}`;
          
          elements.push(
            <span
              key={annotationKey}
              className={`entity-annotation ${
                currentHoverAnnotation?.id === annotation.id ? 'annotation-highlight' : ''
              } ${
                editingAnnotation?.id === annotation.id ? 'annotation-editing' : ''
              }`}
              style={{
                backgroundColor: `${color}20`,
                borderColor: color,
                borderBottom: `2px solid ${color}`
              }}
              title={`${annotation.label}: ${annotation.text}${
                annotation.source ? ` (${annotation.source})` : ''
              }${annotation.confidence ? ` 置信度: ${(annotation.confidence * 100).toFixed(1)}%` : ''}`}
              onClick={(e) => handleAnnotationClick(annotation, annotationIndex, e)}
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
            <span key={`annotation-empty-${elementCounter++}`}>
              {line}
            </span>
          );
        }
      });

      lastIndex = annotation.end;
    });

    if (lastIndex < plainText.length) {
      const textSegment = plainText.slice(lastIndex);
      const lines = textSegment.split('\n');
      
      lines.forEach((line, lineIndex) => {
        if (lineIndex > 0) {
          elements.push(<br key={`remaining-br-${elementCounter++}`} />);
        }
        elements.push(
          <span key={`remaining-text-${elementCounter++}`}>
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
              
              <div className="model-selector">
                <label htmlFor="ai-model-select" className="model-select-label">模型选择:</label>
                <select
                  id="ai-model-select"
                  className="model-select"
                  value={selectedModel}
                  onChange={(e) => setSelectedModel(e.target.value)}
                  disabled={autoAnnotating}
                >
                  {availableModels.map(model => (
                    <option key={model.id} value={model.id}>
                      {model.name} {model.recommended && '(推荐)'}
                    </option>
                  ))}
                </select>
              </div>
              
              <button
                className="action-btn"
                onClick={handleAutoAnnotate}
                disabled={autoAnnotating || !content.trim()}
                title="AI自动标注"
              >
                <i data-feather="zap"></i> 
                {autoAnnotating ? '标注中...' : 'AI自动标注'}
              </button>
              {autoAnnotating && (
                <button
                  className="action-btn danger"
                  onClick={cancelAutoAnnotate}
                  title="取消标注"
                >
                  <i data-feather="x"></i> 取消
                </button>
              )}
              {annotations.length > 0 && !autoAnnotating && (
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

        {autoAnnotating && (
          <div className="progress-container">
            <div className="progress-bar">
              <div 
                className="progress-fill" 
                style={{ width: `${progress}%` }}
              ></div>
            </div>
            <div className="progress-text">
              自动标注中: {progress}%
              {progress < 100 && ' 请稍候...'}
            </div>
          </div>
        )}

        {renderQuickActions()}

        <div className="annotation-preview merged-preview">
          <div className="preview-header">
            <h4>{t('annotation_list')} ({annotations.length})</h4>
            {renderStats()}
          </div>
          <div className="annotation-list" ref={annotatedTextRef}>
            {renderAnnotationList()}
          </div>
          
          <div className="preview-header text-preview-header">
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
          
          <div 
            className="annotated-text contenteditable"
            contentEditable={!readOnly}
            onInput={handlePreviewInput}
            onKeyDown={handlePreviewKeyDown}
            suppressContentEditableWarning={true}
          >
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