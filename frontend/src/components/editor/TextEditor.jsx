// src/components/editor/TextEditor.js - 使用 contentEditable 支持富文本显示
import React, { useState, useEffect, useRef } from 'react';
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
  const editorRef = useRef(null);

  useEffect(() => {
    const newContent = content || '';
    setText(newContent);
    // 同步更新 contentEditable div 的内容
    if (editorRef.current) {
      const currentHTML = editorRef.current.innerHTML;
      // 只有当内容真的不同时才更新，避免光标位置丢失
      if (currentHTML !== newContent && document.activeElement !== editorRef.current) {
        editorRef.current.innerHTML = newContent;
      }
    }
  }, [content]);

  useEffect(() => {
    if (typeof window !== 'undefined' && window.feather) {
      window.feather.replace();
    }
  });

  const handleInput = (e) => {
    const newText = e.currentTarget.innerHTML;
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
    const selection = window.getSelection();
    if (!selection.rangeCount || selection.isCollapsed) {
      alert('请先选择要格式化的文本');
      return;
    }

    const range = selection.getRangeAt(0);
    const selectedText = range.toString();
    
    let wrapper;
    switch (formatType) {
      case 'bold':
        wrapper = document.createElement('b');
        break;
      case 'italic':
        wrapper = document.createElement('i');
        break;
      case 'underline':
        wrapper = document.createElement('u');
        break;
      default:
        return;
    }

    try {
      range.surroundContents(wrapper);
      selection.removeAllRanges();
      
      // 触发内容更新
      if (editorRef.current) {
        const newText = editorRef.current.innerHTML;
        setText(newText);
        if (onChange) {
          onChange(newText);
        }
      }
    } catch (error) {
      // 如果选择跨越了多个节点，使用替代方法
      const fragment = range.extractContents();
      wrapper.appendChild(fragment);
      range.insertNode(wrapper);
      
      if (editorRef.current) {
        const newText = editorRef.current.innerHTML;
        setText(newText);
        if (onChange) {
          onChange(newText);
        }
      }
    }
  };

  const clearFormat = () => {
    const selection = window.getSelection();
    if (!selection.rangeCount || selection.isCollapsed) {
      alert('请先选择要清除格式的文本');
      return;
    }

    const range = selection.getRangeAt(0);
    const fragment = range.extractContents();
    const textContent = fragment.textContent;
    const textNode = document.createTextNode(textContent);
    range.insertNode(textNode);
    
    if (editorRef.current) {
      const newText = editorRef.current.innerHTML;
      setText(newText);
      if (onChange) {
        onChange(newText);
      }
    }
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
        <div
          ref={(el) => {
            editorRef.current = el;
            if (textareaRef) {
              textareaRef.current = el;
            }
            // 初始化内容
            if (el && !el.innerHTML) {
              el.innerHTML = text;
            }
          }}
          contentEditable={!readOnly}
          onInput={handleInput}
          onKeyDown={handleKeyDown}
          className="editor-text-input contenteditable"
          suppressContentEditableWarning={true}
          data-placeholder={placeholder}
        />
      </div>
    </div>
  );
};

export default TextEditor;