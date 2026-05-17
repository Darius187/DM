<?php
declare(strict_types=1);

/**
 * Product - Datenzugriff für Produkte + zugehörige Bilder.
 * Hat keine eigenständige Klasse pro Datensatz (keep it simple); arbeitet mit Arrays.
 */
final class Product
{
    /** Liefert aktive Produkte (sortiert). */
    public static function all(?string $category = null, bool $onlyFeatured = false): array
    {
        $sql = 'SELECT * FROM products WHERE is_active = 1';
        $params = [];
        if ($category) {
            $sql .= ' AND category = ?';
            $params[] = $category;
        }
        if ($onlyFeatured) {
            $sql .= ' AND is_featured = 1';
        }
        $sql .= ' ORDER BY sort_order ASC, id ASC';
        return Database::all($sql, $params);
    }

    public static function bySlug(string $slug): ?array
    {
        return Database::one('SELECT * FROM products WHERE slug = ? AND is_active = 1', [$slug]);
    }

    public static function byId(int $id): ?array
    {
        return Database::one('SELECT * FROM products WHERE id = ?', [$id]);
    }

    /** Bilder zu Produkt. */
    public static function images(int $productId): array
    {
        return Database::all(
            'SELECT * FROM images WHERE product_id = ? AND is_active = 1 ORDER BY sort_order ASC, id ASC',
            [$productId]
        );
    }

    /** Hauptbild zu Produkt, oder null. */
    public static function mainImage(int $productId): ?array
    {
        return Database::one(
            "SELECT * FROM images WHERE product_id = ? AND is_active = 1 AND role = 'main' ORDER BY sort_order ASC LIMIT 1",
            [$productId]
        );
    }

    /** Filterbare Materialien für Übersichts-Filter. */
    public static function materials(): array
    {
        $rows = Database::all(
            "SELECT DISTINCT material FROM products WHERE is_active = 1 AND material IS NOT NULL AND material <> '' ORDER BY material"
        );
        return array_column($rows, 'material');
    }

    /** features_json als Array. */
    public static function features(array $product): array
    {
        if (empty($product['features_json'])) return [];
        $arr = json_decode((string)$product['features_json'], true);
        return is_array($arr) ? $arr : [];
    }
}
