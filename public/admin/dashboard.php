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
    $productCount = (int) Database::value('SELECT COUNT(*) FROM products');
    $inquiryStats = Inquiry::countByStatus();
    $latest       = Inquiry::all(null, 5);
} catch (Throwable $e) {
    $productCount = 0;
    $inquiryStats = ['new' => 0, 'read' => 0, 'responded' => 0, 'archived' => 0];
    $latest       = [];
}

AdminView::render('dashboard', compact('productCount', 'inquiryStats', 'latest'), 'Dashboard');
