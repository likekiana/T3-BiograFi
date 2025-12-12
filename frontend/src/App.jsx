// src/App.js
import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { AuthProvider, useAuth } from './hooks/useAuth.jsx';
import Login from './pages/Login.jsx';
import Register from './pages/Register.jsx';
import Dashboard from './pages/Dashboard.jsx';
import Editor from './pages/Editor.jsx';
import Profile from './pages/Profile.jsx';
import Settings from './pages/Settings.jsx';
import DataVisualization from './components/visualization/DataVisualization.jsx';
import ProjectVisualization from './components/visualization/ProjectVisualization.jsx';
import { ToastContainer } from './components/common/Toast.jsx';
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

// 导入外部Layout组件
import Layout from './components/common/Layout.jsx';

// 保护路由组件
const ProtectedRoute = () => {
  const { isLoggedIn, loading } = useAuth();
  
  if (loading) {
    return (
      <div className="loading-fullscreen">
        <div className="loading-spinner-large"></div>
        <p>加载中...</p>
      </div>
    );
  }
  
  return isLoggedIn ? <Outlet /> : <Navigate to="/login" />;
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
            {/* 受保护路由使用嵌套结构，结合Layout组件 */}
            <Route element={<ProtectedRoute />}>
              <Route element={<Layout />}>
                {/* 仪表板路由 */}
                <Route 
                  path="/dashboard" 
                  element={<Dashboard />} 
                />
                <Route 
                  path="/" 
                  element={<Navigate to="/dashboard" />} 
                />
                
                {/* 项目管理路由 */}
                <Route path="/projects" element={<Dashboard />} />
                <Route path="/project/:id" element={<Dashboard />} />
                
                {/* 编辑器路由 */}
                <Route 
                  path="/editor" 
                  element={<Editor />} 
                />
                <Route 
                  path="/editor/:id" 
                  element={<Editor />} 
                />
                
                {/* 可视化路由 */}
                <Route 
                  path="/visualization" 
                  element={<DataVisualization />} 
                />
                <Route 
                  path="/project-visualization" 
                  element={<ProjectVisualization />} 
                />
                
                {/* 用户相关路由 */}
                <Route path="/profile" element={<Profile />} />
                <Route path="/settings" element={<Settings />} />
              </Route>
            </Route>
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