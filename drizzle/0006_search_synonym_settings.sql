CREATE TABLE IF NOT EXISTS `search_synonym_settings` (
  `id` int NOT NULL,
  `groups_json` text NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
