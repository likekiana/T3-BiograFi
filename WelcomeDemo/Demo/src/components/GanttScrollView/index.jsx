import React from 'react';
import { motion } from 'framer-motion';

const GanttScrollView = () => {
  // 甘特图数据
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

  // SVG配置
  const svgWidth = 2400;
  const svgHeight = 300;
  const taskHeight = 30;
  const taskSpacing = 10;
  const yOffset = 40;
  const xScale = 10; // 每个时间单位对应的像素数

  return (
    <section id="gantt" className="py-20 px-4">
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
            功能流程展示
          </h2>
          <p className="text-gray-400 max-w-2xl mx-auto">
            展示BiograFi｜传记快线项目的完整开发流程
          </p>
        </motion.div>

        {/* 横向滚动容器 */}
        <motion.div
          initial={{ opacity: 0, y: 50 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          viewport={{ once: true }}
          className="bg-ink-black/80 backdrop-blur-md rounded-2xl shadow-xl shadow-neon-blue/10 p-6 border border-neon-blue/20 overflow-x-auto"
        >
          {/* SVG甘特图 */}
          <svg
            width={svgWidth}
            height={svgHeight}
            className="border border-gray-700 rounded-lg"
            viewBox={`0 0 ${svgWidth} ${svgHeight}`}
          >
            {/* 背景网格 */}
            <defs>
              <pattern
                id="grid"
                width="50"
                height="50"
                patternUnits="userSpaceOnUse"
              >
                <path
                  d="M 50 0 L 0 0 0 50"
                  fill="none"
                  stroke="rgba(255,255,255,0.1)"
                  strokeWidth="1"
                />
              </pattern>
            </defs>
            <rect width={svgWidth} height={svgHeight} fill="url(#grid)" />

            {/* 任务条 */}
            {ganttData.map((item, index) => {
              const y = yOffset + index * (taskHeight + taskSpacing);
              return (
                <g key={index}>
                  {/* 任务矩形 */}
                  <rect
                    x={item.start * xScale}
                    y={y}
                    width={item.duration * xScale}
                    height={taskHeight}
                    fill={item.color}
                    opacity="0.8"
                    rx="4"
                    className="hover:opacity-100 transition-opacity"
                  />
                  {/* 任务文本 */}
                  <text
                    x={item.start * xScale + 10}
                    y={y + taskHeight / 2 + 5}
                    fill="white"
                    fontSize="14"
                    fontWeight="bold"
                  >
                    {item.task}
                  </text>
                  {/* 任务时间 */}
                  <text
                    x={item.start * xScale + 10}
                    y={y + taskHeight + 15}
                    fill="rgba(255,255,255,0.7)"
                    fontSize="12"
                  >
                    {item.start} - {item.start + item.duration}
                  </text>
                </g>
              );
            })}

            {/* 时间轴 */}
            <g>
              <line
                x1="0"
                y1={yOffset - 20}
                x2={svgWidth}
                y2={yOffset - 20}
                stroke="rgba(255,255,255,0.5)"
                strokeWidth="2"
              />
              {/* 时间刻度 */}
              {Array.from({ length: 61 }, (_, i) => i * 10).map((time) => (
                <g key={time}>
                  <line
                    x1={time * xScale}
                    y1={yOffset - 20}
                    x2={time * xScale}
                    y2={yOffset - 15}
                    stroke="rgba(255,255,255,0.5)"
                    strokeWidth="2"
                  />
                  <text
                    x={time * xScale + 5}
                    y={yOffset - 5}
                    fill="rgba(255,255,255,0.7)"
                    fontSize="12"
                  >
                    {time}
                  </text>
                </g>
              ))}
            </g>
          </svg>
        </motion.div>
      </div>
    </section>
  );
};

export default GanttScrollView;