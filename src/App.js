// src/App.js
import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './hooks/useAuth';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import { ToastContainer, Toast } from './components/common/Toast';
import './App.css';

// Toast 管理器组件
const ToastManager = () => {
  const [toasts, setToasts] = useState([]);

  const addToast = (message, type = 'info', duration = 3000) => {
    const id = Date.now().toString();
    setToasts(prev => [...prev, { id, message, type, duration }]);
  };

  const removeToast = (id) => {
    setToasts(prev => prev.filter(toast => toast.id !== id));
  };

  // 全局错误处理
  useEffect(() => {
    const handleError = (e) => {
      console.error('Global error:', e.error);
      addToast('发生了一个错误，请刷新页面重试', 'error');
    };

    const handleRejection = (e) => {
      console.error('Unhandled promise rejection:', e.reason);
      addToast('发生了一个错误，请刷新页面重试', 'error');
    };

    window.addEventListener('error', handleError);
    window.addEventListener('unhandledrejection', handleRejection);

    return () => {
      window.removeEventListener('error', handleError);
      window.removeEventListener('unhandledrejection', handleRejection);
    };
  }, []);

  // 全局 toast 函数
  useEffect(() => {
    window.showToast = addToast;
  }, []);

  return <ToastContainer toasts={toasts} removeToast={removeToast} />;
};

// 保护路由组件
const ProtectedRoute = ({ children }) => {
  const { isLoggedIn, loading } = useAuth();
  
  if (loading) {
    return (
      <div className="loading-fullscreen">
        <div className="loading-spinner-large"></div>
        <p>加载中...</p>
      </div>
    );
  }
  
  return isLoggedIn ? children : <Navigate to="/login" />;
};

// 公开路由组件（已登录用户不能访问）
const PublicRoute = ({ children }) => {
  const { isLoggedIn, loading } = useAuth();
  
  if (loading) {
    return (
      <div className="loading-fullscreen">
        <div className="loading-spinner-large"></div>
        <p>加载中...</p>
      </div>
    );
  }
  
  return !isLoggedIn ? children : <Navigate to="/dashboard" />;
};

function App() {
  return (
    <AuthProvider>
      <Router>
        <div className="App">
          <Routes>
            <Route 
              path="/login" 
              element={
                <PublicRoute>
                  <Login />
                </PublicRoute>
              } 
            />
            <Route 
              path="/register" 
              element={
                <PublicRoute>
                  <Register />
                </PublicRoute>
              } 
            />
            <Route 
              path="/dashboard" 
              element={
                <ProtectedRoute>
                  <Dashboard />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/" 
              element={<Navigate to="/dashboard" />} 
            />
            {/* 404 页面 */}
            <Route 
              path="*" 
              element={
                <div className="not-found">
                  <h1>404</h1>
                  <p>页面未找到</p>
                  <a href="/dashboard">返回首页</a>
                </div>
              } 
            />
          </Routes>
          
          {/* Toast 通知容器 */}
          <ToastManager />
        </div>
      </Router>
    </AuthProvider>
  );
}

export default App;