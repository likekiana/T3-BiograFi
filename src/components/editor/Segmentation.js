// src/components/editor/Segmentation.js
import React, { useState } from 'react';
import { t } from '../../utils/language';
import { segmentationService } from '../../services/segmentationService';
import { copyToClipboard } from '../../utils';
import '../../styles/components/Segmentation.css';

const Segmentation = ({ content }) => {
  const [tokens, setTokens] = useState([]);
  const [segmenting, setSegmenting] = useState(false);
  const [stats, setStats] = useState({ total: 0, unique: 0 });

  const handleSegment = async () => {
    if (!content.trim()) {
      alert(t('input_text_first'));
      return;
    }

    setSegmenting(true);
    setTokens([]);

    try {
      const result = await segmentationService.segmentChinese(content);
      setTokens(result);
      
      const stats = segmentationService.getSegmentationStats(result);
      setStats(stats);
    } catch (error) {
      console.error('分词失败:', error);
      alert(`分词失败: ${error.message}`);
    } finally {
      setSegmenting(false);
    }
  };

  const handleCopyTokens = async () => {
    if (tokens.length === 0) {
      alert(t('no_segmentation_result'));
      return;
    }

    const text = segmentationService.formatSegmentationResult(tokens);
    const success = await copyToClipboard(text);
    
    if (success) {
      alert(t('segmentation_copied'));
    } else {
      alert(t('copy_failed'));
    }
  };

  const handleTokenClick = async (token) => {
    const success = await copyToClipboard(token.text);
    if (success) {
      // 可以显示一个小的提示，或者不做任何操作
    }
  };

  return (
    <div className="segmentation-component">
      <div className="segmentation-controls">
        <button
          className="action-btn primary-btn"
          onClick={handleSegment}
          disabled={segmenting || !content.trim()}
        >
          <i data-feather="scissors"></i>
          {segmenting ? t('segmenting') : t('run_segmentation')}
        </button>
        
        <button
          className="action-btn"
          onClick={handleCopyTokens}
          disabled={tokens.length === 0}
        >
          <i data-feather="copy"></i>
          {t('copy_sequence')}
        </button>
      </div>

      {segmenting && (
        <div className="segmentation-status">
          <div className="loading-spinner"></div>
          <span>正在分词中...</span>
        </div>
      )}

      {stats.total > 0 && (
        <div className="segmentation-stats">
          <div className="stat-item">
            <span className="stat-label">总词数：</span>
            <span className="stat-value">{stats.total}</span>
          </div>
          <div className="stat-item">
            <span className="stat-label">唯一词数：</span>
            <span className="stat-value">{stats.unique}</span>
          </div>
        </div>
      )}

      <div className="segmentation-results">
        <h4>分词结果：</h4>
        {tokens.length === 0 ? (
          <div className="empty-segmentation">
            <i data-feather="align-left"></i>
            <p>暂无分词结果</p>
          </div>
        ) : (
          <div className="tokens-container">
            {tokens.map((token, index) => (
              <span
                key={index}
                className="token"
                title={`位置: ${token.start}-${token.end}`}
                onClick={() => handleTokenClick(token)}
              >
                {token.text}
              </span>
            ))}
          </div>
        )}
      </div>

      {tokens.length > 0 && (
        <div className="segmentation-text">
          <h4>分词文本：</h4>
          <div className="segmented-text">
            {tokens.map((token, index) => (
              <span key={index} className="token-text">
                {token.text}
              </span>
            )).reduce((acc, element, index) => {
              if (index > 0) {
                acc.push(' ');
              }
              acc.push(element);
              return acc;
            }, [])}
          </div>
        </div>
      )}
    </div>
  );
};

export default Segmentation;