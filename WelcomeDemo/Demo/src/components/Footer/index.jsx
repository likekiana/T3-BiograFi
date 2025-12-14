import React from 'react';
import { motion } from 'framer-motion';

const Footer = () => {
  return (
    <footer id="footer" className="py-16 px-4 bg-gradient-to-b from-neon-blue/5 to-ink-black">
      <div className="max-w-6xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
          {/* 开发团队信息 */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true }}
          >
            <h3 className="text-2xl font-bold mb-6 bg-clip-text text-transparent bg-gradient-to-r from-gold-brown to-neon-blue">
              开发团队
            </h3>
            <p className="text-gray-400 mb-4">
              浙江工商大学 · 计算机科学与技术学院
            </p>
            <p className="text-gray-500">
              2025 毕业设计项目（Demo 展示版本）
            </p>
          </motion.div>

          {/* 产品定位 */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            viewport={{ once: true }}
          >
            <h3 className="text-2xl font-bold mb-6 bg-clip-text text-transparent bg-gradient-to-r from-gold-brown to-neon-blue">
              平台定位
            </h3>
            <p className="text-gray-400">
              BiograFi｜传记快线是一个面向历史人物研究者与文史爱好者的智能标注平台，通过 AI 技术提升古籍文献处理效率与研究质量。
            </p>
          </motion.div>

          {/* 声明 */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.4 }}
            viewport={{ once: true }}
          >
            <h3 className="text-2xl font-bold mb-6 bg-clip-text text-transparent bg-gradient-to-r from-gold-brown to-neon-blue">
              声明
            </h3>
            <p className="text-gray-400">
              本页面为展示用 Demo，部分内容与素材采用占位图/网络公共资源，仅用于教学或项目演示。
            </p>
          </motion.div>
        </div>

        {/* 版权信息 */}
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          transition={{ duration: 0.8, delay: 0.6 }}
          viewport={{ once: true }}
          className="mt-16 pt-8 border-t border-neon-blue/20 text-center text-gray-500"
        >
          <p>© 2025 BiograFi｜传记快线. All rights reserved.</p>
        </motion.div>
      </div>
    </footer>
  );
};

export default Footer;