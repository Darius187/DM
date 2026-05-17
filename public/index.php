<?php
$_b = __DIR__;
while ($_b && !is_file($_b . '/app/core/bootstrap.php')) {
    $_p = dirname($_b);
    if ($_p === $_b) { http_response_code(500); exit('bootstrap.php not found'); }
    $_b = $_p;
}
require $_b . '/app/core/bootstrap.php';

try {
    $featured = Product::all('plattformwagen', true);
} catch (Throwable $e) {
    // Falls DB noch nicht aufgesetzt ist (z.B. unmittelbar nach Deployment),
    // statischer Fallback aus Seed-Daten.
    $featured = [];
}

$pageTitle       = 'Plattformwagen für die Industrie — geräuscharm & robust';
$pageDescription = 'Premium-Plattformwagen aus PP-Kunststoff, Edelstahl und Stahl. 150–300 kg Tragkraft, geräuscharme 5″-Räder, klappbar. Aus Villingen-Schwenningen, B2B-Lieferant für Industrie, Logistik und Gesundheitswesen.';

render('pages/home', compact('featured', 'pageTitle', 'pageDescription'));
