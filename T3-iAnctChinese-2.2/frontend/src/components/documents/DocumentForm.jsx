// src/components/documents/DocumentForm.js
import React, { useState } from 'react';
import { t } from '../../utils/language';
import Modal from '../common/Modal';
import '../../styles/components/DocumentForm.css';

const DocumentForm = ({ onSubmit, onCancel, initialData = {}, projectId }) => { // 添加 projectId
  const [formData, setFormData] = useState({
    name: initialData.name || '',
    description: initialData.description || '',
    content: initialData.content || '',
    author: initialData.author || ''
  });

  const handleSubmit = () => {
    if (!formData.name.trim()) {
      alert(t('fill_required_fields'));
      return;
    }
    
    // 确保传递所有必要参数
    const submitData = {
      name: formData.name.trim(),
      description: formData.description ? formData.description.trim() : '',
      content: formData.content ? formData.content.trim() : '',
      author: formData.author ? formData.author.trim() : '',
      projectId: projectId // 确保包含 projectId
    };
    
    console.log('提交文档数据:', submitData);
    onSubmit(submitData);
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  return (
    <Modal
      isOpen={true}
      onClose={onCancel}
      title={t('create_document')}
      onSubmit={handleSubmit}
      submitText={t('create_document')}
    >
      <div className="modal-form">
        <div className="form-group">
          <label>{t('document_name')} *</label>
          <input
            type="text"
            name="name"
            value={formData.name}
            onChange={handleInputChange}
            placeholder={t('document_name')}
            required
          />
        </div>
        <div className="form-group">
          <label>{t('document_description')}</label>
          <textarea
            name="description"
            value={formData.description}
            onChange={handleInputChange}
            placeholder={t('document_description')}
            rows="3"
          />
        </div>
        <div className="form-group">
          <label>{t('author')}</label>
          <input
            type="text"
            name="author"
            value={formData.author}
            onChange={handleInputChange}
            placeholder={t('enter_author')}
          />
        </div>
        <div className="form-group">
          <label>内容</label>
          <textarea
            name="content"
            value={formData.content}
            onChange={handleInputChange}
            placeholder={t('enter_content')}
            rows="6"
          />
        </div>
      </div>
    </Modal>
  );
};

export default DocumentForm;