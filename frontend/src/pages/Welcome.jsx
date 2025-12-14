import React from 'react';
import SideNavigation from '../components/welcome/SideNavigation';
import Hero from '../components/welcome/Hero';
import FeatureTabs from '../components/welcome/FeatureTabs';
import CodeDemo from '../components/welcome/CodeDemo';
import GanttScrollView from '../components/welcome/GanttScrollView';
import ValueHighlights from '../components/welcome/ValueHighlights';
import TeamMembers from '../components/welcome/TeamMembers';
import Footer from '../components/welcome/Footer';
import '../styles/pages/Welcome.css';

function Welcome() {
  return (
    <div className="welcome-app">
      <SideNavigation />
      <main className="welcome-main-content">
        <Hero />
        <FeatureTabs />
        <CodeDemo />
        <GanttScrollView />
        <ValueHighlights />
        <TeamMembers />
        <Footer />
      </main>
    </div>
  );
}

export default Welcome;
