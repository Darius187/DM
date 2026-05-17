<?php
/**
 * Bootstrap — zentraler Einstieg.
 * Wird von jeder Seite (public/*.php und public/admin/*.php) als erstes inkludiert.
 */
declare(strict_types=1);

define('APP_BASE', dirname(__DIR__, 2));
define('APP_PATH', APP_BASE . '/app');

// PUBLIC_PATH ist Layout-abhängig:
//   - Repo/Dev-Layout:  APP_BASE/public/  (index.php liegt in public/)
//   - Flat (Alfahosting): APP_BASE selbst (index.php liegt direkt im Domain-Ordner,
//                          neben app/ und storage/)
$_pubPath = APP_BASE . '/public';
if (!is_dir($_pubPath)) {
    $_pubPath = APP_BASE;
}
define('PUBLIC_PATH', $_pubPath);

// Config laden
$configFile = APP_PATH . '/config/config.php';
if (!is_file($configFile)) {
    // Im Repo: nutze sample, damit erste Seite nicht direkt knallt
    $configFile = APP_PATH . '/config/config.sample.php';
}
$config = require $configFile;
$GLOBALS['config'] = $config;

// Timezone, Charset
date_default_timezone_set($config['site']['timezone'] ?? 'Europe/Berlin');
mb_internal_encoding('UTF-8');

// Error reporting nach Umgebung
if (($config['site']['env'] ?? 'production') === 'development') {
    error_reporting(E_ALL);
    ini_set('display_errors', '1');
} else {
    error_reporting(E_ALL & ~E_NOTICE & ~E_DEPRECATED);
    ini_set('display_errors', '0');
    ini_set('log_errors', '1');

    // Log-Ordner anlegen falls nicht da; nur dann eigene error_log setzen
    // (sonst fallen Fehler ins ENV-Default des Hosters — auch OK)
    $logDir = $config['paths']['logs'] ?? null;
    if ($logDir && !is_dir($logDir)) {
        @mkdir($logDir, 0775, true);
    }
    if ($logDir && is_dir($logDir) && is_writable($logDir)) {
        ini_set('error_log', $logDir . '/php.log');
    }
}

// Session sicher konfigurieren — Secure-Cookie nur wenn wir auch wirklich auf HTTPS sind
// (sonst funktioniert lokales HTTP-Testing nicht; in Prod ist HTTPS immer erzwungen).
$isHttps = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off')
        || (($_SERVER['HTTP_X_FORWARDED_PROTO'] ?? '') === 'https')
        || (($_SERVER['SERVER_PORT'] ?? '') == 443);

// Im CLI keine Sessions starten — irrelevant und führt zu Warnings nach echo.
if (PHP_SAPI !== 'cli') {
    session_name($config['security']['session_name']);
    session_set_cookie_params([
        'lifetime' => $config['security']['session_lifetime'],
        'path'     => '/',
        'domain'   => '',
        'secure'   => $isHttps,
        'httponly' => true,
        'samesite' => 'Lax',
    ]);
    if (session_status() === PHP_SESSION_NONE) {
        @session_start();
    }
}

// Autoloader (PSR-4-light für app/core, app/models)
spl_autoload_register(function (string $class): void {
    foreach (['core', 'models'] as $dir) {
        $file = APP_PATH . '/' . $dir . '/' . $class . '.php';
        if (is_file($file)) {
            require_once $file;
            return;
        }
    }
});

// Globale Helpers
require_once APP_PATH . '/core/helpers.php';

// Database-Singleton vorbereiten (lazy)
Database::configure($config['db']);
