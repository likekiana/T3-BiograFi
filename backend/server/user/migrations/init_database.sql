-- 初始化数据库脚本
-- 创建所有必要的表结构

-- 首先禁用外键检查，便于创建表 
SET FOREIGN_KEY_CHECKS = 0; 
 
-- 1. 创建users表（基础表） 
DROP TABLE IF EXISTS `users`; 
CREATE TABLE `users` ( 
  `id` int NOT NULL AUTO_INCREMENT, 
  `username` varchar(64) COLLATE utf8mb4_unicode_ci NOT NULL, 
  `email` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL, 
  `password` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL, 
  `created_at` datetime NOT NULL, 
  `last_login` datetime DEFAULT NULL, 
  `is_active` tinyint(1) DEFAULT '1', 
  PRIMARY KEY (`id`), 
  UNIQUE KEY `username` (`username`), 
  UNIQUE KEY `email` (`email`), 
  KEY `idx_username` (`username`), 
  KEY `idx_email` (`email`), 
  KEY `idx_username_active` (`username`,`is_active`) 
) ENGINE=InnoDB AUTO_INCREMENT=7 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci; 
 
-- 2. 创建projects表 
DROP TABLE IF EXISTS `projects`; 
CREATE TABLE `projects` ( 
  `id` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL, 
  `user_id` int NOT NULL, 
  `name` varchar(200) COLLATE utf8mb4_unicode_ci NOT NULL, 
  `description` text COLLATE utf8mb4_unicode_ci, 
  `created_at` datetime NOT NULL, 
  `updated_at` datetime NOT NULL, 
  PRIMARY KEY (`id`), 
  KEY `idx_user_id` (`user_id`), 
  CONSTRAINT `projects_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE 
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci; 
 
-- 3. 创建documents表 - 修复FULLTEXT索引排序规则问题 
-- MySQL 8.0不支持在FULLTEXT索引中使用utf8mb4_0900_ai_ci，需改为utf8mb4_unicode_ci 
DROP TABLE IF EXISTS `documents`; 
CREATE TABLE `documents` ( 
  `id` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL, 
  `user_id` int NOT NULL, 
  `project_id` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL, 
  `name` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL, 
  `description` text COLLATE utf8mb4_unicode_ci, 
  `content` longtext COLLATE utf8mb4_unicode_ci, 
  `author` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL, 
  `created_at` datetime NOT NULL, 
  `updated_at` datetime NOT NULL, 
  `entityAnnotations` JSON NULL, 
  `relationAnnotations` JSON NULL, 
  PRIMARY KEY (`id`), 
  KEY `idx_user_id` (`user_id`), 
  KEY `idx_project_id` (`project_id`), 
  FULLTEXT KEY `idx_content_search` (`name`,`description`,`content`,`author`) /*!50100 WITH PARSER `ngram` */, 
  CONSTRAINT `documents_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE, 
  CONSTRAINT `documents_ibfk_2` FOREIGN KEY (`project_id`) REFERENCES `projects` (`id`) ON DELETE CASCADE 
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci; 
 
-- 4. 创建document_statistics表 - JSON字段在MySQL 8.0中需要特定版本支持 
-- 确保MySQL 8.0版本在8.0.13以上以支持JSON字段的NOT NULL约束 
DROP TABLE IF EXISTS `document_statistics`; 
CREATE TABLE `document_statistics` ( 
  `id` int NOT NULL AUTO_INCREMENT, 
  `document_id` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL, 
  `total_chars` int NOT NULL DEFAULT '0', 
  `label_counts` json NOT NULL, 
  `entity_density` decimal(5,2) DEFAULT '0.00', 
  `last_calculated` datetime NOT NULL, 
  PRIMARY KEY (`id`), 
  UNIQUE KEY `document_id` (`document_id`), 
  KEY `idx_document_id` (`document_id`), 
  CONSTRAINT `document_statistics_ibfk_1` FOREIGN KEY (`document_id`) REFERENCES `documents` (`id`) ON DELETE CASCADE 
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci; 
 
-- 5. 创建entity_annotations表 
DROP TABLE IF EXISTS `entity_annotations`; 
CREATE TABLE `entity_annotations` ( 
  `id` int NOT NULL AUTO_INCREMENT, 
  `document_id` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL, 
  `start_index` int NOT NULL, 
  `end_index` int NOT NULL, 
  `label` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL, 
  `text_content` text COLLATE utf8mb4_unicode_ci, 
  `created_at` datetime NOT NULL, 
  PRIMARY KEY (`id`), 
  KEY `idx_document_id` (`document_id`), 
  KEY `idx_label` (`label`), 
  KEY `idx_document_label_start` (`document_id`,`label`,`start_index`), 
  CONSTRAINT `entity_annotations_ibfk_1` FOREIGN KEY (`document_id`) REFERENCES `documents` (`id`) ON DELETE CASCADE 
) ENGINE=InnoDB AUTO_INCREMENT=102 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci; 
 
-- 6. 创建export_records表 
DROP TABLE IF EXISTS `export_records`; 
CREATE TABLE `export_records` ( 
  `id` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL, 
  `user_id` int NOT NULL, 
  `document_ids` json NOT NULL, 
  `export_format` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT 'txt+csv', 
  `file_paths` json NOT NULL, 
  `status` enum('processing','completed','failed') COLLATE utf8mb4_unicode_ci DEFAULT 'processing', 
  `created_at` datetime NOT NULL, 
  `completed_at` datetime DEFAULT NULL, 
  PRIMARY KEY (`id`), 
  KEY `idx_user_id` (`user_id`), 
  KEY `idx_status` (`status`), 
  CONSTRAINT `export_records_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE 
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci; 
 
-- 7. 创建location_geocodes表 
DROP TABLE IF EXISTS `location_geocodes`; 
CREATE TABLE `location_geocodes` ( 
  `id` int NOT NULL AUTO_INCREMENT, 
  `name` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL, 
  `lng` decimal(10,6) NOT NULL, 
  `lat` decimal(10,6) NOT NULL, 
  `matched_name` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL, 
  `confidence` enum('high','medium','low') COLLATE utf8mb4_unicode_ci DEFAULT 'medium', 
  `created_at` datetime NOT NULL, 
  `updated_at` datetime NOT NULL, 
  PRIMARY KEY (`id`), 
  UNIQUE KEY `unique_name` (`name`), 
  KEY `idx_name` (`name`) 
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci; 
 
-- 8. 创建relation_annotations表 
DROP TABLE IF EXISTS `relation_annotations`; 
CREATE TABLE `relation_annotations` ( 
  `id` int NOT NULL AUTO_INCREMENT, 
  `document_id` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL, 
  `source_entity_id` int DEFAULT NULL, 
  `target_entity_id` int DEFAULT NULL, 
  `relation_type` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL, 
  `created_at` datetime NOT NULL, 
  PRIMARY KEY (`id`), 
  KEY `idx_document_id` (`document_id`), 
  CONSTRAINT `relation_annotations_ibfk_1` FOREIGN KEY (`document_id`) REFERENCES `documents` (`id`) ON DELETE CASCADE 
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci; 
 
-- 9. 创建time_normalization_cache表 
DROP TABLE IF EXISTS `time_normalization_cache`; 
CREATE TABLE `time_normalization_cache` ( 
  `id` int NOT NULL AUTO_INCREMENT, 
  `original_text` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL, 
  `normalized_time` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL, 
  `time_type` enum('year','month','day','season','dynasty') COLLATE utf8mb4_unicode_ci NOT NULL, 
  `confidence` enum('high','medium','low') COLLATE utf8mb4_unicode_ci DEFAULT 'medium', 
  `created_at` datetime NOT NULL, 
  PRIMARY KEY (`id`), 
  UNIQUE KEY `unique_text` (`original_text`), 
  KEY `idx_original_text` (`original_text`) 
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci; 
 
-- 10. 创建user_settings表 
DROP TABLE IF EXISTS `user_settings`; 
CREATE TABLE `user_settings` ( 
  `id` int NOT NULL AUTO_INCREMENT, 
  `user_id` int NOT NULL, 
  `default_labels` json DEFAULT NULL, 
  `visualization_config` json DEFAULT NULL, 
  `export_preferences` json DEFAULT NULL, 
  `created_at` datetime NOT NULL, 
  `updated_at` datetime NOT NULL, 
  PRIMARY KEY (`id`), 
  UNIQUE KEY `user_id` (`user_id`), 
  CONSTRAINT `user_settings_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE 
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci; 
 
-- 现在添加触发器 - MySQL 8.0兼容版本 
DELIMITER $$ 
 
-- documents表触发器 
DROP TRIGGER IF EXISTS `update_document_timestamp`$$ 
CREATE TRIGGER `update_document_timestamp` BEFORE UPDATE ON `documents` 
FOR EACH ROW 
BEGIN 
    SET NEW.updated_at = NOW(); 
END$$ 
 
-- projects表触发器 
DROP TRIGGER IF EXISTS `update_project_timestamp`$$ 
CREATE TRIGGER `update_project_timestamp` BEFORE UPDATE ON `projects` 
FOR EACH ROW 
BEGIN 
    SET NEW.updated_at = NOW(); 
END$$ 
 
DELIMITER ; 
 
-- 最后启用外键检查 
SET FOREIGN_KEY_CHECKS = 1; 
 
-- 设置字符集和时区（MySQL 8.0兼容方式） 
SET NAMES utf8mb4; 
SET time_zone = '+00:00';

-- 为现有记录设置默认值
UPDATE documents 
SET entityAnnotations = '[]' 
WHERE entityAnnotations IS NULL;

UPDATE documents 
SET relationAnnotations = '[]' 
WHERE relationAnnotations IS NULL;