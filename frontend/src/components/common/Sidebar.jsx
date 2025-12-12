// src/components/common/Sidebar.js
import React, { useState, useEffect } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { useNavigate, useLocation } from 'react-router-dom';
import { useProjects } from '../../hooks/useProjects';
import { t } from '../../utils/language';
import { 
  Home, 
  FileText, 
  Edit, 
  BarChart2, 
  User, 
  Settings,
  ChevronsDown,
  ChevronsRight
} from 'react-feather';
import '../../styles/components/Sidebar.css';

const Sidebar = ({ isCollapsed, toggleSidebar }) => {
  const { user } = useAuth();
  const { projects, loading } = useProjects();
  const navigate = useNavigate();
  const location = useLocation();
  const [expandedMenu, setExpandedMenu] = useState(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  // 从localStorage加载侧边栏状态
  useEffect(() => {
    const savedState = localStorage.getItem('sidebarState');
    if (savedState) {
      setIsSidebarOpen(JSON.parse(savedState));
    }
  }, []);

  // 保存侧边栏状态到localStorage
  useEffect(() => {
    localStorage.setItem('sidebarState', JSON.stringify(!isCollapsed));
  }, [isCollapsed]);

  // 生成实际项目列表
  const projectItems = projects.map(project => ({
    id: project.id,
    name: project.name,
    path: `/project/${project.id}`
  }));

  // 导航菜单数据
  const navItems = [
    { name: 'dashboard', label: '仪表盘', path: '/dashboard', icon: Home },
    { 
      name: 'projects', 
      label: '项目', 
      path: '/projects',
      hasChildren: true,
      children: projectItems,
      icon: FileText
    },
    { name: 'editor', label: '编辑器', path: '/editor', icon: Edit },
    { name: 'visualization', label: '可视化', path: '/visualization', icon: BarChart2 },
    { name: 'profile', label: '个人资料', path: '/profile', icon: User },
    { name: 'settings', label: '设置', path: '/settings', icon: Settings }
  ];

  // 检查当前页面是否匹配导航项（支持子路由）
  const isActive = (path) => {
    // 完全匹配或子路由匹配
    return location.pathname === path || 
           (location.pathname.startsWith(path + '/') && path !== '/');
  };

  // 检查子菜单是否有激活项
  const hasActiveChild = (children) => {
    return children.some(child => location.pathname.startsWith(child.path));
  };

  const handleNavigation = (path) => {
    navigate(path);
  };

  const toggleSubMenu = (menuName) => {
    setExpandedMenu(expandedMenu === menuName ? null : menuName);
  };

  return (
    <aside className={`sidebar ${isCollapsed ? 'collapsed' : ''}`}>
      {/* 侧边栏头部 */}
      <div className="sidebar-header">
        <button 
          type="button" 
          className="sidebar-toggle" 
          onClick={toggleSidebar}
          aria-label={isCollapsed ? '展开侧边栏' : '折叠侧边栏'}
        >
          <span className="toggle-icon">{isCollapsed ? '▶' : '◀'}</span>
        </button>
        {!isCollapsed && (
          <div className="sidebar-title">项目管理</div>
        )}
      </div>

      {/* 侧边栏导航 */}
      <nav className="sidebar-nav">
        <ul className="sidebar-nav-list">
          {navItems.map((item) => (
            <li 
              key={item.name} 
              className={`sidebar-nav-item ${isActive(item.path) || (item.hasChildren && hasActiveChild(item.children)) ? 'active' : ''}`}
            >
              <button 
                type="button" 
                className="sidebar-nav-link"
                onClick={() => {
                  if (item.hasChildren) {
                    toggleSubMenu(item.name);
                  } else {
                    handleNavigation(item.path);
                  }
                }}
              >
                <item.icon size={18} className="nav-item-icon" />
                {item.hasChildren ? (
                  <span className={`nav-item-arrow ${expandedMenu === item.name ? 'expanded' : ''}`}>
                    {expandedMenu === item.name ? <ChevronsDown size={14} /> : <ChevronsRight size={14} />}
                  </span>
                ) : (
                  <span className="nav-item-arrow"></span>
                )}
                <span className="nav-item-label">{item.label}</span>
              </button>
              
              {/* 子菜单 */}
              {item.hasChildren && expandedMenu === item.name && !isCollapsed && (
                <ul className="sidebar-subnav-list">
                  {item.name === 'projects' && loading ? (
                    <li className="sidebar-subnav-item loading">
                      <span className="nav-item-arrow">•</span>
                      <span className="nav-item-label">加载中...</span>
                    </li>
                  ) : item.children.length === 0 ? (
                    <li className="sidebar-subnav-item empty">
                      <span className="nav-item-arrow">•</span>
                      <span className="nav-item-label">暂无项目</span>
                    </li>
                  ) : (
                    item.children.map((child) => (
                      <li 
                        key={child.id} 
                        className={`sidebar-subnav-item ${isActive(child.path) ? 'active' : ''}`}
                      >
                        <button 
                        type="button" 
                        className="sidebar-subnav-link"
                        onClick={() => handleNavigation(child.path)}
                      >
                        <FileText size={16} className="nav-item-icon subnav-icon" />
                        <span className="nav-item-label">{child.name}</span>
                      </button>
                      </li>
                    ))
                  )}
                </ul>
              )}
            </li>
          ))}
        </ul>
      </nav>

      {/* 侧边栏底部 */}
      {user && !isCollapsed && (
        <div className="sidebar-footer">
          <div className="sidebar-user-info">
            <div className="sidebar-user-name">{user.username}</div>
            <div className="sidebar-user-role">{user.role || '用户'}</div>
          </div>
        </div>
      )}
    </aside>
  );
};

export default Sidebar;