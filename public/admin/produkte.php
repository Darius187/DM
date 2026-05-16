<?php
require __DIR__ . '/../../app/core/bootstrap.php';
Auth::require();

try {
    $products = Database::all('SELECT * FROM products ORDER BY sort_order ASC, id ASC');
} catch (Throwable $e) {
    $products = [];
}

AdminView::render('produkte', compact('products'), 'Produkte');
