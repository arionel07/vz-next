CREATE TABLE `site_popups` (
	`id` int AUTO_INCREMENT NOT NULL,
	`titleRu` varchar(255) NOT NULL,
	`titleRo` varchar(255) NOT NULL,
	`textRu` text NOT NULL,
	`textRo` text NOT NULL,
	`image` varchar(128),
	`ctaLabelRu` varchar(128) NOT NULL DEFAULT '',
	`ctaLabelRo` varchar(128) NOT NULL DEFAULT '',
	`ctaUrl` varchar(255) NOT NULL DEFAULT '',
	`audience` enum('all','guest','authenticated') NOT NULL DEFAULT 'all',
	`start_at` datetime,
	`end_at` datetime,
	`reshow_days` int NOT NULL DEFAULT 1,
	`is_shown` tinyint NOT NULL DEFAULT 1,
	`sorder` int NOT NULL DEFAULT 0,
	`updated_at` datetime,
	`created_at` datetime NOT NULL DEFAULT (CURRENT_TIMESTAMP),
	CONSTRAINT `site_popups_id` PRIMARY KEY(`id`)
);

CREATE INDEX `idx_site_popups_shown_audience` ON `site_popups` (`is_shown`, `audience`);
