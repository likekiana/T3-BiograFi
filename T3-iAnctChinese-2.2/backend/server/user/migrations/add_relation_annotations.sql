-- 添加 relationAnnotations 字段到 documents 表
-- 如果字段已存在则忽略错误

ALTER TABLE documents 
ADD COLUMN IF NOT EXISTS relationAnnotations JSON NULL 
AFTER entityAnnotations;

-- 为已存在的记录设置默认值
UPDATE documents 
SET relationAnnotations = '[]' 
WHERE relationAnnotations IS NULL;
