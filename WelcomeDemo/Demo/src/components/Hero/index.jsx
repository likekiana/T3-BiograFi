import React from 'react';
import { motion } from 'framer-motion';

const Hero = () => {
  return (
    <section id="welcome" className="relative min-h-screen flex items-center justify-center overflow-hidden">
      {/* 背景渐变 */}
      <div className="absolute inset-0 bg-gradient-to-br from-ink-black via-neon-blue/10 to-purple-light/10"></div>

      {/* 装饰性3D Blob */}
      <motion.div
        className="absolute top-20 left-20 w-64 h-64 rounded-full bg-neon-blue/20 blur-3xl"
        animate={{
          y: [0, 20, 0],
          scale: [1, 1.1, 1],
        }}
        transition={{
          duration: 8,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      />
      <motion.div
        className="absolute bottom-20 right-20 w-80 h-80 rounded-full bg-purple-light/20 blur-3xl"
        animate={{
          y: [0, -20, 0],
          scale: [1, 1.2, 1],
        }}
        transition={{
          duration: 10,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      />

      {/* 主内容 */}
      <div className="relative z-10 max-w-4xl mx-auto text-center px-4">
        <motion.h1
          initial={{ opacity: 0, y: -50 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, delay: 0.2 }}
          className="text-5xl md:text-7xl font-bold mb-6 bg-clip-text text-transparent bg-gradient-to-r from-gold-brown to-neon-blue"
        >
          BiograFi｜传记快线
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, delay: 0.5 }}
          className="text-xl md:text-2xl mb-10 text-gray-300"
        >
          面向历史人物研究的下一代智能标注平台
        </motion.p>

        <motion.p
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, delay: 0.7 }}
          className="text-lg mb-12 text-gray-400 max-w-2xl mx-auto"
        >
          融合古籍研究方法与人工智能技术，为传记学、历史学、人文学研究提供更高效的文献处理体验。
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, delay: 1 }}
          className="flex flex-col sm:flex-row gap-4 justify-center"
        >
          <button
            className="px-8 py-3 rounded-lg bg-gradient-to-r from-neon-blue to-purple-light hover:shadow-lg hover:shadow-neon-blue/30 transition-all transform hover:scale-105"
            onClick={() => {
              const featuresSection = document.getElementById('features');
              if (featuresSection) {
                featuresSection.scrollIntoView({ behavior: 'smooth' });
              }
            }}
          >
            开始探索
          </button>
          <button
            className="px-8 py-3 rounded-lg bg-transparent border border-neon-blue hover:bg-neon-blue/20 transition-all transform hover:scale-105"
            onClick={() => {
              const featuresSection = document.getElementById('features');
              if (featuresSection) {
                featuresSection.scrollIntoView({ behavior: 'smooth' });
              }
            }}
          >
            了解产品功能
          </button>
        </motion.div>
      </div>

      {/* 向下滚动指示器 */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: [0, 1, 0] }}
        transition={{ duration: 2, repeat: Infinity, delay: 2 }}
        className="absolute bottom-10 left-1/2 transform -translate-x-1/2 cursor-pointer"
        onClick={() => {
          const featuresSection = document.getElementById('features');
          if (featuresSection) {
            featuresSection.scrollIntoView({ behavior: 'smooth' });
          }
        }}
      >
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
        </svg>
      </motion.div>
    </section>
  );
};

export default Hero;