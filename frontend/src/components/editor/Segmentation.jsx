// src/components/editor/Segmentation.js
import React, { useState, useEffect, useRef } from 'react';
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
      ref={buttonRef}
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