import React from 'react';
import { motion } from 'framer-motion';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { tomorrow } from 'react-syntax-highlighter/dist/esm/styles/prism';

const CodeDemo = () => {
  // 示例文本和标注结果
  const exampleText = "李白，字太白，青莲居士，唐代著名诗人。";
  const annotations = [
    { text: "李白", type: "PERSON", color: "bg-blue-500" },
    { text: "唐代", type: "EVENT-TIME", color: "bg-green-500" },
    { text: "诗人", type: "OCCUPATION", color: "bg-purple-500" },
  ];

  // 代码示例
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
    <section id="demo" className="py-20 px-4 bg-gradient-to-b from-ink-black to-neon-blue/5">
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
            智能标注示例
          </h2>
          <p className="text-gray-400 max-w-2xl mx-auto">
            演示文本智能标注的真实效果，支持现代文和古文
          </p>
        </motion.div>

        {/* 示例内容 */}
        <motion.div
          initial={{ opacity: 0, y: 50 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          viewport={{ once: true }}
          className="space-y-12"
        >
          {/* 标注结果展示 */}
          <div className="bg-ink-black/80 backdrop-blur-md rounded-2xl shadow-xl shadow-neon-blue/10 p-8 border border-neon-blue/20">
            <h3 className="text-2xl font-bold mb-6 text-gold-brown">标注结果展示</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* 左侧：示例文档 */}
              <div className="bg-gray-800/50 rounded-xl p-6">
                <h4 className="text-lg font-semibold mb-4 text-neon-blue">示例文档</h4>
                <div className="bg-white/10 rounded-lg p-4 text-lg">
                  {exampleText}
                </div>
              </div>

              {/* 右侧：标注结果 */}
              <div className="bg-gray-800/50 rounded-xl p-6">
                <h4 className="text-lg font-semibold mb-4 text-neon-blue">标注结果</h4>
                <div className="space-y-4">
                  <div className="bg-white/10 rounded-lg p-4">
                    <p className="text-lg">
                      {exampleText.split(/(李白|唐代|诗人)/).map((part, index) => {
                        const annotation = annotations.find(ann => ann.text === part);
                        if (annotation) {
                          return (
                            <span
                              key={index}
                              className={`px-2 py-0.5 rounded ${annotation.color} text-white font-medium`}
                            >
                              {part}
                            </span>
                          );
                        }
                        return part;
                      })}
                    </p>
                  </div>
                  
                  {/* 标注类型说明 */}
                  <div>
                    <h5 className="text-sm font-semibold mb-2 text-gray-400">标注类型说明：</h5>
                    <div className="flex flex-wrap gap-3">
                      {annotations.map((annotation, index) => (
                        <div key={index} className="flex items-center gap-2">
                          <div className={`w-3 h-3 rounded-full ${annotation.color}`}></div>
                          <span className="text-sm text-gray-300">{annotation.type}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* 代码示例 */}
          <div className="bg-ink-black/80 backdrop-blur-md rounded-2xl shadow-xl shadow-neon-blue/10 p-8 border border-neon-blue/20">
            <h3 className="text-2xl font-bold mb-6 text-gold-brown">代码示例</h3>
            <SyntaxHighlighter
              language="javascript"
              style={tomorrow}
              className="rounded-lg overflow-hidden"
              showLineNumbers
            >
              {codeExample}
            </SyntaxHighlighter>
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default CodeDemo;