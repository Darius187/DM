-- uni-silent.de - Seed-Daten (Produktkatalog)
-- Run AFTER database.sql

SET NAMES utf8mb4;

-- ============================================================
-- Produkte (aus PDF GA011 + Excel-Preisliste)
-- ============================================================
INSERT INTO `products`
(`slug`, `art_nr`, `name`, `subtitle`, `short_desc`, `material`, `color`,
 `platform_w_cm`, `platform_h_cm`, `handle_h_cm`, `wheel_inch`, `capacity_kg`, `weight_kg`,
 `category`, `is_active`, `is_featured`, `ebay_url`, `sort_order`,
 `meta_title`, `meta_description`, `features_json`)
VALUES
(
  'PLA300-DX', 'PLA300-DX',
  'Plattformwagen PLA300-DX',
  'PP-Kunststoff, Standardgriff, blau',
  'Robuster Plattformwagen aus schlagfestem Polypropylen mit klappbarem Griff. Geräuscharme Räder für leise Innenraum-Logistik.',
  'PP-Kunststoff', 'Blau',
  90.0, 60.0, 89.0, '5"', 300, 14.50,
  'plattformwagen', 1, 1, 'https://www.ebay.de/itm/336259496141', 10,
  'PLA300-DX Plattformwagen 300 kg, PP, klappbar | uni-silent',
  'PLA300-DX Plattformwagen: 90×60 cm Ladefläche, 300 kg Tragkraft, klappbarer Griff, geräuscharme 5″-Räder. Ideal für leise Innenraum-Logistik.',
  JSON_ARRAY('Klappbarer Griff für platzsparende Lagerung', 'Geräuscharme 5″-Räder mit Doppelkugellager', 'Schlagfeste PP-Plattform mit Anti-Rutsch-Profil', 'Korrosionsfreier Kunststoffrahmen', 'Tragkraft 300 kg')
),
(
  'PLA300-DX-SF', 'PLA300-DX-SF',
  'Plattformwagen PLA300-DX-SF',
  'PP-Kunststoff, extra hoher Griff, schwarz',
  'Plattformwagen mit ergonomisch hohem Griff (100,5 cm) für rückenschonendes Arbeiten. Schwarze Premium-Ausführung.',
  'PP-Kunststoff', 'Schwarz',
  90.0, 60.0, 100.5, '5"', 300, 15.00,
  'plattformwagen', 1, 1, 'https://www.ebay.de/itm/235769112093', 20,
  'PLA300-DX-SF Plattformwagen mit hohem Griff 300 kg | uni-silent',
  'PLA300-DX-SF: Plattformwagen mit extra hohem Griff (100,5 cm), 300 kg Tragkraft, schwarz. Ergonomisch, rückenschonend, geräuscharm.',
  JSON_ARRAY('Extra hoher Griff 100,5 cm - rückenschonend', 'Klappbar zur platzsparenden Lagerung', 'Geräuscharme 5″-Räder', 'Schlagfeste PP-Plattform 90×60 cm', 'Tragkraft 300 kg')
),
-- PLA300-T2 (Doppeldecker) wurde 2026-05-17 vom Inhaber deaktiviert (is_active=0).
-- Datensatz bleibt in der DB für mögliche spätere Reaktivierung.
(
  'PLA300-T2', 'PLA300-T2',
  'Plattformwagen PLA300-T2 Doppeldecker',
  'PP-Kunststoff, zwei Ladeebenen, blau',
  'Zweietagiger Plattformwagen für doppelte Ladekapazität auf gleicher Stellfläche - ideal für Bestellkommissionierung und interne Logistik.',
  'PP-Kunststoff', 'Blau',
  90.0, 60.0, 91.5, '5"', 300, 21.90,
  'plattformwagen', 0, 0, NULL, 30,
  'PLA300-T2 Doppeldecker-Plattformwagen 300 kg | uni-silent',
  'PLA300-T2 Doppeldeckerwagen mit zwei Ebenen, 90×60 cm, 300 kg Tragkraft. Perfekt für Kommissionierung und Lagerlogistik.',
  JSON_ARRAY('Zwei Ladeebenen für doppelte Kapazität', 'Stabile PP-Konstruktion', 'Geräuscharme 5″-Räder', 'Hoher Schiebebügel 91,5 cm', 'Tragkraft 300 kg')
),
(
  'ST300-DX', 'ST300-DX',
  'Plattformwagen ST300-DX Edelstahl',
  'Rostfreier Edelstahl, klappbar',
  'Hochwertiger Plattformwagen aus Edelstahl V2A - korrosionsbeständig, hygienisch und lebensmittelecht. Für Pharma, Lebensmittel, Reinraum.',
  'Edelstahl rostfrei', 'Silber',
  90.0, 60.0, 89.0, '5"', 300, 17.70,
  'plattformwagen', 1, 1, 'https://www.ebay.de/itm/336259406925', 40,
  'ST300-DX Edelstahl-Plattformwagen 300 kg, lebensmittelecht | uni-silent',
  'ST300-DX Plattformwagen aus rostfreiem Edelstahl: 90×60 cm, 300 kg. Hygienisch, korrosionsbeständig, ideal für Pharma, Lebensmittel und Reinraum.',
  JSON_ARRAY('Korrosionsfreier Edelstahl V2A', 'Lebensmittelecht & hygienisch reinigbar', 'Klappbarer Griff', 'Geräuscharme 5″-Räder', 'Tragkraft 300 kg', 'Ideal für Reinraum, Pharma, Lebensmittel')
),
(
  'TB300-DX', 'TB300-DX',
  'Plattformwagen TB300-DX Stahl',
  'Stahlrahmen mit Bumper, schwarz/gelb',
  'Robuster Stahlplattformwagen mit umlaufendem Bumper als Stoßschutz für Möbel und Wände. Für schwere Industrieeinsätze.',
  'Stahl', 'Schwarz / Gelb',
  91.0, 61.0, 89.0, '5"', 300, 16.70,
  'plattformwagen', 1, 0, NULL, 50,
  'TB300-DX Stahl-Plattformwagen mit Bumper 300 kg | uni-silent',
  'TB300-DX Stahlplattformwagen mit umlaufendem Bumper, 91×61 cm, 300 kg Tragkraft. Robust für Industrie und schwere Lasten.',
  JSON_ARRAY('Robuster Stahlrahmen', 'Umlaufender Bumper schützt Möbel & Wände', 'Geräuscharme 5″-Räder', 'Pulverbeschichtet schwarz/gelb', 'Tragkraft 300 kg')
),
(
  'TB150-DX', 'TB150-DX',
  'Plattformwagen TB150-DX Stahl klein',
  'Stahl klein mit Bumper, schwarz/gelb',
  'Kompakter Stahlplattformwagen für 150 kg - ideal für enge Gänge, kleine Werkstätten und mobile Einsätze.',
  'Stahl', 'Schwarz / Gelb',
  72.0, 47.0, 82.0, '4"', 150, 8.20,
  'plattformwagen', 1, 0, NULL, 60,
  'TB150-DX Kompakt-Plattformwagen 150 kg Stahl | uni-silent',
  'TB150-DX kompakter Stahlplattformwagen 72×47 cm, 150 kg Tragkraft, mit Bumper. Wendig, leicht, ideal für enge Räume.',
  JSON_ARRAY('Kompakt & wendig (72×47 cm)', 'Stahlrahmen mit Bumper', '4″-Räder, geräuscharm', 'Nur 8,2 kg Eigengewicht', 'Tragkraft 150 kg')
),
(
  'PLAB-300', 'PLAB-300',
  'Bremse PLAB-300',
  'Feststellbremse für PLA / ST / TB300',
  'Nachrüstbare Feststellbremse für die 300-kg-Plattformwagen-Serie. Erhöht Standsicherheit beim Be- und Entladen.',
  'Zubehör', NULL,
  NULL, NULL, NULL, NULL, NULL, NULL,
  'zubehoer', 1, 0, NULL, 100,
  'PLAB-300 Feststellbremse für Plattformwagen | uni-silent',
  'PLAB-300 Feststellbremse als Zubehör für PLA300, ST300 und TB300 Plattformwagen. Für sicheres Be- und Entladen.',
  JSON_ARRAY('Kompatibel mit PLA300, ST300, TB300', 'Werkzeuglose Nachrüstung', 'Erhöht Standsicherheit', 'Korrosionsbeständig')
);

-- ============================================================
-- Bilder (aus manifest.json - werden vom Import-Skript automatisch befüllt;
-- hier als statischer Fallback für saubere Erstinstallation)
-- ============================================================
INSERT INTO `images` (`product_id`, `context`, `role`, `filename_base`, `directory`, `alt_text`, `sort_order`)
SELECT id, 'product', 'main', 'main-01', CONCAT('products/', slug),
       CONCAT('Plattformwagen ', name), 1
FROM `products`
WHERE slug IN ('PLA300-DX','PLA300-DX-SF','PLA300-T2','ST300-DX','TB300-DX','TB150-DX');

INSERT INTO `images` (`product_id`, `context`, `role`, `filename_base`, `directory`, `alt_text`, `sort_order`)
SELECT id, 'product', 'gallery', 'gallery-02', CONCAT('products/', slug),
       CONCAT(name, ' - Detailansicht'), 2
FROM `products`
WHERE slug IN ('PLA300-DX','ST300-DX','TB150-DX');

-- ============================================================
-- Wagenzug-Bilder
-- ============================================================
INSERT INTO `images` (`context`, `role`, `filename_base`, `directory`, `alt_text`, `sort_order`)
VALUES
('wagen_train', 'train', 'wagen_gelb',    'wagen', 'Gelber Plattformwagen',     1),
('wagen_train', 'train', 'wagen_schwarz', 'wagen', 'Schwarzer Plattformwagen',  2),
('wagen_train', 'train', 'wagen_blau',    'wagen', 'Blauer Plattformwagen',     3),
('wagen_train', 'train', 'wagen_stahl',   'wagen', 'Edelstahl-Plattformwagen',  4);

-- ============================================================
-- Settings (Default)
-- ============================================================
INSERT INTO `settings` (`key_name`, `value`) VALUES
('site_title',       'uni-silent - Plattformwagen für die Industrie'),
('site_tagline',     'Auf leisen Rollen.'),
('contact_email',    'info@db-bas.de'),
('contact_phone',    '+49 (0)7720 3041933'),
('contact_mobile',   '+49 (0)173 3131701'),
('contact_address',  'Neckarpark 51, 78056 Villingen-Schwenningen'),
('train_enabled',    '1'),
('train_speed_pps',  '60');
