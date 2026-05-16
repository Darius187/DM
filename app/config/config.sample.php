<?php
/**
 * uni-silent.de — Konfiguration
 *
 * Auf Alfahosting NACH dem Upload zu config.php umbenennen
 * und Datenbank-Zugangsdaten eintragen.
 * Die echte config.php gehört NICHT ins Git-Repo (siehe .gitignore).
 */

return [
    // Datenbank (Alfahosting Shared Hosting)
    'db' => [
        'host'     => 'localhost',                 // Alfahosting: localhost
        'name'     => 'cxycs6ph_unisilent',
        'user'     => 'cxycs6ph_unisilent',
        'pass'     => 'CHANGE_ME',                 // <-- Hier das echte DB-Passwort eintragen
        'charset'  => 'utf8mb4',
    ],

    // Site
    'site' => [
        'url'         => 'https://unisilent.de',
        'name'        => 'uni-silent',
        'locale'      => 'de_DE',
        'timezone'    => 'Europe/Berlin',
        'env'         => 'production',       // production | development
    ],

    // E-Mail (Anfragen, Kontakt)
    'mail' => [
        'from_addr'   => 'no-reply@unisilent.de',
        'from_name'   => 'uni-silent Webseite',
        'to_addr'     => 'info@db-bas.de',
        'smtp_host'   => 'localhost',
        'smtp_port'   => 25,
        'smtp_user'   => '',
        'smtp_pass'   => '',
        'smtp_secure' => '',                 // 'tls' oder 'ssl' oder ''
    ],

    // Sicherheit
    'security' => [
        'session_name'     => 'usil_sess',
        'session_lifetime' => 7200,
        'csrf_lifetime'    => 7200,
        'login_max_attempts' => 5,
        'login_lockout_min'  => 15,
        'pepper'           => 'CHANGE_ME_TO_RANDOM_32_CHAR_STRING',
    ],

    // Pfade (werden relativ zu APP_BASE aufgelöst)
    'paths' => [
        'uploads' => __DIR__ . '/../../storage/uploads',
        'logs'    => __DIR__ . '/../../storage/logs',
        'cache'   => __DIR__ . '/../../storage/cache',
        'public'  => __DIR__ . '/../../public',
    ],
];
