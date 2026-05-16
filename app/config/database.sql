-- uni-silent.de — MySQL Schema
-- charset utf8mb4, collation utf8mb4_unicode_ci, engine InnoDB

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

-- ============================================================
-- products
-- ============================================================
CREATE TABLE IF NOT EXISTS `products` (
  `id`              INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `slug`            VARCHAR(64)  NOT NULL,                  -- e.g. "PLA300-DX"
  `art_nr`          VARCHAR(64)  NOT NULL,
  `name`            VARCHAR(255) NOT NULL,
  `subtitle`        VARCHAR(255) DEFAULT NULL,
  `short_desc`      TEXT         DEFAULT NULL,
  `long_desc`       MEDIUMTEXT   DEFAULT NULL,
  `material`        VARCHAR(64)  DEFAULT NULL,              -- PP, Edelstahl, Stahl
  `color`           VARCHAR(64)  DEFAULT NULL,
  `platform_w_cm`   DECIMAL(6,1) DEFAULT NULL,
  `platform_h_cm`   DECIMAL(6,1) DEFAULT NULL,
  `handle_h_cm`     DECIMAL(6,1) DEFAULT NULL,
  `wheel_inch`      VARCHAR(16)  DEFAULT NULL,
  `capacity_kg`     INT UNSIGNED DEFAULT NULL,
  `weight_kg`       DECIMAL(5,2) DEFAULT NULL,
  `price_net`       DECIMAL(10,2) DEFAULT NULL,             -- optional, nicht auf Frontend (B2B Anfrage)
  `category`        VARCHAR(64)  DEFAULT 'plattformwagen',  -- plattformwagen / zubehoer
  `is_active`       TINYINT(1)   NOT NULL DEFAULT 1,
  `is_featured`     TINYINT(1)   NOT NULL DEFAULT 0,
  `sort_order`      INT          NOT NULL DEFAULT 0,
  `meta_title`      VARCHAR(255) DEFAULT NULL,
  `meta_description` VARCHAR(500) DEFAULT NULL,
  `features_json`   JSON         DEFAULT NULL,              -- bullet list
  `created_at`      TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
  `updated_at`      TIMESTAMP    DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `slug` (`slug`),
  UNIQUE KEY `art_nr` (`art_nr`),
  KEY `is_active` (`is_active`),
  KEY `category` (`category`),
  KEY `sort_order` (`sort_order`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- images (für Produkte + Anwendungen + Wagenzug + Hero etc.)
-- ============================================================
CREATE TABLE IF NOT EXISTS `images` (
  `id`           INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `product_id`   INT UNSIGNED DEFAULT NULL,                 -- NULL = nicht produktgebunden
  `context`      VARCHAR(32)  NOT NULL DEFAULT 'product',   -- product, application, wagen_train, hero, generic
  `role`         VARCHAR(32)  NOT NULL DEFAULT 'gallery',   -- main, gallery, application, train
  `filename_base` VARCHAR(255) NOT NULL,                    -- "main-01" -> resolves to main-01-400/800/1600.webp etc.
  `directory`    VARCHAR(255) NOT NULL,                     -- "products/PLA300-DX"
  `alt_text`     VARCHAR(500) NOT NULL,
  `caption`      VARCHAR(500) DEFAULT NULL,
  `width`        INT UNSIGNED DEFAULT NULL,
  `height`       INT UNSIGNED DEFAULT NULL,
  `sort_order`   INT          NOT NULL DEFAULT 0,
  `is_active`    TINYINT(1)   NOT NULL DEFAULT 1,
  `created_at`   TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `product_id` (`product_id`),
  KEY `context` (`context`),
  KEY `sort_order` (`sort_order`),
  CONSTRAINT `fk_images_product` FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- inquiries (B2B Anfragen mit Stückzahl)
-- ============================================================
CREATE TABLE IF NOT EXISTS `inquiries` (
  `id`         INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `type`       VARCHAR(32)  NOT NULL DEFAULT 'quote',       -- quote, contact
  `company`    VARCHAR(255) DEFAULT NULL,
  `name`       VARCHAR(255) NOT NULL,
  `email`      VARCHAR(255) NOT NULL,
  `phone`      VARCHAR(64)  DEFAULT NULL,
  `street`     VARCHAR(255) DEFAULT NULL,
  `zip`        VARCHAR(16)  DEFAULT NULL,
  `city`       VARCHAR(128) DEFAULT NULL,
  `country`    VARCHAR(64)  DEFAULT NULL,
  `message`    TEXT         DEFAULT NULL,
  `items_json` JSON         DEFAULT NULL,                   -- [{slug, art_nr, qty}, ...]
  `status`     VARCHAR(32)  NOT NULL DEFAULT 'new',         -- new, read, responded, archived
  `ip_hash`    VARCHAR(64)  DEFAULT NULL,
  `user_agent` VARCHAR(500) DEFAULT NULL,
  `created_at` TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP    DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `status` (`status`),
  KEY `created_at` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- users (Admin)
-- ============================================================
CREATE TABLE IF NOT EXISTS `users` (
  `id`            INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `username`      VARCHAR(64)  NOT NULL,
  `email`         VARCHAR(255) NOT NULL,
  `password_hash` VARCHAR(255) NOT NULL,
  `role`          VARCHAR(32)  NOT NULL DEFAULT 'admin',
  `is_active`     TINYINT(1)   NOT NULL DEFAULT 1,
  `last_login`    TIMESTAMP    NULL DEFAULT NULL,
  `created_at`    TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `username` (`username`),
  UNIQUE KEY `email` (`email`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- login_attempts (Rate Limiting)
-- ============================================================
CREATE TABLE IF NOT EXISTS `login_attempts` (
  `id`         INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `ip_hash`    VARCHAR(64)  NOT NULL,
  `username`   VARCHAR(64)  DEFAULT NULL,
  `success`    TINYINT(1)   NOT NULL DEFAULT 0,
  `created_at` TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `ip_hash_created` (`ip_hash`, `created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- settings (Key-Value für Site-Konfig im Admin)
-- ============================================================
CREATE TABLE IF NOT EXISTS `settings` (
  `key_name`   VARCHAR(64)  NOT NULL,
  `value`      TEXT         DEFAULT NULL,
  `updated_at` TIMESTAMP    DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`key_name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

SET FOREIGN_KEY_CHECKS = 1;
