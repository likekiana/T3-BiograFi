// src/components/common/Header.js
import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { t } from '../../utils/language';
import '../../styles/components/Header.css';

const Header = ({ showEditorButtons = false, onSaveDocument, onBackToProject, onShowUserProfile }) => {
  const { user, logout } = useAuth();
  

  const handleLogout = () => {
    if (window.confirm(t('confirm_logout'))) {
      logout();
    }
  };

  const navigate = useNavigate();

  const goToProfile = () => {
    // 如果上层传递了 onShowUserProfile，保持向后兼容，仍然触发它
    if (onShowUserProfile) {
      onShowUserProfile();
    }
    navigate('/profile');
  };

  const goToSettings = () => {
    navigate('/settings');
  };

  

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
              onClick={onBackToProject}
            >
              <i data-feather="arrow-left"></i>
              <span>{t('back_to_project')}</span>
            </button>
          </div>
        )}
        
        {/* 语言下拉已移入设置中心 */}
        
        {user ? (
          <>
            <button className="header-button" onClick={goToProfile}>
              {user.username || t('user_info')}
            </button>
            <button className="header-button" onClick={goToSettings}>
              设置
            </button>
            <button className="header-button logout-button" onClick={handleLogout}>
              {t('logout')}
            </button>
          </>
        ) : (
          <>
            <button className="header-button" onClick={onShowUserProfile}>
              {t('user_info')}
            </button>
            <button className="header-button logout-button" onClick={handleLogout}>
              {t('logout')}
            </button>
          </>
        )}
      </div>
    </header>
  );
};

export default Header;