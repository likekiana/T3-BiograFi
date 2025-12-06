-- 创建location_geocodes表
-- 如果表已存在则忽略错误

CREATE TABLE IF NOT EXISTS location_geocodes (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(255) NOT NULL,
    lng DECIMAL(10, 6) NOT NULL,
    lat DECIMAL(10, 6) NOT NULL,
    matched_name VARCHAR(255),
    confidence VARCHAR(50),
    updated_at DATETIME NOT NULL,
    UNIQUE KEY unique_name (name)
);