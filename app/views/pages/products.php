<?php /** @var array $products; @var array $materials */ ?>

<section class="bg-brand-900 text-white py-12 md:py-16">
  <div class="container-x">
    <nav class="text-sm text-brand-200 mb-4" aria-label="Brotkrumen">
      <ol class="flex gap-2"><li><a href="/" class="no-underline hover:text-white">Start</a></li><li aria-hidden="true">/</li><li aria-current="page">Produkte</li></ol>
    </nav>
    <h1 class="text-white">Plattformwagen — alle Modelle</h1>
    <p class="mt-3 text-brand-100 max-w-2xl">Filtern Sie nach Material oder vergleichen Sie alle 7 Modelle auf einen Blick. Alle Wagen mit geräuscharmen Rädern und mindestens 12-monatiger Gewährleistung.</p>
  </div>
</section>

<section class="py-10 md:py-14">
  <div class="container-x">

    <!-- Filter -->
    <div class="mb-8 flex flex-wrap gap-2" role="group" aria-label="Nach Material filtern">
      <button type="button" data-filter="all" aria-pressed="true" class="rounded-full px-4 py-2 text-sm font-medium bg-brand-700 text-white ring-1 ring-brand-200">Alle</button>
      <?php foreach ($materials as $m): ?>
        <button type="button" data-filter="<?= ea($m) ?>" aria-pressed="false" class="rounded-full px-4 py-2 text-sm font-medium bg-white text-brand-700 ring-1 ring-brand-200 hover:bg-brand-50"><?= e($m) ?></button>
      <?php endforeach; ?>
    </div>

    <?php if (empty($products)): ?>
      <div class="rounded-lg bg-amber-50 ring-1 ring-amber-200 p-6 text-amber-900">Keine Produkte gefunden.</div>
    <?php else: ?>
      <div class="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
        <?php foreach ($products as $p): ?>
          <article class="card overflow-hidden group" data-product data-material="<?= ea($p['material'] ?? '') ?>">
            <a href="/produkt/<?= ea($p['slug']) ?>" class="block no-underline">
              <div class="aspect-square bg-white">
                <?= picture('products/' . $p['slug'] . '/main-01', 'Plattformwagen ' . $p['name'], ['class' => 'h-full w-full object-contain p-4 group-hover:scale-105 transition-transform duration-300']) ?>
              </div>
              <div class="p-5 border-t border-slate-100">
                <div class="flex items-start justify-between gap-2">
                  <h2 class="text-base font-semibold text-brand-900"><?= e($p['name']) ?></h2>
                  <span class="badge shrink-0"><?= e($p['art_nr']) ?></span>
                </div>
                <p class="mt-1 text-sm text-slate-600 line-clamp-2"><?= e($p['subtitle'] ?? '') ?></p>
                <dl class="mt-4 grid grid-cols-2 gap-2 text-xs">
                  <?php if (!empty($p['capacity_kg'])): ?>
                    <div><dt class="text-slate-500">Tragkraft</dt><dd class="font-semibold text-brand-900"><?= (int)$p['capacity_kg'] ?> kg</dd></div>
                  <?php endif; ?>
                  <?php if (!empty($p['material'])): ?>
                    <div><dt class="text-slate-500">Material</dt><dd class="font-semibold text-brand-900"><?= e($p['material']) ?></dd></div>
                  <?php endif; ?>
                  <?php if (!empty($p['platform_w_cm']) && !empty($p['platform_h_cm'])): ?>
                    <div><dt class="text-slate-500">Plattform</dt><dd class="font-semibold text-brand-900"><?= rtrim(rtrim(number_format((float)$p['platform_w_cm'],1,',','.'),'0'),',') ?>×<?= rtrim(rtrim(number_format((float)$p['platform_h_cm'],1,',','.'),'0'),',') ?> cm</dd></div>
                  <?php endif; ?>
                  <?php if (!empty($p['wheel_inch'])): ?>
                    <div><dt class="text-slate-500">Räder</dt><dd class="font-semibold text-brand-900"><?= e($p['wheel_inch']) ?></dd></div>
                  <?php endif; ?>
                </dl>
                <span class="mt-4 inline-flex items-center text-sm font-medium text-brand-700 group-hover:text-accent-600">Details ansehen →</span>
              </div>
            </a>
          </article>
        <?php endforeach; ?>
      </div>
    <?php endif; ?>
  </div>
</section>
