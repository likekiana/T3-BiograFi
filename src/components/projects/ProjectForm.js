// src/components/projects/ProjectForm.js
import React, { useState } from 'react';
import { t } from '../../utils/language';
import Modal from '../common/Modal';
import '../../styles/components/ProjectForm.css';

const ProjectForm = ({ onSubmit, onCancel, initialData = {} }) => {
  const [formData, setFormData] = useState({
    name: initialData.name || '',
    description: initialData.description || ''
  });

  // 修复：简化提交处理
  const handleSubmit = () => {
    if (!formData.name.trim()) {
      alert(t('fill_required_fields'));
      return;
    }
    
    // 确保 description 不是 undefined
    const submitData = {
      name: formData.name.trim(),
      description: formData.description ? formData.description.trim() : ''
    };
    
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
      title={t('create_project')}
      onSubmit={handleSubmit}  // 直接传递函数，不包装事件
      submitText={t('create_project')}
    >
      <div className="modal-form">
        <div className="form-group">
          <label>{t('project_name')} *</label>
          <input
            type="text"
            name="name"
            value={formData.name}
            onChange={handleInputChange}
            placeholder={t('project_name')}
            required
          />
        </div>
        <div className="form-group">
          <label>{t('project_description')}</label>
          <textarea
            name="description"
            value={formData.description}
            onChange={handleInputChange}
            placeholder={t('project_description')}
            rows="3"
          />
        </div>
      </div>
    </Modal>
  );
};

export default ProjectForm;