<?php
/**
 * Bootstrap — zentraler Einstieg.
 * Wird von jeder Seite (public/*.php und public/admin/*.php) als erstes inkludiert.
 */
declare(strict_types=1);

define('APP_BASE', dirname(__DIR__, 2));
define('APP_PATH', APP_BASE . '/app');
define('PUBLIC_PATH', APP_BASE . '/public');

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
    ini_set('error_log', $config['paths']['logs'] . '/php.log');
}

// Session sicher konfigurieren
session_name($config['security']['session_name']);
session_set_cookie_params([
    'lifetime' => $config['security']['session_lifetime'],
    'path'     => '/',
    'domain'   => '',
    'secure'   => true,
    'httponly' => true,
    'samesite' => 'Lax',
]);
if (session_status() === PHP_SESSION_NONE) {
    @session_start();
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
