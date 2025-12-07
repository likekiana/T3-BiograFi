// src/components/editor/Segmentation.js
import React, { useState, useEffect, useRef } from 'react';
import { segmentationService } from '../../services/segmentationService';
import '../../styles/components/Segmentation.css';

const Segmentation = ({ content, onApplySegmentation }) => {
  const [loading, setLoading] = useState(false);
  const iconRef = useRef(null);
  const isRendered = useRef(false);

  // 只在组件挂载时渲染一次图标
  useEffect(() => {
    if (typeof window === 'undefined' || !window.feather || isRendered.current) {
      return;
    }

    const renderIcon = () => {
      if (iconRef.current && window.feather) {
        // 只渲染当前组件的图标
        const iconElement = iconRef.current.querySelector('i[data-feather]');
        if (iconElement) {
          // 先清除可能存在的重复SVG
          const existingSvg = iconElement.parentNode.querySelector('svg');
          if (existingSvg && existingSvg.parentNode === iconElement.parentNode) {
            existingSvg.remove();
          }
          
          // 渲染图标
          window.feather.replace(iconElement);
          isRendered.current = true;
        }
      }
    };

    // 使用较短的延迟确保DOM已更新
    const timer = setTimeout(renderIcon, 50);
    return () => clearTimeout(timer);
  }, []);

  // 当loading状态变化时重新渲染图标（从加载状态恢复时）
  useEffect(() => {
    if (loading || typeof window === 'undefined' || !window.feather) {
      return;
    }

    const timer = setTimeout(() => {
      if (iconRef.current) {
        const iconElement = iconRef.current.querySelector('i[data-feather]');
        if (iconElement) {
          // 清除可能存在的SVG
          const svgs = iconElement.parentNode.querySelectorAll('svg');
          svgs.forEach(svg => {
            if (svg.parentNode === iconElement.parentNode) {
              svg.remove();
            }
          });
          
          // 重新渲染
          window.feather.replace(iconElement);
        }
      }
    }, 100);

    return () => clearTimeout(timer);
  }, [loading]);

  const handleSegment = async () => {
    if (!content || !content.trim()) {
      alert('请输入要分词的文本');
      return;
    }

    setLoading(true);

    try {
      console.log('开始分词处理...');
      
      const segmentedText = await segmentationService.segmentTextPreserveFormat(content);
      
      console.log('分词完成');
      
      // 检查分词是否有变化
      if (segmentedText === content || !segmentedText) {
        alert('分词失败或没有需要分词的内容');
        setLoading(false);
        return;
      }
      
      if (onApplySegmentation) {
        onApplySegmentation(segmentedText);
      }
      
    } catch (error) {
      console.error('分词失败：', error);
      alert('分词失败，请重试');
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      ref={iconRef}
      className="segment-btn"
      onClick={handleSegment}
      disabled={loading || !content || !content.trim()}
      title="AI分词"
    >
      {loading ? (
        <>
          <span className="spinner-small"></span>
          分词中
        </>
      ) : (
        <>
          <i data-feather="divide-square"></i>
          AI分词
        </>
      )}
    </button>
  );
};

export default Segmentation;