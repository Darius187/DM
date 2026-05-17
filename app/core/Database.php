<?php
declare(strict_types=1);

/**
 * Database - schlanker PDO-Wrapper.
 * Alle Queries laufen ausschließlich über Prepared Statements (kein User-Input
 * jemals in SQL-Strings konkateniert).
 */
final class Database
{
    private static ?PDO $pdo = null;
    private static array $config = [];

    public static function configure(array $config): void
    {
        self::$config = $config;
    }

    public static function pdo(): PDO
    {
        if (self::$pdo === null) {
            $cfg = self::$config;
            // Port nur in DSN, wenn explizit gesetzt - sonst nutzt PDO Default (3306)
            // bzw. bei host=localhost den lokalen Socket.
            $dsn = 'mysql:host=' . $cfg['host'];
            if (!empty($cfg['port'])) {
                $dsn .= ';port=' . (int)$cfg['port'];
            }
            if (!empty($cfg['socket'])) {
                $dsn .= ';unix_socket=' . $cfg['socket'];
            }
            $dsn .= ';dbname=' . $cfg['name'];
            $dsn .= ';charset=' . ($cfg['charset'] ?? 'utf8mb4');

            self::$pdo = new PDO($dsn, $cfg['user'], $cfg['pass'], [
                PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
                PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
                PDO::ATTR_EMULATE_PREPARES   => false,
                PDO::MYSQL_ATTR_INIT_COMMAND => "SET NAMES utf8mb4 COLLATE utf8mb4_unicode_ci",
            ]);
        }
        return self::$pdo;
    }

    public static function query(string $sql, array $params = []): PDOStatement
    {
        $stmt = self::pdo()->prepare($sql);
        $stmt->execute($params);
        return $stmt;
    }

    public static function all(string $sql, array $params = []): array
    {
        return self::query($sql, $params)->fetchAll();
    }

    public static function one(string $sql, array $params = []): ?array
    {
        $row = self::query($sql, $params)->fetch();
        return $row === false ? null : $row;
    }

    public static function value(string $sql, array $params = []): mixed
    {
        $row = self::query($sql, $params)->fetch(PDO::FETCH_NUM);
        return $row === false ? null : ($row[0] ?? null);
    }

    public static function insert(string $table, array $data): int
    {
        $cols = array_keys($data);
        $placeholders = array_map(fn($c) => ':' . $c, $cols);
        $sql = sprintf(
            'INSERT INTO `%s` (`%s`) VALUES (%s)',
            $table,
            implode('`,`', $cols),
            implode(',', $placeholders)
        );
        self::query($sql, $data);
        return (int)self::pdo()->lastInsertId();
    }
}
