import React, { useState, useEffect, useRef, useCallback } from 'react';
import { segmentationService } from '../../services/segmentationService';
import '../../styles/components/Segmentation.css';

const Segmentation = ({ content, onApplySegmentation }) => {
  const [loading, setLoading] = useState(false);
  const buttonRef = useRef(null);
  const isMounted = useRef(true);

  // 组件卸载时标记
  useEffect(() => {
    return () => {
      isMounted.current = false;
    };
  }, []);

  // 当loading状态变化时渲染图标
  useEffect(() => {
    if (loading || typeof window === 'undefined' || !window.feather) {
      return;
    }

    const renderIcon = () => {
      // 检查组件是否已卸载
      if (!isMounted.current || !buttonRef.current) {
        return;
      }

      try {
        // 确保DOM元素存在
        const iconElement = buttonRef.current.querySelector('i[data-feather]');
        if (iconElement) {
          // 渲染图标
          window.feather.replace(iconElement);
        }
      } catch (error) {
        console.error('渲染图标失败:', error);
      }
    };

    // 使用较短的延迟确保DOM已更新
    const timer = setTimeout(renderIcon, 100);
    return () => clearTimeout(timer);
  }, [loading]);

  // 清理HTML标签，确保标签正确闭合
  const cleanHTMLTags = useCallback((html) => {
    if (!html) return html;
    
    // 修复常见的标签嵌套问题
    const tagStack = [];
    let result = '';
    let i = 0;
    
    while (i < html.length) {
      // 检查是否是开始标签
      if (html[i] === '<' && i + 1 < html.length && html[i + 1] !== '/') {
        // 找到标签结束位置
        let j = i + 1;
        while (j < html.length && html[j] !== '>') j++;
        
        if (j < html.length) {
          const tagContent = html.substring(i + 1, j);
          const tagMatch = tagContent.match(/^([a-zA-Z]+)/);
          
          if (tagMatch) {
            const tagName = tagMatch[1].toLowerCase();
            // 只处理 b, i, u 标签
            if (['b', 'i', 'u', 'strong', 'em'].includes(tagName)) {
              tagStack.push(tagName);
              result += `<${tagContent}>`;
              i = j + 1;
              continue;
            }
          }
        }
      }
      
      // 检查是否是结束标签
      if (html[i] === '<' && i + 1 < html.length && html[i + 1] === '/') {
        let j = i + 2;
        while (j < html.length && html[j] !== '>') j++;
        
        if (j < html.length) {
          const tagContent = html.substring(i + 2, j);
          const tagMatch = tagContent.match(/^([a-zA-Z]+)/);
          
          if (tagMatch) {
            const tagName = tagMatch[1].toLowerCase();
            if (['b', 'i', 'u', 'strong', 'em'].includes(tagName)) {
              // 查找对应的开始标签
              const lastIndex = tagStack.lastIndexOf(tagName);
              if (lastIndex !== -1) {
                // 关闭这个标签及其之前的所有未关闭标签
                for (let k = tagStack.length - 1; k >= lastIndex; k--) {
                  const closingTag = tagStack[k];
                  result += `</${closingTag}>`;
                }
                tagStack.splice(lastIndex);
              } else {
                // 忽略无效的结束标签
                i = j + 1;
                continue;
              }
            }
          }
        }
      }
      
      // 添加普通字符
      result += html[i];
      i++;
    }
    
    // 关闭所有未闭合的标签
    while (tagStack.length > 0) {
      const tag = tagStack.pop();
      result += `</${tag}>`;
    }
    
    return result;
  }, []);

  // 简化HTML，移除多余的嵌套标签
  const simplifyHTML = useCallback((html) => {
    if (!html) return html;
    
    // 提取纯文本内容，但保留基本格式
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = html;
    
    // 遍历所有节点，移除多余的嵌套
    const processNode = (node) => {
      // 只处理元素节点
      if (node.nodeType !== 1) return node;
      
      const tagName = node.tagName.toLowerCase();
      
      // 只处理 b, i, u, strong, em 标签
      if (!['b', 'i', 'u', 'strong', 'em'].includes(tagName)) {
        // 对于其他标签，保留其子节点
        const fragment = document.createDocumentFragment();
        Array.from(node.childNodes).forEach(child => {
          fragment.appendChild(processNode(child));
        });
        return fragment;
      }
      
      // 处理格式标签
      const children = Array.from(node.childNodes);
      
      // 如果子节点只有一个且是同类型标签，合并它们
      if (children.length === 1 && 
          children[0].nodeType === 1 && 
          children[0].tagName.toLowerCase() === tagName) {
        return processNode(children[0]);
      }
      
      // 处理子节点，确保不重复嵌套相同标签
      const newElement = document.createElement(tagName);
      children.forEach(child => {
        const processedChild = processNode(child);
        
        // 如果子节点是同类型元素，取其子节点
        if (processedChild.nodeType === 1 && 
            processedChild.tagName.toLowerCase() === tagName) {
          Array.from(processedChild.childNodes).forEach(grandChild => {
            newElement.appendChild(grandChild.cloneNode(true));
          });
        } else {
          newElement.appendChild(processedChild.cloneNode(true));
        }
      });
      
      return newElement;
    };
    
    const processed = processNode(tempDiv);
    
    // 转回HTML字符串
    const resultDiv = document.createElement('div');
    resultDiv.appendChild(processed.cloneNode(true));
    
    return resultDiv.innerHTML;
  }, []);

  const handleSegment = async () => {
    if (!content || !content.trim()) {
      window.showToast('请输入要分词的文本', 'warning');
      return;
    }

    setLoading(true);

    try {
      // 先清理和简化HTML
      const cleanedHTML = cleanHTMLTags(content);
      const simplifiedHTML = simplifyHTML(cleanedHTML);
      
      // 分词处理
      const segmentedText = await segmentationService.segmentTextPreserveFormat(simplifiedHTML);
      
      // 再次清理分词结果
      const finalCleanedHTML = cleanHTMLTags(segmentedText || '');
      const finalSimplifiedHTML = simplifyHTML(finalCleanedHTML || '');
      
      // 检查分词是否有变化
      if (!finalSimplifiedHTML || finalSimplifiedHTML === content) {
        window.showToast('分词失败或没有需要分词的内容', 'warning');
        setLoading(false);
        return;
      }
      
      if (onApplySegmentation) {
        onApplySegmentation(finalSimplifiedHTML);
      } else {
        window.showToast('分词成功，但未应用到编辑器', 'info');
      }
      
    } catch (error) {
      console.error('分词失败：', error);
      window.showToast('分词失败，请重试', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      ref={buttonRef}
      className="segment-btn"
      onClick={handleSegment}
      disabled={loading || !content || !content.trim()}
      title="自动分词"
    >
      {loading ? (
        <>
          <span className="spinner-small"></span>
          分词中
        </>
      ) : (
        <>
          <i data-feather="divide-square"></i>
        </>
      )}
    </button>
  );
};

export default Segmentation;