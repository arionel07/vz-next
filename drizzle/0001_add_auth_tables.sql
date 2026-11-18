CREATE TABLE `auth_sessions` (
  `token_hash` char(64) NOT NULL,
  `client_id` int NOT NULL,
  `expires_at` datetime NOT NULL,
  `created_at` datetime NOT NULL,
  PRIMARY KEY (`token_hash`),
  KEY `auth_sessions_client_id` (`client_id`),
  KEY `auth_sessions_expires_at` (`expires_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `auth_verification_codes` (
  `id` int NOT NULL AUTO_INCREMENT,
  `client_id` int NOT NULL,
  `purpose` varchar(32) NOT NULL,
  `code_hash` char(64) NOT NULL,
  `attempt_count` int unsigned NOT NULL DEFAULT 0,
  `expires_at` datetime NOT NULL,
  `used_at` datetime DEFAULT NULL,
  `created_at` datetime NOT NULL,
  PRIMARY KEY (`id`),
  KEY `auth_verification_codes_client_id` (`client_id`),
  KEY `auth_verification_codes_expiry` (`expires_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `auth_password_reset_tokens` (
  `token_hash` char(64) NOT NULL,
  `client_id` int NOT NULL,
  `expires_at` datetime NOT NULL,
  `used_at` datetime DEFAULT NULL,
  `created_at` datetime NOT NULL,
  PRIMARY KEY (`token_hash`),
  KEY `auth_password_reset_tokens_client_id` (`client_id`),
  KEY `auth_password_reset_tokens_expiry` (`expires_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
