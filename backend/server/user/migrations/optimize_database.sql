-- 数据库结构优化脚本
-- 修复字段命名不一致、缺少字段等问题

-- 1. 为users表添加updated_at字段
ALTER TABLE users
ADD COLUMN IF NOT EXISTS updated_at datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
ADD COLUMN IF NOT EXISTS settings json NULL AFTER is_active;

-- 2. 为entity_annotations表添加type和updated_at字段
ALTER TABLE entity_annotations
ADD COLUMN IF NOT EXISTS type varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'entity' AFTER text_content,
ADD COLUMN IF NOT EXISTS updated_at datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP;

-- 3. 为relation_annotations表添加updated_at字段
ALTER TABLE relation_annotations
ADD COLUMN IF NOT EXISTS updated_at datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP;

-- 4. 为document_statistics表添加updated_at字段（如果没有的话）
ALTER TABLE document_statistics
ADD COLUMN IF NOT EXISTS updated_at datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP;

-- 5. 为time_normalization_cache表添加updated_at字段（如果没有的话）
ALTER TABLE time_normalization_cache
ADD COLUMN IF NOT EXISTS updated_at datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP;

-- 6. 为location_geocodes表添加created_at字段（如果没有的话）
ALTER TABLE location_geocodes
ADD COLUMN IF NOT EXISTS created_at datetime NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- 7. 更新users表的现有记录，设置默认的updated_at值
UPDATE users
SET updated_at = created_at
WHERE updated_at IS NULL OR updated_at = '0000-00-00 00:00:00';

-- 8. 更新entity_annotations表的现有记录，设置默认的updated_at值
UPDATE entity_annotations
SET updated_at = created_at
WHERE updated_at IS NULL OR updated_at = '0000-00-00 00:00:00';

-- 9. 更新relation_annotations表的现有记录，设置默认的updated_at值
UPDATE relation_annotations
SET updated_at = created_at
WHERE updated_at IS NULL OR updated_at = '0000-00-00 00:00:00';

-- 10. 确保documents表的entityAnnotations和relationAnnotations字段有默认值
ALTER TABLE documents
MODIFY COLUMN entityAnnotations json NULL DEFAULT '[]',
MODIFY COLUMN relationAnnotations json NULL DEFAULT '[]';

-- 11. 更新documents表的现有记录，确保entityAnnotations和relationAnnotations有默认值
UPDATE documents
SET entityAnnotations = '[]'
WHERE entityAnnotations IS NULL;

UPDATE documents
SET relationAnnotations = '[]'
WHERE relationAnnotations IS NULL;

-- 12. 为documents表添加全文索引（如果没有的话）
-- 注意：这个索引在init_database.sql中已经创建，这里作为备份
ALTER TABLE documents
ADD FULLTEXT INDEX IF NOT EXISTS idx_content_search (name, description, content, author) /*!50100 WITH PARSER `ngram` */;

-- 13. 为entity_annotations表添加更多索引，优化查询性能
ALTER TABLE entity_annotations
ADD INDEX IF NOT EXISTS idx_document_label (document_id, label),
ADD INDEX IF NOT EXISTS idx_document_type (document_id, type),
ADD INDEX IF NOT EXISTS idx_label_text (label, text_content(100));

-- 14. 为relation_annotations表添加更多索引，优化查询性能
ALTER TABLE relation_annotations
ADD INDEX IF NOT EXISTS idx_relation_type (relation_type),
ADD INDEX IF NOT EXISTS idx_source_target (source_entity_id, target_entity_id),
ADD INDEX IF NOT EXISTS idx_target_source (target_entity_id, source_entity_id);

-- 15. 为location_geocodes表添加更多索引，优化查询性能
ALTER TABLE location_geocodes
ADD INDEX IF NOT EXISTS idx_lat_lng (lat, lng),
ADD INDEX IF NOT EXISTS idx_confidence (confidence);

-- 16. 为time_normalization_cache表添加更多索引，优化查询性能
ALTER TABLE time_normalization_cache
ADD INDEX IF NOT EXISTS idx_time_type (time_type),
ADD INDEX IF NOT EXISTS idx_confidence (confidence);

-- 17. 为user_settings表添加updated_at字段（如果没有的话）
ALTER TABLE user_settings
ADD COLUMN IF NOT EXISTS updated_at datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP;

-- 18. 更新user_settings表的现有记录，设置默认的updated_at值
UPDATE user_settings
SET updated_at = created_at
WHERE updated_at IS NULL OR updated_at = '0000-00-00 00:00:00';

-- 19. 为export_records表添加updated_at字段（如果没有的话）
ALTER TABLE export_records
ADD COLUMN IF NOT EXISTS updated_at datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP;

-- 20. 更新export_records表的现有记录，设置默认的updated_at值
UPDATE export_records
SET updated_at = created_at
WHERE updated_at IS NULL OR updated_at = '0000-00-00 00:00:00';

-- 21. 优化表结构，重建索引
OPTIMIZE TABLE users, projects, documents, entity_annotations, relation_annotations, document_statistics, export_records, location_geocodes, time_normalization_cache, user_settings;

-- 完成优化
SELECT '数据库结构优化完成' AS result;