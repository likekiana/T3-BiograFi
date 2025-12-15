import React from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { tomorrow } from 'react-syntax-highlighter/dist/esm/styles/prism';
import './Welcome.css';

// Hero 组件
const Hero = ({ onExplore }) => {
  return (
    <section id="welcome" className="welcome-hero">
      <div className="welcome-hero-bg"></div>
      <motion.div
        className="welcome-blob welcome-blob-1"
        animate={{ y: [0, 20, 0], scale: [1, 1.1, 1] }}
        transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className="welcome-blob welcome-blob-2"
        animate={{ y: [0, -20, 0], scale: [1, 1.2, 1] }}
        transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
      />
      <div className="welcome-hero-content">
        <motion.h1
          initial={{ opacity: 0, y: -50 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, delay: 0.2 }}
          className="welcome-title"
        >
          BiograFi｜传记快线
        </motion.h1>
        <motion.p
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, delay: 0.5 }}
          className="welcome-subtitle"
        >
          面向历史人物研究的下一代智能标注平台
        </motion.p>
        <motion.p
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, delay: 0.7 }}
          className="welcome-desc"
        >
          融合古籍研究方法与人工智能技术，为传记学、历史学、人文学研究提供更高效的文献处理体验。
        </motion.p>
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, delay: 1 }}
          className="welcome-buttons"
        >
          <button className="welcome-btn welcome-btn-primary" onClick={onExplore}>
            开始探索
          </button>
          <button
            className="welcome-btn welcome-btn-secondary"
            onClick={() => document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' })}
          >
            了解产品功能
          </button>
        </motion.div>
      </div>
    </section>
  );
};

// SideNavigation 组件
const SideNavigation = () => {
  const [isOpen, setIsOpen] = React.useState(false);
  const [activeSection, setActiveSection] = React.useState('welcome');
  const sections = [
    { id: 'welcome', name: 'Welcome' },
    { id: 'features', name: '产品功能' },
    { id: 'demo', name: '标注示例' },
    { id: 'gantt', name: '甘特图' },
    { id: 'value', name: '亮点价值' },
    { id: 'team', name: '团队' },
    { id: 'footer', name: '背景说明' },
  ];

  // 使用 IntersectionObserver 替代滚动事件监听，更可靠
  React.useEffect(() => {
    const observerOptions = {
      root: null,
      rootMargin: '-20% 0px -70% 0px', // 当元素进入视口上部 20%-30% 区域时触发
      threshold: 0
    };

    const observerCallback = (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          setActiveSection(entry.target.id);
        }
      });
    };

    const observer = new IntersectionObserver(observerCallback, observerOptions);

    // 观察所有 section 元素
    sections.forEach((section) => {
      const element = document.getElementById(section.id);
      if (element) {
        observer.observe(element);
      }
    });

    return () => observer.disconnect();
  }, []);

  return (
    <>
      <button className="welcome-nav-toggle" onClick={() => setIsOpen(true)}>
        <svg width="24" height="24" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16m-7 6h7" />
        </svg>
      </button>
      {isOpen && <div className="welcome-nav-overlay" onClick={() => setIsOpen(false)} />}
      <div className={`welcome-nav-sidebar ${isOpen ? 'open' : ''}`}>
        <h2 className="welcome-nav-title">BiograFi</h2>
        <nav className="welcome-nav-list">
          {sections.map((section) => (
            <button
              key={section.id}
              className={`welcome-nav-item ${activeSection === section.id ? 'active' : ''}`}
              onClick={() => { document.getElementById(section.id)?.scrollIntoView({ behavior: 'smooth' }); setIsOpen(false); }}
            >
              {section.name}
            </button>
          ))}
        </nav>
        <button className="welcome-nav-close" onClick={() => setIsOpen(false)}>关闭菜单</button>
      </div>
    </>
  );
};

// FeatureTabs 组件
const FeatureTabs = () => {
  const [activeTab, setActiveTab] = React.useState(0);
  const features = [
    { title: '自动分词', description: '基于AI技术的智能分词系统，支持现代文和古文的精确分词。', icon: '🔤' },
    { title: '实体标注', description: '自动识别并标注文本中的姓名、地名、官职、事件等实体信息。', icon: '🏷️' },
    { title: '专籍解析', description: '支持《旧唐书》《清史稿》等古籍传记的结构化解析。', icon: '📚' },
    { title: '智能问答', description: '基于传记知识图谱的智能问答系统，提供精准的历史人物信息查询。', icon: '💬' },
  ];

  return (
    <section id="features" className="welcome-section">
      <motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} transition={{ duration: 0.8 }} viewport={{ once: true }} className="welcome-section-header">
        <h2 className="welcome-section-title">核心功能展示</h2>
        <p className="welcome-section-desc">BiograFi｜传记快线提供多种智能功能，为历史人物研究提供高效的文献处理体验</p>
      </motion.div>
      <motion.div initial={{ opacity: 0, y: 50 }} whileInView={{ opacity: 1, y: 0 }} transition={{ duration: 0.8 }} viewport={{ once: true }} className="welcome-card">
        <div className="welcome-tabs">
          {features.map((feature, index) => (
            <button key={index} className={`welcome-tab ${activeTab === index ? 'active' : ''}`} onClick={() => setActiveTab(index)}>
              <span className="welcome-tab-icon">{feature.icon}</span>{feature.title}
            </button>
          ))}
        </div>
        <motion.div key={activeTab} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.5 }} className="welcome-tab-content">
          <div className="welcome-tab-demo">
            <div className="welcome-tab-demo-icon">{features[activeTab].icon}</div>
            <p>{features[activeTab].title} 功能演示</p>
          </div>
          <div className="welcome-tab-info">
            <h3>{features[activeTab].title}</h3>
            <p>{features[activeTab].description}</p>
            <ul><li>高效处理大量文献资料</li><li>精确的实体识别与标注</li><li>支持多种古籍文献格式</li><li>智能问答系统提供精准信息</li></ul>
          </div>
        </motion.div>
      </motion.div>
    </section>
  );
};


// CodeDemo 组件
const CodeDemo = () => {
  const exampleText = "李白，字太白，青莲居士，唐代著名诗人。";
  const annotations = [
    { text: "李白", type: "PERSON", color: "#3b82f6" },
    { text: "唐代", type: "EVENT-TIME", color: "#22c55e" },
    { text: "诗人", type: "OCCUPATION", color: "#a855f7" },
  ];
  const codeExample = `// 智能标注示例代码
const text = "李白，字太白，青莲居士，唐代著名诗人。";
const result = biograFi.annotate(text);
// 输出结果
{
  "entities": [
    { "text": "李白", "type": "PERSON", "start": 0, "end": 2 },
    { "text": "唐代", "type": "EVENT-TIME", "start": 8, "end": 10 },
    { "text": "诗人", "type": "OCCUPATION", "start": 11, "end": 13 }
  ]
}`;

  return (
    <section id="demo" className="welcome-section welcome-section-alt">
      <motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} transition={{ duration: 0.8 }} viewport={{ once: true }} className="welcome-section-header">
        <h2 className="welcome-section-title">智能标注示例</h2>
        <p className="welcome-section-desc">演示文本智能标注的真实效果，支持现代文和古文</p>
      </motion.div>
      <motion.div initial={{ opacity: 0, y: 50 }} whileInView={{ opacity: 1, y: 0 }} transition={{ duration: 0.8 }} viewport={{ once: true }} className="welcome-card">
        <h3 className="welcome-card-title">标注结果展示</h3>
        <div className="welcome-demo-grid">
          <div className="welcome-demo-box">
            <h4>示例文档</h4>
            <div className="welcome-demo-text">{exampleText}</div>
          </div>
          <div className="welcome-demo-box">
            <h4>标注结果</h4>
            <div className="welcome-demo-text">
              {exampleText.split(/(李白|唐代|诗人)/).map((part, index) => {
                const annotation = annotations.find(ann => ann.text === part);
                return annotation ? <span key={index} style={{ backgroundColor: annotation.color, color: '#fff', padding: '2px 6px', borderRadius: '4px' }}>{part}</span> : part;
              })}
            </div>
            <div className="welcome-demo-legend">
              {annotations.map((ann, i) => (<span key={i}><span className="welcome-legend-dot" style={{ backgroundColor: ann.color }}></span>{ann.type}</span>))}
            </div>
          </div>
        </div>
      </motion.div>
      <motion.div initial={{ opacity: 0, y: 50 }} whileInView={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, delay: 0.2 }} viewport={{ once: true }} className="welcome-card">
        <h3 className="welcome-card-title">代码示例</h3>
        <SyntaxHighlighter language="javascript" style={tomorrow} showLineNumbers>{codeExample}</SyntaxHighlighter>
      </motion.div>
    </section>
  );
};

// GanttScrollView 组件
const GanttScrollView = () => {
  const ganttData = [
    { task: '需求分析', start: 0, duration: 15, color: '#5f8cff' },
    { task: '数据处理', start: 10, duration: 20, color: '#ab6eff' },
    { task: '模型训练', start: 20, duration: 25, color: '#5f8cff' },
    { task: '前端开发', start: 15, duration: 25, color: '#ab6eff' },
    { task: '后端开发', start: 20, duration: 20, color: '#5f8cff' },
    { task: '标注系统构建', start: 30, duration: 15, color: '#ab6eff' },
    { task: '测试', start: 40, duration: 10, color: '#5f8cff' },
    { task: '文档/展示', start: 45, duration: 10, color: '#ab6eff' },
  ];

  return (
    <section id="gantt" className="welcome-section">
      <motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} transition={{ duration: 0.8 }} viewport={{ once: true }} className="welcome-section-header">
        <h2 className="welcome-section-title">功能流程展示</h2>
        <p className="welcome-section-desc">展示BiograFi｜传记快线项目的完整开发流程</p>
      </motion.div>
      <motion.div initial={{ opacity: 0, y: 50 }} whileInView={{ opacity: 1, y: 0 }} transition={{ duration: 0.8 }} viewport={{ once: true }} className="welcome-card welcome-gantt-container">
        <svg width={2400} height={300} viewBox="0 0 2400 300">
          <defs><pattern id="grid" width="50" height="50" patternUnits="userSpaceOnUse"><path d="M 50 0 L 0 0 0 50" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="1" /></pattern></defs>
          <rect width={2400} height={300} fill="url(#grid)" />
          {ganttData.map((item, index) => {
            const y = 40 + index * 40;
            return (<g key={index}><rect x={item.start * 10} y={y} width={item.duration * 10} height={30} fill={item.color} opacity="0.8" rx="4" /><text x={item.start * 10 + 10} y={y + 20} fill="white" fontSize="14" fontWeight="bold">{item.task}</text></g>);
          })}
          <line x1="0" y1="20" x2="2400" y2="20" stroke="rgba(255,255,255,0.5)" strokeWidth="2" />
          {Array.from({ length: 61 }, (_, i) => i * 10).map((time) => (<g key={time}><line x1={time * 10} y1="20" x2={time * 10} y2="25" stroke="rgba(255,255,255,0.5)" strokeWidth="2" /><text x={time * 10 + 5} y="35" fill="rgba(255,255,255,0.7)" fontSize="12">{time}</text></g>))}
        </svg>
      </motion.div>
    </section>
  );
};

// ValueHighlights 组件
const ValueHighlights = () => {
  const valueHighlights = [
    { title: '提高古籍文献处理效率', description: '通过自动标注技术，大幅提升古籍文献的处理速度和准确性，减少人工标注的时间成本。', icon: '⚡' },
    { title: '统一历史人物数据规范', description: '基于知识图谱技术，为历史人物研究提供标准化的数据模型，促进学术研究的一致性和可比性。', icon: '🔗' },
    { title: '科学研究工具', description: '为学者和爱好者提供智能问答、查询和传记结构化等功能，助力更深入的历史人物研究。', icon: '🔬' },
  ];

  return (
    <section id="value" className="welcome-section welcome-section-alt">
      <motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} transition={{ duration: 0.8 }} viewport={{ once: true }} className="welcome-section-header">
        <h2 className="welcome-section-title">产品价值亮点</h2>
        <p className="welcome-section-desc">BiograFi｜传记快线为历史人物研究带来革命性的改变</p>
      </motion.div>
      <div className="welcome-value-grid">
        {valueHighlights.map((highlight, index) => (
          <motion.div key={index} initial={{ opacity: 0, y: 50 }} whileInView={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, delay: index * 0.2 }} viewport={{ once: true }} className="welcome-value-card">
            <div className="welcome-value-icon">{highlight.icon}</div>
            <h3>{highlight.title}</h3>
            <p>{highlight.description}</p>
          </motion.div>
        ))}
      </div>
    </section>
  );
};


// TeamMembers 组件
const TeamMembers = () => {
  const teamMembers = [
    { name: '朱子豪', role: '组长', avatar: 'https://ui-avatars.com/api/?name=ZZH&background=5f8cff&color=fff' },
    { name: '顾思源', role: '组员', avatar: 'https://ui-avatars.com/api/?name=GSY&background=ab6eff&color=fff' },
    { name: '余逸晨', role: '组员', avatar: 'https://ui-avatars.com/api/?name=YYC&background=5f8cff&color=fff' },
    { name: '贺翔宇', role: '组员', avatar: 'https://ui-avatars.com/api/?name=HXY&background=ab6eff&color=fff' },
    { name: '毛杭程', role: '组员', avatar: 'https://ui-avatars.com/api/?name=MHC&background=5f8cff&color=fff' },
    { name: '何其乐', role: '组员', avatar: 'https://ui-avatars.com/api/?name=HQL&background=ab6eff&color=fff' },
    { name: '李泽亿', role: '组员', avatar: 'https://ui-avatars.com/api/?name=LZY&background=5f8cff&color=fff' },
    { name: '王少伟', role: '组员', avatar: 'https://ui-avatars.com/api/?name=WSW&background=ab6eff&color=fff' },
  ];

  return (
    <section id="team" className="welcome-section">
      <motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} transition={{ duration: 0.8 }} viewport={{ once: true }} className="welcome-section-header">
        <h2 className="welcome-section-title">团队成员展示</h2>
        <p className="welcome-section-desc">我们的团队由来自不同领域的专业人才组成</p>
      </motion.div>
      <div className="welcome-team-grid">
        {teamMembers.map((member, index) => (
          <motion.div key={index} initial={{ opacity: 0, y: 50 }} whileInView={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: index * 0.1 }} viewport={{ once: true }} className="welcome-team-card">
            <img src={member.avatar} alt={member.name} />
            <h3>{member.name}</h3>
            <p>{member.role}</p>
          </motion.div>
        ))}
      </div>
    </section>
  );
};

// Footer 组件
const Footer = () => (
  <footer id="footer" className="welcome-footer">
    <div className="welcome-footer-grid">
      <motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} transition={{ duration: 0.8 }} viewport={{ once: true }}>
        <h3>开发团队</h3>
        <p>浙江工商大学 · 计算机科学与技术学院</p>
        <p className="welcome-footer-sub">2025 毕业设计项目（Demo 展示版本）</p>
      </motion.div>
      <motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, delay: 0.2 }} viewport={{ once: true }}>
        <h3>平台定位</h3>
        <p>BiograFi｜传记快线是一个面向历史人物研究者与文史爱好者的智能标注平台，通过 AI 技术提升古籍文献处理效率与研究质量。</p>
      </motion.div>
      <motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, delay: 0.4 }} viewport={{ once: true }}>
        <h3>声明</h3>
        <p>本页面为展示用 Demo，部分内容与素材采用占位图/网络公共资源，仅用于教学或项目演示。</p>
      </motion.div>
    </div>
    <motion.div initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} transition={{ duration: 0.8, delay: 0.6 }} viewport={{ once: true }} className="welcome-footer-copyright">
      <p>© 2025 BiograFi｜传记快线. All rights reserved.</p>
    </motion.div>
  </footer>
);

// 主 Welcome 页面
const Welcome = () => {
  const navigate = useNavigate();
  const handleExplore = () => {
    // 清除登录状态，确保用户必须重新登录
    localStorage.removeItem('currentUser');
    localStorage.removeItem('token');
    navigate('/login');
  };

  return (
    <div className="welcome-app">
      <SideNavigation />
      <main className="welcome-main">
        <Hero onExplore={handleExplore} />
        <FeatureTabs />
        <CodeDemo />
        <GanttScrollView />
        <ValueHighlights />
        <TeamMembers />
        <Footer />
      </main>
    </div>
  );
};

export default Welcome;
