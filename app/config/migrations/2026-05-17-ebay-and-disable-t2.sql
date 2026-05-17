-- Migration 2026-05-17
-- (a) Spalte ebay_url ergänzen
-- (b) PLA300-T2 deaktivieren (laut User: erstmal komplett weglassen)
-- (c) eBay-Verkaufslinks für die 3 angebotenen Modelle eintragen
--
-- Idempotent: kann mehrfach ausgeführt werden (IF NOT EXISTS / WHERE-Bedingungen).

-- (a) Spalte ergänzen, falls noch nicht da. MySQL 8 + MariaDB 10.5+ kennen IF NOT EXISTS.
ALTER TABLE `products` ADD COLUMN IF NOT EXISTS `ebay_url` VARCHAR(500) DEFAULT NULL AFTER `is_featured`;

-- (b) PLA300-T2 (Doppeldecker) auf inaktiv setzen
UPDATE `products` SET `is_active` = 0 WHERE `slug` = 'PLA300-T2';

-- (c) eBay-URLs für die drei Modelle, die direkt über eBay vertrieben werden
UPDATE `products` SET `ebay_url` = 'https://www.ebay.de/itm/336259496141' WHERE `slug` = 'PLA300-DX';
UPDATE `products` SET `ebay_url` = 'https://www.ebay.de/itm/235769112093' WHERE `slug` = 'PLA300-DX-SF';
UPDATE `products` SET `ebay_url` = 'https://www.ebay.de/itm/336259406925' WHERE `slug` = 'ST300-DX';
