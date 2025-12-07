// src/components/editor/RelationAnnotator.js
import React, { useMemo, useState } from 'react';
import { t } from '../../utils/language';
import '../../styles/components/RelationAnnotator.css';

const RelationAnnotator = ({
  documentId,
  documentName,
  entityAnnotations = [],
  relations = [],
  onAddRelation,
  onDeleteRelation
}) => {
  const [selectedEntity1, setSelectedEntity1] = useState('');
  const [selectedEntity2, setSelectedEntity2] = useState('');
  const [relationName, setRelationName] = useState('');
  const [adding, setAdding] = useState(false);
  const [exporting, setExporting] = useState(false);

  const entityOptions = useMemo(
    () =>
      entityAnnotations.map((ann, index) => ({
        value: String(index),
        label: `${ann.label || t('other')} · "${ann.text || ''}" [${ann.start}-${ann.end}]`
      })),
    [entityAnnotations]
  );

  const formatEntityText = (entity) => {
    if (!entity) return '';
    return `${entity.label || t('other')}｜${entity.text || ''}`;
  };

  const resetForm = () => {
    setSelectedEntity1('');
    setSelectedEntity2('');
    setRelationName('');
  };

  const handleAddRelation = async () => {
    if (!onAddRelation) return;
    if (entityAnnotations.length < 2) {
      alert(t('entity_required_for_relation'));
      return;
    }
    if (selectedEntity1 === '' || selectedEntity2 === '') {
      alert(t('select_entities_first'));
      return;
    }
    if (selectedEntity1 === selectedEntity2) {
      alert(t('select_distinct_entities'));
      return;
    }
    if (!relationName.trim()) {
      alert(t('input_relation_name'));
      return;
    }

    const entity1 = entityAnnotations[Number(selectedEntity1)];
    const entity2 = entityAnnotations[Number(selectedEntity2)];

    setAdding(true);
    try {
      await onAddRelation({
        entity1,
        entity2,
        relationName: relationName.trim()
      });
      resetForm();
    } catch (error) {
      console.error('添加关系标注失败:', error);
      alert(error.message || t('add_relation_failed'));
    } finally {
      setAdding(false);
    }
  };

  const handleDeleteRelation = async (relationId) => {
    if (!onDeleteRelation || !relationId) return;
    try {
      await onDeleteRelation(relationId);
    } catch (error) {
      console.error('删除关系标注失败:', error);
      alert(error.message || t('delete_relation_failed'));
    }
  };

  const handleExport = () => {
    if (relations.length === 0) {
      alert(t('no_relations_to_export'));
      return;
    }

    setExporting(true);
    try {
      const header = [t('relation_entity1'), t('relation_entity2'), t('relation_name')];
      const rows = relations.map((relation) => [
        formatEntityText(relation.entity1),
        formatEntityText(relation.entity2),
        relation.relationName || ''
      ]);

      const csvContent = [header, ...rows]
        .map((row) => row.map((cell = '') => `"${String(cell).replace(/"/g, '""')}"`).join(','))
        .join('\n');

      const blob = new Blob(['\ufeff' + csvContent], {
        type: 'application/vnd.ms-excel'
      });
      const safeName = (documentName || documentId || 'relations').replace(/[^\w\u4e00-\u9fa5-]+/g, '_');
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${safeName}-关系标注.xls`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('导出关系失败:', error);
      alert(t('export_relation_failed'));
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="relation-annotator">
      <div className="relation-controls">
        <div className="control-group">
          <label>{t('relation_entity1')}</label>
          <select
            value={selectedEntity1}
            onChange={(e) => setSelectedEntity1(e.target.value)}
            className="label-select"
          >
            <option value="">{t('select_entity_placeholder')}</option>
            {entityOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        <div className="control-group">
          <label>{t('relation_entity2')}</label>
          <select
            value={selectedEntity2}
            onChange={(e) => setSelectedEntity2(e.target.value)}
            className="label-select"
          >
            <option value="">{t('select_entity_placeholder')}</option>
            {entityOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        <div className="control-group relation-name-input">
          <label>{t('relation_name')}</label>
          <input
            type="text"
            value={relationName}
            onChange={(e) => setRelationName(e.target.value)}
            placeholder={t('enter_relation_name')}
          />
        </div>
      </div>

      {entityAnnotations.length < 2 && (
        <div className="relation-hint">
          <i data-feather="info"></i>
          <span>{t('entity_required_for_relation')}</span>
        </div>
      )}

      <div className="relation-actions">
        <button
          className="action-btn primary"
          onClick={handleAddRelation}
          disabled={adding || entityAnnotations.length < 2}
        >
          <i data-feather="link-2"></i>
          {adding ? t('adding') : t('add_relation')}
        </button>
        <button
          className="action-btn"
          onClick={handleExport}
          disabled={exporting || relations.length === 0}
        >
          <i data-feather="download"></i>
          {exporting ? t('exporting') : t('export_relations')}
        </button>
      </div>

      <div className="relation-list-section">
        <h4>{t('relation_list')}</h4>
        {relations.length === 0 ? (
          <div className="empty-relations">{t('no_relation_annotations')}</div>
        ) : (
          <div className="relation-list">
            {relations.map((relation, index) => (
              <div key={relation.id || index} className="relation-item">
                <div className="relation-entities">
                  <span className="entity-chip">{formatEntityText(relation.entity1)}</span>
                  <i data-feather="arrow-right"></i>
                  <span className="entity-chip">{formatEntityText(relation.entity2)}</span>
                </div>
                <div className="relation-name">{relation.relationName}</div>
                {onDeleteRelation && (
                  <button
                    className="delete-relation-btn"
                    onClick={() => handleDeleteRelation(relation.id)}
                    title="删除关系"
                  >
                    <i data-feather="x"></i>
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default RelationAnnotator;
