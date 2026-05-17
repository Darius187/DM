<?php
/**
 * uni-silent.de - Konfiguration
 *
 * Auf Alfahosting NACH dem Upload zu config.php umbenennen
 * und Datenbank-Zugangsdaten eintragen.
 * Die echte config.php gehört NICHT ins Git-Repo (siehe .gitignore).
 */

return [
    // Datenbank (Alfahosting Shared Hosting)
    'db' => [
        'host'     => '127.0.0.1',                 // Alfahosting: 127.0.0.1 (TCP). 'localhost' würde Unix-Socket suchen.
        'port'     => 3307,                        // Alfahosting MySQL: 3307 - NICHT der Default 3306!
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
    //
    // Auf Alfahosting Shared Hosting: 'transport' => 'mail' nutzt PHP mail()
    // → /usr/sbin/sendmail (zuverlässig, kein Connect-Timeout).
    // 'auto' versucht erst SMTP, dann mail() - nur sinnvoll wenn SMTP-Daten
    // korrekt sind. 'smtp' erzwingt SMTP (für externen Mailserver mit Auth).
    'mail' => [
        'transport'   => 'mail',             // 'mail' | 'smtp' | 'auto'
        'from_addr'   => 'no-reply@unisilent.de',
        'from_name'   => 'uni-silent Webseite',
        'to_addr'     => 'info@db-bas.de',
        'smtp_host'   => '',                 // nur befüllen wenn transport != 'mail'
        'smtp_port'   => 0,
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
