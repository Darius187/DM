<?php /** @var array $inquiries; @var array $stats; @var ?string $status */ ?>
<h1 class="text-2xl">Anfragen</h1>
<p class="mt-1 text-slate-600">B2B-Stückzahlanfragen und Kontaktnachrichten.</p>

<div class="mt-4 flex flex-wrap gap-2" role="group" aria-label="Filter nach Status">
  <a href="/admin/anfragen.php"                       class="rounded-full px-4 py-1.5 text-sm <?= !$status         ? 'bg-brand-700 text-white' : 'bg-white ring-1 ring-brand-200 text-brand-700 hover:bg-brand-50' ?>">Alle</a>
  <a href="/admin/anfragen.php?status=new"            class="rounded-full px-4 py-1.5 text-sm <?= $status==='new'  ? 'bg-brand-700 text-white' : 'bg-white ring-1 ring-brand-200 text-brand-700 hover:bg-brand-50' ?>">Neu (<?= (int)$stats['new'] ?>)</a>
  <a href="/admin/anfragen.php?status=read"           class="rounded-full px-4 py-1.5 text-sm <?= $status==='read' ? 'bg-brand-700 text-white' : 'bg-white ring-1 ring-brand-200 text-brand-700 hover:bg-brand-50' ?>">Gelesen (<?= (int)$stats['read'] ?>)</a>
  <a href="/admin/anfragen.php?status=responded"      class="rounded-full px-4 py-1.5 text-sm <?= $status==='responded' ? 'bg-brand-700 text-white' : 'bg-white ring-1 ring-brand-200 text-brand-700 hover:bg-brand-50' ?>">Beantwortet (<?= (int)$stats['responded'] ?>)</a>
  <a href="/admin/anfragen.php?status=archived"       class="rounded-full px-4 py-1.5 text-sm <?= $status==='archived' ? 'bg-brand-700 text-white' : 'bg-white ring-1 ring-brand-200 text-brand-700 hover:bg-brand-50' ?>">Archiv (<?= (int)$stats['archived'] ?>)</a>
</div>

<div class="mt-6 card overflow-hidden">
  <?php if (empty($inquiries)): ?>
    <p class="p-6 text-sm text-slate-500">Keine Anfragen <?= $status ? 'in dieser Kategorie' : '' ?>.</p>
  <?php else: ?>
    <table class="min-w-full text-sm">
      <thead class="bg-slate-50 text-slate-600">
        <tr>
          <th class="px-4 py-2 text-left font-medium">Datum</th>
          <th class="px-4 py-2 text-left font-medium">Typ</th>
          <th class="px-4 py-2 text-left font-medium">Firma / Name</th>
          <th class="px-4 py-2 text-left font-medium">E-Mail</th>
          <th class="px-4 py-2 text-right font-medium">Stk.</th>
          <th class="px-4 py-2 text-left font-medium">Status</th>
          <th class="px-4 py-2 text-right font-medium"></th>
        </tr>
      </thead>
      <tbody class="divide-y divide-slate-100">
        <?php foreach ($inquiries as $i):
            $items = Inquiry::items($i);
            $total = array_sum(array_column($items, 'qty')); ?>
          <tr class="hover:bg-slate-50 <?= $i['status'] === 'new' ? 'font-medium' : '' ?>">
            <td class="px-4 py-2 whitespace-nowrap"><?= e(date('d.m.Y H:i', strtotime((string)$i['created_at']))) ?></td>
            <td class="px-4 py-2"><span class="badge"><?= e($i['type']) ?></span></td>
            <td class="px-4 py-2">
              <?php if (!empty($i['company'])): ?><span class="text-brand-900"><?= e($i['company']) ?></span> · <?php endif; ?>
              <span class="text-slate-700"><?= e($i['name']) ?></span>
            </td>
            <td class="px-4 py-2"><a href="mailto:<?= ea($i['email']) ?>" class="text-brand-700 hover:text-accent-600 no-underline"><?= e($i['email']) ?></a></td>
            <td class="px-4 py-2 text-right"><?= $total ? (int)$total : '-' ?></td>
            <td class="px-4 py-2">
              <span class="inline-block rounded-full px-2 py-0.5 text-xs <?= match ($i['status']) {
                'new'       => 'bg-accent-50 text-accent-700 ring-1 ring-accent-200',
                'read'      => 'bg-slate-100 text-slate-700',
                'responded' => 'bg-green-50 text-green-700 ring-1 ring-green-200',
                'archived'  => 'bg-slate-100 text-slate-500',
                default     => 'bg-slate-100 text-slate-700',
              } ?>"><?= e($i['status']) ?></span>
            </td>
            <td class="px-4 py-2 text-right"><a href="/admin/anfrage.php?id=<?= (int)$i['id'] ?>" class="text-brand-700 hover:text-accent-600">Details →</a></td>
          </tr>
        <?php endforeach; ?>
      </tbody>
    </table>
  <?php endif; ?>
</div>
