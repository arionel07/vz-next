-- Current sql file was generated after introspecting the database
-- If you want to run this migration please uncomment this code before executing migrations
/*
CREATE TABLE `admins` (
	`id` int AUTO_INCREMENT NOT NULL,
	`login` varchar(50) NOT NULL DEFAULT '',
	`password` varchar(255) NOT NULL DEFAULT '',
	`admin_type` int NOT NULL DEFAULT 2,
	`status` int NOT NULL DEFAULT 1,
	`sorder` int NOT NULL,
	CONSTRAINT `admins_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `analytics_events` (
	`id` bigint unsigned AUTO_INCREMENT NOT NULL,
	`event_uid` char(36) NOT NULL,
	`event_name` varchar(40) NOT NULL,
	`visitor_key` char(64) NOT NULL,
	`session_key` char(64) NOT NULL,
	`cart_key` char(64),
	`product_id` int,
	`category_id` int,
	`order_id` int,
	`quantity` int unsigned,
	`cart_items_count` int unsigned,
	`cart_value` decimal(12,2),
	`event_value` decimal(12,2),
	`currency` char(3),
	`page_path` varchar(255),
	`traffic_source` varchar(80),
	`traffic_medium` varchar(80),
	`traffic_campaign` varchar(120),
	`referrer_host` varchar(191),
	`device_type` varchar(16),
	`consent_version` varchar(32) NOT NULL,
	`created_at` datetime NOT NULL,
	CONSTRAINT `analytics_events_id` PRIMARY KEY(`id`),
	CONSTRAINT `uq_analytics_events_event_uid` UNIQUE(`event_uid`)
);
--> statement-breakpoint
CREATE TABLE `article_likes` (
	`id` bigint unsigned AUTO_INCREMENT NOT NULL,
	`article_id` int NOT NULL,
	`visitor_key` char(64) NOT NULL,
	`created_at` datetime NOT NULL,
	CONSTRAINT `article_likes_id` PRIMARY KEY(`id`),
	CONSTRAINT `uq_article_likes_visitor` UNIQUE(`article_id`,`visitor_key`)
);
--> statement-breakpoint
CREATE TABLE `articles` (
	`id` int AUTO_INCREMENT NOT NULL,
	`date` date NOT NULL,
	`uriRU` varchar(300) NOT NULL,
	`uriRO` varchar(300) NOT NULL,
	`uriEN` varchar(300) NOT NULL,
	`titleRU` varchar(250),
	`titleRO` varchar(250),
	`titleEN` varchar(255),
	`descRU` text NOT NULL,
	`descRO` text NOT NULL,
	`descEN` text NOT NULL,
	`textRU` text,
	`textRO` text,
	`textEN` text,
	`textLRU` text,
	`textLRO` text,
	`textLEN` text,
	`seoTitleRU` varchar(250),
	`seoTitleRO` varchar(250),
	`seoTitleEN` varchar(255),
	`seoKeywordsRU` text,
	`seoKeywordsRO` text,
	`seoKeywordsEN` text,
	`seoDescRU` text,
	`tagsRU` varchar(500) NOT NULL DEFAULT '',
	`seoDescRO` text,
	`tagsRO` varchar(500) NOT NULL DEFAULT '',
	`seoDescEN` text,
	`menuON` int NOT NULL,
	`isShown` tinyint(1) NOT NULL DEFAULT 1,
	`isBlog` tinyint(1) NOT NULL DEFAULT 0,
	`sorder` int NOT NULL DEFAULT 1,
	`img` varchar(255),
	CONSTRAINT `articles_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `banners` (
	`id` int AUTO_INCREMENT NOT NULL,
	`titleRU` varchar(250),
	`titleRO` varchar(250),
	`titleEN` varchar(255),
	`uriRU` varchar(300) NOT NULL,
	`uriRO` varchar(300) NOT NULL,
	`uriEN` varchar(300) NOT NULL,
	`ColorText` varchar(32) NOT NULL,
	`ColorButton` varchar(32) NOT NULL,
	`ColorButtonText` varchar(32) NOT NULL,
	`isShown` tinyint(1) NOT NULL DEFAULT 1,
	`sorder` int NOT NULL DEFAULT 1,
	`img` varchar(255),
	`imgMob` varchar(254) NOT NULL,
	CONSTRAINT `banners_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `beauty_selection_products` (
	`id` int unsigned AUTO_INCREMENT NOT NULL,
	`selection_id` int unsigned NOT NULL,
	`product_id` int NOT NULL,
	`sorder` int NOT NULL DEFAULT 0,
	CONSTRAINT `beauty_selection_products_id` PRIMARY KEY(`id`),
	CONSTRAINT `uniq_beauty_selection_product` UNIQUE(`selection_id`,`product_id`)
);
--> statement-breakpoint
CREATE TABLE `beauty_selections` (
	`id` int unsigned AUTO_INCREMENT NOT NULL,
	`titleRU` varchar(255) NOT NULL,
	`titleRO` varchar(255) NOT NULL,
	`uriRU` varchar(255) NOT NULL,
	`uriRO` varchar(255) NOT NULL,
	`descRU` text,
	`descRO` text,
	`textRU` mediumtext,
	`textRO` mediumtext,
	`imgRU` varchar(255),
	`imgRO` varchar(255),
	`seoTitleRU` varchar(255),
	`seoTitleRO` varchar(255),
	`seoKeywordsRU` text,
	`seoKeywordsRO` text,
	`seoDescRU` text,
	`seoDescRO` text,
	`isShown` tinyint(1) NOT NULL DEFAULT 1,
	`sorder` int NOT NULL DEFAULT 0,
	`created_at` datetime,
	`updated_at` datetime,
	CONSTRAINT `beauty_selections_id` PRIMARY KEY(`id`),
	CONSTRAINT `uniq_beauty_selections_uri_ru` UNIQUE(`uriRU`),
	CONSTRAINT `uniq_beauty_selections_uri_ro` UNIQUE(`uriRO`)
);
--> statement-breakpoint
CREATE TABLE `brand_certificates` (
	`id` int unsigned AUTO_INCREMENT NOT NULL,
	`brand_id` int unsigned NOT NULL,
	`titleRU` varchar(255),
	`titleRO` varchar(255),
	`image` varchar(255) NOT NULL,
	`preview_image` varchar(255),
	`sorder` int NOT NULL DEFAULT 0,
	`isShown` tinyint(1) NOT NULL DEFAULT 1,
	`created_at` datetime,
	`updated_at` datetime,
	CONSTRAINT `brand_certificates_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `brands` (
	`id` int AUTO_INCREMENT NOT NULL,
	`GUID` varchar(128) NOT NULL,
	`title` varchar(256),
	`h1RO` varchar(255),
	`h1RU` varchar(255),
	`breadcrumbTitleRO` varchar(255),
	`breadcrumbTitleRU` varchar(255),
	`uri` varchar(256),
	`textRU` text NOT NULL,
	`textRO` text NOT NULL,
	`textEN` text NOT NULL,
	`img` varchar(256),
	`seoTitleRU` varchar(255),
	`seoTitleRO` varchar(255),
	`seoTitleEN` varchar(255),
	`seoKeywordsRU` text,
	`seoKeywordsRO` text,
	`seoKeywordsEN` text,
	`seoDescRU` text,
	`seoDescRO` text,
	`seoTextRO` mediumtext,
	`seoTextRU` mediumtext,
	`seoDescEN` text,
	`sorder` int DEFAULT 0,
	`top` int NOT NULL,
	`isShown` tinyint(1) DEFAULT 1,
	`updated_at` datetime,
	`created_at` datetime NOT NULL DEFAULT (CURRENT_TIMESTAMP),
	CONSTRAINT `brands_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `categories` (
	`id` int AUTO_INCREMENT NOT NULL,
	`GUID` varchar(128) NOT NULL,
	`parent_id` int NOT NULL DEFAULT 0,
	`feature_type` int NOT NULL,
	`step` int NOT NULL,
	`titleRU` varchar(256),
	`h1RU` varchar(255),
	`breadcrumbTitleRU` varchar(255),
	`titleRO` varchar(256),
	`h1RO` varchar(255),
	`breadcrumbTitleRO` varchar(255),
	`titleEN` varchar(256),
	`uriRU` varchar(256),
	`uriRO` varchar(256),
	`uriEN` varchar(256),
	`img` varchar(256),
	`imgNav` varchar(254) NOT NULL,
	`imgNavHover` varchar(254) NOT NULL,
	`calculator` int NOT NULL,
	`search_teg` varchar(255) NOT NULL,
	`seoTitleRU` varchar(255),
	`seoTitleRO` varchar(255),
	`seoTitleEN` varchar(255),
	`descRU` text NOT NULL,
	`descRO` text NOT NULL,
	`descEN` text NOT NULL,
	`seoKeywordsRU` text,
	`seoKeywordsRO` text,
	`seoKeywordsEN` text,
	`seoDescRU` text,
	`seoTextRU` mediumtext,
	`seoDescRO` text,
	`seoTextRO` mediumtext,
	`seoDescEN` text,
	`top_menu` int NOT NULL,
	`footer_menu` int NOT NULL,
	`sorder` int DEFAULT 0,
	`wallpaper` int NOT NULL,
	`isShown` tinyint(1) DEFAULT 1,
	`isCustomMobile` tinyint(1) NOT NULL DEFAULT 0,
	`updated_at` datetime,
	`created_at` datetime NOT NULL DEFAULT (CURRENT_TIMESTAMP),
	CONSTRAINT `categories_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `category_banner` (
	`id` int AUTO_INCREMENT NOT NULL,
	`category_id` int NOT NULL,
	`titleRU` varchar(256),
	`titleRO` varchar(256),
	`titleEN` varchar(256),
	`uriRU` varchar(256),
	`uriRO` varchar(256),
	`uriEN` varchar(256),
	`descRU` varchar(256),
	`descRO` varchar(256),
	`descEN` varchar(256),
	`img` varchar(256),
	`sorder` int DEFAULT 0,
	`isShown` tinyint(1) DEFAULT 1,
	`updated_at` datetime,
	`created_at` datetime NOT NULL DEFAULT (CURRENT_TIMESTAMP),
	CONSTRAINT `category_banner_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `clients` (
	`id` int AUTO_INCREMENT NOT NULL,
	`id_fb` int NOT NULL,
	`active` int NOT NULL,
	`Discount` varchar(16) NOT NULL,
	`Bonus` varchar(16) NOT NULL,
	`name` varchar(255) NOT NULL DEFAULT '0',
	`surname` varchar(256),
	`phone` varchar(256),
	`email` text,
	`address` varchar(254),
	`apartament` varchar(64),
	`city` varchar(64),
	`house` varchar(64),
	`porch` varchar(64),
	`birthday` varchar(256),
	`sex` int NOT NULL,
	`password` varchar(256),
	`code` int NOT NULL,
	`sms_subscribe` int NOT NULL,
	`mail_subscribe` int NOT NULL,
	`sorder` int DEFAULT 0,
	`isShown` tinyint(1) DEFAULT 1,
	`isb2b` tinyint NOT NULL DEFAULT 0,
	`welcome_offer_started_at` datetime,
	`welcome_offer_expires_at` datetime,
	CONSTRAINT `clients_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `collections` (
	`id` int AUTO_INCREMENT NOT NULL,
	`GUID` varchar(128) NOT NULL,
	`brand_id` int NOT NULL,
	`titleRU` varchar(256),
	`titleRO` varchar(256),
	`titleEN` varchar(256),
	`uriRU` varchar(256),
	`uriRO` varchar(256),
	`uriEN` varchar(256),
	`descRU` varchar(256),
	`descRO` varchar(256),
	`descEN` varchar(256),
	`img` varchar(256),
	`seoTitleRU` varchar(255),
	`seoTitleRO` varchar(255),
	`seoTitleEN` varchar(255),
	`seoKeywordsRU` text,
	`seoKeywordsRO` text,
	`seoKeywordsEN` text,
	`seoDescRU` text,
	`seoDescRO` text,
	`seoDescEN` text,
	`sorder` int DEFAULT 0,
	`top` int NOT NULL,
	`isShown` tinyint(1) DEFAULT 1,
	`updated_at` datetime,
	`created_at` datetime NOT NULL DEFAULT (CURRENT_TIMESTAMP),
	CONSTRAINT `collections_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `constants` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(250),
	`description` varchar(250),
	`EN` text,
	`RO` text NOT NULL,
	`RU` text,
	`fieldType` tinyint(1) NOT NULL DEFAULT 0,
	`groupes` enum('errors','transliteration','contacts','form','choose','about','dates') NOT NULL,
	`sorder` int NOT NULL DEFAULT 999,
	`isShown` int NOT NULL DEFAULT 1,
	CONSTRAINT `constants_id` PRIMARY KEY(`id`),
	CONSTRAINT `ID` UNIQUE(`id`)
);
--> statement-breakpoint
CREATE TABLE `dates` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(255),
	`date_start` date,
	`date_end` date,
	CONSTRAINT `dates_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `delivery` (
	`id` int AUTO_INCREMENT NOT NULL,
	`title1RU` varchar(250),
	`title1RO` varchar(250),
	`descL1RU` text NOT NULL,
	`descL1RO` text NOT NULL,
	`descR1RU` text NOT NULL,
	`descR1RO` text NOT NULL,
	`note1RU` text NOT NULL,
	`note1RO` text NOT NULL,
	`text1RU` text NOT NULL,
	`text1RO` text NOT NULL,
	`title2RU` varchar(250),
	`title2RO` varchar(250),
	`descL2RU` text NOT NULL,
	`descL2RO` text NOT NULL,
	`descR2RU` text NOT NULL,
	`descR2RO` text NOT NULL,
	`title3RU` varchar(250),
	`title3RO` varchar(250),
	`descL3RU` text NOT NULL,
	`descL3RO` text NOT NULL,
	`descR3RU` text NOT NULL,
	`descR3RO` text NOT NULL,
	`title4RU` varchar(250),
	`title4RO` varchar(250),
	`descL4RU` text NOT NULL,
	`descL4RO` text NOT NULL,
	`descR4RU` text NOT NULL,
	`descR4RO` text NOT NULL,
	`isShown` tinyint(1) NOT NULL DEFAULT 1,
	`sorder` int NOT NULL DEFAULT 1,
	CONSTRAINT `delivery_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `gift_promotion_brands` (
	`promotion_id` int unsigned NOT NULL,
	`brand_id` int unsigned NOT NULL,
	CONSTRAINT `gift_promotion_brands_promotion_id_brand_id` PRIMARY KEY(`promotion_id`,`brand_id`)
);
--> statement-breakpoint
CREATE TABLE `gift_promotions` (
	`id` int unsigned AUTO_INCREMENT NOT NULL,
	`titleRU` varchar(255) NOT NULL,
	`titleRO` varchar(255) NOT NULL,
	`descriptionRU` text,
	`descriptionRO` text,
	`gift_id` int unsigned NOT NULL,
	`offer_id` int unsigned,
	`condition_qty` int unsigned NOT NULL DEFAULT 2,
	`is_enabled` tinyint(1) NOT NULL DEFAULT 1,
	`show_on_site` tinyint(1) NOT NULL DEFAULT 1,
	`is_online` tinyint unsigned NOT NULL DEFAULT 1,
	`progress_mode` varchar(16) NOT NULL DEFAULT 'time',
	`date_from` date,
	`date_to` date,
	`sorder` int NOT NULL DEFAULT 0,
	`created_at` datetime,
	`updated_at` datetime,
	CONSTRAINT `gift_promotions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `gifts` (
	`id` int unsigned AUTO_INCREMENT NOT NULL,
	`titleRU` varchar(255) NOT NULL,
	`titleRO` varchar(255) NOT NULL,
	`descriptionRU` text,
	`descriptionRO` text,
	`product_id` int,
	`variant_id` int,
	`is_enabled` tinyint(1) NOT NULL DEFAULT 1,
	`show_on_site` tinyint(1) NOT NULL DEFAULT 1,
	`sorder` int NOT NULL DEFAULT 0,
	`created_at` datetime,
	`updated_at` datetime,
	CONSTRAINT `gifts_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `home_brand_section_products` (
	`id` int unsigned AUTO_INCREMENT NOT NULL,
	`section_id` int unsigned NOT NULL,
	`product_id` int unsigned NOT NULL,
	`sorder` int NOT NULL DEFAULT 0,
	`isShown` tinyint(1) NOT NULL DEFAULT 1,
	`created_at` datetime NOT NULL DEFAULT (CURRENT_TIMESTAMP),
	`updated_at` datetime NOT NULL DEFAULT (CURRENT_TIMESTAMP),
	CONSTRAINT `home_brand_section_products_id` PRIMARY KEY(`id`),
	CONSTRAINT `uniq_brand_section_product` UNIQUE(`section_id`,`product_id`)
);
--> statement-breakpoint
CREATE TABLE `home_brand_sections` (
	`id` int unsigned AUTO_INCREMENT NOT NULL,
	`titleRU` varchar(255) NOT NULL,
	`titleRO` varchar(255) NOT NULL,
	`urlRU` varchar(500) NOT NULL,
	`urlRO` varchar(500) NOT NULL,
	`img` varchar(255),
	`imgMob` varchar(255),
	`placement` enum('after_new','after_sale') NOT NULL DEFAULT 'after_new',
	`sorder` int NOT NULL DEFAULT 0,
	`isShown` tinyint(1) NOT NULL DEFAULT 1,
	`created_at` datetime NOT NULL DEFAULT (CURRENT_TIMESTAMP),
	`updated_at` datetime NOT NULL DEFAULT (CURRENT_TIMESTAMP),
	CONSTRAINT `home_brand_sections_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `home_categories` (
	`id` int unsigned AUTO_INCREMENT NOT NULL,
	`titleRU` varchar(255) NOT NULL,
	`titleRO` varchar(255) NOT NULL,
	`urlRU` varchar(500) NOT NULL,
	`urlRO` varchar(500) NOT NULL,
	`img` varchar(255),
	`sorder` int NOT NULL DEFAULT 0,
	`isShown` tinyint(1) NOT NULL DEFAULT 1,
	`created_at` datetime NOT NULL DEFAULT (CURRENT_TIMESTAMP),
	`updated_at` datetime NOT NULL DEFAULT (CURRENT_TIMESTAMP),
	CONSTRAINT `home_categories_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `home_product_items` (
	`id` int unsigned AUTO_INCREMENT NOT NULL,
	`section_key` varchar(30) NOT NULL,
	`product_id` int unsigned NOT NULL,
	`sorder` int NOT NULL DEFAULT 0,
	`isShown` tinyint(1) NOT NULL DEFAULT 1,
	`created_at` datetime NOT NULL DEFAULT (CURRENT_TIMESTAMP),
	`updated_at` datetime NOT NULL DEFAULT (CURRENT_TIMESTAMP),
	CONSTRAINT `home_product_items_id` PRIMARY KEY(`id`),
	CONSTRAINT `uniq_home_section_product` UNIQUE(`section_key`,`product_id`)
);
--> statement-breakpoint
CREATE TABLE `menu` (
	`id` int AUTO_INCREMENT NOT NULL,
	`uriRU` varchar(300) NOT NULL,
	`uriRO` varchar(300) NOT NULL,
	`uriEN` varchar(300) NOT NULL,
	`titleRU` varchar(250),
	`titleRO` varchar(250),
	`titleEN` varchar(255),
	`descRU` text NOT NULL,
	`descRO` text NOT NULL,
	`descEN` text NOT NULL,
	`textRU` text,
	`textRO` text,
	`textEN` text,
	`seoTitleRU` varchar(250),
	`seoTitleRO` varchar(250),
	`seoTitleEN` varchar(255),
	`seoKeywordsRU` text,
	`seoKeywordsRO` text,
	`seoKeywordsEN` text,
	`seoDescRU` text,
	`seoDescRO` text,
	`breadcrumbTitleRO` varchar(255),
	`breadcrumbTitleRU` varchar(255),
	`seoDescEN` text,
	`isShown` tinyint(1) NOT NULL DEFAULT 1,
	`sorder` int NOT NULL DEFAULT 1,
	`onTop` int NOT NULL DEFAULT 0,
	`onBottom` int NOT NULL DEFAULT 0,
	`parentID` int DEFAULT 0,
	`system` tinyint(1) NOT NULL DEFAULT 0,
	`img` varchar(255),
	CONSTRAINT `menu_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `offers` (
	`id` int AUTO_INCREMENT NOT NULL,
	`date_from` date NOT NULL,
	`date_to` date NOT NULL,
	`titleRU` varchar(256),
	`titleRO` varchar(256),
	`titleEN` varchar(256),
	`descRU` varchar(1024) NOT NULL,
	`descRO` varchar(1024) NOT NULL,
	`descEN` varchar(1024) NOT NULL,
	`uriRU` varchar(256),
	`uriRO` varchar(256),
	`uriEN` varchar(256),
	`sale` varchar(32) NOT NULL,
	`is_online` tinyint unsigned NOT NULL DEFAULT 1,
	`progress_mode` varchar(16) NOT NULL DEFAULT 'time',
	`locationRU` varchar(254) NOT NULL,
	`locationRO` varchar(254) NOT NULL,
	`imgB` varchar(255) NOT NULL,
	`img` varchar(256),
	`imgRU` varchar(254) NOT NULL,
	`imgRO` varchar(254) NOT NULL,
	`imgBRU` varchar(254) NOT NULL,
	`imgBRO` varchar(254) NOT NULL,
	`seoTitleRU` varchar(255),
	`seoTitleRO` varchar(255),
	`seoTitleEN` varchar(255),
	`seoKeywordsRU` text,
	`seoKeywordsRO` text,
	`seoKeywordsEN` text,
	`seoDescRU` text,
	`seoDescRO` text,
	`seoDescEN` text,
	`view_home` int NOT NULL,
	`sorder` int DEFAULT 0,
	`isShown` tinyint(1) DEFAULT 1,
	`updated_at` date NOT NULL,
	`created_at` date,
	CONSTRAINT `offers_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `offers_products` (
	`id` int AUTO_INCREMENT NOT NULL,
	`offers_id` int NOT NULL,
	`product_id` int NOT NULL,
	`title` varchar(255) NOT NULL,
	`SKU` varchar(32) NOT NULL,
	`sorder` int NOT NULL,
	`isShown` tinyint(1) NOT NULL DEFAULT 1,
	CONSTRAINT `offers_products_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `orders` (
	`id` int AUTO_INCREMENT NOT NULL,
	`order_source` varchar(16) NOT NULL DEFAULT 'unknown',
	`order_id` int,
	`status` enum('new','progress','finished','canceled') NOT NULL DEFAULT 'new',
	`1c` int NOT NULL,
	`client_id` int NOT NULL,
	`total` varchar(64) NOT NULL,
	`delivery_price` int NOT NULL,
	`delivery` int,
	`bonus_plus` varchar(32) NOT NULL,
	`bonus_minus` varchar(32) NOT NULL,
	`payment` int,
	`pay_success` int NOT NULL,
	`stores` int NOT NULL,
	`name` varchar(255) NOT NULL,
	`surname` varchar(255),
	`email` varchar(255) NOT NULL,
	`phone` varchar(255) NOT NULL,
	`message` text,
	`contactName` varchar(128) NOT NULL,
	`postcode` varchar(32) NOT NULL,
	`address` varchar(255) NOT NULL,
	`street` varchar(128) NOT NULL,
	`locality` varchar(128) NOT NULL,
	`town` varchar(128) NOT NULL,
	`county` varchar(128) NOT NULL,
	`city` varchar(255) NOT NULL,
	`telephone` varchar(32) NOT NULL,
	`notes` text NOT NULL,
	`ip` varchar(128) NOT NULL,
	`ExternalID` varchar(64) NOT NULL,
	`voucher` varchar(32) NOT NULL,
	`added` datetime DEFAULT (CURRENT_TIMESTAMP),
	`updated` datetime,
	`sorder` int NOT NULL,
	`isb2b` tinyint NOT NULL DEFAULT 0,
	`promo_id` int unsigned,
	`promo_code` varchar(64),
	`promo_discount` decimal(10,2) NOT NULL DEFAULT '0.00',
	CONSTRAINT `orders_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `orders_products` (
	`id` int AUTO_INCREMENT NOT NULL,
	`order_id` int NOT NULL,
	`product_id` int,
	`qty` int,
	`price` varchar(64),
	`total` varchar(64),
	`options` varchar(32),
	`roulette_gift_id` bigint unsigned,
	`gift_promotion_id` bigint unsigned,
	`promo_discount` decimal(10,2) NOT NULL DEFAULT '0.00',
	CONSTRAINT `orders_products_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `paynet_logs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`order_id` varchar(255) NOT NULL,
	`message` varchar(255) NOT NULL,
	`response` text,
	`date` varchar(32),
	CONSTRAINT `paynet_logs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `product_categories` (
	`id` int AUTO_INCREMENT NOT NULL,
	`product_id` int NOT NULL,
	`category_id` int NOT NULL,
	CONSTRAINT `product_categories_id` PRIMARY KEY(`id`),
	CONSTRAINT `uniq_product_category` UNIQUE(`product_id`,`category_id`)
);
--> statement-breakpoint
CREATE TABLE `product_import_changes` (
	`id` int unsigned AUTO_INCREMENT NOT NULL,
	`product_id` int unsigned NOT NULL,
	`product_guid` varchar(128) NOT NULL,
	`action` varchar(16) NOT NULL,
	`changed_fields` longtext NOT NULL,
	`created_at` datetime NOT NULL,
	CONSTRAINT `product_import_changes_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `product_search` (
	`id` int AUTO_INCREMENT NOT NULL,
	`product_id` int NOT NULL,
	`variable_id` int,
	`GUID` varchar(128),
	`SKU` varchar(128),
	`title` text,
	`color` text,
	`volume` text,
	`search_text` text,
	CONSTRAINT `product_search_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `products` (
	`id` int AUTO_INCREMENT NOT NULL,
	`GUID` varchar(128) NOT NULL,
	`SKU` varchar(128) NOT NULL,
	`titleRU` varchar(256),
	`h1RU` varchar(255),
	`breadcrumbTitleRU` varchar(255),
	`titleRO` varchar(255) NOT NULL,
	`h1RO` varchar(255),
	`breadcrumbTitleRO` varchar(255),
	`titleEN` varchar(255) NOT NULL,
	`descRU` varchar(255) NOT NULL,
	`descRO` varchar(255) NOT NULL,
	`descEN` varchar(255) NOT NULL,
	`textRU` text,
	`textRO` text,
	`textEN` text NOT NULL,
	`uriRU` varchar(256),
	`uriRO` varchar(256),
	`uriEN` varchar(255) NOT NULL,
	`price` float,
	`discount_price` float,
	`sale_mdl` int NOT NULL,
	`sale_percent` int NOT NULL,
	`volume` varchar(32) NOT NULL,
	`on_stock` int DEFAULT 1,
	`stock` int NOT NULL,
	`is_new` tinyint DEFAULT 0,
	`best_selling` int NOT NULL,
	`category_id` int,
	`brand_id` int DEFAULT 0,
	`feature_type` int NOT NULL,
	`reviews` varchar(64) NOT NULL,
	`variations` varchar(32) NOT NULL,
	`instructionRU` varchar(254),
	`instructionRO` varchar(254),
	`instructionEN` varchar(254),
	`componentsRU` varchar(254),
	`componentsRO` varchar(254),
	`componentsEN` varchar(254),
	`sex` varchar(64),
	`search_teg` varchar(255) NOT NULL,
	`seoTitleRU` varchar(255),
	`seoTitleRO` varchar(255),
	`seoTitleEN` varchar(255),
	`seoKeywordsRU` text,
	`seoKeywordsRO` text,
	`seoKeywordsEN` text,
	`seoDescRU` text,
	`seoDescRO` text,
	`seoDescEN` text,
	`order` int NOT NULL,
	`sorder` int DEFAULT 1,
	`isShown` tinyint(1) DEFAULT 1,
	`isGift` tinyint(1) NOT NULL DEFAULT 0,
	`updated_at` datetime,
	`created_at` datetime NOT NULL DEFAULT (CURRENT_TIMESTAMP),
	`priceWH` float NOT NULL,
	`barcode` varchar(256),
	`on_stockWH` int NOT NULL,
	`WarehouseName` varchar(256),
	`youtube_video_id` varchar(11),
	CONSTRAINT `products_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `products_features` (
	`id` int AUTO_INCREMENT NOT NULL,
	`product_id` int,
	`category_id` int,
	`feature_id` int,
	`feature_value_id` int,
	CONSTRAINT `products_features_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `products_img` (
	`id` int AUTO_INCREMENT NOT NULL,
	`product_id` int NOT NULL,
	`img` varchar(64) NOT NULL,
	`sorder` int NOT NULL,
	`isShown` tinyint(1) NOT NULL DEFAULT 1,
	CONSTRAINT `products_img_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `products_more` (
	`product_id` int NOT NULL,
	`related_id` int NOT NULL,
	CONSTRAINT `product_id` UNIQUE(`product_id`,`related_id`)
);
--> statement-breakpoint
CREATE TABLE `products_related` (
	`product_id` int NOT NULL,
	`related_id` int NOT NULL,
	CONSTRAINT `product_id` UNIQUE(`product_id`,`related_id`)
);
--> statement-breakpoint
CREATE TABLE `products_variable` (
	`id` int AUTO_INCREMENT NOT NULL,
	`product_id` int NOT NULL,
	`SKU` varchar(32),
	`titleRU` varchar(256),
	`titleRO` varchar(255) NOT NULL,
	`titleEN` varchar(255) NOT NULL,
	`colorRU` varchar(254) NOT NULL,
	`colorRO` varchar(254) NOT NULL,
	`color_data` text,
	`colorHex` varchar(7),
	`VolumeVar` varchar(254) NOT NULL,
	`color` varchar(254),
	`dose` varchar(255),
	`price` double,
	`discount_price` varchar(32) NOT NULL,
	`qty` int NOT NULL,
	`sorder` int NOT NULL,
	`isShown` tinyint DEFAULT 1,
	`updated_at` datetime,
	`created_at` datetime NOT NULL DEFAULT (CURRENT_TIMESTAMP),
	`colorEN` varchar(254) NOT NULL,
	`priceWH` double NOT NULL,
	`barcode` varchar(256),
	`qtyWH` int NOT NULL,
	`WarehouseName` varchar(256),
	CONSTRAINT `products_variable_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `products_variable_img` (
	`id` int AUTO_INCREMENT NOT NULL,
	`product_id` int NOT NULL,
	`variable_id` int NOT NULL,
	`img` varchar(64) NOT NULL,
	`sorder` int NOT NULL,
	`isShown` tinyint(1) NOT NULL DEFAULT 1,
	CONSTRAINT `products_variable_img_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `promocode_brands` (
	`promocode_id` int unsigned NOT NULL,
	`brand_id` int NOT NULL,
	CONSTRAINT `promocode_brands_promocode_id_brand_id` PRIMARY KEY(`promocode_id`,`brand_id`)
);
--> statement-breakpoint
CREATE TABLE `promocode_events` (
	`id` int AUTO_INCREMENT NOT NULL,
	`promocode_id` int,
	`client_id` int,
	`order_id` int,
	`code` varchar(100) NOT NULL,
	`event_type` varchar(50) NOT NULL,
	`cart_subtotal` decimal(12,2) NOT NULL DEFAULT '0.00',
	`discount_amount` decimal(12,2) NOT NULL DEFAULT '0.00',
	`final_total` decimal(12,2) NOT NULL DEFAULT '0.00',
	`reason` varchar(100),
	`ip_address` varchar(45),
	`user_agent` varchar(500),
	`created_at` datetime NOT NULL DEFAULT (CURRENT_TIMESTAMP),
	CONSTRAINT `promocode_events_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `promocode_excluded_brands` (
	`id` int unsigned AUTO_INCREMENT NOT NULL,
	`promocode_id` int unsigned NOT NULL,
	`brand_id` int NOT NULL,
	CONSTRAINT `promocode_excluded_brands_id` PRIMARY KEY(`id`),
	CONSTRAINT `uq_promocode_brand` UNIQUE(`promocode_id`,`brand_id`)
);
--> statement-breakpoint
CREATE TABLE `promocode_usages` (
	`id` int unsigned AUTO_INCREMENT NOT NULL,
	`promocode_id` int unsigned NOT NULL,
	`client_id` int NOT NULL,
	`order_id` int NOT NULL,
	`created_at` datetime NOT NULL DEFAULT (CURRENT_TIMESTAMP),
	CONSTRAINT `promocode_usages_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `promocodes` (
	`id` int unsigned AUTO_INCREMENT NOT NULL,
	`name` varchar(255) NOT NULL,
	`code` varchar(64) NOT NULL,
	`type` enum('percentage','fixed') NOT NULL,
	`value` decimal(10,2) NOT NULL,
	`min_amount` decimal(10,2),
	`max_discount` decimal(10,2),
	`usage_limit` int unsigned,
	`per_user_limit` int unsigned DEFAULT 1,
	`allow_discounted` tinyint(1) NOT NULL DEFAULT 0,
	`starts_at` datetime,
	`ends_at` datetime,
	`status` enum('draft','active','disabled') NOT NULL DEFAULT 'draft',
	`created_at` datetime NOT NULL DEFAULT (CURRENT_TIMESTAMP),
	`updated_at` datetime,
	`brand_scope` enum('all','selected') NOT NULL DEFAULT 'all',
	CONSTRAINT `promocodes_id` PRIMARY KEY(`id`),
	CONSTRAINT `uq_promocodes_code` UNIQUE(`code`)
);
--> statement-breakpoint
CREATE TABLE `roulette_account_state` (
	`client_id` bigint unsigned NOT NULL,
	`next_spin_at` datetime,
	`created_at` datetime NOT NULL,
	`updated_at` datetime NOT NULL,
	CONSTRAINT `roulette_account_state_client_id` PRIMARY KEY(`client_id`)
);
--> statement-breakpoint
CREATE TABLE `roulette_payment_reservations` (
	`id` bigint unsigned AUTO_INCREMENT NOT NULL,
	`spin_id` bigint unsigned NOT NULL,
	`order_id` bigint unsigned NOT NULL,
	`paynet_external_id` varchar(64) NOT NULL,
	`created_at` datetime NOT NULL,
	`reserved_until` datetime NOT NULL,
	`status` varchar(16) NOT NULL DEFAULT 'pending',
	`resolved_at` datetime,
	CONSTRAINT `roulette_payment_reservations_id` PRIMARY KEY(`id`),
	CONSTRAINT `uniq_roulette_paynet_external_id` UNIQUE(`paynet_external_id`)
);
--> statement-breakpoint
CREATE TABLE `roulette_prizes` (
	`id` smallint unsigned AUTO_INCREMENT NOT NULL,
	`code` varchar(40) NOT NULL,
	`titleRU` varchar(120) NOT NULL,
	`titleRO` varchar(120) NOT NULL,
	`reward_type` varchar(32) NOT NULL,
	`reward_value` decimal(10,2),
	`reward_payload` varchar(120),
	`probability` decimal(5,2),
	`is_enabled` tinyint(1) NOT NULL DEFAULT 1,
	`sort_order` smallint NOT NULL DEFAULT 0,
	`updated_at` datetime NOT NULL,
	CONSTRAINT `roulette_prizes_id` PRIMARY KEY(`id`),
	CONSTRAINT `uniq_roulette_prizes_code` UNIQUE(`code`)
);
--> statement-breakpoint
CREATE TABLE `roulette_settings` (
	`id` tinyint unsigned NOT NULL,
	`titleRU` varchar(120) NOT NULL,
	`titleRO` varchar(120) NOT NULL,
	`descriptionRU` text,
	`descriptionRO` text,
	`rulesRU` text,
	`rulesRO` text,
	`updated_at` datetime NOT NULL,
	`is_enabled` tinyint(1) NOT NULL DEFAULT 0,
	`is_visible` tinyint(1) NOT NULL DEFAULT 1,
	`spin_interval_hours` int unsigned,
	CONSTRAINT `roulette_settings_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `roulette_spins` (
	`id` bigint unsigned AUTO_INCREMENT NOT NULL,
	`client_id` bigint unsigned NOT NULL,
	`prize_id` smallint unsigned NOT NULL,
	`request_id` char(36) NOT NULL,
	`prize_code_snapshot` varchar(40) NOT NULL,
	`reward_type_snapshot` varchar(32) NOT NULL,
	`reward_value_snapshot` decimal(10,2),
	`reward_payload_snapshot` varchar(120),
	`titleRU_snapshot` varchar(120) NOT NULL,
	`titleRO_snapshot` varchar(120) NOT NULL,
	`probability_snapshot` decimal(5,2) NOT NULL,
	`spun_at` datetime NOT NULL,
	`expires_at` datetime NOT NULL,
	`status` varchar(16) NOT NULL DEFAULT 'active',
	`order_id` bigint unsigned,
	`used_at` datetime,
	`created_at` datetime NOT NULL,
	CONSTRAINT `roulette_spins_id` PRIMARY KEY(`id`),
	CONSTRAINT `uniq_roulette_spin_request` UNIQUE(`client_id`,`request_id`)
);
--> statement-breakpoint
CREATE TABLE `shop_cart_items` (
	`id` int AUTO_INCREMENT NOT NULL,
	`code` varchar(255) NOT NULL,
	`contact_id` int,
	`rowid` varchar(255) NOT NULL,
	`product_id` int NOT NULL,
	`sku_id` int,
	`name` varchar(255),
	`create_datetime` datetime NOT NULL DEFAULT (CURRENT_TIMESTAMP),
	`qty` int NOT NULL,
	`price` decimal(15,4),
	`options` text NOT NULL,
	CONSTRAINT `shop_cart_items_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `shop_feature` (
	`id` int AUTO_INCREMENT NOT NULL,
	`GUID` varchar(128) NOT NULL,
	`type_id` int NOT NULL,
	`name_RU` varchar(255) NOT NULL,
	`name_RO` varchar(255) NOT NULL,
	`name_EN` varchar(255) NOT NULL,
	`type` int NOT NULL DEFAULT 0,
	`free_values` int NOT NULL,
	`sorder` int NOT NULL,
	CONSTRAINT `shop_feature_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `shop_feature_values` (
	`id` int AUTO_INCREMENT NOT NULL,
	`GUID` varchar(128) NOT NULL,
	`feature_id` int NOT NULL,
	`name_RU` varchar(255),
	`name_RO` varchar(255),
	`name_EN` varchar(255),
	`color` varchar(10) NOT NULL DEFAULT '#ffffff',
	`sorder` int NOT NULL DEFAULT 0,
	CONSTRAINT `shop_feature_values_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `shop_type` (
	`id` int AUTO_INCREMENT NOT NULL,
	`GUID` varchar(128) NOT NULL,
	`name` varchar(255) NOT NULL,
	`sorder` int NOT NULL,
	CONSTRAINT `shop_type_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `site_feedback` (
	`id` bigint unsigned AUTO_INCREMENT NOT NULL,
	`feedback_type` enum('idea','bug','question') NOT NULL,
	`message` text NOT NULL,
	`page_path` varchar(255),
	`reference_url` varchar(2048),
	`locale` varchar(10),
	`status` enum('new','in_progress','done','rejected') NOT NULL DEFAULT 'new',
	`created_at` datetime NOT NULL,
	`updated_at` datetime,
	CONSTRAINT `site_feedback_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `site_feedback_images` (
	`id` bigint unsigned AUTO_INCREMENT NOT NULL,
	`feedback_id` bigint unsigned NOT NULL,
	`file_path` varchar(255) NOT NULL,
	`original_name` varchar(255),
	`created_at` datetime NOT NULL,
	CONSTRAINT `site_feedback_images_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `site_support_settings` (
	`id` tinyint unsigned NOT NULL,
	`is_enabled` tinyint(1) NOT NULL DEFAULT 1,
	`telegram_contact` varchar(255) NOT NULL,
	`support_phone` varchar(32),
	`updated_at` datetime,
	CONSTRAINT `site_support_settings_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `site_theme_settings` (
	`id` tinyint unsigned NOT NULL,
	`theme_key` varchar(32) NOT NULL DEFAULT 'default',
	`updated_at` datetime NOT NULL,
	CONSTRAINT `site_theme_settings_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `sliders` (
	`id` int AUTO_INCREMENT NOT NULL,
	`titleRU` varchar(250),
	`titleRO` varchar(250),
	`titleEN` varchar(255),
	`descRU` text NOT NULL,
	`descRO` text NOT NULL,
	`descEN` text NOT NULL,
	`infoRU` varchar(250),
	`infoRO` varchar(250),
	`infoEN` varchar(255),
	`buttonRU` varchar(64),
	`buttonRO` varchar(64),
	`buttonEN` varchar(64),
	`uriRU` varchar(300) NOT NULL,
	`uriRO` varchar(300) NOT NULL,
	`uriEN` varchar(300) NOT NULL,
	`ColorText` varchar(32) NOT NULL,
	`ColorButton` varchar(32) NOT NULL,
	`ColorButtonText` varchar(32) NOT NULL,
	`isShown` tinyint(1) NOT NULL DEFAULT 1,
	`sorder` int NOT NULL DEFAULT 1,
	`img` varchar(255),
	`imgMob` varchar(254) NOT NULL,
	`youtube` varchar(254),
	`video` varchar(256),
	CONSTRAINT `sliders_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `stores` (
	`id` int AUTO_INCREMENT NOT NULL,
	`titleRU` varchar(250),
	`titleRO` varchar(250),
	`titleEN` varchar(255),
	`phone` varchar(255),
	`coords` varchar(255),
	`descRU` text NOT NULL,
	`descRO` text NOT NULL,
	`descEN` text NOT NULL,
	`textRU` text,
	`textRO` text,
	`textEN` text,
	`iframe_google` varchar(1024),
	`delivery` int NOT NULL,
	`isShown` tinyint(1) NOT NULL DEFAULT 1,
	`sorder` int NOT NULL DEFAULT 1,
	`onBottom` int NOT NULL DEFAULT 0,
	CONSTRAINT `stores_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `stores_img` (
	`id` int AUTO_INCREMENT NOT NULL,
	`stores_id` int NOT NULL,
	`img` varchar(64) NOT NULL,
	`sorder` int NOT NULL,
	`isShown` tinyint(1) NOT NULL DEFAULT 1,
	CONSTRAINT `stores_img_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `subscribe` (
	`id` int AUTO_INCREMENT NOT NULL,
	`email` varchar(256),
	`active` varchar(256),
	`ip` varchar(255) NOT NULL,
	`send` varchar(256),
	`sorder` int DEFAULT 0,
	`isShown` tinyint(1) DEFAULT 1,
	CONSTRAINT `subscribe_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `subscriptions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`email` varchar(256),
	`mailing` tinyint(1) DEFAULT 1,
	`sorder` int DEFAULT 0,
	`isShown` tinyint(1) DEFAULT 1,
	`created_at` datetime NOT NULL DEFAULT (CURRENT_TIMESTAMP),
	CONSTRAINT `subscriptions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `vsl_logs` (
	`id` bigint AUTO_INCREMENT NOT NULL,
	`type` varchar(100) NOT NULL,
	`text` mediumtext NOT NULL,
	`date` datetime NOT NULL DEFAULT (CURRENT_TIMESTAMP),
	CONSTRAINT `vsl_logs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `beauty_selection_products` ADD CONSTRAINT `fk_beauty_selection_products_selection` FOREIGN KEY (`selection_id`) REFERENCES `beauty_selections`(`id`) ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE `home_brand_section_products` ADD CONSTRAINT `fk_brand_section_products_section` FOREIGN KEY (`section_id`) REFERENCES `home_brand_sections`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `product_categories` ADD CONSTRAINT `fk_pc_category` FOREIGN KEY (`category_id`) REFERENCES `categories`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `product_categories` ADD CONSTRAINT `fk_pc_product` FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `idx_analytics_events_name_created` ON `analytics_events` (`event_name`,`created_at`);--> statement-breakpoint
CREATE INDEX `idx_analytics_events_visitor_created` ON `analytics_events` (`visitor_key`,`created_at`);--> statement-breakpoint
CREATE INDEX `idx_analytics_events_session_created` ON `analytics_events` (`session_key`,`created_at`);--> statement-breakpoint
CREATE INDEX `idx_analytics_events_cart_created` ON `analytics_events` (`cart_key`,`created_at`);--> statement-breakpoint
CREATE INDEX `idx_analytics_events_product_created` ON `analytics_events` (`product_id`,`created_at`);--> statement-breakpoint
CREATE INDEX `idx_analytics_events_category_created` ON `analytics_events` (`category_id`,`created_at`);--> statement-breakpoint
CREATE INDEX `idx_analytics_events_order` ON `analytics_events` (`order_id`);--> statement-breakpoint
CREATE INDEX `idx_analytics_events_source_created` ON `analytics_events` (`traffic_source`,`created_at`);--> statement-breakpoint
CREATE INDEX `idx_analytics_events_device_created` ON `analytics_events` (`device_type`,`created_at`);--> statement-breakpoint
CREATE INDEX `idx_article_likes_article` ON `article_likes` (`article_id`);--> statement-breakpoint
CREATE INDEX `ID` ON `articles` (`id`);--> statement-breakpoint
CREATE INDEX `ID` ON `banners` (`id`);--> statement-breakpoint
CREATE INDEX `idx_beauty_selection_products_order` ON `beauty_selection_products` (`selection_id`,`sorder`,`id`);--> statement-breakpoint
CREATE INDEX `idx_beauty_selections_visibility_order` ON `beauty_selections` (`isShown`,`sorder`,`id`);--> statement-breakpoint
CREATE INDEX `idx_brand_certificates_brand` ON `brand_certificates` (`brand_id`);--> statement-breakpoint
CREATE INDEX `idx_brand_certificates_visible_order` ON `brand_certificates` (`brand_id`,`isShown`,`sorder`);--> statement-breakpoint
CREATE INDEX `id` ON `brands` (`id`);--> statement-breakpoint
CREATE INDEX `category_id` ON `category_banner` (`category_id`);--> statement-breakpoint
CREATE INDEX `idx_category_banner_category_id_id` ON `category_banner` (`category_id`,`id`);--> statement-breakpoint
CREATE INDEX `id_fb` ON `clients` (`id_fb`);--> statement-breakpoint
CREATE INDEX `active` ON `clients` (`active`);--> statement-breakpoint
CREATE INDEX `phone` ON `clients` (`phone`);--> statement-breakpoint
CREATE INDEX `code` ON `clients` (`code`);--> statement-breakpoint
CREATE INDEX `ID` ON `dates` (`id`);--> statement-breakpoint
CREATE INDEX `ID` ON `delivery` (`id`);--> statement-breakpoint
CREATE INDEX `idx_gift_promotion_brands_brand` ON `gift_promotion_brands` (`brand_id`);--> statement-breakpoint
CREATE INDEX `idx_gift_promotions_active` ON `gift_promotions` (`is_enabled`,`show_on_site`,`is_online`,`date_from`,`date_to`,`sorder`,`id`);--> statement-breakpoint
CREATE INDEX `idx_gift_promotions_gift` ON `gift_promotions` (`gift_id`);--> statement-breakpoint
CREATE INDEX `idx_gift_promotions_offer` ON `gift_promotions` (`offer_id`);--> statement-breakpoint
CREATE INDEX `idx_gifts_enabled_order` ON `gifts` (`is_enabled`,`sorder`,`id`);--> statement-breakpoint
CREATE INDEX `idx_gifts_product` ON `gifts` (`product_id`);--> statement-breakpoint
CREATE INDEX `idx_gifts_variant` ON `gifts` (`variant_id`);--> statement-breakpoint
CREATE INDEX `idx_gifts_visible_order` ON `gifts` (`show_on_site`,`is_enabled`,`sorder`,`id`);--> statement-breakpoint
CREATE INDEX `idx_brand_section_products` ON `home_brand_section_products` (`section_id`,`isShown`,`sorder`);--> statement-breakpoint
CREATE INDEX `idx_brand_product_id` ON `home_brand_section_products` (`product_id`);--> statement-breakpoint
CREATE INDEX `idx_brand_sections_position` ON `home_brand_sections` (`placement`,`isShown`,`sorder`);--> statement-breakpoint
CREATE INDEX `idx_home_categories_visible_order` ON `home_categories` (`isShown`,`sorder`);--> statement-breakpoint
CREATE INDEX `idx_home_section_visible_order` ON `home_product_items` (`section_key`,`isShown`,`sorder`);--> statement-breakpoint
CREATE INDEX `idx_home_product_id` ON `home_product_items` (`product_id`);--> statement-breakpoint
CREATE INDEX `ID` ON `menu` (`id`);--> statement-breakpoint
CREATE INDEX `ID` ON `offers_products` (`id`);--> statement-breakpoint
CREATE INDEX `idx_orders_promo_id` ON `orders` (`promo_id`);--> statement-breakpoint
CREATE INDEX `idx_orders_promo_code` ON `orders` (`promo_code`);--> statement-breakpoint
CREATE INDEX `ID` ON `paynet_logs` (`id`);--> statement-breakpoint
CREATE INDEX `product_id` ON `product_categories` (`product_id`);--> statement-breakpoint
CREATE INDEX `category_id` ON `product_categories` (`category_id`);--> statement-breakpoint
CREATE INDEX `idx_product_import_changes_created_at` ON `product_import_changes` (`created_at`);--> statement-breakpoint
CREATE INDEX `idx_product_import_changes_product_id` ON `product_import_changes` (`product_id`);--> statement-breakpoint
CREATE INDEX `idx_product_import_changes_action` ON `product_import_changes` (`action`);--> statement-breakpoint
CREATE INDEX `idx_product` ON `product_search` (`product_id`);--> statement-breakpoint
CREATE INDEX `idx_variable` ON `product_search` (`variable_id`);--> statement-breakpoint
CREATE INDEX `ft_search` ON `product_search` (`title`,`SKU`,`GUID`,`color`,`volume`,`search_text`);--> statement-breakpoint
CREATE INDEX `id` ON `products` (`id`);--> statement-breakpoint
CREATE INDEX `isShown` ON `products` (`isShown`);--> statement-breakpoint
CREATE INDEX `SKU` ON `products` (`SKU`);--> statement-breakpoint
CREATE INDEX `titleRU` ON `products` (`titleRU`);--> statement-breakpoint
CREATE INDEX `titleRO` ON `products` (`titleRO`);--> statement-breakpoint
CREATE INDEX `category_id` ON `products` (`category_id`);--> statement-breakpoint
CREATE INDEX `brand_id` ON `products` (`brand_id`);--> statement-breakpoint
CREATE INDEX `search_teg` ON `products` (`search_teg`);--> statement-breakpoint
CREATE INDEX `GUID` ON `products` (`GUID`);--> statement-breakpoint
CREATE INDEX `price` ON `products` (`price`);--> statement-breakpoint
CREATE INDEX `priceWH` ON `products` (`priceWH`);--> statement-breakpoint
CREATE INDEX `discount_price` ON `products` (`discount_price`);--> statement-breakpoint
CREATE INDEX `sex` ON `products` (`sex`);--> statement-breakpoint
CREATE INDEX `best_selling` ON `products` (`best_selling`);--> statement-breakpoint
CREATE INDEX `stock` ON `products` (`stock`);--> statement-breakpoint
CREATE INDEX `is_new` ON `products` (`is_new`);--> statement-breakpoint
CREATE INDEX `sorder` ON `products` (`sorder`);--> statement-breakpoint
CREATE INDEX `idx_products_shown_discount_price` ON `products` (`isShown`,`discount_price`,`price`,`id`);--> statement-breakpoint
CREATE INDEX `ID` ON `products_img` (`id`);--> statement-breakpoint
CREATE INDEX `product_id` ON `products_img` (`product_id`);--> statement-breakpoint
CREATE INDEX `sorder` ON `products_img` (`sorder`);--> statement-breakpoint
CREATE INDEX `idx_product_image_order` ON `products_img` (`product_id`,`sorder`,`id`);--> statement-breakpoint
CREATE INDEX `product_id` ON `products_variable` (`product_id`);--> statement-breakpoint
CREATE INDEX `SKU` ON `products_variable` (`SKU`);--> statement-breakpoint
CREATE INDEX `qty` ON `products_variable` (`qty`);--> statement-breakpoint
CREATE INDEX `isShown` ON `products_variable` (`isShown`);--> statement-breakpoint
CREATE INDEX `ID` ON `products_variable_img` (`id`);--> statement-breakpoint
CREATE INDEX `product_id` ON `products_variable_img` (`product_id`);--> statement-breakpoint
CREATE INDEX `variable_id` ON `products_variable_img` (`variable_id`);--> statement-breakpoint
CREATE INDEX `idx_promocode_brands_brand_id` ON `promocode_brands` (`brand_id`);--> statement-breakpoint
CREATE INDEX `idx_promocode_id` ON `promocode_events` (`promocode_id`);--> statement-breakpoint
CREATE INDEX `idx_client_id` ON `promocode_events` (`client_id`);--> statement-breakpoint
CREATE INDEX `idx_order_id` ON `promocode_events` (`order_id`);--> statement-breakpoint
CREATE INDEX `idx_code` ON `promocode_events` (`code`);--> statement-breakpoint
CREATE INDEX `idx_event_type` ON `promocode_events` (`event_type`);--> statement-breakpoint
CREATE INDEX `idx_created_at` ON `promocode_events` (`created_at`);--> statement-breakpoint
CREATE INDEX `idx_promocode_excluded_promocode` ON `promocode_excluded_brands` (`promocode_id`);--> statement-breakpoint
CREATE INDEX `idx_promocode_excluded_brand` ON `promocode_excluded_brands` (`brand_id`);--> statement-breakpoint
CREATE INDEX `idx_promo_usage_promocode` ON `promocode_usages` (`promocode_id`);--> statement-breakpoint
CREATE INDEX `idx_promo_usage_client` ON `promocode_usages` (`client_id`);--> statement-breakpoint
CREATE INDEX `idx_promo_usage_order` ON `promocode_usages` (`order_id`);--> statement-breakpoint
CREATE INDEX `idx_promo_usage_client_promo` ON `promocode_usages` (`promocode_id`,`client_id`);--> statement-breakpoint
CREATE INDEX `idx_promocodes_status` ON `promocodes` (`status`);--> statement-breakpoint
CREATE INDEX `idx_promocodes_dates` ON `promocodes` (`starts_at`,`ends_at`);--> statement-breakpoint
CREATE INDEX `idx_roulette_reservation_spin_status` ON `roulette_payment_reservations` (`spin_id`,`status`,`reserved_until`);--> statement-breakpoint
CREATE INDEX `idx_roulette_reservation_order` ON `roulette_payment_reservations` (`order_id`);--> statement-breakpoint
CREATE INDEX `idx_roulette_prizes_order` ON `roulette_prizes` (`sort_order`,`id`);--> statement-breakpoint
CREATE INDEX `idx_roulette_spin_account_status_expiry` ON `roulette_spins` (`client_id`,`status`,`expires_at`);--> statement-breakpoint
CREATE INDEX `idx_roulette_spin_order` ON `roulette_spins` (`order_id`);--> statement-breakpoint
CREATE INDEX `rowid` ON `shop_cart_items` (`rowid`);--> statement-breakpoint
CREATE INDEX `product_id` ON `shop_cart_items` (`product_id`);--> statement-breakpoint
CREATE INDEX `code` ON `shop_cart_items` (`code`);--> statement-breakpoint
CREATE INDEX `idx_site_feedback_type` ON `site_feedback` (`feedback_type`);--> statement-breakpoint
CREATE INDEX `idx_site_feedback_status` ON `site_feedback` (`status`);--> statement-breakpoint
CREATE INDEX `idx_site_feedback_created_at` ON `site_feedback` (`created_at`);--> statement-breakpoint
CREATE INDEX `idx_site_feedback_images_feedback_id` ON `site_feedback_images` (`feedback_id`);--> statement-breakpoint
CREATE INDEX `ID` ON `sliders` (`id`);--> statement-breakpoint
CREATE INDEX `ID` ON `stores` (`id`);--> statement-breakpoint
CREATE INDEX `ID` ON `stores_img` (`id`);
*/