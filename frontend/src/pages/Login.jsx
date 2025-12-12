// src/pages/Login.js
import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { t, getCurrentLanguage, setCurrentLanguage } from '../utils/language';
import { authService } from '../services/authService';
import '../styles/pages/Login.css';

const Login = () => {
  const [formData, setFormData] = useState({
    username: '',
    password: ''
  });
  const [rememberMe, setRememberMe] = useState(false);
  const [loading, setLoading] = useState(false);
  const [currentLanguage, setCurrentLanguageState] = useState(getCurrentLanguage());

  const { login, isLoggedIn } = useAuth();
  const navigate = useNavigate();

  // 如果已登录，重定向到首页
  useEffect(() => {
    if (isLoggedIn) {
      navigate('/dashboard');
    }
  }, [isLoggedIn, navigate]);

  // 加载记住的用户名
  useEffect(() => {
    const rememberedUsername = authService.getRememberedUsername();
    if (rememberedUsername) {
      setFormData(prev => ({ ...prev, username: rememberedUsername }));
      setRememberMe(true);
    }
  }, []);

  // 修复：正确的 Feather Icons 初始化
  useEffect(() => {
    const initializeFeatherIcons = () => {
      if (typeof window !== 'undefined' && window.feather) {
        window.feather.replace();
      }
    };

    // 延迟初始化以确保 DOM 已加载
    const timer = setTimeout(initializeFeatherIcons, 100);
    
    return () => clearTimeout(timer);
  }, []);

  const handleLanguageChange = (lang) => {
    setCurrentLanguage(lang);
    setCurrentLanguageState(lang);
    window.location.reload();
  };

  const handleSubmit = async () => {
    setLoading(true);

    // 表单验证
    if (!formData.username.trim()) {
      window.showToast('请输入用户名', 'warning');
      setLoading(false);
      return;
    }

    if (!formData.password) {
      window.showToast('请输入密码', 'warning');
      setLoading(false);
      return;
    }

    try {
      const result = await login(formData.username, formData.password);
      
      if (result.success) {
        // 记住用户名
        if (rememberMe) {
          authService.rememberUsername(formData.username);
        } else {
          authService.clearRememberedUsername();
        }
        
        window.showToast('登录成功', 'success');
        navigate('/dashboard');
      } else {
        const errorMessage = result.error || '登录失败';
        window.showToast(errorMessage, 'error');
      }
    } catch (err) {
      console.error('登录异常:', err);
      window.showToast('登录失败，请检查网络连接或重试', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleLoginClick = (e) => {
    if (e && e.preventDefault) {
      e.preventDefault();
    }
    handleSubmit();
  };

  return (
    <div className="login-page">
      {/* 语言选择器 */}
      <div className="lang-selector">
        <select 
          value={currentLanguage} 
          onChange={(e) => handleLanguageChange(e.target.value)}
        >
          <option value="简体中文">简体中文</option>
          <option value="繁體中文">繁體中文</option>
          <option value="English">English</option>
        </select>
      </div>

      <div className="login-container">
        <div className="login-card">
          <div className="login-header">
            <h1 id="login-title">{t('login_title')}</h1>
            <p id="login-subtitle">{t('login_subtitle')}</p>
          </div>
          
          <div className="login-form">
            <div className="form-group">
              <label htmlFor="username" id="username-label">
                <i data-feather="user"></i>
                <span>{t('username')}</span>
              </label>
              <input 
                type="text" 
                id="username" 
                name="username"
                value={formData.username}
                onChange={handleInputChange}
                placeholder={t('input_username')} 
                required 
                autoComplete="username"
                disabled={loading}
                onKeyPress={(e) => {
                  if (e.key === 'Enter') handleLoginClick(e);
                }}
              />
            </div>
            
            <div className="form-group">
              <label htmlFor="password" id="password-label">
                <i data-feather="lock"></i>
                <span>{t('password')}</span>
              </label>
              <input 
                type="password" 
                id="password" 
                name="password"
                value={formData.password}
                onChange={handleInputChange}
                placeholder={t('input_password')} 
                required
                autoComplete="current-password"
                disabled={loading}
                onKeyPress={(e) => {
                  if (e.key === 'Enter') handleLoginClick(e);
                }}
              />
            </div>
            
            <div className="form-options">
              <label className="remember-me">
                <input 
                  type="checkbox" 
                  id="remember-me"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  disabled={loading}
                />
                <span id="remember-me-text">{t('remember_me')}</span>
              </label>
            </div>
            
            <button 
              type="button"
              className="login-btn" 
              onClick={handleLoginClick}
              disabled={loading}
            >
              {loading ? (
                <>
                  <i data-feather="loader" className="spin"></i>
                  <span id="logging-in-text">{t('logging_in')}</span>
                </>
              ) : (
                <span id="login-text">{t('login')}</span>
              )}
            </button>
            
            {/* 错误信息通过 Toast 组件显示 */}
          </div>
          
          <div className="login-footer">
            <p id="no-account-text">
              {t('no_account')}
              <Link to="/register" className="register-link" id="register-link">
                {t('register_now')}
              </Link>
            </p>
            <p className="default-account" id="default-account">
              {t('default_account')}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;