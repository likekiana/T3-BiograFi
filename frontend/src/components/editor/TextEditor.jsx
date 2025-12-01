// src/components/editor/TextEditor.js - 确保没有 document 事件监听
import React, { useState, useEffect } from 'react';
import { t } from '../../utils/language';
import '../../styles/components/TextEditor.css';

const TextEditor = ({ 
  content, 
  onChange, 
  placeholder = t('enter_content'),
  readOnly = false,
  textareaRef
}) => {
  const [text, setText] = useState(content || '');

  useEffect(() => {
    setText(content || '');
  }, [content]);

  useEffect(() => {
    if (typeof window !== 'undefined' && window.feather) {
      window.feather.replace();
    }
  });

  const handleChange = (e) => {
    const newText = e.target.value;
    setText(newText);
    if (onChange) {
      onChange(newText);
    }
  };

  const handleKeyDown = (e) => {
    // 快捷键支持 - 不需要 document 事件监听
    if ((e.ctrlKey || e.metaKey) && e.key === 's') {
      e.preventDefault();
      // 保存功能由父组件处理
    }
  };

  const applyFormat = (formatType) => {
    if (!textareaRef || !textareaRef.current) return;

    const textarea = textareaRef.current;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;

    if (start === end) {
      alert('请先选择要格式化的文本');
      return;
    }

    const selectedText = text.substring(start, end);
    let formattedText = '';

    switch (formatType) {
      case 'bold':
        formattedText = `<b>${selectedText}</b>`;
        break;
      case 'italic':
        formattedText = `<i>${selectedText}</i>`;
        break;
      case 'underline':
        formattedText = `<u>${selectedText}</u>`;
        break;
      default:
        return;
    }

    const newText = text.substring(0, start) + formattedText + text.substring(end);
    setText(newText);
    if (onChange) {
      onChange(newText);
    }

    // 重新设置光标位置
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start, start + formattedText.length);
    }, 0);
  };

  const clearFormat = () => {
    if (!textareaRef || !textareaRef.current) return;

    const textarea = textareaRef.current;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;

    if (start === end) {
      alert('请先选择要清除格式的文本');
      return;
    }

    const selectedText = text.substring(start, end);
    // 移除所有 HTML 标签
    const cleanText = selectedText.replace(/<\/?[^>]+(>|$)/g, '');

    const newText = text.substring(0, start) + cleanText + text.substring(end);
    setText(newText);
    if (onChange) {
      onChange(newText);
    }

    // 重新设置光标位置
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start, start + cleanText.length);
    }, 0);
  };

  return (
    <div className="text-editor">
      <div className="editor-toolbar">
        <button className="toolbar-btn" title="粗体" onClick={() => applyFormat('bold')}>
          <i data-feather="bold"></i>
        </button>
        <button className="toolbar-btn" title="斜体" onClick={() => applyFormat('italic')}>
          <i data-feather="italic"></i>
        </button>
        <button className="toolbar-btn" title="下划线" onClick={() => applyFormat('underline')}>
          <i data-feather="underline"></i>
        </button>
        <button className="toolbar-btn" title="清除格式" onClick={clearFormat}>
          <i data-feather="type"></i>
        </button>
      </div>
      
      <div className="editor-textarea">
        <textarea
          ref={textareaRef}
          value={text}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          readOnly={readOnly}
          className="editor-text-input"
        />
      </div>
    </div>
  );
};

export default TextEditor;