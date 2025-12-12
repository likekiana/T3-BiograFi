// src/components/common/Header.js
import React from 'react';
import { useAuth } from '../../hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { t } from '../../utils/language';
import '../../styles/components/Header.css';

const Header = ({ toggleSidebar }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    if (window.confirm(t('confirm_logout'))) {
      logout();
    }
  };

  const goToProfile = () => {
    navigate('/profile');
  };

  return (
    <header className="header">
      <div className="header-container">
        <div className="header-title-container">
          {toggleSidebar && (
            <button 
              type="button" 
              className="header-toggle-sidebar"
              onClick={toggleSidebar}
              aria-label="Toggle Sidebar"
            >
              <span className="toggle-icon">☰</span>
            </button>
          )}
          <div className="header-title" onClick={() => navigate('/dashboard')}>
            {t('header_title')}
          </div>
        </div>
        
        <div className="header-nav">
          {user ? (
            <>
              <button className="header-button user-button" onClick={goToProfile}>
                {user.username || t('user_info')}
              </button>
              <button className="header-button logout-button" onClick={handleLogout}>
                {t('logout')}
              </button>
            </>
          ) : (
            <>
              <button className="header-button" onClick={() => navigate('/login')}>
                {t('login')}
              </button>
              <button className="header-button" onClick={() => navigate('/register')}>
                {t('register')}
              </button>
            </>
          )}
        </div>
      </div>
    </header>
  );
};

export default Header;