// src/components/projects/ProjectCard.js
import React, { useState } from 'react';
import { useProjects } from '../../hooks/useProjects';
import { t } from '../../utils/language';
import Modal from '../common/Modal';
import '../../styles/components/ProjectCard.css';

const ProjectCard = ({ project, onOpen }) => {
  const { updateProject, deleteProject } = useProjects();
  const [showDetails, setShowDetails] = useState(false);
  const [editData, setEditData] = useState({
    name: project.name,
    description: project.description || ''
  });

  const handleEdit = async () => {
    try {
      await updateProject(project.id, editData);
      setShowDetails(false);
    } catch (error) {
      console.error('更新项目失败:', error);
    }
  };

  const handleDelete = async () => {
    if (window.confirm(t('confirm_delete_project'))) {
      try {
        await deleteProject(project.id);
      } catch (error) {
        console.error('删除项目失败:', error);
      }
    }
  };

  return (
    <>
      <div className="project-card">
        <div className="project-info">
          <div className="project-title-row">
            <span className="project-name">{project.name}</span>
            <span className="project-detail">{project.description}</span>
          </div>
          <span className="project-date">{project.createdAt}</span>
        </div>
        
        <div className="project-actions">
          <button 
            className="action-btn" 
            onClick={() => onOpen(project)}
          >
            <i data-feather="folder"></i> {t('open_project')}
          </button>
          <button 
            className="action-btn" 
            onClick={() => setShowDetails(true)}
          >
            <i data-feather="info"></i> {t('project_details')}
          </button>
          <button 
            className="action-btn delete-btn" 
            onClick={handleDelete}
          >
            <i data-feather="trash-2"></i> {t('delete_project')}
          </button>
        </div>
      </div>

      {/* 项目详情模态框 */}
      <Modal
        isOpen={showDetails}
        onClose={() => setShowDetails(false)}
        title={t('project_details')}
        onSubmit={handleEdit}
        submitText={t('save_changes')}
      >
        <div className="modal-form">
          <div className="form-group">
            <label>{t('project_name')}</label>
            <input
              type="text"
              value={editData.name}
              onChange={(e) => setEditData(prev => ({ ...prev, name: e.target.value }))}
            />
          </div>
          <div className="form-group">
            <label>{t('project_description')}</label>
            <textarea
              value={editData.description}
              onChange={(e) => setEditData(prev => ({ ...prev, description: e.target.value }))}
              rows="3"
            />
          </div>
          <div className="form-group">
            <label>{t('created_at')}</label>
            <input type="text" value={project.createdAt} readOnly />
          </div>
          <div className="form-group">
            <label>{t('update_time')}</label>
            <input type="text" value={project.updatedAt || project.createdAt} readOnly />
          </div>
        </div>
      </Modal>
    </>
  );
};

export default ProjectCard;