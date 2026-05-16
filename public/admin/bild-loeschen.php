<?php
require __DIR__ . '/../../app/core/bootstrap.php';
Auth::require();
Csrf::require();

$id        = (int)($_POST['id'] ?? 0);
$productId = (int)($_POST['product_id'] ?? 0);

if ($id <= 0) {
    AdminView::flash('error', 'Ungültige Bild-ID.');
    redirect($productId ? "/admin/produkt-edit.php?id=$productId" : '/admin/produkte.php');
}

try {
    $img = Database::one('SELECT * FROM images WHERE id = ?', [$id]);
    if (!$img) {
        AdminView::flash('error', 'Bild nicht gefunden.');
        redirect("/admin/produkt-edit.php?id=$productId");
    }

    $dirAbs = PUBLIC_PATH . '/images/' . $img['directory'];
    ImageProcessor::deleteVariants($dirAbs, $img['filename_base']);

    Database::query('DELETE FROM images WHERE id = ?', [$id]);

    AdminView::flash('success', 'Bild gelöscht.');
} catch (Throwable $e) {
    AdminView::flash('error', 'Löschen fehlgeschlagen: ' . $e->getMessage());
}

redirect("/admin/produkt-edit.php?id=$productId");
