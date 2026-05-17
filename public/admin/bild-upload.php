<?php
$_b = __DIR__;
while ($_b && !is_file($_b . '/app/core/bootstrap.php')) {
    $_p = dirname($_b);
    if ($_p === $_b) { http_response_code(500); exit('bootstrap.php not found'); }
    $_b = $_p;
}
require $_b . '/app/core/bootstrap.php';
Auth::require();
Csrf::require();

$productId = (int)($_POST['product_id'] ?? 0);
$role      = (string)($_POST['role'] ?? 'gallery');
$altText   = trim((string)($_POST['alt_text'] ?? ''));

$validRoles = ['main', 'gallery', 'application'];
if (!in_array($role, $validRoles, true)) $role = 'gallery';

if ($productId <= 0) {
    AdminView::flash('error', 'Ungültige Produkt-ID.');
    redirect('/admin/produkte.php');
}

try {
    $product = Product::byId($productId);
    if (!$product) {
        AdminView::flash('error', 'Produkt nicht gefunden.');
        redirect('/admin/produkte.php');
    }

    if (!v_required($altText)) {
        AdminView::flash('error', 'Alt-Text ist Pflicht (Barrierefreiheit).');
        redirect('/admin/produkt-edit.php?id=' . $productId);
    }

    if (empty($_FILES['image']) || !is_array($_FILES['image'])) {
        AdminView::flash('error', 'Keine Datei hochgeladen.');
        redirect('/admin/produkt-edit.php?id=' . $productId);
    }

    $dirRel = 'products/' . $product['slug'];
    $dirAbs = PUBLIC_PATH . '/images/' . $dirRel;

    // Eindeutigen Basisnamen finden (role + nächste Nummer)
    $existing = Database::all(
        "SELECT filename_base FROM images WHERE product_id = ? AND role = ?",
        [$productId, $role]
    );
    $maxNum = 0;
    foreach ($existing as $e) {
        if (preg_match('/-(\d+)$/', $e['filename_base'], $m)) {
            $maxNum = max($maxNum, (int)$m[1]);
        }
    }
    $base = $role . '-' . str_pad((string)($maxNum + 1), 2, '0', STR_PAD_LEFT);

    $result = ImageProcessor::processUpload($_FILES['image'], $dirAbs, $base);

    // Wenn role=main: alte main als gallery degradieren
    if ($role === 'main') {
        Database::query(
            "UPDATE images SET role = 'gallery' WHERE product_id = ? AND role = 'main'",
            [$productId]
        );
    }

    $nextSort = (int)Database::value(
        'SELECT COALESCE(MAX(sort_order), 0) + 1 FROM images WHERE product_id = ?',
        [$productId]
    );

    Database::insert('images', [
        'product_id'    => $productId,
        'context'       => 'product',
        'role'          => $role,
        'filename_base' => $result['base'],
        'directory'     => $dirRel,
        'alt_text'      => mb_substr($altText, 0, 500),
        'width'         => $result['width'],
        'height'        => $result['height'],
        'sort_order'    => $nextSort,
        'is_active'     => 1,
    ]);

    AdminView::flash('success', 'Bild hochgeladen und verarbeitet (' . $result['base'] . ').');
} catch (Throwable $e) {
    AdminView::flash('error', 'Upload fehlgeschlagen: ' . $e->getMessage());
}

redirect('/admin/produkt-edit.php?id=' . $productId);
