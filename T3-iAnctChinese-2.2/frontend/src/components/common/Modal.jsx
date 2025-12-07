// src/components/common/Modal.js - 修复 ESC 键监听
import React, { useEffect } from 'react';
import { t } from '../../utils/language';
import '../../styles/components/Modal.css';

const Modal = ({ 
  isOpen, 
  onClose, 
  title, 
  children, 
  onSubmit, 
  submitText = t('confirm'),
  cancelText = t('cancel'),
  size = 'medium',
  showFooter = true
}) => {
  // 阻止背景滚动
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }

    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  // 修复：ESC 键关闭 - 安全的方式
  useEffect(() => {
    if (!isOpen) return;

    const handleEscape = (e) => {
      if (e.keyCode === 27) {
        onClose?.();
      }
    };

    // 安全地添加事件监听
    if (typeof document !== 'undefined') {
      document.addEventListener('keydown', handleEscape);
      
      return () => {
        document.removeEventListener('keydown', handleEscape);
      };
    }
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleOverlayClick = (e) => {
    if (e.target === e.currentTarget) {
      onClose?.();
    }
  };

  const handleSubmit = (e) => {
    if (e && typeof e.preventDefault === 'function') {
      e.preventDefault();
    }
    if (onSubmit) {
      onSubmit();
    }
  };

  return (
    <div className="modal-overlay" onClick={handleOverlayClick}>
      <div className={`modal-content modal-${size}`}>
        <div className="modal-header">
          <h3 className="modal-title">{title}</h3>
          <button className="modal-close" onClick={onClose}>
            <i data-feather="x"></i>
          </button>
        </div>
        
        <div className="modal-body">
          {children}
        </div>
        
        {showFooter && (
          <div className="modal-footer">
            <button 
              className="modal-btn secondary" 
              onClick={onClose}
              type="button"
            >
              {cancelText}
            </button>
            {onSubmit && (
              <button 
                className="modal-btn primary" 
                onClick={handleSubmit}
                type="button"
              >
                {submitText}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default Modal;