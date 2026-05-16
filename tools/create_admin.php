<?php
/**
 * CLI-Tool zum Anlegen eines Admin-Users.
 *
 * Auf Alfahosting per SSH (falls vorhanden) oder lokal ausführen:
 *   php tools/create_admin.php <username> <email> <passwort>
 *
 * Beispiel:
 *   php tools/create_admin.php admin info@db-bas.de "Mein-Sicheres-Passwort!"
 *
 * Wenn nur 2 Argumente: erfragt Passwort interaktiv.
 *
 * Hinweis: dieses Tool liegt außerhalb von /public/ und ist daher
 * nicht über den Browser erreichbar.
 */
declare(strict_types=1);

if (PHP_SAPI !== 'cli') {
    http_response_code(403);
    exit("Nur über CLI ausführbar.\n");
}

require __DIR__ . '/../app/core/bootstrap.php';

$argv = $_SERVER['argv'];
if (!isset($argv[1], $argv[2])) {
    fwrite(STDERR, "Usage: php tools/create_admin.php <username> <email> [<passwort>]\n");
    exit(1);
}
$username = trim($argv[1]);
$email    = trim($argv[2]);
$password = $argv[3] ?? null;

if (!preg_match('/^[a-zA-Z0-9_.-]{3,64}$/', $username)) {
    fwrite(STDERR, "Username invalid (3-64 chars, a-z0-9._-).\n");
    exit(1);
}
if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
    fwrite(STDERR, "Invalid email.\n");
    exit(1);
}

if ($password === null) {
    // Interaktive Passwort-Eingabe (ohne Echo)
    if (function_exists('readline')) {
        fwrite(STDOUT, 'Passwort: ');
        @system('stty -echo');
        $password = trim((string)fgets(STDIN));
        @system('stty echo');
        fwrite(STDOUT, "\n");
    } else {
        fwrite(STDERR, "Bitte Passwort als drittes Argument übergeben.\n");
        exit(1);
    }
}

if (strlen($password) < 12) {
    fwrite(STDERR, "Passwort zu kurz (min. 12 Zeichen).\n");
    exit(1);
}

try {
    $existing = Database::one('SELECT id FROM users WHERE username = ? OR email = ?', [$username, $email]);
    if ($existing) {
        // Update password
        Database::query('UPDATE users SET password_hash = ?, email = ?, is_active = 1 WHERE id = ?',
            [password_hash($password, PASSWORD_DEFAULT), $email, $existing['id']]);
        echo "Existing user '$username' password updated (id=$existing[id]).\n";
    } else {
        $id = Database::insert('users', [
            'username'      => $username,
            'email'         => $email,
            'password_hash' => password_hash($password, PASSWORD_DEFAULT),
            'role'          => 'admin',
            'is_active'     => 1,
        ]);
        echo "Admin user '$username' created (id=$id).\n";
    }
    echo "Login at: " . $GLOBALS['config']['site']['url'] . "/admin/\n";
} catch (Throwable $e) {
    fwrite(STDERR, "Error: " . $e->getMessage() . "\n");
    exit(1);
}
