<?php
declare(strict_types=1);

/**
 * Inquiry — Anfragen (B2B-Stückzahlanfrage + Kontakt).
 */
final class Inquiry
{
    public const TYPE_QUOTE   = 'quote';
    public const TYPE_CONTACT = 'contact';

    public const STATUS_NEW       = 'new';
    public const STATUS_READ      = 'read';
    public const STATUS_RESPONDED = 'responded';
    public const STATUS_ARCHIVED  = 'archived';

    public static function create(array $data): int
    {
        $allowed = [
            'type', 'company', 'name', 'email', 'phone',
            'street', 'zip', 'city', 'country',
            'message', 'items_json', 'status', 'ip_hash', 'user_agent',
        ];
        $row = array_intersect_key($data, array_flip($allowed));
        $row['type']   = $row['type']   ?? self::TYPE_QUOTE;
        $row['status'] = $row['status'] ?? self::STATUS_NEW;
        return Database::insert('inquiries', $row);
    }

    public static function byId(int $id): ?array
    {
        return Database::one('SELECT * FROM inquiries WHERE id = ?', [$id]);
    }

    public static function all(?string $status = null, int $limit = 200): array
    {
        if ($status) {
            return Database::all(
                'SELECT * FROM inquiries WHERE status = ? ORDER BY created_at DESC LIMIT ' . (int)$limit,
                [$status]
            );
        }
        return Database::all(
            'SELECT * FROM inquiries ORDER BY created_at DESC LIMIT ' . (int)$limit
        );
    }

    public static function setStatus(int $id, string $status): void
    {
        $valid = [self::STATUS_NEW, self::STATUS_READ, self::STATUS_RESPONDED, self::STATUS_ARCHIVED];
        if (!in_array($status, $valid, true)) {
            throw new InvalidArgumentException('Invalid status');
        }
        Database::query('UPDATE inquiries SET status = ? WHERE id = ?', [$status, $id]);
    }

    public static function delete(int $id): void
    {
        Database::query('DELETE FROM inquiries WHERE id = ?', [$id]);
    }

    public static function countByStatus(): array
    {
        $rows = Database::all('SELECT status, COUNT(*) AS c FROM inquiries GROUP BY status');
        $out = ['new' => 0, 'read' => 0, 'responded' => 0, 'archived' => 0];
        foreach ($rows as $r) { $out[$r['status']] = (int)$r['c']; }
        return $out;
    }

    /** Items als Array decodieren. */
    public static function items(array $row): array
    {
        if (empty($row['items_json'])) return [];
        $arr = json_decode((string)$row['items_json'], true);
        return is_array($arr) ? $arr : [];
    }
}
