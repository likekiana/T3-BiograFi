import React from 'react';
import SideNavigation from './components/SideNavigation';
import Hero from './components/Hero';
import FeatureTabs from './components/FeatureTabs';
import CodeDemo from './components/CodeDemo';
import GanttScrollView from './components/GanttScrollView';
import ValueHighlights from './components/ValueHighlights';
import TeamMembers from './components/TeamMembers';
import Footer from './components/Footer';
import './App.css';

function App() {
  return (
    <div className="app">
      {/* 侧边导航栏 */}
      <SideNavigation />
      
      {/* 主内容 */}
      <main className="main-content">
        {/* 欢迎Hero区 */}
        <Hero />
        
        {/* 产品功能展示区 */}
        <FeatureTabs />
        
        {/* 智能标注示例区 */}
        <CodeDemo />
        
        {/* 功能流程展示区 */}
        <GanttScrollView />
        
        {/* 产品价值亮点区 */}
        <ValueHighlights />
        
        {/* 团队成员展示区 */}
        <TeamMembers />
        
        {/* 产品背景与版权说明区 */}
        <Footer />
      </main>
    </div>
  );
}

export default App;
