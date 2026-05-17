<?php
$_b = __DIR__;
while ($_b && !is_file($_b . '/app/core/bootstrap.php')) {
    $_p = dirname($_b);
    if ($_p === $_b) { http_response_code(500); exit('bootstrap.php not found'); }
    $_b = $_p;
}
require $_b . '/app/core/bootstrap.php';

$errors  = [];
$success = false;
$inquiryId = null;

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    Csrf::require();

    // Honeypot
    if (!empty($_POST['website'])) {
        // Bots silent ignorieren - simulieren Erfolg
        $success = true;
    } else {
        $company = trim((string)($_POST['company'] ?? ''));
        $name    = trim((string)($_POST['name']    ?? ''));
        $email   = trim((string)($_POST['email']   ?? ''));
        $phone   = trim((string)($_POST['phone']   ?? ''));
        $message = trim((string)($_POST['message'] ?? ''));
        $consent = !empty($_POST['consent']);
        $qty     = $_POST['qty'] ?? [];

        if (!v_required($company))           $errors['company'] = 'Firma ist Pflicht.';
        if (!v_required($name))              $errors['name']    = 'Ansprechpartner ist Pflicht.';
        if (!v_email($email))                $errors['email']   = 'Gültige E-Mail erforderlich.';
        if (!v_max($message, 2000))          $errors['message'] = 'Nachricht zu lang (max. 2000 Zeichen).';
        if (!$consent)                       $errors['consent'] = 'Bitte Einwilligung bestätigen.';

        // Items aufbauen
        $items = [];
        $totalQty = 0;
        if (is_array($qty)) {
            try {
                $products = Product::all();
                $bySlug = [];
                foreach ($products as $p) { $bySlug[$p['slug']] = $p; }
                foreach ($qty as $slug => $q) {
                    if (!is_string($slug) || !preg_match('/^[A-Za-z0-9_-]{1,64}$/', $slug)) continue;
                    $q = (int)$q;
                    if ($q <= 0 || $q > 99999) continue;
                    if (!isset($bySlug[$slug])) continue;
                    $items[] = ['slug' => $slug, 'art_nr' => $bySlug[$slug]['art_nr'], 'name' => $bySlug[$slug]['name'], 'qty' => $q];
                    $totalQty += $q;
                }
            } catch (Throwable $e) {
                // DB offline → trotzdem speichern wir items leer
            }
        }
        if (empty($items)) {
            $errors['qty'] = 'Bitte mindestens ein Produkt mit Stückzahl angeben.';
        }

        if (!$errors) {
            try {
                $inquiryId = Inquiry::create([
                    'type'       => Inquiry::TYPE_QUOTE,
                    'company'    => mb_substr($company, 0, 255),
                    'name'       => mb_substr($name, 0, 255),
                    'email'      => mb_substr($email, 0, 255),
                    'phone'      => mb_substr($phone, 0, 64),
                    'message'    => mb_substr($message, 0, 2000),
                    'items_json' => json_encode($items, JSON_UNESCAPED_UNICODE),
                    'ip_hash'    => client_ip_hash(),
                    'user_agent' => mb_substr($_SERVER['HTTP_USER_AGENT'] ?? '', 0, 500),
                ]);

                $mailer = new Mailer();
                $to     = $GLOBALS['config']['mail']['to_addr'];
                $itemLines = array_map(fn($i) => sprintf('%-14s %5d Stk.  %s', $i['art_nr'], $i['qty'], $i['name']), $items);
                $bodyText = "Neue B2B-Anfrage über unisilent.de\n"
                    . str_repeat('=', 50) . "\n\n"
                    . "Firma:       $company\n"
                    . "Name:        $name\n"
                    . "E-Mail:      $email\n"
                    . "Telefon:     " . ($phone ?: '-') . "\n\n"
                    . "Angefragte Produkte ($totalQty Stk. gesamt):\n"
                    . "  " . implode("\n  ", $itemLines) . "\n\n"
                    . "Nachricht:\n"
                    . ($message ?: '(keine)') . "\n\n"
                    . str_repeat('-', 50) . "\n"
                    . "Anfrage-ID: $inquiryId\n"
                    . "Empfangen: " . date('d.m.Y H:i:s') . "\n"
                    . "Im Admin ansehen: " . base_url('/admin/anfrage.php?id=' . $inquiryId) . "\n";

                $mailer->send($to, "Neue B2B-Anfrage von $company ($totalQty Stk.)", $bodyText, null, [
                    'reply_to' => $email,
                ]);

                // Bestätigung an Anfragenden
                $confirmBody = "Hallo $name,\n\n"
                    . "vielen Dank für Ihre Anfrage über unsere Webseite.\n"
                    . "Wir haben sie erhalten und melden uns innerhalb von 24 Stunden (werktags) mit einem Angebot zurück.\n\n"
                    . "Ihre Anfrage in Stichworten:\n"
                    . "  " . implode("\n  ", $itemLines) . "\n\n"
                    . "Mit freundlichen Grüßen\n"
                    . "Darius Matuszak\n"
                    . "uni-silent / db-bas\n"
                    . "Tel: +49 (0)7720 3041933\n"
                    . "info@db-bas.de\n";
                $mailer->send($email, 'Ihre Anfrage bei uni-silent (Eingangsbestätigung)', $confirmBody);

                $success = true;
                // Felder leeren
                $_POST = [];
            } catch (Throwable $e) {
                error_log('[anfrage] ' . $e->getMessage());
                $errors['_global'] = 'Es ist ein technischer Fehler aufgetreten. Bitte später erneut versuchen oder per Telefon kontaktieren.';
            }
        }
    }
}

$slug = $_GET['slug'] ?? '';
$preselect = null;
if ($slug && preg_match('/^[A-Za-z0-9_-]{1,64}$/', $slug)) {
    try { $preselect = Product::bySlug($slug); } catch (Throwable $e) { $preselect = null; }
}

try {
    $products = Product::all();
} catch (Throwable $e) {
    $products = [];
}

$pageTitle = 'Stückzahl-Anfrage - B2B-Konditionen anfordern';
$pageDescription = 'Senden Sie uns Ihre B2B-Anfrage mit gewünschter Stückzahl. Wir kalkulieren passende Konditionen und melden uns zeitnah zurück.';

render('pages/anfrage', compact('products', 'preselect', 'pageTitle', 'pageDescription', 'errors', 'success'));
