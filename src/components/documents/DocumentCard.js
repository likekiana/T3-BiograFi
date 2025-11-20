// src/components/documents/DocumentCard.js
import React, { useState } from 'react';
import { useDocuments } from '../../hooks/useDocuments';
import { t } from '../../utils/language';
import Modal from '../common/Modal';
import '../../styles/components/DocumentCard.css';

const DocumentCard = ({ 
  document, 
  onOpen, 
  exportMode = false, 
  isSelected = false, 
  onToggleSelect 
}) => {
  const { updateDocument, deleteDocument } = useDocuments();
  const [showDetails, setShowDetails] = useState(false);
  const [showCopyForm, setShowCopyForm] = useState(false);
  const [editData, setEditData] = useState({
    name: document.name,
    description: document.description || ''
  });
  const [copyName, setCopyName] = useState(`${document.name} - ${t('copy')}`);

  const handleEdit = async () => {
    try {
      await updateDocument(document.id, editData);
      setShowDetails(false);
    } catch (error) {
      console.error('更新文档失败:', error);
    }
  };

  const handleCopy = async () => {
    try {
      await updateDocument(document.id, {
        name: copyName,
        description: document.description,
        content: document.content,
        author: document.author
      });
      setShowCopyForm(false);
    } catch (error) {
      console.error('复制文档失败:', error);
    }
  };

  const handleDelete = async () => {
    if (window.confirm(t('confirm_delete_document'))) {
      try {
        await deleteDocument(document.id);
      } catch (error) {
        console.error('删除文档失败:', error);
      }
    }
  };

  return (
    <>
      <div className="document-card">
        <div className="document-info">
          <div className="document-title-row">
            {exportMode && (
              <input
                type="checkbox"
                className="doc-export-checkbox"
                checked={isSelected}
                onChange={onToggleSelect}
              />
            )}
            <span className="document-title">{document.name}</span>
            <span className="document-detail">{document.description}</span>
          </div>
          <span className="document-meta">
            {document.createdAt} • {document.author || '未知作者'}
          </span>
        </div>
        
        <div className="document-actions">
          <button 
            className="doc-btn" 
            onClick={() => onOpen(document)}
          >
            <i data-feather="edit"></i> {t('open_document')}
          </button>
          <button 
            className="doc-btn" 
            onClick={() => setShowDetails(true)}
          >
            <i data-feather="info"></i> {t('document_details')}
          </button>
          <button 
            className="doc-btn" 
            onClick={() => setShowCopyForm(true)}
          >
            <i data-feather="copy"></i> {t('copy_document')}
          </button>
          <button 
            className="doc-btn delete-btn" 
            onClick={handleDelete}
          >
            <i data-feather="trash-2"></i> {t('delete_document')}
          </button>
        </div>
      </div>

      {/* 文档详情模态框 */}
      <Modal
        isOpen={showDetails}
        onClose={() => setShowDetails(false)}
        title={t('document_details')}
        onSubmit={handleEdit}
        submitText={t('save_changes')}
      >
        <div className="modal-form">
          <div className="form-group">
            <label>{t('document_name')}</label>
            <input
              type="text"
              value={editData.name}
              onChange={(e) => setEditData(prev => ({ ...prev, name: e.target.value }))}
            />
          </div>
          <div className="form-group">
            <label>{t('document_description')}</label>
            <textarea
              value={editData.description}
              onChange={(e) => setEditData(prev => ({ ...prev, description: e.target.value }))}
              rows="3"
            />
          </div>
          <div className="form-group">
            <label>{t('created_at')}</label>
            <input type="text" value={document.createdAt} readOnly />
          </div>
          <div className="form-group">
            <label>{t('update_time')}</label>
            <input type="text" value={document.updatedAt || document.createdAt} readOnly />
          </div>
        </div>
      </Modal>

      {/* 复制文档模态框 */}
      <Modal
        isOpen={showCopyForm}
        onClose={() => setShowCopyForm(false)}
        title={`${t('copy')}: ${document.name}`}
        onSubmit={handleCopy}
        submitText={t('copy')}
      >
        <div className="modal-form">
          <div className="form-group">
            <label>{t('new_name')}</label>
            <input
              type="text"
              value={copyName}
              onChange={(e) => setCopyName(e.target.value)}
              placeholder={t('new_name')}
            />
          </div>
        </div>
      </Modal>
    </>
  );
};

export default DocumentCard;