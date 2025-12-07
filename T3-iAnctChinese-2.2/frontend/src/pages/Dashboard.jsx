// src/pages/Dashboard.js
import React, { useState, useEffect } from 'react';
import Header from '../components/common/Header';
import ProjectList from '../components/projects/ProjectList';
import DocumentList from '../components/documents/DocumentList';
import Editor from './Editor';
import Modal from '../components/common/Modal';
import { useAuth } from '../hooks/useAuth';
import { t } from '../utils/language';
import '../styles/pages/Dashboard.css';

const Dashboard = () => {
  const { user, updateUser } = useAuth();
  const [currentView, setCurrentView] = useState('home'); // 'home', 'documents', 'editor'
  const [currentProject, setCurrentProject] = useState(null);
  const [currentDocument, setCurrentDocument] = useState(null);
  const [showUserProfile, setShowUserProfile] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [profileData, setProfileData] = useState({
    email: '',
    newPassword: '',
    confirmPassword: ''
  });

  // 初始化用户数据
  useEffect(() => {
    if (user) {
      setProfileData(prev => ({
        ...prev,
        email: user.email || ''
      }));
    }
  }, [user]);

  const handleOpenProject = (project) => {
    setCurrentProject(project);
    setCurrentView('documents');
  };

  const handleOpenDocument = (document) => {
    setCurrentDocument(document);
    setCurrentView('editor');
  };

  const handleBackToProjects = () => {
    setCurrentProject(null);
    setCurrentView('home');
  };

  const handleBackToDocuments = () => {
    setCurrentDocument(null);
    setCurrentView('documents');
  };

  const handleSaveDocument = () => {
    // 保存文档的逻辑将在 Editor 组件中实现
    console.log('保存文档');
  };

  const handleUpdateProfile = async () => {
    if (!profileData.email || !isValidEmail(profileData.email)) {
      alert('请输入有效的邮箱地址');
      return;
    }

    if (profileData.newPassword || profileData.confirmPassword) {
      if (profileData.newPassword !== profileData.confirmPassword) {
        alert('两次输入的密码不一致');
        return;
      }
      if (profileData.newPassword.length < 6) {
        alert('密码至少需要6个字符');
        return;
      }
    }

    const updates = { email: profileData.email };
    if (profileData.newPassword) {
      updates.password = profileData.newPassword;
    }

    try {
      const result = await updateUser(updates);
      if (result.success) {
        alert('个人信息更新成功');
        setShowUserProfile(false);
        setProfileData({
          email: user.email || '',
          newPassword: '',
          confirmPassword: ''
        });

        // 如果修改了密码，提示重新登录
        if (profileData.newPassword) {
          setTimeout(() => {
            setShowLogoutConfirm(true);
          }, 1000);
        }
      } else {
        alert(result.error || '更新失败');
      }
    } catch (error) {
      alert('更新失败，请重试');
    }
  };

  const handleConfirmLogout = () => {
    setShowLogoutConfirm(false);
    window.location.href = '/login';
  };

  const renderContent = () => {
    switch (currentView) {
      case 'home':
        return <ProjectList onOpenProject={handleOpenProject} />;
      case 'documents':
        return (
          <DocumentList 
            project={currentProject}
            onOpenDocument={handleOpenDocument}
            onBack={handleBackToProjects}
          />
        );
      case 'editor':
        return (
          <Editor 
            document={currentDocument}
            project={currentProject}
            onBack={handleBackToDocuments}
            onSave={handleSaveDocument}
          />
        );
      default:
        return <ProjectList onOpenProject={handleOpenProject} />;
    }
  };

  // 辅助函数
  const isValidEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  return (
    <div className="dashboard">
      <Header 
        onShowUserProfile={() => setShowUserProfile(true)}
        showEditorButtons={currentView === 'editor'}
        onSaveDocument={handleSaveDocument}
        onBackToProject={handleBackToDocuments}
      />
      
      <main className="dashboard-main">
        {renderContent()}
      </main>

      {/* 用户信息模态框 */}
      <Modal
        isOpen={showUserProfile}
        onClose={() => setShowUserProfile(false)}
        title={t('user_info')}
        onSubmit={handleUpdateProfile}
        submitText={t('save_changes')}
        size="large"
      >
        <div className="profile-form">
          <div className="form-group">
            <label>{t('username')}</label>
            <input
              type="text"
              value={user?.username || ''}
              readOnly
              className="readonly-input"
            />
          </div>
          
          <div className="form-group">
            <label>{t('email')} *</label>
            <input
              type="email"
              value={profileData.email}
              onChange={(e) => setProfileData(prev => ({ ...prev, email: e.target.value }))}
              placeholder={t('input_email')}
            />
          </div>
          
          <div className="form-group">
            <label>{t('new_password')}</label>
            <input
              type="password"
              value={profileData.newPassword}
              onChange={(e) => setProfileData(prev => ({ ...prev, newPassword: e.target.value }))}
              placeholder={t('new_password')}
            />
          </div>
          
          <div className="form-group">
            <label>{t('confirm_password')}</label>
            <input
              type="password"
              value={profileData.confirmPassword}
              onChange={(e) => setProfileData(prev => ({ ...prev, confirmPassword: e.target.value }))}
              placeholder={t('confirm_password')}
            />
          </div>
          
          <div className="form-group">
            <label>{t('registered_at')}</label>
            <input
              type="text"
              value={user?.created_at || '-'}
              readOnly
              className="readonly-input"
            />
          </div>
          
          <div className="form-group">
            <label>{t('last_login')}</label>
            <input
              type="text"
              value={user?.last_login || '从未登录'}
              readOnly
              className="readonly-input"
            />
          </div>
        </div>
      </Modal>

      {/* 重新登录确认模态框 */}
      <Modal
        isOpen={showLogoutConfirm}
        onClose={() => setShowLogoutConfirm(false)}
        title="重新登录提示"
        onSubmit={handleConfirmLogout}
        onCancel={() => setShowLogoutConfirm(false)}
        submitText="立即重新登录"
        cancelText="稍后手动登录"
      >
        <div className="logout-confirm-content">
          <p>密码已修改，为了安全需要重新登录。</p>
          <p>是否立即跳转到登录页面？</p>
        </div>
      </Modal>
    </div>
  );
};

export default Dashboard;