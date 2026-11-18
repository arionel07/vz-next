-- Upgrade databases where 0001_add_auth_tables.sql was already applied.
SET @attempt_count_column_exists = (
  SELECT COUNT(*)
  FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'auth_verification_codes'
    AND COLUMN_NAME = 'attempt_count'
);

SET @attempt_count_ddl = IF(
  @attempt_count_column_exists = 0,
  'ALTER TABLE `auth_verification_codes` ADD COLUMN `attempt_count` int unsigned NOT NULL DEFAULT 0 AFTER `code_hash`',
  'SELECT 1'
);

PREPARE add_attempt_count_column FROM @attempt_count_ddl;
EXECUTE add_attempt_count_column;
DEALLOCATE PREPARE add_attempt_count_column;
