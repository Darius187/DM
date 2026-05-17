<?php
$_b = __DIR__;
while ($_b && !is_file($_b . '/app/core/bootstrap.php')) {
    $_p = dirname($_b);
    if ($_p === $_b) { http_response_code(500); exit('bootstrap.php not found'); }
    $_b = $_p;
}
require $_b . '/app/core/bootstrap.php';

$slug = $_GET['slug'] ?? '';
if (!preg_match('/^[A-Za-z0-9_-]{1,64}$/', $slug)) {
    http_response_code(404);
    require __DIR__ . '/404.php';
    exit;
}

try {
    $product = Product::bySlug($slug);
    $images  = $product ? Product::images((int)$product['id']) : [];
} catch (Throwable $e) {
    http_response_code(500);
    echo 'Datenbank nicht verfügbar.';
    exit;
}

if (!$product) {
    http_response_code(404);
    require __DIR__ . '/404.php';
    exit;
}

$pageTitle       = $product['meta_title'] ?: ($product['name'] . ' - ' . ($product['subtitle'] ?? ''));
$pageDescription = $product['meta_description'] ?: $product['short_desc'];

$structuredData = [
    '@context'    => 'https://schema.org',
    '@type'       => 'Product',
    'name'        => $product['name'],
    'sku'         => $product['art_nr'],
    'description' => $product['short_desc'],
    'brand'       => ['@type' => 'Brand', 'name' => 'uni-silent'],
    'image'       => base_url('/images/products/' . $product['slug'] . '/main-01-1600.jpg'),
];

render('pages/product', compact('product', 'images', 'pageTitle', 'pageDescription', 'structuredData'));
