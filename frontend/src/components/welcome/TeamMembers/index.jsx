import React from 'react';
import { motion } from 'framer-motion';

const TeamMembers = () => {
  // 团队成员数据
  const teamMembers = [
    { name: '张三', role: '项目经理', avatar: 'https://ui-avatars.com/api/?name=张三&background=5f8cff&color=fff' },
    { name: '李四', role: '前端开发', avatar: 'https://ui-avatars.com/api/?name=李四&background=ab6eff&color=fff' },
    { name: '王五', role: '后端开发', avatar: 'https://ui-avatars.com/api/?name=王五&background=5f8cff&color=fff' },
    { name: '赵六', role: '算法工程师', avatar: 'https://ui-avatars.com/api/?name=赵六&background=ab6eff&color=fff' },
    { name: '孙七', role: '数据分析师', avatar: 'https://ui-avatars.com/api/?name=孙七&background=5f8cff&color=fff' },
    { name: '周八', role: 'UI/UX设计师', avatar: 'https://ui-avatars.com/api/?name=周八&background=ab6eff&color=fff' },
    { name: '吴九', role: '测试工程师', avatar: 'https://ui-avatars.com/api/?name=吴九&background=5f8cff&color=fff' },
    { name: '郑十', role: '文档专员', avatar: 'https://ui-avatars.com/api/?name=郑十&background=ab6eff&color=fff' },
  ];

  return (
    <section id="team" className="py-20 px-4">
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
            团队成员展示
          </h2>
          <p className="text-gray-400 max-w-2xl mx-auto">
            我们的团队由来自不同领域的专业人才组成
          </p>
        </motion.div>

        {/* 团队成员卡片 */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-8">
          {teamMembers.map((member, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 50 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: index * 0.1 }}
              viewport={{ once: true }}
              whileHover={{ y: -10, boxShadow: '0 20px 25px -5px rgba(95, 140, 255, 0.2), 0 10px 10px -5px rgba(171, 110, 255, 0.1)' }}
              className="bg-ink-black/80 backdrop-blur-md rounded-2xl shadow-xl shadow-neon-blue/10 p-6 border border-neon-blue/20 transition-all flex flex-col items-center text-center"
            >
              {/* 头像 */}
              <div className="w-32 h-32 rounded-full overflow-hidden mb-6 border-4 border-neon-blue/30">
                <img
                  src={member.avatar}
                  alt={member.name}
                  className="w-full h-full object-cover"
                />
              </div>
              
              {/* 姓名 */}
              <h3 className="text-xl font-bold mb-2 text-white">{member.name}</h3>
              
              {/* 职责 */}
              <p className="text-neon-blue font-medium">{member.role}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default TeamMembers;