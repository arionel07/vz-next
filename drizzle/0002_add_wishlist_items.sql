CREATE TABLE IF NOT EXISTS `wishlist_items` (
  `id` int NOT NULL AUTO_INCREMENT,
  `contact_id` int NOT NULL,
  `product_id` int NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `wishlist_items_contact_product` (`contact_id`, `product_id`),
  KEY `wishlist_items_contact_id` (`contact_id`),
  KEY `wishlist_items_product_id` (`product_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
