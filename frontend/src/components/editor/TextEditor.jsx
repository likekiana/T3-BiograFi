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

  return (
    <div className="text-editor">
      <div className="editor-toolbar">
        <button className="toolbar-btn" title="粗体">
          <i data-feather="bold"></i>
        </button>
        <button className="toolbar-btn" title="斜体">
          <i data-feather="italic"></i>
        </button>
        <button className="toolbar-btn" title="下划线">
          <i data-feather="underline"></i>
        </button>
        <button className="toolbar-btn" title="清除格式">
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