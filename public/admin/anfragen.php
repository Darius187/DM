<?php
$_b = __DIR__;
while ($_b && !is_file($_b . '/app/core/bootstrap.php')) {
    $_p = dirname($_b);
    if ($_p === $_b) { http_response_code(500); exit('bootstrap.php not found'); }
    $_b = $_p;
}
require $_b . '/app/core/bootstrap.php';
Auth::require();

$status = $_GET['status'] ?? null;
if ($status && !in_array($status, ['new', 'read', 'responded', 'archived'], true)) {
    $status = null;
}

try {
    $inquiries = Inquiry::all($status, 500);
    $stats     = Inquiry::countByStatus();
} catch (Throwable $e) {
    $inquiries = [];
    $stats = ['new' => 0, 'read' => 0, 'responded' => 0, 'archived' => 0];
}

AdminView::render('anfragen', compact('inquiries', 'stats', 'status'), 'Anfragen');
