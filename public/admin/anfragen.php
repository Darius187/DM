<?php
require __DIR__ . '/../../app/core/bootstrap.php';
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
