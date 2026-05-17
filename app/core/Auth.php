<?php
declare(strict_types=1);

/**
 * Auth - Session-basiertes Login + Rate-Limiting für Admin-Panel.
 */
final class Auth
{
    public static function user(): ?array
    {
        $id = $_SESSION['auth_user_id'] ?? null;
        if (!$id) return null;
        return Database::one('SELECT id, username, email, role FROM users WHERE id = ? AND is_active = 1', [$id]);
    }

    public static function isLoggedIn(): bool
    {
        return self::user() !== null;
    }

    public static function require(): void
    {
        if (!self::isLoggedIn()) {
            $_SESSION['auth_redirect'] = $_SERVER['REQUEST_URI'] ?? '/admin/';
            redirect('/admin/index.php');
        }
    }

    /**
     * Login-Versuch. Rate-Limited auf 5 Versuche / 15 Minuten pro IP.
     * Liefert true bei Erfolg, false bei Fehler oder Sperre.
     */
    public static function attempt(string $username, string $password): bool
    {
        $cfg = $GLOBALS['config']['security'];
        $ipHash = client_ip_hash();

        // Rate-Limit prüfen
        $cutoff = date('Y-m-d H:i:s', time() - ($cfg['login_lockout_min'] * 60));
        $failures = (int) Database::value(
            'SELECT COUNT(*) FROM login_attempts WHERE ip_hash = ? AND success = 0 AND created_at > ?',
            [$ipHash, $cutoff]
        );
        if ($failures >= $cfg['login_max_attempts']) {
            self::logAttempt($ipHash, $username, false);
            return false;
        }

        $user = Database::one(
            'SELECT id, username, password_hash, is_active FROM users WHERE username = ?',
            [$username]
        );

        $hash = $user['password_hash'] ?? '$2y$10$invalidinvalidinvalidinvalidinvalidinvalidinvalidinvalidinvalid';
        if (!$user || !$user['is_active'] || !password_verify($password, $hash)) {
            self::logAttempt($ipHash, $username, false);
            // Konstante Antwortzeit
            usleep(random_int(200000, 500000));
            return false;
        }

        // Erfolg
        session_regenerate_id(true);
        $_SESSION['auth_user_id'] = $user['id'];
        Database::query('UPDATE users SET last_login = NOW() WHERE id = ?', [$user['id']]);
        self::logAttempt($ipHash, $username, true);

        // Re-Hash falls Algorithmus geupdated
        if (password_needs_rehash($hash, PASSWORD_DEFAULT)) {
            Database::query('UPDATE users SET password_hash = ? WHERE id = ?',
                [password_hash($password, PASSWORD_DEFAULT), $user['id']]);
        }
        return true;
    }

    public static function logout(): void
    {
        $_SESSION = [];
        if (ini_get('session.use_cookies')) {
            $p = session_get_cookie_params();
            setcookie(session_name(), '', time() - 42000,
                $p['path'], $p['domain'], $p['secure'], $p['httponly']);
        }
        session_destroy();
    }

    private static function logAttempt(string $ipHash, string $username, bool $success): void
    {
        Database::insert('login_attempts', [
            'ip_hash'  => $ipHash,
            'username' => mb_substr($username, 0, 64),
            'success'  => $success ? 1 : 0,
        ]);
    }

    public static function remainingAttempts(): int
    {
        $cfg = $GLOBALS['config']['security'];
        $ipHash = client_ip_hash();
        $cutoff = date('Y-m-d H:i:s', time() - ($cfg['login_lockout_min'] * 60));
        $failures = (int) Database::value(
            'SELECT COUNT(*) FROM login_attempts WHERE ip_hash = ? AND success = 0 AND created_at > ?',
            [$ipHash, $cutoff]
        );
        return max(0, $cfg['login_max_attempts'] - $failures);
    }
}
