// src/components/editor/EntityAnnotator.js
import React, { useState, useEffect, useRef } from 'react';
import { t } from '../../utils/language';
import { aiService } from '../../services/aiService';
import '../../styles/components/EntityAnnotator.css';

const EntityAnnotator = ({ 
  documentId, 
  content, 
  annotations = [], 
  onAddAnnotation,
  onDeleteAnnotation,
  textareaRef
}) => {
  const [selectedLabel, setSelectedLabel] = useState('人物');
  const [selectedText, setSelectedText] = useState('');
  const [selectionStart, setSelectionStart] = useState(-1);
  const [selectionEnd, setSelectionEnd] = useState(-1);
  const [autoAnnotating, setAutoAnnotating] = useState(false);

  const entityLabels = [
    { value: '人物', label: t('person') },
    { value: '地名', label: t('place') },
    { value: '时间', label: t('time') },
    { value: '器物', label: t('object') },
    { value: '概念', label: t('concept') },
    { value: '其他', label: t('other') }
  ];

  // 监听文本选择
  useEffect(() => {
    const handleSelectionChange = () => {
      if (!textareaRef || !textareaRef.current) return;

      const start = textareaRef.current.selectionStart;
      const end = textareaRef.current.selectionEnd;
      
      if (start !== end) {
        const selected = content.substring(start, end);
        const trimmed = selected.trim();
        if (trimmed) {
          const trimStart = selected.indexOf(trimmed);
          const actualStart = start + trimStart;
          const actualEnd = actualStart + trimmed.length;
          
          setSelectedText(trimmed);
          setSelectionStart(actualStart);
          setSelectionEnd(actualEnd);
        }
      }
    };

    if (textareaRef && textareaRef.current) {
      const textarea = textareaRef.current;
      textarea.addEventListener('mouseup', handleSelectionChange);
      textarea.addEventListener('keyup', handleSelectionChange);

      return () => {
        textarea.removeEventListener('mouseup', handleSelectionChange);
        textarea.removeEventListener('keyup', handleSelectionChange);
      };
    }
  }, [textareaRef, content]);

  const handleTextSelect = () => {
    if (!textareaRef.current) return;

    const start = textareaRef.current.selectionStart;
    const end = textareaRef.current.selectionEnd;
    const selected = content.substring(start, end);
    const trimmed = selected.trim();

    if (trimmed) {
      const trimStart = selected.indexOf(trimmed);
      const actualStart = start + trimStart;
      const actualEnd = actualStart + trimmed.length;
      
      setSelectedText(trimmed);
      setSelectionStart(actualStart);
      setSelectionEnd(actualEnd);
    }
  };

  const handleAddAnnotation = () => {
    if (!selectedText || selectionStart === -1 || selectionEnd === -1) {
      alert(t('select_text_first'));
      return;
    }

    if (onAddAnnotation) {
      onAddAnnotation({
        start: selectionStart,
        end: selectionEnd,
        label: selectedLabel,
        text: selectedText
      });
    }

    // 重置选择
    setSelectedText('');
    setSelectionStart(-1);
    setSelectionEnd(-1);
  };

  const handleAutoAnnotate = async () => {
    if (!content.trim()) {
      alert(t('input_text_first'));
      return;
    }

    setAutoAnnotating(true);
    try {
      const aiAnnotations = await aiService.autoAnnotateEntities(content);
      
      // 添加 AI 标注
      for (const ann of aiAnnotations) {
        if (onAddAnnotation) {
          onAddAnnotation(ann);
        }
      }

      alert(`AI 自动标注完成，共标注 ${aiAnnotations.length} 个实体`);
    } catch (error) {
      console.error('自动标注失败:', error);
      alert(`自动标注失败: ${error.message}`);
    } finally {
      setAutoAnnotating(false);
    }
  };

  // 解析并渲染带有 HTML 格式标签的文本
  const parseFormattedText = (text, keyPrefix = '') => {
    if (!text) return text;

    const elements = [];
    let currentIndex = 0;
    // 匹配 <b>, <i>, <u> 标签
    const formatRegex = /<(b|i|u)>(.*?)<\/\1>/g;
    let match;

    while ((match = formatRegex.exec(text)) !== null) {
      // 添加标签之前的普通文本
      if (match.index > currentIndex) {
        elements.push(
          <span key={`${keyPrefix}-text-${currentIndex}`}>
            {text.slice(currentIndex, match.index)}
          </span>
        );
      }

      // 添加格式化的文本
      const tag = match[1];
      const content = match[2];
      const TagComponent = tag; // 'b', 'i', or 'u'
      
      elements.push(
        React.createElement(
          TagComponent,
          { key: `${keyPrefix}-${tag}-${match.index}` },
          content
        )
      );

      currentIndex = match.index + match[0].length;
    }

    // 添加剩余的普通文本
    if (currentIndex < text.length) {
      elements.push(
        <span key={`${keyPrefix}-text-${currentIndex}`}>
          {text.slice(currentIndex)}
        </span>
      );
    }

    return elements.length > 0 ? elements : text;
  };

  const renderAnnotatedText = () => {
    if (!content) return content;

    let lastIndex = 0;
    const elements = [];
    const sortedAnnotations = [...annotations].sort((a, b) => a.start - b.start);

    sortedAnnotations.forEach((annotation, index) => {
      // 添加未标注的文本（支持格式化）
      if (annotation.start > lastIndex) {
        const textSegment = content.slice(lastIndex, annotation.start);
        elements.push(
          <span key={`text-${lastIndex}`}>
            {parseFormattedText(textSegment, `seg-${lastIndex}`)}
          </span>
        );
      }

      // 添加标注的文本（支持格式化）
      elements.push(
        <span
          key={`annotation-${index}`}
          className={`entity-annotation entity-${annotation.label}`}
          title={`${annotation.label}: ${annotation.text}`}
        >
          {parseFormattedText(annotation.text, `ann-${index}`)}
          <button
            className="annotation-delete-btn"
            onClick={() => onDeleteAnnotation && onDeleteAnnotation(index)}
          >
            <i data-feather="x"></i>
          </button>
        </span>
      );

      lastIndex = annotation.end;
    });

    // 添加剩余文本（支持格式化）
    if (lastIndex < content.length) {
      const textSegment = content.slice(lastIndex);
      elements.push(
        <span key={`text-${lastIndex}`}>
          {parseFormattedText(textSegment, `seg-${lastIndex}`)}
        </span>
      );
    }

    return elements;
  };

  return (
    <div className="entity-annotator">
      <div className="annotator-controls">
        <div className="control-group">
          <label>{t('label')}</label>
          <select
            value={selectedLabel}
            onChange={(e) => setSelectedLabel(e.target.value)}
            className="label-select"
          >
            {entityLabels.map(label => (
              <option key={label.value} value={label.value}>
                {label.label}
              </option>
            ))}
          </select>
        </div>

        {selectedText && (
          <div className="selected-text-info">
            <label>已选中文本：</label>
            <div className="selected-text-preview">"{selectedText}"</div>
          </div>
        )}

        <div className="control-buttons">
          <button
            className="action-btn"
            onClick={handleAddAnnotation}
            disabled={!selectedText}
          >
            <i data-feather="tag"></i> {t('add_entity')}
          </button>
          <button
            className="action-btn"
            onClick={handleAutoAnnotate}
            disabled={autoAnnotating || !content.trim()}
          >
            <i data-feather="zap"></i> 
            {autoAnnotating ? '标注中...' : 'AI自动标注'}
          </button>
        </div>
      </div>

      <div className="annotation-preview">
        <h4>{t('annotation_list')}</h4>
        <div className="annotation-list">
          {annotations.length === 0 ? (
            <div className="empty-annotations">暂无标注</div>
          ) : (
            annotations.map((annotation, index) => (
              <div key={index} className="annotation-item">
                <span className={`annotation-badge badge-${annotation.label}`}>
                  {annotation.label}
                </span>
                <span className="annotation-text">"{annotation.text}"</span>
                <button
                  className="delete-annotation-btn"
                  onClick={() => onDeleteAnnotation && onDeleteAnnotation(index)}
                >
                  <i data-feather="trash-2"></i>
                </button>
              </div>
            ))
          )}
        </div>
      </div>

      <div className="text-preview">
        <h4>文本预览（带标注）</h4>
        <div className="annotated-text">
          {renderAnnotatedText()}
        </div>
      </div>
    </div>
  );
};

export default EntityAnnotator;