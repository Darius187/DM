<?php
/** @var array $product; @var array $images; @var array $errors */
$features = [];
if (!empty($product['features_json'])) {
    $arr = json_decode((string)$product['features_json'], true);
    if (is_array($arr)) $features = $arr;
}
$isNew = (int)$product['id'] === 0;
?>
<nav class="text-sm text-slate-500 mb-4" aria-label="Brotkrumen">
  <ol class="flex gap-2"><li><a href="/admin/dashboard.php" class="hover:text-brand-700">Admin</a></li><li>/</li><li><a href="/admin/produkte.php" class="hover:text-brand-700">Produkte</a></li><li>/</li><li aria-current="page"><?= $isNew ? 'Neu' : e($product['art_nr']) ?></li></ol>
</nav>

<h1 class="text-2xl"><?= $isNew ? 'Neues Produkt' : 'Produkt bearbeiten: ' . e($product['name']) ?></h1>

<?php if (!empty($errors['_global'])): ?>
  <div role="alert" class="mt-4 rounded-md bg-red-50 ring-1 ring-red-300 p-3 text-red-900 text-sm"><?= e($errors['_global']) ?></div>
<?php endif; ?>

<form method="post" action="/admin/produkt-edit.php<?= $isNew ? '' : '?id=' . (int)$product['id'] ?>" class="mt-6 grid lg:grid-cols-3 gap-6">
  <?= Csrf::field() ?>

  <!-- Hauptdaten -->
  <div class="lg:col-span-2 space-y-6">
    <div class="card p-5 space-y-4">
      <h2 class="text-base font-semibold text-brand-900">Grunddaten</h2>
      <div class="grid sm:grid-cols-2 gap-4">
        <label class="block"><span class="text-sm font-medium text-slate-700">Slug (URL) *</span>
          <input type="text" name="slug" required maxlength="64" value="<?= ea($product['slug']) ?>"
                 pattern="[A-Za-z0-9_-]{1,64}"
                 class="mt-1 block w-full rounded-md border-slate-300 focus:border-brand-500 focus:ring-brand-500 <?= isset($errors['slug']) ? 'ring-1 ring-red-400' : '' ?>">
          <?php if (!empty($errors['slug'])): ?><span class="text-xs text-red-700"><?= e($errors['slug']) ?></span><?php endif; ?>
        </label>
        <label class="block"><span class="text-sm font-medium text-slate-700">Artikelnummer *</span>
          <input type="text" name="art_nr" required maxlength="64" value="<?= ea($product['art_nr']) ?>"
                 class="mt-1 block w-full rounded-md border-slate-300 focus:border-brand-500 focus:ring-brand-500 <?= isset($errors['art_nr']) ? 'ring-1 ring-red-400' : '' ?>">
          <?php if (!empty($errors['art_nr'])): ?><span class="text-xs text-red-700"><?= e($errors['art_nr']) ?></span><?php endif; ?>
        </label>
      </div>
      <label class="block"><span class="text-sm font-medium text-slate-700">Name *</span>
        <input type="text" name="name" required maxlength="255" value="<?= ea($product['name']) ?>"
               class="mt-1 block w-full rounded-md border-slate-300 focus:border-brand-500 focus:ring-brand-500 <?= isset($errors['name']) ? 'ring-1 ring-red-400' : '' ?>">
        <?php if (!empty($errors['name'])): ?><span class="text-xs text-red-700"><?= e($errors['name']) ?></span><?php endif; ?>
      </label>
      <label class="block"><span class="text-sm font-medium text-slate-700">Untertitel</span>
        <input type="text" name="subtitle" maxlength="255" value="<?= ea($product['subtitle'] ?? '') ?>"
               class="mt-1 block w-full rounded-md border-slate-300 focus:border-brand-500 focus:ring-brand-500">
      </label>
      <label class="block"><span class="text-sm font-medium text-slate-700">Kurzbeschreibung</span>
        <textarea name="short_desc" rows="3" class="mt-1 block w-full rounded-md border-slate-300 focus:border-brand-500 focus:ring-brand-500"><?= e($product['short_desc'] ?? '') ?></textarea>
      </label>
      <label class="block"><span class="text-sm font-medium text-slate-700">Lange Beschreibung (HTML erlaubt)</span>
        <textarea name="long_desc" rows="6" class="mt-1 block w-full rounded-md border-slate-300 focus:border-brand-500 focus:ring-brand-500 font-mono text-sm"><?= e($product['long_desc'] ?? '') ?></textarea>
      </label>
      <label class="block"><span class="text-sm font-medium text-slate-700">Features (eine pro Zeile)</span>
        <textarea name="features" rows="6" class="mt-1 block w-full rounded-md border-slate-300 focus:border-brand-500 focus:ring-brand-500"
                  placeholder="Klappbarer Griff für platzsparende Lagerung&#10;Geräuscharme 5″-Räder&#10;..."><?= e(implode("\n", $features)) ?></textarea>
      </label>
    </div>

    <div class="card p-5 space-y-4">
      <h2 class="text-base font-semibold text-brand-900">Technische Daten</h2>
      <div class="grid sm:grid-cols-3 gap-4">
        <label class="block"><span class="text-sm font-medium text-slate-700">Material</span>
          <input type="text" name="material" maxlength="64" value="<?= ea($product['material'] ?? '') ?>" class="mt-1 block w-full rounded-md border-slate-300 focus:border-brand-500 focus:ring-brand-500">
        </label>
        <label class="block"><span class="text-sm font-medium text-slate-700">Farbe</span>
          <input type="text" name="color" maxlength="64" value="<?= ea($product['color'] ?? '') ?>" class="mt-1 block w-full rounded-md border-slate-300 focus:border-brand-500 focus:ring-brand-500">
        </label>
        <label class="block"><span class="text-sm font-medium text-slate-700">Räder (Zoll)</span>
          <input type="text" name="wheel_inch" maxlength="16" value="<?= ea($product['wheel_inch'] ?? '') ?>" placeholder='5"' class="mt-1 block w-full rounded-md border-slate-300 focus:border-brand-500 focus:ring-brand-500">
        </label>
        <label class="block"><span class="text-sm font-medium text-slate-700">Plattform Breite (cm)</span>
          <input type="number" step="0.1" min="0" name="platform_w_cm" value="<?= ea((string)($product['platform_w_cm'] ?? '')) ?>" class="mt-1 block w-full rounded-md border-slate-300 focus:border-brand-500 focus:ring-brand-500">
        </label>
        <label class="block"><span class="text-sm font-medium text-slate-700">Plattform Tiefe (cm)</span>
          <input type="number" step="0.1" min="0" name="platform_h_cm" value="<?= ea((string)($product['platform_h_cm'] ?? '')) ?>" class="mt-1 block w-full rounded-md border-slate-300 focus:border-brand-500 focus:ring-brand-500">
        </label>
        <label class="block"><span class="text-sm font-medium text-slate-700">Griffhöhe (cm)</span>
          <input type="number" step="0.1" min="0" name="handle_h_cm" value="<?= ea((string)($product['handle_h_cm'] ?? '')) ?>" class="mt-1 block w-full rounded-md border-slate-300 focus:border-brand-500 focus:ring-brand-500">
        </label>
        <label class="block"><span class="text-sm font-medium text-slate-700">Tragkraft (kg)</span>
          <input type="number" min="0" max="9999" name="capacity_kg" value="<?= ea((string)($product['capacity_kg'] ?? '')) ?>" class="mt-1 block w-full rounded-md border-slate-300 focus:border-brand-500 focus:ring-brand-500">
        </label>
        <label class="block"><span class="text-sm font-medium text-slate-700">Eigengewicht (kg)</span>
          <input type="number" step="0.01" min="0" name="weight_kg" value="<?= ea((string)($product['weight_kg'] ?? '')) ?>" class="mt-1 block w-full rounded-md border-slate-300 focus:border-brand-500 focus:ring-brand-500">
        </label>
        <label class="block"><span class="text-sm font-medium text-slate-700">Kategorie</span>
          <select name="category" class="mt-1 block w-full rounded-md border-slate-300 focus:border-brand-500 focus:ring-brand-500">
            <option value="plattformwagen" <?= $product['category'] === 'plattformwagen' ? 'selected' : '' ?>>Plattformwagen</option>
            <option value="zubehoer"       <?= $product['category'] === 'zubehoer'       ? 'selected' : '' ?>>Zubehör</option>
          </select>
        </label>
      </div>
    </div>

    <div class="card p-5 space-y-4">
      <h2 class="text-base font-semibold text-brand-900">SEO</h2>
      <label class="block"><span class="text-sm font-medium text-slate-700">Meta-Titel</span>
        <input type="text" name="meta_title" maxlength="255" value="<?= ea($product['meta_title'] ?? '') ?>" class="mt-1 block w-full rounded-md border-slate-300 focus:border-brand-500 focus:ring-brand-500">
      </label>
      <label class="block"><span class="text-sm font-medium text-slate-700">Meta-Description</span>
        <textarea name="meta_description" rows="3" maxlength="500" class="mt-1 block w-full rounded-md border-slate-300 focus:border-brand-500 focus:ring-brand-500"><?= e($product['meta_description'] ?? '') ?></textarea>
      </label>
    </div>
  </div>

  <!-- Sidebar -->
  <div class="space-y-6">
    <div class="card p-5 space-y-3">
      <h2 class="text-base font-semibold text-brand-900">Status</h2>
      <label class="flex items-center gap-2"><input type="checkbox" name="is_active" <?= $product['is_active'] ? 'checked' : '' ?> class="h-4 w-4 rounded border-slate-300 text-brand-700"> Aktiv (auf Website sichtbar)</label>
      <label class="flex items-center gap-2"><input type="checkbox" name="is_featured" <?= $product['is_featured'] ? 'checked' : '' ?> class="h-4 w-4 rounded border-slate-300 text-brand-700"> Featured (Startseite)</label>
      <label class="block"><span class="text-sm font-medium text-slate-700">Sortierung</span>
        <input type="number" name="sort_order" value="<?= (int)$product['sort_order'] ?>" class="mt-1 block w-full rounded-md border-slate-300 focus:border-brand-500 focus:ring-brand-500">
      </label>
      <div class="pt-3 border-t border-slate-200">
        <button type="submit" class="btn-primary w-full">Speichern</button>
        <a href="/admin/produkte.php" class="block mt-2 text-center text-sm text-slate-500 hover:text-brand-700">Abbrechen</a>
      </div>
    </div>

    <!-- Bilder -->
    <?php if (!$isNew): ?>
    <div class="card p-5">
      <h2 class="text-base font-semibold text-brand-900">Bilder</h2>
      <?php if (empty($images)): ?>
        <p class="mt-2 text-sm text-slate-500">Noch keine Bilder.</p>
      <?php else: ?>
        <ul class="mt-3 space-y-2">
          <?php foreach ($images as $im): ?>
            <li class="flex items-center gap-3 rounded border border-slate-200 p-2">
              <img src="/images/<?= ea($im['directory'] . '/' . $im['filename_base']) ?>-thumb.jpg" alt="" class="h-12 w-12 object-contain rounded">
              <div class="flex-1 min-w-0">
                <div class="text-sm font-medium text-brand-900 truncate"><?= e($im['filename_base']) ?></div>
                <div class="text-xs text-slate-500"><?= e($im['role']) ?> · #<?= (int)$im['sort_order'] ?></div>
              </div>
              <form method="post" action="/admin/bild-loeschen.php" class="inline" onsubmit="return confirm('Bild wirklich löschen?');">
                <?= Csrf::field() ?>
                <input type="hidden" name="id" value="<?= (int)$im['id'] ?>">
                <input type="hidden" name="product_id" value="<?= (int)$product['id'] ?>">
                <button type="submit" class="text-xs text-red-700 hover:text-red-900" title="Löschen">✕</button>
              </form>
            </li>
          <?php endforeach; ?>
        </ul>
      <?php endif; ?>
    </div>

    <div class="card p-5">
      <h2 class="text-base font-semibold text-brand-900">Bild hochladen</h2>
      <form method="post" action="/admin/bild-upload.php" enctype="multipart/form-data" class="mt-3 space-y-3">
        <?= Csrf::field() ?>
        <input type="hidden" name="product_id" value="<?= (int)$product['id'] ?>">
        <label class="block"><span class="text-sm font-medium text-slate-700">Datei (JPG/PNG/WebP, max. 12 MB)</span>
          <input type="file" name="image" required accept="image/jpeg,image/png,image/webp" class="mt-1 block w-full text-sm">
        </label>
        <label class="block"><span class="text-sm font-medium text-slate-700">Rolle</span>
          <select name="role" class="mt-1 block w-full rounded-md border-slate-300 focus:border-brand-500 focus:ring-brand-500">
            <option value="main">Hauptbild</option>
            <option value="gallery" selected>Galerie</option>
            <option value="application">Anwendung</option>
          </select>
        </label>
        <label class="block"><span class="text-sm font-medium text-slate-700">Alt-Text (Pflicht für Barrierefreiheit)</span>
          <input type="text" name="alt_text" required maxlength="500" class="mt-1 block w-full rounded-md border-slate-300 focus:border-brand-500 focus:ring-brand-500">
        </label>
        <button type="submit" class="btn-primary w-full">Hochladen</button>
      </form>
    </div>
    <?php endif; ?>
  </div>
</form>
