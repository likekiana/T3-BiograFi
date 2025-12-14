import React from 'react';
import { motion } from 'framer-motion';

const ValueHighlights = () => {
  // 价值亮点数据
  const valueHighlights = [
    {
      title: '提高古籍文献处理效率',
      description: '通过自动标注技术，大幅提升古籍文献的处理速度和准确性，减少人工标注的时间成本。',
      icon: '⚡',
      color: 'from-neon-blue to-purple-light',
    },
    {
      title: '统一历史人物数据规范',
      description: '基于知识图谱技术，为历史人物研究提供标准化的数据模型，促进学术研究的一致性和可比性。',
      icon: '🔗',
      color: 'from-purple-light to-neon-blue',
    },
    {
      title: '科学研究工具',
      description: '为学者和爱好者提供智能问答、查询和传记结构化等功能，助力更深入的历史人物研究。',
      icon: '🔬',
      color: 'from-neon-blue to-purple-light',
    },
  ];

  return (
    <section id="value" className="py-20 px-4 bg-gradient-to-b from-ink-black to-neon-blue/5">
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
            产品价值亮点
          </h2>
          <p className="text-gray-400 max-w-2xl mx-auto">
            BiograFi｜传记快线为历史人物研究带来革命性的改变
          </p>
        </motion.div>

        {/* 价值亮点卡片 */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {valueHighlights.map((highlight, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 50 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: index * 0.2 }}
              viewport={{ once: true }}
              whileHover={{ y: -10, boxShadow: '0 20px 25px -5px rgba(95, 140, 255, 0.2), 0 10px 10px -5px rgba(171, 110, 255, 0.1)' }}
              className="bg-ink-black/80 backdrop-blur-md rounded-2xl shadow-xl shadow-neon-blue/10 p-8 border border-neon-blue/20 transition-all"
            >
              {/* 图标 */}
              <div className={`w-16 h-16 rounded-full bg-gradient-to-br ${highlight.color} flex items-center justify-center mb-6 text-3xl`}>
                {highlight.icon}
              </div>
              
              {/* 标题 */}
              <h3 className="text-2xl font-bold mb-4 text-gold-brown">{highlight.title}</h3>
              
              {/* 描述 */}
              <p className="text-gray-400">{highlight.description}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default ValueHighlights;