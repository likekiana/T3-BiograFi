import React, { useState } from 'react';
import { motion } from 'framer-motion';

const FeatureTabs = () => {
  const [activeTab, setActiveTab] = useState(0);

  const features = [
    {
      title: '自动分词',
      description: '基于AI技术的智能分词系统，支持现代文和古文的精确分词。',
      icon: '🔤',
    },
    {
      title: '实体标注',
      description: '自动识别并标注文本中的姓名、地名、官职、事件等实体信息。',
      icon: '🏷️',
    },
    {
      title: '专籍解析',
      description: '支持《旧唐书》《清史稿》等古籍传记的结构化解析。',
      icon: '📚',
    },
    {
      title: '智能问答',
      description: '基于传记知识图谱的智能问答系统，提供精准的历史人物信息查询。',
      icon: '💬',
    },
  ];

  return (
    <section id="features" className="py-20 px-4">
      <div className="max-w-6xl mx-auto">
        {/* 标题 */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <h2 className="text-4xl font-bold mb-4 bg-clip-text text-transparent bg-gradient-to-r from-gold-brown to-neon-blue">
            核心功能展示
          </h2>
          <p className="text-gray-400 max-w-2xl mx-auto">
            BiograFi｜传记快线提供多种智能功能，为历史人物研究提供高效的文献处理体验
          </p>
        </motion.div>

        {/* 浮层卡片 */}
        <motion.div
          initial={{ opacity: 0, y: 50 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          viewport={{ once: true }}
          className="bg-ink-black/80 backdrop-blur-md rounded-2xl shadow-xl shadow-neon-blue/10 p-8 border border-neon-blue/20"
        >
          {/* Tab切换 */}
          <div className="flex flex-wrap mb-8 gap-4 justify-center">
            {features.map((feature, index) => (
              <button
                key={index}
                className={`px-6 py-3 rounded-lg transition-all transform hover:scale-105 ${activeTab === index ? 'bg-gradient-to-r from-neon-blue to-purple-light text-white shadow-lg shadow-neon-blue/30' : 'bg-gray-800 text-gray-300 hover:bg-gray-700'}`}
                onClick={() => setActiveTab(index)}
              >
                <span className="mr-2 text-xl">{feature.icon}</span>
                {feature.title}
              </button>
            ))}
          </div>

          {/* 内容展示 */}
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.5 }}
            className="flex flex-col md:flex-row items-center gap-8"
          >
            {/* 左侧动画/视频区域 */}
            <div className="w-full md:w-1/2 bg-gray-800/50 rounded-xl p-8 flex items-center justify-center aspect-video">
              <div className="text-center">
                <div className="text-6xl mb-4">{features[activeTab].icon}</div>
                <p className="text-gray-400">{features[activeTab].title} 功能演示</p>
                <p className="text-gray-500 text-sm mt-2">（此处可替换为实际视频或Lottie动画）</p>
              </div>
            </div>

            {/* 右侧内容区域 */}
            <div className="w-full md:w-1/2">
              <h3 className="text-2xl font-bold mb-4 text-gold-brown">{features[activeTab].title}</h3>
              <p className="text-gray-300 mb-6">{features[activeTab].description}</p>
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 rounded-full bg-neon-blue"></div>
                  <span className="text-gray-400">高效处理大量文献资料</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 rounded-full bg-neon-blue"></div>
                  <span className="text-gray-400">精确的实体识别与标注</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 rounded-full bg-neon-blue"></div>
                  <span className="text-gray-400">支持多种古籍文献格式</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 rounded-full bg-neon-blue"></div>
                  <span className="text-gray-400">智能问答系统提供精准信息</span>
                </div>
              </div>
            </div>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
};

export default FeatureTabs;