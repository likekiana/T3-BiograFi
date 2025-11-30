-- MySQL dump 10.13  Distrib 9.4.0, for Win64 (x86_64)
--
-- Host: localhost    Database: iannot
-- ------------------------------------------------------
-- Server version	9.4.0

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!50503 SET NAMES utf8mb4 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;

--
-- Table structure for table `ai_processing_logs`
--

DROP TABLE IF EXISTS `ai_processing_logs`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `ai_processing_logs` (
  `id` int NOT NULL AUTO_INCREMENT,
  `document_id` int NOT NULL COMMENT '处理的文档ID',
  `processing_type` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '处理类型（annotation/analysis/qa）',
  `request_data` text COLLATE utf8mb4_unicode_ci COMMENT '请求数据',
  `response_data` text COLLATE utf8mb4_unicode_ci COMMENT '响应数据',
  `model_used` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '使用的AI模型',
  `processing_time_ms` int DEFAULT NULL COMMENT '处理耗时（毫秒）',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  PRIMARY KEY (`id`),
  KEY `idx_document_id` (`document_id`),
  KEY `idx_processing_type` (`processing_type`),
  KEY `idx_created_at` (`created_at`),
  CONSTRAINT `ai_processing_logs_ibfk_1` FOREIGN KEY (`document_id`) REFERENCES `documents` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='AI处理记录表';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `ai_processing_logs`
--

LOCK TABLES `ai_processing_logs` WRITE;
/*!40000 ALTER TABLE `ai_processing_logs` DISABLE KEYS */;
/*!40000 ALTER TABLE `ai_processing_logs` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `annotations`
--

DROP TABLE IF EXISTS `annotations`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `annotations` (
  `id` int NOT NULL AUTO_INCREMENT,
  `document_id` int NOT NULL COMMENT '所属文档ID',
  `start_index` int NOT NULL COMMENT '标注起始位置',
  `end_index` int NOT NULL COMMENT '标注结束位置',
  `label` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '标注标签',
  `confidence` float DEFAULT NULL COMMENT '置信度（AI标注）',
  `created_by` int DEFAULT NULL COMMENT '标注者用户ID',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  PRIMARY KEY (`id`),
  KEY `created_by` (`created_by`),
  KEY `idx_document_id` (`document_id`),
  KEY `idx_start_end` (`document_id`,`start_index`,`end_index`),
  KEY `idx_label` (`label`),
  CONSTRAINT `annotations_ibfk_1` FOREIGN KEY (`document_id`) REFERENCES `documents` (`id`) ON DELETE CASCADE,
  CONSTRAINT `annotations_ibfk_2` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB AUTO_INCREMENT=61 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='标注表';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `annotations`
--

LOCK TABLES `annotations` WRITE;
/*!40000 ALTER TABLE `annotations` DISABLE KEYS */;
INSERT INTO `annotations` VALUES (1,1,0,1,'其他',NULL,NULL,'2025-10-31 02:51:03'),(2,3,11,14,'地名',NULL,NULL,'2025-10-31 02:51:03');
/*!40000 ALTER TABLE `annotations` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `documents`
--

DROP TABLE IF EXISTS `documents`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `documents` (
  `id` int NOT NULL AUTO_INCREMENT,
  `original_id` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '原始ID（从JSON迁移）',
  `project_id` int NOT NULL COMMENT '所属项目ID',
  `user_id` int NOT NULL COMMENT '所属用户ID',
  `name` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '文档名称',
  `description` text COLLATE utf8mb4_unicode_ci COMMENT '文档描述',
  `content` text COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '文档内容',
  `author` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '作者',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  PRIMARY KEY (`id`),
  UNIQUE KEY `original_id` (`original_id`),
  KEY `idx_project_id` (`project_id`),
  KEY `idx_user_id` (`user_id`),
  KEY `idx_original_id` (`original_id`),
  FULLTEXT KEY `idx_content` (`content`) COMMENT '全文搜索索引',
  CONSTRAINT `documents_ibfk_1` FOREIGN KEY (`project_id`) REFERENCES `projects` (`id`) ON DELETE CASCADE,
  CONSTRAINT `documents_ibfk_2` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=41 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='文档表';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `documents`
--

LOCK TABLES `documents` WRITE;
/*!40000 ALTER TABLE `documents` DISABLE KEYS */;
INSERT INTO `documents` VALUES (1,'17604921936987mqc3yoij',1,1,'左传','','青取之于蓝而胜于蓝','','2025-10-14 17:36:33','2025-10-14 19:01:48'),(2,'1760495809617v78odiezt',1,1,'论语','','君子曰学不可以已\n君子 曰 学 不 可以 已','','2025-10-14 18:36:49','2025-10-14 19:00:27'),(3,'1760501682869d8gkibekj',1,1,'六州歌头•东风著意.txt','','东风 著意 ， 先上 小桃枝 。 红粉 腻 ， 娇如醉 ， 倚 朱扉 。 记年 时 ， 隐映 新妆 面 ， 临 水岸 ， 春 将 半 ， 云 日暖 ， 斜桥 转 ， 夹 城西 。 草软莎平 ， 跋马 垂杨 渡 ， 玉勒争 嘶 。 认 娥眉 ， 凝 笑脸 ， 薄拂燕脂 。 绣户 曾 窥 ， 恨 依依 。 \n 共 携手 处 ， 香 如雾 ， 红 随步 ， 怨春迟 。 消瘦 损 ， 凭 谁 问 ？ 只花知 ， 泪空 垂 。 旧日 堂 前燕 ， 和 烟雨 ， 又 双飞 。 人自老 ， 春长 好 ， 梦 佳期 。 前度刘郎 ， 几许 风流 地 ， 花 也 应悲 。 但 茫茫 暮霭 ， 目断 武陵 溪 ， 往事 难 追 。','','2025-10-14 20:14:42','2025-10-16 04:01:53'),(24,'doc_1761931789158_wz2fyybkw',20,3,'1','1','','','2025-10-31 17:29:49','2025-10-31 17:29:49'),(25,'doc_1761931796889_gpqhzf1cu',20,3,'12','22','','','2025-10-31 17:29:56','2025-10-31 17:29:56'),(26,'doc_1761931804938_24bqheb48',20,3,'test.txt','','文档名称: 桃花源记.txt\n文档描述: 无\n创建时间: 2025-10-17 02:32:51\n更新时间: 2025-10-17 03:17:06\n导出时间: 2025-10-17 03:18:19\n\n文档内容（古文原文）:\n《桃花源记》\n\n　　陶渊明\n\n　　晋太元中，武陵人捕鱼为业。缘溪行(xíng)，忘路之远近。忽逢桃花林，夹岸数百步，中无杂树，芳草鲜美，落英缤纷。渔人甚异之。复前行，欲穷其林。\n\n　　林尽水源，便得一山，山有小口，仿佛若有光。便舍船，从口入。初极狭，才通人。复行数十步，豁然开朗。土地平旷，屋舍俨(yǎn)然，有良田，美池，桑竹之属。阡陌(qiānmò)交通，鸡犬相闻。其中往来种作，男女衣着(zhuó)，悉如外人。黄发垂髫(tiáo)，并怡然自乐。\n\n　　见渔人，乃大惊，问所从来，具答之。便要(yāo)还家，为设酒杀鸡作食。村中闻有此人，咸来问讯。自云先世避秦时乱，率妻子邑人来此绝境，不复出焉，遂与外人间(jiàn)隔。问今是何世，乃不知有汉，无论魏晋。此人一一为具言所闻，皆叹惋。余人各复延至其家，皆出酒食。停数日，辞去。此中人语 (yù)云：“不足为外人道也。”\n\n　　既出，得其船，便扶向路，处处志之。及郡下，诣(yì)太守，说如此。太守即(jí)遣人随其往，寻向所志，遂迷，不复得路。\n\n　　南阳刘子骥(jì)，高尚士也，闻之，欣然规往。未果，寻病终，后遂无问津者。\n','','2025-10-31 17:30:04','2025-10-31 17:30:04'),(27,'doc_1761931880183_ane0nf59r',20,3,'1','214','','','2025-10-31 17:31:20','2025-10-31 17:31:20'),(28,'doc_1761931949469_4qscbndq4',20,3,'1','21','','','2025-10-31 17:32:29','2025-10-31 17:32:29'),(29,'doc_1761931981533_jo8mtwnjv',20,3,'1','1','','','2025-10-31 17:33:01','2025-10-31 17:33:01'),(39,'doc_1761935353915_vh6mx6n6o',26,4,'12','211','','','2025-10-31 18:29:13','2025-10-31 18:29:13'),(40,'doc_1761935366518_k0mamgitj',26,4,'21','3123','','','2025-10-31 18:29:26','2025-10-31 18:29:26');
/*!40000 ALTER TABLE `documents` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `projects`
--

DROP TABLE IF EXISTS `projects`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `projects` (
  `id` int NOT NULL AUTO_INCREMENT,
  `original_id` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '原始ID（从JSON迁移）',
  `user_id` int NOT NULL COMMENT '所属用户ID',
  `name` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '项目名称',
  `description` text COLLATE utf8mb4_unicode_ci COMMENT '项目描述',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  PRIMARY KEY (`id`),
  UNIQUE KEY `original_id` (`original_id`),
  KEY `idx_user_id` (`user_id`),
  KEY `idx_original_id` (`original_id`),
  CONSTRAINT `projects_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=27 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='项目表';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `projects`
--

LOCK TABLES `projects` WRITE;
/*!40000 ALTER TABLE `projects` DISABLE KEYS */;
INSERT INTO `projects` VALUES (1,'1760492180723k2lri3e3e',1,'a','这是项目a的项目描述测试\naaa','2025-10-14 17:36:20','2025-10-16 03:27:38'),(2,'1760496128476qn0wn3yfc',2,'k','','2025-10-14 18:42:08','2025-10-14 18:42:08'),(20,'proj_1761931784638_l8l8t6wpp',3,'1','2','2025-10-31 17:29:44','2025-10-31 17:29:44'),(26,'proj_1761935349661_25y1m618p',4,'12','12','2025-10-31 18:29:09','2025-10-31 18:29:09');
/*!40000 ALTER TABLE `projects` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `segmentations`
--

DROP TABLE IF EXISTS `segmentations`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `segmentations` (
  `id` int NOT NULL AUTO_INCREMENT,
  `document_id` int NOT NULL COMMENT '所属文档ID',
  `original_text` text COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '原始文本',
  `segmented_text` text COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '分词后文本',
  `segmentation_method` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '分词方法',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  PRIMARY KEY (`id`),
  KEY `idx_document_id` (`document_id`),
  CONSTRAINT `segmentations_ibfk_1` FOREIGN KEY (`document_id`) REFERENCES `documents` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='分词结果表';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `segmentations`
--

LOCK TABLES `segmentations` WRITE;
/*!40000 ALTER TABLE `segmentations` DISABLE KEYS */;
/*!40000 ALTER TABLE `segmentations` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `users`
--

DROP TABLE IF EXISTS `users`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `users` (
  `id` int NOT NULL AUTO_INCREMENT,
  `username` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '用户名',
  `email` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '邮箱',
  `password_hash` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '加密后的密码',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `last_login` timestamp NULL DEFAULT NULL COMMENT '最后登录时间',
  `is_active` tinyint(1) DEFAULT '1' COMMENT '是否激活',
  PRIMARY KEY (`id`),
  UNIQUE KEY `username` (`username`),
  UNIQUE KEY `email` (`email`),
  KEY `idx_username` (`username`),
  KEY `idx_email` (`email`)
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='用户表';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `users`
--

LOCK TABLES `users` WRITE;
/*!40000 ALTER TABLE `users` DISABLE KEYS */;
INSERT INTO `users` VALUES (1,'zontiks','admin12@example.com','123456','2025-10-15 04:00:00','2025-10-16 20:25:32',1),(2,'zzz','2848685684@qq.com','123456','2025-10-14 17:10:05','2025-10-14 18:41:57',1),(3,'zzh','3147307592@qq.com','123456','2025-10-30 19:30:23','2025-10-31 07:40:50',1),(4,'test1','test@qq.com','$2b$10$PzOpVJDTMXFfHoRJnS4LgOolSFntM/OqqziCApHn9PndstVcLwqBK','2025-10-31 17:37:58','2025-10-31 18:37:09',1);
/*!40000 ALTER TABLE `users` ENABLE KEYS */;
UNLOCK TABLES;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2025-11-01  2:41:16
