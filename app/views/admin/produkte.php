<?php /** @var array $products */ ?>
<div class="flex items-center justify-between flex-wrap gap-3">
  <div>
    <h1 class="text-2xl">Produkte</h1>
    <p class="mt-1 text-slate-600">Alle Plattformwagen verwalten.</p>
  </div>
  <a href="/admin/produkt-edit.php" class="btn-primary">+ Neues Produkt</a>
</div>

<div class="mt-6 card overflow-hidden">
  <?php if (empty($products)): ?>
    <p class="p-6 text-sm text-slate-500">Noch keine Produkte angelegt.</p>
  <?php else: ?>
    <table class="min-w-full text-sm">
      <thead class="bg-slate-50 text-slate-600">
        <tr>
          <th class="px-4 py-2 text-left font-medium">Sort.</th>
          <th class="px-4 py-2 text-left font-medium">Art.Nr</th>
          <th class="px-4 py-2 text-left font-medium">Name</th>
          <th class="px-4 py-2 text-left font-medium">Material</th>
          <th class="px-4 py-2 text-right font-medium">Tragkraft</th>
          <th class="px-4 py-2 text-center font-medium">Aktiv</th>
          <th class="px-4 py-2 text-center font-medium">Featured</th>
          <th class="px-4 py-2 text-right font-medium"></th>
        </tr>
      </thead>
      <tbody class="divide-y divide-slate-100">
        <?php foreach ($products as $p): ?>
          <tr class="hover:bg-slate-50">
            <td class="px-4 py-2 text-slate-500"><?= (int)$p['sort_order'] ?></td>
            <td class="px-4 py-2"><span class="badge"><?= e($p['art_nr']) ?></span></td>
            <td class="px-4 py-2 font-medium text-brand-900"><?= e($p['name']) ?></td>
            <td class="px-4 py-2"><?= e($p['material'] ?? '') ?></td>
            <td class="px-4 py-2 text-right"><?= !empty($p['capacity_kg']) ? (int)$p['capacity_kg'] . ' kg' : '-' ?></td>
            <td class="px-4 py-2 text-center"><?= $p['is_active'] ? '✓' : '–' ?></td>
            <td class="px-4 py-2 text-center"><?= $p['is_featured'] ? '★' : '' ?></td>
            <td class="px-4 py-2 text-right whitespace-nowrap">
              <a href="/admin/produkt-edit.php?id=<?= (int)$p['id'] ?>" class="text-brand-700 hover:text-accent-600">Bearbeiten</a>
              <span class="text-slate-300 mx-2">|</span>
              <a href="/produkt/<?= ea($p['slug']) ?>" target="_blank" rel="noopener" class="text-slate-500 hover:text-brand-700">Ansicht ↗</a>
            </td>
          </tr>
        <?php endforeach; ?>
      </tbody>
    </table>
  <?php endif; ?>
</div>
