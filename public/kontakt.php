<?php
require __DIR__ . '/../app/core/bootstrap.php';

$errors  = [];
$success = false;

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    Csrf::require();
    if (!empty($_POST['website'])) {
        $success = true;
    } else {
        $name    = trim((string)($_POST['name']    ?? ''));
        $email   = trim((string)($_POST['email']   ?? ''));
        $company = trim((string)($_POST['company'] ?? ''));
        $message = trim((string)($_POST['message'] ?? ''));
        $consent = !empty($_POST['consent']);

        if (!v_required($name))              $errors['name']    = 'Name ist Pflicht.';
        if (!v_email($email))                $errors['email']   = 'Gültige E-Mail erforderlich.';
        if (!v_required($message))           $errors['message'] = 'Nachricht ist Pflicht.';
        if (!v_max($message, 2000))          $errors['message'] = 'Nachricht zu lang (max. 2000 Zeichen).';
        if (!$consent)                       $errors['consent'] = 'Bitte Einwilligung bestätigen.';

        if (!$errors) {
            try {
                $id = Inquiry::create([
                    'type'    => Inquiry::TYPE_CONTACT,
                    'company' => mb_substr($company, 0, 255),
                    'name'    => mb_substr($name, 0, 255),
                    'email'   => mb_substr($email, 0, 255),
                    'message' => mb_substr($message, 0, 2000),
                    'ip_hash' => client_ip_hash(),
                    'user_agent' => mb_substr($_SERVER['HTTP_USER_AGENT'] ?? '', 0, 500),
                ]);

                $mailer = new Mailer();
                $to = $GLOBALS['config']['mail']['to_addr'];
                $body = "Neue Kontaktanfrage über unisilent.de\n"
                    . str_repeat('=', 50) . "\n\n"
                    . "Name:    $name\n"
                    . ($company ? "Firma:   $company\n" : '')
                    . "E-Mail:  $email\n\n"
                    . "Nachricht:\n$message\n\n"
                    . str_repeat('-', 50) . "\n"
                    . "Kontakt-ID: $id\n"
                    . "Im Admin ansehen: " . base_url('/admin/anfrage.php?id=' . $id) . "\n";

                $mailer->send($to, "Kontaktanfrage von $name" . ($company ? " ($company)" : ''), $body, null, ['reply_to' => $email]);

                $success = true;
                $_POST = [];
            } catch (Throwable $e) {
                error_log('[kontakt] ' . $e->getMessage());
                $errors['_global'] = 'Es ist ein technischer Fehler aufgetreten. Bitte später erneut versuchen oder telefonisch melden.';
            }
        }
    }
}

$pageTitle = 'Kontakt';
$pageDescription = 'Kontaktieren Sie uns telefonisch oder per E-Mail — wir helfen gerne bei der Auswahl des passenden Plattformwagens.';
render('pages/kontakt', compact('pageTitle', 'pageDescription', 'errors', 'success'));
