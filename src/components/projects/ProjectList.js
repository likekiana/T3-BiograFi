// src/components/projects/ProjectList.js
import React, { useState, useEffect } from 'react';
import ProjectCard from './ProjectCard';
import ProjectForm from './ProjectForm';
import { useProjects } from '../../hooks/useProjects';
import { t } from '../../utils/language';
import '../../styles/components/ProjectList.css';

const ProjectList = ({ onOpenProject }) => {
  const { projects, loading, error, createProject, searchProjects } = useProjects();
  const [searchQuery, setSearchQuery] = useState('');
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [filteredProjects, setFilteredProjects] = useState([]);

  useEffect(() => {
    if (searchQuery.trim()) {
      setFilteredProjects(searchProjects(searchQuery));
    } else {
      setFilteredProjects(projects);
    }
  }, [searchQuery, projects, searchProjects]);

  const handleCreateProject = async (projectData) => {
    try {
      await createProject(projectData);
      setShowCreateForm(false);
    } catch (error) {
      console.error('创建项目失败:', error);
    }
  };

  if (loading) {
    return (
      <div className="project-list-container">
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <p>{t('loading')}</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="project-list-container">
        <div className="error-container">
          <h3>加载失败</h3>
          <p>{error}</p>
          <button 
            className="retry-btn"
            onClick={() => window.location.reload()}
          >
            重试
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="project-list-container">
      <div className="page-header">
        <h2 className="page-title">{t('project_management')}</h2>
        <div className="header-actions">
          <div className="search-box">
            <input
              type="text"
              placeholder={t('search_project')}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="search-input"
            />
            <i data-feather="search" className="search-icon"></i>
          </div>
          <button 
            className="create-btn"
            onClick={() => setShowCreateForm(true)}
          >
            <i data-feather="plus"></i> {t('new_project')}
          </button>
        </div>
      </div>

      {showCreateForm && (
        <ProjectForm
          onSubmit={handleCreateProject}
          onCancel={() => setShowCreateForm(false)}
        />
      )}

      <div className="project-list">
        {filteredProjects.length === 0 ? (
          <div className="empty-state">
            {searchQuery ? (
              <>
                <h3>{t('no_matching_projects')}</h3>
                <p>{t('no_projects_found')} "{searchQuery}" 的项目</p>
                <button 
                  className="action-btn"
                  onClick={() => setSearchQuery('')}
                >
                  <i data-feather="x"></i> {t('clear_search')}
                </button>
              </>
            ) : (
              <>
                <h3>{t('welcome_title')}</h3>
                <p>{t('welcome_desc')}</p>
                <button 
                  className="create-btn"
                  onClick={() => setShowCreateForm(true)}
                >
                  <i data-feather="plus"></i> {t('create_first_project')}
                </button>
              </>
            )}
          </div>
        ) : (
          filteredProjects.map(project => (
            <ProjectCard
              key={project.id}
              project={project}
              onOpen={onOpenProject}
            />
          ))
        )}
      </div>
    </div>
  );
};

export default ProjectList;