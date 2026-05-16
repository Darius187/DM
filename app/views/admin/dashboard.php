<?php /** @var int $productCount; @var array $inquiryStats; @var array $latest */ ?>
<h1 class="text-2xl">Dashboard</h1>
<p class="mt-1 text-slate-600">Übersicht über Inhalte und neue Anfragen.</p>

<div class="mt-6 grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
  <div class="card p-5">
    <p class="text-sm text-slate-500">Produkte</p>
    <p class="mt-1 text-3xl font-semibold text-brand-900"><?= (int)$productCount ?></p>
    <a href="/admin/produkte.php" class="mt-2 inline-block text-sm text-brand-700 hover:text-accent-600">Verwalten →</a>
  </div>
  <div class="card p-5">
    <p class="text-sm text-slate-500">Neue Anfragen</p>
    <p class="mt-1 text-3xl font-semibold text-accent-600"><?= (int)$inquiryStats['new'] ?></p>
    <a href="/admin/anfragen.php?status=new" class="mt-2 inline-block text-sm text-brand-700 hover:text-accent-600">Ansehen →</a>
  </div>
  <div class="card p-5">
    <p class="text-sm text-slate-500">Gelesen</p>
    <p class="mt-1 text-3xl font-semibold text-brand-900"><?= (int)$inquiryStats['read'] ?></p>
  </div>
  <div class="card p-5">
    <p class="text-sm text-slate-500">Beantwortet</p>
    <p class="mt-1 text-3xl font-semibold text-green-700"><?= (int)$inquiryStats['responded'] ?></p>
  </div>
</div>

<section class="mt-10">
  <h2 class="text-lg font-semibold text-brand-900">Letzte Anfragen</h2>
  <div class="mt-3 card overflow-hidden">
    <?php if (empty($latest)): ?>
      <p class="p-6 text-sm text-slate-500">Noch keine Anfragen.</p>
    <?php else: ?>
      <table class="min-w-full text-sm">
        <thead class="bg-slate-50 text-slate-600">
          <tr>
            <th class="px-4 py-2 text-left font-medium">Datum</th>
            <th class="px-4 py-2 text-left font-medium">Typ</th>
            <th class="px-4 py-2 text-left font-medium">Firma / Name</th>
            <th class="px-4 py-2 text-left font-medium">Status</th>
            <th class="px-4 py-2 text-right font-medium"></th>
          </tr>
        </thead>
        <tbody class="divide-y divide-slate-100">
          <?php foreach ($latest as $i): ?>
            <tr class="hover:bg-slate-50">
              <td class="px-4 py-2"><?= e(date('d.m.Y H:i', strtotime((string)$i['created_at']))) ?></td>
              <td class="px-4 py-2"><span class="badge"><?= e($i['type']) ?></span></td>
              <td class="px-4 py-2">
                <?php if (!empty($i['company'])): ?><span class="font-medium text-brand-900"><?= e($i['company']) ?></span> · <?php endif; ?>
                <?= e($i['name']) ?>
              </td>
              <td class="px-4 py-2"><?= e($i['status']) ?></td>
              <td class="px-4 py-2 text-right"><a href="/admin/anfrage.php?id=<?= (int)$i['id'] ?>" class="text-brand-700 hover:text-accent-600">Details →</a></td>
            </tr>
          <?php endforeach; ?>
        </tbody>
      </table>
    <?php endif; ?>
  </div>
</section>

<section class="mt-10 grid md:grid-cols-2 gap-6">
  <div class="card p-5">
    <h3 class="text-base font-semibold text-brand-900">Schnellaktionen</h3>
    <div class="mt-3 flex flex-wrap gap-2">
      <a href="/admin/produkt-edit.php" class="btn-primary">+ Neues Produkt</a>
      <a href="/admin/produkte.php"     class="btn-ghost">Produkte bearbeiten</a>
      <a href="/admin/anfragen.php"     class="btn-ghost">Alle Anfragen</a>
    </div>
  </div>
  <div class="card p-5">
    <h3 class="text-base font-semibold text-brand-900">Hinweise</h3>
    <ul class="mt-3 text-sm text-slate-600 list-disc list-inside space-y-1">
      <li>Bilder werden beim Upload automatisch zu WebP+JPG in 400/800/1600 px konvertiert.</li>
      <li>Anfrage-E-Mails gehen an <strong><?= e($GLOBALS['config']['mail']['to_addr']) ?></strong>.</li>
      <li>Passwort regelmäßig ändern: <code>php tools/create_admin.php</code> oder via Datenbank.</li>
    </ul>
  </div>
</section>
