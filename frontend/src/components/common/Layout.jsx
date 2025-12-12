// src/components/common/Layout.jsx
import React, { useState } from 'react';
import Header from './Header';
import Sidebar from './Sidebar';
import { Outlet } from 'react-router-dom';

const Layout = () => {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  const toggleSidebar = () => {
    setIsSidebarCollapsed(!isSidebarCollapsed);
  };

  return (
    <div className="app-layout">
      <Header toggleSidebar={toggleSidebar} />
      <div className="app-content">
        <Sidebar isCollapsed={isSidebarCollapsed} toggleSidebar={toggleSidebar} />
        <main 
          className={`main-content ${isSidebarCollapsed ? 'sidebar-collapsed' : ''}`}
          style={{
            marginLeft: isSidebarCollapsed ? '60px' : '200px',
            transition: 'margin-left 0.3s ease'
          }}
        >
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default Layout;