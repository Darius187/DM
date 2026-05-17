<?php
/**
 * Healthcheck — Self-Test der gesamten Installation.
 *
 * CLI: php tools/healthcheck.php
 *
 * Prüft:
 *   - PHP-Version + benötigte Extensions
 *   - Pfade existieren und sind les-/schreibbar
 *   - config.php geladen (oder Fallback auf sample)
 *   - DB-Verbindung (mit Port!) + Tabellen vorhanden + Produkt-Count
 *   - Mail-Transport
 *   - Image-Verzeichnisse
 *
 * Nichts wird verändert — reines Lese-Tool. Sicher in Prod ausführbar.
 */
declare(strict_types=1);

if (PHP_SAPI !== 'cli') {
    http_response_code(403);
    exit("Nur über CLI ausführbar.\n");
}

$ok   = "\033[32m✓\033[0m";
$warn = "\033[33m⚠\033[0m";
$err  = "\033[31m✗\033[0m";

$exitCode = 0;
function fail(string $msg) { global $err, $exitCode; echo "  $err $msg\n"; $exitCode = 1; }
function pass(string $msg) { global $ok;                  echo "  $ok $msg\n"; }
function warn(string $msg) { global $warn;                echo "  $warn $msg\n"; }

echo "═══════════════════════════════════════════════════\n";
echo " uni-silent.de — Healthcheck\n";
echo "═══════════════════════════════════════════════════\n\n";

echo "1. PHP\n";
$phpv = PHP_VERSION;
echo "  Version: $phpv\n";
if (version_compare($phpv, '8.0', '<')) {
    fail("PHP < 8.0 wird nicht unterstützt.");
} else {
    pass("PHP-Version OK");
}
foreach (['pdo_mysql', 'mbstring', 'gd', 'fileinfo', 'json'] as $ext) {
    if (extension_loaded($ext)) pass("Extension: $ext");
    else                        fail("Extension fehlt: $ext");
}
if (function_exists('imagewebp')) pass("GD hat WebP-Support");
else                              warn("GD ohne WebP — Uploads landen nur als JPG.");

echo "\n2. Pfade\n";
require __DIR__ . '/../app/core/bootstrap.php';
echo "  APP_BASE: " . APP_BASE . "\n";
echo "  APP_PATH: " . APP_PATH . "\n";
echo "  PUBLIC_PATH: " . PUBLIC_PATH . "\n";
foreach ([APP_BASE, APP_PATH, PUBLIC_PATH] as $p) {
    if (is_dir($p) && is_readable($p)) pass("Lesbar: $p");
    else                                fail("Nicht lesbar oder fehlt: $p");
}
foreach (['storage/logs', 'storage/cache', 'storage/uploads'] as $rel) {
    $p = APP_BASE . '/' . $rel;
    if (!is_dir($p)) { @mkdir($p, 0775, true); }
    if (is_dir($p) && is_writable($p)) pass("Schreibbar: $rel");
    else                                fail("NICHT schreibbar: $rel — Logs/Uploads werden fehlschlagen.");
}

echo "\n3. Konfiguration\n";
$cfgFile = APP_PATH . '/config/config.php';
if (is_file($cfgFile)) pass("config.php gefunden");
else                   fail("config.php fehlt — Beispiel kopieren: cp app/config/config.sample.php app/config/config.php");

$cfg = $GLOBALS['config'];
echo "  Site-URL: " . ($cfg['site']['url'] ?? '(unset)') . "\n";
echo "  Env:      " . ($cfg['site']['env'] ?? '(unset)') . "\n";

echo "\n4. Datenbank\n";
echo "  DSN-Bausteine: host=" . $cfg['db']['host'] . " port=" . ($cfg['db']['port'] ?? '(default 3306)')
   . " name=" . $cfg['db']['name'] . " user=" . $cfg['db']['user'] . "\n";
if (($cfg['db']['pass'] ?? '') === 'CHANGE_ME') {
    fail("DB-Passwort ist noch 'CHANGE_ME' — bitte in config.php eintragen.");
}
try {
    $pdo = Database::pdo();
    $ver = $pdo->query('SELECT VERSION()')->fetchColumn();
    pass("Verbunden. MySQL: $ver");
} catch (Throwable $e) {
    fail("Connection failed: " . $e->getMessage());
}

if ($exitCode === 0) {
    try {
        $tables = Database::all('SHOW TABLES');
        $names = [];
        foreach ($tables as $t) { $names[] = reset($t); }
        $expected = ['products', 'images', 'inquiries', 'users', 'login_attempts', 'settings'];
        foreach ($expected as $tbl) {
            if (in_array($tbl, $names, true)) pass("Tabelle: $tbl");
            else                              fail("Tabelle fehlt: $tbl — database.sql in phpMyAdmin importieren.");
        }
        $pc = (int) Database::value('SELECT COUNT(*) FROM products');
        if ($pc > 0) pass("$pc Produkte in DB");
        else         warn("Keine Produkte — seed.sql noch nicht importiert?");

        $uc = (int) Database::value('SELECT COUNT(*) FROM users WHERE is_active=1');
        if ($uc > 0) pass("$uc aktiver Admin-User");
        else         warn("Kein Admin-User — anlegen: php tools/create_admin.php <user> <email> <pw>");
    } catch (Throwable $e) {
        fail("DB-Abfrage fehlgeschlagen: " . $e->getMessage());
    }
}

echo "\n5. Mail\n";
$mail = $cfg['mail'];
echo "  Transport: " . ($mail['transport'] ?? 'auto') . "\n";
echo "  From:      " . ($mail['from_addr'] ?? '(unset)') . "\n";
echo "  To:        " . ($mail['to_addr']   ?? '(unset)') . "\n";
$sendmail = ini_get('sendmail_path') ?: '(unset)';
echo "  sendmail_path: $sendmail\n";
$transport = strtolower((string)($mail['transport'] ?? 'auto'));
if ($transport === 'mail') {
    if (function_exists('mail')) pass("PHP mail() verfügbar (via sendmail)");
    else                         fail("PHP mail() nicht verfügbar!");
} elseif ($transport === 'smtp' || $transport === 'auto') {
    $host = $mail['smtp_host'] ?? '';
    $port = (int)($mail['smtp_port'] ?? 0);
    if ($host && $port) {
        $sock = @fsockopen($host, $port, $errno, $errstr, 3);
        if ($sock) { pass("SMTP-Port erreichbar: $host:$port"); fclose($sock); }
        else        warn("SMTP-Port NICHT erreichbar: $host:$port ($errstr) — Fallback auf mail() wird greifen.");
    } else {
        warn("smtp_host / smtp_port nicht gesetzt, aber transport=$transport.");
    }
}

echo "\n6. Statische Assets\n";
foreach ([
    'public/assets/css/tailwind.min.css',
    'public/assets/js/main.js',
    'public/assets/js/train.js',
    'public/assets/js/cookie.js',
    'public/images/wagen/wagen_gelb.png',
    'public/images/wagen/wagen_blau.png',
    'public/images/wagen/wagen_schwarz.png',
    'public/images/wagen/wagen_stahl.png',
    'public/.htaccess',
    'public/admin/.htaccess',
] as $rel) {
    $p = APP_BASE . '/' . $rel;
    if (is_file($p)) pass("$rel (" . number_format(filesize($p)) . " B)");
    else             fail("$rel — fehlt!");
}

echo "\n═══════════════════════════════════════════════════\n";
echo $exitCode === 0
    ? " \033[32mAlles OK.\033[0m Du kannst die Seite aufrufen.\n"
    : " \033[31mProbleme gefunden.\033[0m Siehe ✗ oben — diese zuerst beheben.\n";
echo "═══════════════════════════════════════════════════\n";

exit($exitCode);
