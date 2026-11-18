CREATE TABLE IF NOT EXISTS `admin_sessions` (
  `token_hash` char(64) NOT NULL,
  `admin_id` int NOT NULL,
  `expires_at` datetime NOT NULL,
  `created_at` datetime NOT NULL,
  PRIMARY KEY (`token_hash`),
  KEY `admin_sessions_admin_id` (`admin_id`),
  KEY `admin_sessions_expires_at` (`expires_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `admin_login_attempts` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `attempt_key` char(64) NOT NULL,
  `created_at` datetime NOT NULL,
  PRIMARY KEY (`id`),
  KEY `admin_login_attempts_key_created` (`attempt_key`, `created_at`),
  KEY `admin_login_attempts_created_at` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
