<?php
/** @var array $product; @var array $images */
$features = Product::features($product);
$main = null;
foreach ($images as $im) { if ($im['role'] === 'main') { $main = $im; break; } }
if (!$main && !empty($images)) $main = $images[0];
?>

<section class="py-10 md:py-14">
  <div class="container-x">

    <nav class="text-sm text-slate-500 mb-6" aria-label="Brotkrumen">
      <ol class="flex gap-2"><li><a href="/" class="hover:text-brand-700 no-underline">Start</a></li><li aria-hidden="true">/</li><li><a href="/produkte" class="hover:text-brand-700 no-underline">Produkte</a></li><li aria-hidden="true">/</li><li aria-current="page"><?= e($product['art_nr']) ?></li></ol>
    </nav>

    <div class="grid lg:grid-cols-2 gap-10 lg:gap-16">

      <!-- Bilder + Galerie -->
      <div>
        <div class="card overflow-hidden bg-white" data-gallery-main>
          <div class="aspect-square">
            <?php if ($main): ?>
              <?= picture($main['directory'] . '/' . $main['filename_base'], $main['alt_text'], ['class' => 'h-full w-full object-contain p-6', 'lazy' => false]) ?>
            <?php else: ?>
              <div class="h-full w-full grid place-items-center text-slate-400 text-sm">Bild folgt</div>
            <?php endif; ?>
          </div>
        </div>

        <?php if (count($images) > 1): ?>
          <ul class="mt-4 grid grid-cols-4 gap-3">
            <?php foreach ($images as $i => $im):
                  $base = $im['directory'] . '/' . $im['filename_base'];
                  $isCurrent = ($main && $im['id'] === $main['id']);
            ?>
              <li>
                <button type="button" class="card aspect-square w-full overflow-hidden hover:ring-brand-500 transition"
                        aria-current="<?= $isCurrent ? 'true' : 'false' ?>"
                        data-gallery-thumb
                        data-full="/images/<?= ea($base) ?>-800.jpg"
                        data-fullset="/images/<?= ea($base) ?>-800.webp 800w, /images/<?= ea($base) ?>-1600.webp 1600w">
                  <img src="/images/<?= ea($base) ?>-thumb.jpg" alt="<?= ea($im['alt_text']) ?>" class="h-full w-full object-contain p-2" loading="lazy">
                </button>
              </li>
            <?php endforeach; ?>
          </ul>
        <?php endif; ?>
      </div>

      <!-- Inhalt -->
      <div>
        <span class="badge"><?= e($product['art_nr']) ?></span>
        <h1 class="mt-3"><?= e($product['name']) ?></h1>
        <?php if (!empty($product['subtitle'])): ?>
          <p class="mt-2 text-lg text-slate-600"><?= e($product['subtitle']) ?></p>
        <?php endif; ?>

        <?php if (!empty($product['short_desc'])): ?>
          <p class="mt-6 text-slate-700 leading-relaxed"><?= e($product['short_desc']) ?></p>
        <?php endif; ?>

        <?php if (!empty($features)): ?>
          <ul class="mt-6 space-y-2">
            <?php foreach ($features as $f): ?>
              <li class="flex items-start gap-3">
                <svg class="mt-1 h-5 w-5 text-accent-500 shrink-0" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true"><path d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"/></svg>
                <span class="text-slate-700"><?= e($f) ?></span>
              </li>
            <?php endforeach; ?>
          </ul>
        <?php endif; ?>

        <!-- Technische Daten -->
        <div class="mt-8 card p-5">
          <h2 class="text-base font-semibold text-brand-900">Technische Daten</h2>
          <dl class="mt-4 grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
            <?php
            $rows = [
              ['Artikelnummer', $product['art_nr'] ?? null],
              ['Material',      $product['material'] ?? null],
              ['Farbe',         $product['color'] ?? null],
              ['Plattformmaße', (!empty($product['platform_w_cm']) && !empty($product['platform_h_cm']))
                  ? rtrim(rtrim(number_format((float)$product['platform_w_cm'],1,',','.'),'0'),',') . ' × ' . rtrim(rtrim(number_format((float)$product['platform_h_cm'],1,',','.'),'0'),',') . ' cm'
                  : null],
              ['Griffhöhe',     !empty($product['handle_h_cm']) ? rtrim(rtrim(number_format((float)$product['handle_h_cm'],1,',','.'),'0'),',') . ' cm' : null],
              ['Räder',         $product['wheel_inch'] ?? null],
              ['Tragkraft',     !empty($product['capacity_kg']) ? ((int)$product['capacity_kg']) . ' kg' : null],
              ['Eigengewicht',  !empty($product['weight_kg']) ? number_format((float)$product['weight_kg'],2,',','.') . ' kg' : null],
            ];
            foreach ($rows as [$k, $v]): if (empty($v)) continue; ?>
              <div><dt class="text-slate-500"><?= e($k) ?></dt><dd class="font-medium text-brand-900"><?= e((string)$v) ?></dd></div>
            <?php endforeach; ?>
          </dl>
        </div>

        <div class="mt-8 flex flex-col sm:flex-row gap-3">
          <a href="/anfrage?slug=<?= ea($product['slug']) ?>" class="btn-primary flex-1">Stückzahl anfragen</a>
          <a href="/kontakt" class="btn-ghost flex-1">Frage stellen</a>
        </div>

        <p class="mt-6 text-xs text-slate-500">B2B-Preis auf Anfrage. Versand aus Villingen-Schwenningen, kurze Lieferzeiten in der EU.</p>
      </div>

    </div>

    <?php if (!empty($product['long_desc'])): ?>
      <div class="prose prose-slate max-w-none mt-16">
        <?= $product['long_desc'] ?>
      </div>
    <?php endif; ?>
  </div>
</section>
