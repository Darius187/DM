<?php /** @var array $inquiry; @var array $items */ ?>
<nav class="text-sm text-slate-500 mb-4" aria-label="Brotkrumen">
  <ol class="flex gap-2"><li><a href="/admin/dashboard.php" class="hover:text-brand-700">Admin</a></li><li>/</li><li><a href="/admin/anfragen.php" class="hover:text-brand-700">Anfragen</a></li><li>/</li><li aria-current="page">#<?= (int)$inquiry['id'] ?></li></ol>
</nav>

<div class="flex items-center justify-between flex-wrap gap-3">
  <div>
    <h1 class="text-2xl">Anfrage #<?= (int)$inquiry['id'] ?></h1>
    <p class="mt-1 text-sm text-slate-500">
      Eingegangen: <?= e(date('d.m.Y H:i:s', strtotime((string)$inquiry['created_at']))) ?> ·
      Typ: <span class="badge"><?= e($inquiry['type']) ?></span>
    </p>
  </div>
  <div class="flex items-center gap-2">
    <form method="post" action="/admin/anfrage.php?id=<?= (int)$inquiry['id'] ?>" class="flex items-center gap-2">
      <?= Csrf::field() ?>
      <input type="hidden" name="id" value="<?= (int)$inquiry['id'] ?>">
      <input type="hidden" name="action" value="status">
      <label class="sr-only" for="set-status">Status setzen</label>
      <select id="set-status" name="status" class="rounded-md border-slate-300 text-sm" onchange="this.form.submit()">
        <option value="new"       <?= $inquiry['status']==='new'      ?'selected':'' ?>>Neu</option>
        <option value="read"      <?= $inquiry['status']==='read'     ?'selected':'' ?>>Gelesen</option>
        <option value="responded" <?= $inquiry['status']==='responded'?'selected':'' ?>>Beantwortet</option>
        <option value="archived"  <?= $inquiry['status']==='archived' ?'selected':'' ?>>Archiviert</option>
      </select>
    </form>
    <form method="post" action="/admin/anfrage.php?id=<?= (int)$inquiry['id'] ?>" onsubmit="return confirm('Anfrage endgültig löschen?');">
      <?= Csrf::field() ?>
      <input type="hidden" name="id" value="<?= (int)$inquiry['id'] ?>">
      <input type="hidden" name="action" value="delete">
      <button class="px-3 py-1.5 rounded bg-red-50 text-red-700 ring-1 ring-red-200 hover:bg-red-100 text-sm">Löschen</button>
    </form>
  </div>
</div>

<div class="mt-6 grid lg:grid-cols-3 gap-6">

  <div class="lg:col-span-2 space-y-6">
    <div class="card p-5">
      <h2 class="text-base font-semibold text-brand-900">Kontaktdaten</h2>
      <dl class="mt-3 grid sm:grid-cols-2 gap-x-6 gap-y-2 text-sm">
        <?php if (!empty($inquiry['company'])): ?>
        <div><dt class="text-slate-500">Firma</dt><dd class="font-medium text-brand-900"><?= e($inquiry['company']) ?></dd></div>
        <?php endif; ?>
        <div><dt class="text-slate-500">Ansprechpartner</dt><dd class="font-medium text-brand-900"><?= e($inquiry['name']) ?></dd></div>
        <div><dt class="text-slate-500">E-Mail</dt><dd><a href="mailto:<?= ea($inquiry['email']) ?>" class="text-brand-700 hover:text-accent-600 no-underline"><?= e($inquiry['email']) ?></a></dd></div>
        <?php if (!empty($inquiry['phone'])): ?>
        <div><dt class="text-slate-500">Telefon</dt><dd><a href="tel:<?= ea($inquiry['phone']) ?>" class="text-brand-700 hover:text-accent-600 no-underline"><?= e($inquiry['phone']) ?></a></dd></div>
        <?php endif; ?>
      </dl>
    </div>

    <?php if (!empty($items)): ?>
    <div class="card p-5">
      <h2 class="text-base font-semibold text-brand-900">Angefragte Produkte</h2>
      <table class="mt-3 min-w-full text-sm">
        <thead class="text-slate-500">
          <tr><th class="text-left py-1">Art.Nr</th><th class="text-left py-1">Name</th><th class="text-right py-1">Stückzahl</th></tr>
        </thead>
        <tbody class="divide-y divide-slate-100">
          <?php $total = 0; foreach ($items as $it): $total += (int)$it['qty']; ?>
            <tr>
              <td class="py-1.5"><span class="badge"><?= e($it['art_nr']) ?></span></td>
              <td class="py-1.5"><?= e($it['name']) ?></td>
              <td class="py-1.5 text-right font-semibold text-brand-900"><?= (int)$it['qty'] ?></td>
            </tr>
          <?php endforeach; ?>
          <tr class="font-semibold border-t-2 border-slate-200"><td class="py-1.5">Gesamt</td><td></td><td class="py-1.5 text-right text-brand-900"><?= (int)$total ?> Stk.</td></tr>
        </tbody>
      </table>
    </div>
    <?php endif; ?>

    <?php if (!empty($inquiry['message'])): ?>
    <div class="card p-5">
      <h2 class="text-base font-semibold text-brand-900">Nachricht</h2>
      <p class="mt-3 whitespace-pre-wrap text-slate-700"><?= e($inquiry['message']) ?></p>
    </div>
    <?php endif; ?>
  </div>

  <div class="space-y-6">
    <div class="card p-5">
      <h2 class="text-base font-semibold text-brand-900">Schnellantwort</h2>
      <a href="mailto:<?= ea($inquiry['email']) ?>?subject=<?= ea(rawurlencode('AW: Ihre Anfrage bei uni-silent (#' . $inquiry['id'] . ')')) ?>"
         class="btn-primary w-full mt-3">E-Mail antworten ✉</a>
      <?php if (!empty($inquiry['phone'])): ?>
        <a href="tel:<?= ea($inquiry['phone']) ?>" class="btn-ghost w-full mt-2">Anrufen ☎</a>
      <?php endif; ?>
    </div>

    <div class="card p-5">
      <h2 class="text-base font-semibold text-brand-900">Metadaten</h2>
      <dl class="mt-3 text-xs space-y-1 text-slate-600">
        <div><dt class="inline text-slate-500">User-Agent:</dt><dd class="inline break-all"><?= e($inquiry['user_agent'] ?? '-') ?></dd></div>
        <div><dt class="inline text-slate-500">IP-Hash:</dt><dd class="inline font-mono break-all"><?= e(substr((string)($inquiry['ip_hash'] ?? ''), 0, 16)) ?>…</dd></div>
        <div><dt class="inline text-slate-500">Geändert:</dt><dd class="inline"><?= e(date('d.m.Y H:i', strtotime((string)$inquiry['updated_at']))) ?></dd></div>
      </dl>
    </div>
  </div>

</div>
