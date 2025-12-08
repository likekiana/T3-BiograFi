// src/components/editor/ClassicalAnalysis.js
import React, { useState } from 'react';
import { t } from '../../utils/language';
import { aiService } from '../../services/aiService';
import Modal from '../common/Modal';
import '../../styles/components/ClassicalAnalysis.css';

const ClassicalAnalysis = ({ content }) => {
  const [analysisResult, setAnalysisResult] = useState('');
  const [analyzing, setAnalyzing] = useState(false);
  const [qaHistory, setQaHistory] = useState([]);
  const [currentQuestion, setCurrentQuestion] = useState('');
  const [answering, setAnswering] = useState(false);
  const [showModelSelect, setShowModelSelect] = useState(false);
  const [selectedModel, setSelectedModel] = useState('xunzi-qwen2');

  const models = aiService.getAvailableModels();

  const handleAnalyze = async () => {
    if (!content.trim()) {
      alert(t('input_analysis_text'));
      return;
    }

    setShowModelSelect(true);
  };

  const performAnalysis = async (model) => {
    setShowModelSelect(false);
    setAnalyzing(true);
    setAnalysisResult('');

    try {
      const result = await aiService.analyzeClassicalText(content, model);
      setAnalysisResult(result);
    } catch (error) {
      console.error('古文解析失败:', error);
      setAnalysisResult(`解析失败: ${error.message}`);
    } finally {
      setAnalyzing(false);
    }
  };

  const handleAskQuestion = async () => {
    if (!currentQuestion.trim()) {
      alert(t('input_question'));
      return;
    }

    if (!content.trim()) {
      alert(t('input_classical_text_first'));
      return;
    }

    setShowModelSelect(true);
  };

  const performQuestionAnswering = async (model) => {
    setShowModelSelect(false);
    setAnswering(true);

    try {
      const answer = await aiService.askQuestion(content, currentQuestion, model);
      
      const newQa = {
        question: currentQuestion,
        answer: answer,
        timestamp: new Date().toLocaleString(),
        model: model
      };

      setQaHistory(prev => [newQa, ...prev]);
      setCurrentQuestion('');
    } catch (error) {
      console.error('答疑失败:', error);
      alert(`答疑失败: ${error.message}`);
    } finally {
      setAnswering(false);
    }
  };

  const formatAnalysisResult = (text) => {
    if (!text) return text;

    return text
      .split('\n')
      .map((line, index) => {
        if (line.match(/^\d+\./)) {
          return <strong key={index}>{line}</strong>;
        }
        return line;
      })
      .reduce((acc, line, index) => {
        if (index > 0) {
          acc.push(<br key={`br-${index}`} />);
        }
        acc.push(line);
        return acc;
      }, []);
  };

  return (
    <div className="classical-analysis">
      <div className="analysis-section">
        <h3>{t('classical_analysis')}</h3>
        <button
          className="action-btn primary-btn"
          onClick={handleAnalyze}
          disabled={analyzing || !content.trim()}
        >
          <i data-feather="play"></i>
          {analyzing ? t('analyzing') : t('run_analysis')}
        </button>

        {analyzing && (
          <div className="analysis-status">
            <div className="loading-spinner"></div>
            <span>正在解析中，请稍候...</span>
          </div>
        )}

        {analysisResult && (
          <div className="analysis-result">
            <h4>解析结果：</h4>
            <div className="result-content">
              {formatAnalysisResult(analysisResult)}
            </div>
          </div>
        )}
      </div>

      <div className="qa-section">
        <h3>{t('qa_title')}</h3>
        
        <div className="qa-input-group">
          <input
            type="text"
            value={currentQuestion}
            onChange={(e) => setCurrentQuestion(e.target.value)}
            placeholder={t('qa_input_placeholder')}
            className="qa-input"
            onKeyPress={(e) => e.key === 'Enter' && handleAskQuestion()}
          />
          <button
            className="action-btn primary-btn"
            onClick={handleAskQuestion}
            disabled={answering || !currentQuestion.trim() || !content.trim()}
          >
            <i data-feather="help-circle"></i>
            {answering ? t('answering') : t('ask_question')}
          </button>
        </div>

        {answering && (
          <div className="qa-status">
            <div className="loading-spinner"></div>
            <span>正在思考答案...</span>
          </div>
        )}

        <div className="qa-history">
          <h4>问答历史</h4>
          {qaHistory.length === 0 ? (
            <div className="empty-qa">
              <i data-feather="message-circle"></i>
              <p>{t('no_qa_history')}</p>
            </div>
          ) : (
            qaHistory.map((qa, index) => (
              <div key={index} className="qa-item">
                <div className="question">
                  <strong>问：</strong>{qa.question}
                  <span className="qa-meta">({qa.timestamp})</span>
                </div>
                <div className="answer">
                  <strong>答：</strong>{qa.answer}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* 模型选择模态框 */}
      <Modal
        isOpen={showModelSelect}
        onClose={() => setShowModelSelect(false)}
        title={t('select_model')}
        showFooter={false}
      >
        <div className="model-selection">
          <h4>选择AI模型进行{analysisResult ? '解析' : '答疑'}</h4>
          {models.map(model => (
            <div key={model.id} className="model-option">
              <label>
                <input
                  type="radio"
                  name="model"
                  value={model.id}
                  checked={selectedModel === model.id}
                  onChange={(e) => setSelectedModel(e.target.value)}
                />
                <div className="model-info">
                  <strong>{model.name}</strong>
                  {model.recommended && <span className="recommended-badge">{t('recommended')}</span>}
                  <p>{model.description}</p>
                </div>
              </label>
            </div>
          ))}
          <div className="model-actions">
            <button
              className="modal-btn secondary"
              onClick={() => setShowModelSelect(false)}
            >
              {t('cancel')}
            </button>
            <button
              className="modal-btn primary"
              onClick={() => analysisResult ? performAnalysis(selectedModel) : performQuestionAnswering(selectedModel)}
            >
              {t('confirm')}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default ClassicalAnalysis;