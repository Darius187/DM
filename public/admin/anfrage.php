<?php
require __DIR__ . '/../../app/core/bootstrap.php';
Auth::require();

$id = (int)($_GET['id'] ?? 0);

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    Csrf::require();
    $action = (string)($_POST['action'] ?? '');
    $postId = (int)($_POST['id'] ?? 0);
    try {
        if ($action === 'status') {
            $newStatus = (string)($_POST['status'] ?? '');
            Inquiry::setStatus($postId, $newStatus);
            AdminView::flash('success', 'Status aktualisiert.');
        } elseif ($action === 'delete') {
            Inquiry::delete($postId);
            AdminView::flash('success', 'Anfrage gelöscht.');
            redirect('/admin/anfragen.php');
        }
    } catch (Throwable $e) {
        AdminView::flash('error', 'Aktion fehlgeschlagen: ' . $e->getMessage());
    }
    redirect('/admin/anfrage.php?id=' . $postId);
}

try {
    $inquiry = Inquiry::byId($id);
} catch (Throwable $e) {
    $inquiry = null;
}

if (!$inquiry) {
    AdminView::flash('error', 'Anfrage nicht gefunden.');
    redirect('/admin/anfragen.php');
}

// Beim ersten Öffnen automatisch als "read" markieren
if ($inquiry['status'] === Inquiry::STATUS_NEW) {
    try {
        Inquiry::setStatus($id, Inquiry::STATUS_READ);
        $inquiry['status'] = Inquiry::STATUS_READ;
    } catch (Throwable $e) {}
}

$items = Inquiry::items($inquiry);

AdminView::render('anfrage', compact('inquiry', 'items'), 'Anfrage #' . $inquiry['id']);
