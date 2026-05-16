<?php
declare(strict_types=1);

/**
 * CSRF-Token-Verwaltung. Token im Session, validiert bei jedem POST.
 */
final class Csrf
{
    private const KEY = '_csrf_token';

    public static function token(): string
    {
        if (empty($_SESSION[self::KEY])) {
            $_SESSION[self::KEY] = bin2hex(random_bytes(32));
        }
        return $_SESSION[self::KEY];
    }

    public static function field(): string
    {
        return '<input type="hidden" name="_csrf" value="' . ea(self::token()) . '">';
    }

    public static function check(?string $submitted): bool
    {
        $expected = $_SESSION[self::KEY] ?? '';
        return is_string($submitted) && $expected !== '' && hash_equals($expected, $submitted);
    }

    public static function require(): void
    {
        if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
            return;
        }
        if (!self::check($_POST['_csrf'] ?? null)) {
            http_response_code(419);
            exit('CSRF token invalid or expired.');
        }
    }
}
