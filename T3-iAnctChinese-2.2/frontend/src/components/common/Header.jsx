// src/components/common/Header.js
import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { t, getCurrentLanguage, setCurrentLanguage } from '../../utils/language';
import '../../styles/components/Header.css';

const Header = ({ showEditorButtons = false, onSaveDocument, onBackToProject, onShowUserProfile }) => {
  const { user, logout } = useAuth();
  const [showLanguageDropdown, setShowLanguageDropdown] = useState(false);
  const [currentLanguage, setCurrentLanguageState] = useState(getCurrentLanguage());
  const dropdownRef = useRef(null);

  const handleLogout = () => {
    if (window.confirm(t('confirm_logout'))) {
      logout();
    }
  };

  const handleLanguageSelect = (lang) => {
    setCurrentLanguage(lang);
    setCurrentLanguageState(lang);
    setShowLanguageDropdown(false);
    // 重新加载页面以应用语言更改
    window.location.reload();
  };

  // 点击外部关闭下拉框
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowLanguageDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  return (
    <header className="header">
      <div className="header-title">{t('header_title')}</div>
      
      <div className="header-nav">
        {/* 编辑器按钮 */}
        {showEditorButtons && (
          <div className="editor-buttons">
            <button 
              type="button" 
              className="header-button" 
              onClick={onSaveDocument}
            >
              <i data-feather="save"></i>
              <span>{t('save_document')}</span>
            </button>
            <button 
              type="button" 
              className="header-button" 
              onClick={onBackToProject}
            >
              <i data-feather="arrow-left"></i>
              <span>{t('back_to_project')}</span>
            </button>
          </div>
        )}
        
        {/* 语言下拉框 */}
        <div className="lang-wrapper" ref={dropdownRef}>
          <button 
            className="header-button" 
            onClick={() => setShowLanguageDropdown(!showLanguageDropdown)}
          >
            {currentLanguage}
          </button>
          {showLanguageDropdown && (
            <div className="lang-dropdown">
              <div 
                className="lang-item" 
                onClick={() => handleLanguageSelect('简体中文')}
              >
                简体中文
              </div>
              <div 
                className="lang-item" 
                onClick={() => handleLanguageSelect('繁體中文')}
              >
                繁體中文
              </div>
              <div 
                className="lang-item" 
                onClick={() => handleLanguageSelect('English')}
              >
                English
              </div>
            </div>
          )}
        </div>
        
        <button 
          className="header-button" 
          onClick={onShowUserProfile}
        >
          {user?.username || t('user_info')}
        </button>
        
        <button 
          className="header-button logout-button" 
          onClick={handleLogout}
        >
          {t('logout')}
        </button>
      </div>
    </header>
  );
};

export default Header;