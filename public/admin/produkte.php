<?php
$_b = __DIR__;
while ($_b && !is_file($_b . '/app/core/bootstrap.php')) {
    $_p = dirname($_b);
    if ($_p === $_b) { http_response_code(500); exit('bootstrap.php not found'); }
    $_b = $_p;
}
require $_b . '/app/core/bootstrap.php';
Auth::require();

try {
    $products = Database::all('SELECT * FROM products ORDER BY sort_order ASC, id ASC');
} catch (Throwable $e) {
    $products = [];
}

AdminView::render('produkte', compact('products'), 'Produkte');
