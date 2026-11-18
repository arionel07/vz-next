CREATE TABLE IF NOT EXISTS `search_query_stats` (
  `query_date` date NOT NULL,
  `query_text` varchar(100) NOT NULL,
  `search_count` int unsigned NOT NULL DEFAULT 1,
  `updated_at` datetime NOT NULL,
  PRIMARY KEY (`query_date`, `query_text`),
  KEY `idx_search_query_date_count` (`query_date`, `search_count`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
