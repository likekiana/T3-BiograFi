// src/pages/Register.js
import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { t, getCurrentLanguage, setCurrentLanguage } from '../utils/language';
import { isValidEmail } from '../utils';
import '../styles/pages/Register.css';

const Register = () => {
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    confirmPassword: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [currentLanguage, setCurrentLanguageState] = useState(getCurrentLanguage());

  const { register, isLoggedIn } = useAuth();
  const navigate = useNavigate();

  // 如果已登录，重定向到首页
  useEffect(() => {
    if (isLoggedIn) {
      navigate('/dashboard');
    }
  }, [isLoggedIn, navigate]);

  // 修复：正确的 Feather Icons 初始化
  useEffect(() => {
    const initializeFeatherIcons = () => {
      if (typeof window !== 'undefined' && window.feather) {
        window.feather.replace();
      }
    };

    const timer = setTimeout(initializeFeatherIcons, 100);
    return () => clearTimeout(timer);
  }, []);

  const handleLanguageChange = (lang) => {
    setCurrentLanguage(lang);
    setCurrentLanguage(lang);
    window.location.reload();
  };

  const handleSubmit = async () => {
    setError('');
    setSuccess('');
    setLoading(true);

    // 验证逻辑
    if (formData.username.length < 3 || formData.username.length > 20) {
      setError('用户名长度应在3-20个字符之间');
      setLoading(false);
      return;
    }

    if (!isValidEmail(formData.email)) {
      setError('请输入有效的邮箱地址');
      setLoading(false);
      return;
    }

    if (formData.password.length < 6) {
      setError('密码至少需要6个字符');
      setLoading(false);
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      setError('两次输入的密码不一致');
      setLoading(false);
      return;
    }

    try {
      console.log('开始注册请求...', formData.username);
      const result = await register(formData.username, formData.email, formData.password);
      console.log('注册结果:', result);
      
      if (result.success) {
        setSuccess('注册成功！3秒后跳转到登录页...');
        console.log('注册成功，准备跳转到登录页...');
        
        // 修复：使用更可靠的跳转方式
        setTimeout(() => {
          console.log('执行跳转到登录页');
          navigate('/login', { replace: true });
        }, 3000);
      } else {
        setError(result.error || '注册失败');
        console.error('注册失败:', result.error);
      }
    } catch (err) {
      console.error('注册异常:', err);
      setError('注册失败，请重试');
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

  const handleRegisterClick = (e) => {
    if (e && e.preventDefault) {
      e.preventDefault();
    }
    handleSubmit();
  };

  return (
    <div className="register-page">
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

      <div className="register-container">
        <div className="register-card">
          <div className="register-header">
            <h1 id="register-title">{t('register_title')}</h1>
            <p id="register-subtitle">{t('register_subtitle')}</p>
          </div>
          
          <div className="register-form">
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
                placeholder={t('username_length')} 
                required 
                minLength="3"
                maxLength="20"
                disabled={loading}
              />
            </div>
            
            <div className="form-group">
              <label htmlFor="email" id="email-label">
                <i data-feather="mail"></i>
                <span>{t('email')}</span>
              </label>
              <input 
                type="email" 
                id="email" 
                name="email"
                value={formData.email}
                onChange={handleInputChange}
                placeholder={t('input_email')} 
                required
                disabled={loading}
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
                placeholder={t('password_length')} 
                required
                minLength="6"
                disabled={loading}
              />
            </div>
            
            <div className="form-group">
              <label htmlFor="confirm-password" id="confirm-password-label">
                <i data-feather="check-circle"></i>
                <span>{t('confirm_password')}</span>
              </label>
              <input 
                type="password" 
                id="confirm-password" 
                name="confirmPassword"
                value={formData.confirmPassword}
                onChange={handleInputChange}
                placeholder={t('reinput_password')} 
                required
                minLength="6"
                disabled={loading}
              />
            </div>
            
            <button 
              type="button"
              className="register-btn" 
              onClick={handleRegisterClick}
              disabled={loading}
            >
              {loading ? (
                <>
                  <i data-feather="loader" className="spin"></i>
                  <span id="registering-text">{t('registering')}</span>
                </>
              ) : (
                <span id="register-text">{t('register')}</span>
              )}
            </button>
            
            {error && (
              <div id="error-message" className="error-message">
                <i data-feather="alert-circle"></i>
                {error}
              </div>
            )}
            
            {success && (
              <div id="success-message" className="success-message">
                <i data-feather="check-circle"></i>
                {success}
                <div style={{ marginTop: '10px', fontSize: '14px' }}>
                  <button 
                    type="button"
                    className="login-link"
                    onClick={() => navigate('/login', { replace: true })}
                    style={{ 
                      background: 'none', 
                      border: 'none', 
                      color: '#007bff', 
                      textDecoration: 'underline',
                      cursor: 'pointer'
                    }}
                  >
                    立即跳转到登录页
                  </button>
                </div>
              </div>
            )}
          </div>
          
          <div className="register-footer">
            <p id="has-account-text">
              {t('has_account')}
              <Link to="/login" className="login-link" id="login-link">
                {t('login_now')}
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Register;