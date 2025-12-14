import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';

const SideNavigation = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [activeSection, setActiveSection] = useState('welcome');

  const sections = [
    { id: 'welcome', name: 'Welcome' },
    { id: 'features', name: '产品功能' },
    { id: 'demo', name: '标注示例' },
    { id: 'gantt', name: '甘特图' },
    { id: 'value', name: '亮点价值' },
    { id: 'team', name: '团队' },
    { id: 'footer', name: '背景说明' },
  ];

  // 监听滚动，更新当前激活的区域
  useEffect(() => {
    const handleScroll = () => {
      const scrollPosition = window.scrollY + 100;

      for (const section of sections) {
        const element = document.getElementById(section.id);
        if (element) {
          const { offsetTop, offsetHeight } = element;
          if (scrollPosition >= offsetTop && scrollPosition < offsetTop + offsetHeight) {
            setActiveSection(section.id);
            break;
          }
        }
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [sections]);

  // 滚动到指定区域
  const scrollToSection = (id) => {
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
      setIsOpen(false);
    }
  };

  return (
    <>
      {/* 呼出按钮 */}
      <button
        className="fixed top-5 left-5 z-50 p-2 rounded-full bg-neon-blue/20 hover:bg-neon-blue/40 transition-all"
        onClick={() => setIsOpen(true)}
      >
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16m-7 6h7" />
        </svg>
      </button>

      {/* 遮罩层 */}
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/70 z-40"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* 侧边导航栏 */}
      <motion.div
        initial={{ x: '-100%' }}
        animate={{ x: isOpen ? 0 : '-100%' }}
        exit={{ x: '-100%' }}
        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        className="fixed top-0 left-0 w-64 h-full bg-ink-black/95 backdrop-blur-md z-50 border-r border-neon-blue/20 p-5"
      >
        <div className="flex flex-col h-full">
          {/* 导航标题 */}
          <h2 className="text-2xl font-bold text-gold-brown mb-8">BiograFi</h2>

          {/* 导航列表 */}
          <nav className="flex-grow">
            <ul className="space-y-4">
              {sections.map((section) => (
                <li key={section.id}>
                  <button
                    className={`w-full text-left px-4 py-2 rounded-lg transition-all ${activeSection === section.id ? 'bg-neon-blue/20 text-neon-blue border-l-4 border-neon-blue' : 'hover:bg-purple-light/10 text-gray-300'}`}
                    onClick={() => scrollToSection(section.id)}
                  >
                    {section.name}
                  </button>
                </li>
              ))}
            </ul>
          </nav>

          {/* 关闭按钮 */}
          <div className="mt-auto">
            <button
              className="w-full px-4 py-2 rounded-lg bg-purple-light/20 hover:bg-purple-light/40 text-purple-light transition-all"
              onClick={() => setIsOpen(false)}
            >
              关闭菜单
            </button>
          </div>
        </div>
      </motion.div>
    </>
  );
};

export default SideNavigation;