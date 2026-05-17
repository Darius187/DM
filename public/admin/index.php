<?php
$_b = __DIR__;
while ($_b && !is_file($_b . '/app/core/bootstrap.php')) {
    $_p = dirname($_b);
    if ($_p === $_b) { http_response_code(500); exit('bootstrap.php not found'); }
    $_b = $_p;
}
require $_b . '/app/core/bootstrap.php';

if (Auth::isLoggedIn()) {
    redirect('/admin/dashboard.php');
}

$error = null;
$remaining = null;

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    Csrf::require();
    $username = trim((string)($_POST['username'] ?? ''));
    $password = (string)($_POST['password'] ?? '');

    try {
        $ok = Auth::attempt($username, $password);
        if ($ok) {
            $to = $_SESSION['auth_redirect'] ?? '/admin/dashboard.php';
            unset($_SESSION['auth_redirect']);
            redirect($to);
        }
        $remaining = Auth::remainingAttempts();
        $error = $remaining > 0
            ? 'Login fehlgeschlagen. Verbleibende Versuche: ' . $remaining
            : 'Zu viele Fehlversuche. Bitte 15 Minuten warten.';
    } catch (Throwable $e) {
        $error = 'Login zurzeit nicht möglich. (Datenbank?) - bitte später erneut.';
        error_log('[admin login] ' . $e->getMessage());
    }
}

AdminView::render('login', compact('error', 'remaining'), 'Anmelden');
