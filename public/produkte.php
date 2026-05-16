<?php
require __DIR__ . '/../app/core/bootstrap.php';

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
