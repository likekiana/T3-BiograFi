// src/components/documents/DocumentList.js
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import DocumentCard from './DocumentCard';
import DocumentForm from './DocumentForm';
import { useDocuments } from '../../hooks/useDocuments';
import { t } from '../../utils/language';
import Modal from '../common/Modal';
import '../../styles/components/DocumentList.css';

const DocumentList = ({ project, onOpenDocument, onBack }) => {
  const navigate = useNavigate();
  
  const { 
    documents, 
    loading, 
    createDocument, 
    importDocuments,
    exportDocuments,
    searchDocuments,
    refresh
  } = useDocuments(project?.id);
  
  const [searchQuery, setSearchQuery] = useState('');
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [exportMode, setExportMode] = useState(false);
  const [selectedDocs, setSelectedDocs] = useState(new Set());
  const [filteredDocuments, setFilteredDocuments] = useState([]);
  
  // 项目可视化功能
  const handleProjectVisualization = () => {
    navigate('/project-visualization', {
      state: {
        projectId: project.id,
        projectName: project.name
      }
    });
  };

  useEffect(() => {
    if (searchQuery.trim()) {
      setFilteredDocuments(searchDocuments(searchQuery));
    } else {
      setFilteredDocuments(documents);
    }
  }, [searchQuery, documents, searchDocuments]);

  const handleDocumentsChange = async () => {
    await refresh();
  };

  const handleCreateDocument = async (documentData) => {
    try {
      await createDocument(documentData);
      setShowCreateForm(false);
    } catch (error) {
      console.error('创建文档失败:', error);
    }
  };

  const handleImport = async (files) => {
    try {
      await importDocuments(files);
      setShowImportModal(false);
    } catch (error) {
      console.error('导入文档失败:', error);
    }
  };

  const handleExport = async () => {
    if (selectedDocs.size === 0) {
      alert('请选择要导出的文档');
      return;
    }

    try {
      await exportDocuments(Array.from(selectedDocs));
      setExportMode(false);
      setSelectedDocs(new Set());
    } catch (error) {
      console.error('导出文档失败:', error);
    }
  };

  const toggleSelectAll = () => {
    if (selectedDocs.size === filteredDocuments.length) {
      setSelectedDocs(new Set());
    } else {
      setSelectedDocs(new Set(filteredDocuments.map(doc => doc.id)));
    }
  };

  const toggleSelectDoc = (docId) => {
    const newSelected = new Set(selectedDocs);
    if (newSelected.has(docId)) {
      newSelected.delete(docId);
    } else {
      newSelected.add(docId);
    }
    setSelectedDocs(newSelected);
  };

  if (loading) {
    return (
      <div className="document-list-container">
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <p>{t('loading')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="document-list-container">
      <div className="document-list-header">
        <h2 className="document-list-title">
          {project.name} {t('document_list')}
        </h2>
        
        <div className="document-list-actions">
          <div className="search-box">
            <input
              type="text"
              placeholder={t('search_document')}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="search-input"
            />
            <i data-feather="search" className="search-icon"></i>
          </div>

          <button 
            className="action-btn"
            onClick={() => setShowCreateForm(true)}
          >
            <i data-feather="plus"></i> {t('new_document')}
          </button>

          <button 
            className="action-btn"
            onClick={() => setShowImportModal(true)}
          >
            <i data-feather="upload"></i> {t('import_document')}
          </button>

          {exportMode ? (
            <>
              <button 
                className="action-btn"
                onClick={toggleSelectAll}
              >
                <i data-feather={selectedDocs.size === filteredDocuments.length ? "square" : "check-square"}></i> 
                {selectedDocs.size === filteredDocuments.length ? t('deselect_all') : t('select_all')}
              </button>
              <button 
                className="action-btn primary-btn"
                onClick={handleExport}
              >
                <i data-feather="check"></i> {t('confirm_export')}
              </button>
              <button 
                className="action-btn"
                onClick={() => {
                  setExportMode(false);
                  setSelectedDocs(new Set());
                }}
              >
                <i data-feather="x"></i> {t('cancel')}
              </button>
            </>
          ) : (
            <>
              <button 
                className="action-btn"
                onClick={() => setExportMode(true)}
              >
                <i data-feather="download"></i> {t('export_documents')}
              </button>

              {/* 项目可视化按钮 */}
              <button 
                className="action-btn primary-btn"
                onClick={handleProjectVisualization}
              >
                <i data-feather="bar-chart-2"></i> {t('project_visualization')}
              </button>

              <button 
                className="action-btn"
                onClick={onBack}
              >
                <i data-feather="arrow-left"></i> {t('back_to_project_list')}
              </button>
            </>
          )}
        </div>
      </div>

      {showCreateForm && (
        <DocumentForm
          onSubmit={handleCreateDocument}
          onCancel={() => setShowCreateForm(false)}
          projectId={project.id}
        />
      )}

      {/* 导入文档模态框 */}
      <ImportModal
        isOpen={showImportModal}
        onClose={() => setShowImportModal(false)}
        onImport={handleImport}
      />

      <div className="document-list-content">
        {filteredDocuments.length === 0 ? (
          <div className="empty-state">
            {searchQuery ? (
              <>
                <h3>{t('no_matching_documents')}</h3>
                <p>{t('no_documents_found')} "{searchQuery}" 的文档</p>
                <button 
                  className="action-btn"
                  onClick={() => setSearchQuery('')}
                >
                  <i data-feather="x"></i> {t('clear_search')}
                </button>
              </>
            ) : (
              <>
                <h3>{t('no_documents')}</h3>
                <p>{t('document_tips')}</p>
                <ul>
                  <li>{t('create_blank_document')}</li>
                  <li>{t('upload_local_file')}</li>
                </ul>
                <div className="action-buttons">
                  <button 
                    className="action-btn"
                    onClick={() => setShowCreateForm(true)}
                  >
                    <i data-feather="plus"></i> {t('new_document')}
                  </button>
                  <button 
                    className="action-btn"
                    onClick={() => setShowImportModal(true)}
                  >
                    <i data-feather="upload"></i> {t('import_document')}
                  </button>
                </div>
              </>
            )}
          </div>
        ) : (
          filteredDocuments.map(document => (
            <DocumentCard
              key={document.id}
              document={document}
              onOpen={onOpenDocument}
              exportMode={exportMode}
              isSelected={selectedDocs.has(document.id)}
              onToggleSelect={() => toggleSelectDoc(document.id)}
              projectId={project.id}
              onDocumentsChange={handleDocumentsChange}
            />
          ))
        )}
      </div>
    </div>
  );
};

// 导入文档模态框组件
const ImportModal = ({ isOpen, onClose, onImport }) => {
  const [files, setFiles] = useState([]);

  const handleFileSelect = (e) => {
    setFiles(Array.from(e.target.files));
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setFiles(Array.from(e.dataTransfer.files));
  };

  const handleDragOver = (e) => {
    e.preventDefault();
  };

  const handleSubmit = () => {
    if (files.length === 0) {
      alert('请选择要导入的文件');
      return;
    }
    onImport(files);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={t('import_documents')}
      onSubmit={handleSubmit}
      submitText={t('import')}
    >
      <div className="import-modal-content">
        <div 
          className="upload-area"
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onClick={() => document.getElementById('file-input').click()}
        >
          <div className="upload-content">
            <i data-feather="upload" className="upload-icon"></i>
            <p>{t('select_file')}</p>
          </div>
          <input
            id="file-input"
            type="file"
            multiple
            accept=".txt,.md,.doc,.docx,.pdf"
            onChange={handleFileSelect}
            style={{ display: 'none' }}
          />
        </div>

        {files.length > 0 && (
          <div className="file-list">
            <h4>已选择文件 ({files.length})</h4>
            {files.map((file, index) => (
              <div key={index} className="file-item">
                <span className="file-name">{file.name}</span>
                <span className="file-size">{(file.size / 1024).toFixed(2)} KB</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </Modal>
  );
};

export default DocumentList;