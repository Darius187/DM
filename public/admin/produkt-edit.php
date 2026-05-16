<?php
require __DIR__ . '/../../app/core/bootstrap.php';
Auth::require();

$id = isset($_GET['id']) ? (int)$_GET['id'] : 0;
$product = null;
$images  = [];
$errors  = [];

if ($id > 0) {
    try {
        $product = Product::byId($id);
        if (!$product) {
            AdminView::flash('error', 'Produkt nicht gefunden.');
            redirect('/admin/produkte.php');
        }
        $images = Product::images($id);
    } catch (Throwable $e) {
        AdminView::flash('error', 'Datenbank-Fehler: ' . $e->getMessage());
        redirect('/admin/produkte.php');
    }
}

// Defaults für neues Produkt
$product = $product ?? [
    'id' => 0, 'slug' => '', 'art_nr' => '', 'name' => '', 'subtitle' => '',
    'short_desc' => '', 'long_desc' => '', 'material' => '', 'color' => '',
    'platform_w_cm' => null, 'platform_h_cm' => null, 'handle_h_cm' => null,
    'wheel_inch' => '', 'capacity_kg' => null, 'weight_kg' => null,
    'category' => 'plattformwagen', 'is_active' => 1, 'is_featured' => 0, 'sort_order' => 100,
    'meta_title' => '', 'meta_description' => '', 'features_json' => '[]',
];

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    Csrf::require();

    // ---- Form-Daten einsammeln ----
    $data = [
        'slug'        => trim((string)($_POST['slug']        ?? '')),
        'art_nr'      => trim((string)($_POST['art_nr']      ?? '')),
        'name'        => trim((string)($_POST['name']        ?? '')),
        'subtitle'    => trim((string)($_POST['subtitle']    ?? '')),
        'short_desc'  => trim((string)($_POST['short_desc']  ?? '')),
        'long_desc'   => trim((string)($_POST['long_desc']   ?? '')),
        'material'    => trim((string)($_POST['material']    ?? '')),
        'color'       => trim((string)($_POST['color']       ?? '')),
        'platform_w_cm' => $_POST['platform_w_cm'] !== '' ? (float)$_POST['platform_w_cm'] : null,
        'platform_h_cm' => $_POST['platform_h_cm'] !== '' ? (float)$_POST['platform_h_cm'] : null,
        'handle_h_cm'   => $_POST['handle_h_cm']   !== '' ? (float)$_POST['handle_h_cm']   : null,
        'wheel_inch'    => trim((string)($_POST['wheel_inch'] ?? '')),
        'capacity_kg'   => $_POST['capacity_kg'] !== '' ? (int)$_POST['capacity_kg'] : null,
        'weight_kg'     => $_POST['weight_kg']   !== '' ? (float)$_POST['weight_kg'] : null,
        'category'      => trim((string)($_POST['category'] ?? 'plattformwagen')),
        'is_active'     => !empty($_POST['is_active']) ? 1 : 0,
        'is_featured'   => !empty($_POST['is_featured']) ? 1 : 0,
        'sort_order'    => (int)($_POST['sort_order'] ?? 100),
        'meta_title'    => trim((string)($_POST['meta_title'] ?? '')),
        'meta_description' => trim((string)($_POST['meta_description'] ?? '')),
    ];

    // Features (textarea, eine pro Zeile)
    $rawFeatures = (string)($_POST['features'] ?? '');
    $features = array_values(array_filter(array_map('trim', preg_split('/\R/', $rawFeatures) ?: [])));
    $data['features_json'] = json_encode($features, JSON_UNESCAPED_UNICODE);

    // ---- Validierung ----
    if (!preg_match('/^[A-Za-z0-9_-]{1,64}$/', $data['slug'])) {
        $errors['slug'] = 'Slug nur a-z, 0-9, "-", "_" (max. 64 Zeichen).';
    }
    if (!v_required($data['art_nr']) || !v_max($data['art_nr'], 64)) {
        $errors['art_nr'] = 'Artikelnummer ist Pflicht (max. 64 Zeichen).';
    }
    if (!v_required($data['name']) || !v_max($data['name'], 255)) {
        $errors['name'] = 'Name ist Pflicht (max. 255 Zeichen).';
    }

    // Uniqueness-Check (nur bei neu oder geändert)
    if (!$errors) {
        try {
            $clash = Database::one('SELECT id FROM products WHERE (slug = ? OR art_nr = ?) AND id <> ?',
                [$data['slug'], $data['art_nr'], (int)$product['id']]);
            if ($clash) $errors['slug'] = 'Slug oder Artikelnummer bereits vergeben.';
        } catch (Throwable $e) {
            $errors['_global'] = 'DB-Fehler: ' . $e->getMessage();
        }
    }

    // ---- Speichern ----
    if (!$errors) {
        try {
            if ((int)$product['id'] === 0) {
                $newId = Database::insert('products', $data);
                AdminView::flash('success', 'Produkt angelegt.');
                redirect('/admin/produkt-edit.php?id=' . $newId);
            } else {
                $sets = [];
                $params = [];
                foreach ($data as $k => $v) {
                    $sets[] = "`$k` = ?";
                    $params[] = $v;
                }
                $params[] = (int)$product['id'];
                Database::query('UPDATE products SET ' . implode(', ', $sets) . ' WHERE id = ?', $params);
                AdminView::flash('success', 'Produkt gespeichert.');
                redirect('/admin/produkt-edit.php?id=' . (int)$product['id']);
            }
        } catch (Throwable $e) {
            $errors['_global'] = 'Speichern fehlgeschlagen: ' . $e->getMessage();
        }
    }

    // Bei Fehlern: User-Eingaben zurück in $product mappen (zum Anzeigen)
    $product = array_merge($product, $data);
}

AdminView::render('produkt-edit', compact('product', 'images', 'errors'),
    $product['id'] ? 'Produkt bearbeiten: ' . $product['name'] : 'Neues Produkt');
