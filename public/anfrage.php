<?php
require __DIR__ . '/../app/core/bootstrap.php';
Csrf::require();

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

$pageTitle = 'Stückzahl-Anfrage — B2B-Konditionen anfordern';
$pageDescription = 'Senden Sie uns Ihre B2B-Anfrage mit gewünschter Stückzahl. Wir kalkulieren passende Konditionen und melden uns zeitnah zurück.';

render('pages/anfrage', compact('products', 'preselect', 'pageTitle', 'pageDescription'));
