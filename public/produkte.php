<?php
$_b = __DIR__;
while ($_b && !is_file($_b . '/app/core/bootstrap.php')) {
    $_p = dirname($_b);
    if ($_p === $_b) { http_response_code(500); exit('bootstrap.php not found'); }
    $_b = $_p;
}
require $_b . '/app/core/bootstrap.php';

try {
    $products  = Product::all();
    $materials = Product::materials();
} catch (Throwable $e) {
    $products  = [];
    $materials = [];
}

$pageTitle       = 'Alle Plattformwagen — Übersicht & Vergleich';
$pageDescription = 'Übersicht aller Plattformwagen-Modelle von uni-silent: PLA300, ST300, TB300, TB150 — Materialien PP, Edelstahl und Stahl. Tragkraft 150–300 kg.';

render('pages/products', compact('products', 'materials', 'pageTitle', 'pageDescription'));
