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
  onDeleteAnnotation 
}) => {
  const [selectedLabel, setSelectedLabel] = useState('人物');
  const [selectedText, setSelectedText] = useState('');
  const [selectionStart, setSelectionStart] = useState(-1);
  const [selectionEnd, setSelectionEnd] = useState(-1);
  const [autoAnnotating, setAutoAnnotating] = useState(false);
  const textareaRef = useRef(null);

  const entityLabels = [
    { value: '人物', label: t('person') },
    { value: '地名', label: t('place') },
    { value: '时间', label: t('time') },
    { value: '器物', label: t('object') },
    { value: '概念', label: t('concept') },
    { value: '其他', label: t('other') }
  ];

  const handleTextSelect = () => {
    if (!textareaRef.current) return;

    const start = textareaRef.current.selectionStart;
    const end = textareaRef.current.selectionEnd;
    const selected = content.substring(start, end).trim();

    if (selected) {
      setSelectedText(selected);
      setSelectionStart(start);
      setSelectionEnd(end);
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

  const renderAnnotatedText = () => {
    if (!content) return content;

    let lastIndex = 0;
    const elements = [];
    const sortedAnnotations = [...annotations].sort((a, b) => a.start - b.start);

    sortedAnnotations.forEach((annotation, index) => {
      // 添加未标注的文本
      if (annotation.start > lastIndex) {
        elements.push(
          <span key={`text-${lastIndex}`}>
            {content.slice(lastIndex, annotation.start)}
          </span>
        );
      }

      // 添加标注的文本
      elements.push(
        <span
          key={`annotation-${index}`}
          className={`entity-annotation entity-${annotation.label}`}
          title={`${annotation.label}: ${annotation.text}`}
        >
          {annotation.text}
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

    // 添加剩余文本
    if (lastIndex < content.length) {
      elements.push(
        <span key={`text-${lastIndex}`}>
          {content.slice(lastIndex)}
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