<?php /** @var array $featured */ ?>

<!-- HERO -->
<section class="relative bg-gradient-to-br from-brand-900 via-brand-800 to-brand-700 text-white overflow-hidden">
  <div class="container-x py-16 md:py-24 lg:py-28 grid md:grid-cols-2 gap-12 items-center">
    <div class="animate-fade-in-up">
      <span class="badge bg-white/10 text-white ring-white/20">Premiumqualität · Made for Industrie</span>
      <h1 class="mt-4 text-white">Plattformwagen,<br>die <span class="text-accent-200">leise arbeiten.</span></h1>
      <p class="mt-6 text-lg md:text-xl text-brand-100 max-w-xl leading-relaxed">
        Robust für 150-300 kg Tragkraft. Geräuscharm dank Doppelkugellager-Rädern.
        Korrosionsfrei in PP, Stahl oder Edelstahl. Für Logistik, Produktion,
        Krankenhäuser und Reinraum-Anwendungen.
      </p>
      <div class="mt-8 flex flex-col sm:flex-row gap-3">
        <a href="/produkte" class="btn-primary">Produkte ansehen</a>
        <a href="/anfrage"  class="btn-ghost bg-white/10 text-white ring-white/30 hover:bg-white/20">Stückzahl anfragen</a>
      </div>
      <ul class="mt-10 grid grid-cols-3 gap-6 text-center max-w-md">
        <li><div class="text-3xl font-bold text-white">300<span class="text-accent-200">kg</span></div><div class="text-xs text-brand-200 uppercase tracking-wider">max. Tragkraft</div></li>
        <li><div class="text-3xl font-bold text-white">5<span class="text-accent-200">″</span></div><div class="text-xs text-brand-200 uppercase tracking-wider">leise Räder</div></li>
        <li><div class="text-3xl font-bold text-white">7</div><div class="text-xs text-brand-200 uppercase tracking-wider">Modelle</div></li>
      </ul>
    </div>
    <!-- Produktfoto als schwebende weisse Karte: kein "Loch" mehr im blauen Bereich -->
    <div class="relative hidden md:block">
      <div class="absolute -inset-4 bg-white/5 blur-2xl rounded-full" aria-hidden="true"></div>
      <div class="relative bg-white rounded-2xl ring-1 ring-white/20 shadow-2xl p-6 lg:p-8">
        <picture>
          <source type="image/webp" srcset="/images/products/PLA300-DX/main-01-800.webp 800w, /images/products/PLA300-DX/main-01-1600.webp 1600w" sizes="(min-width:1024px) 40vw, 80vw">
          <img src="/images/products/PLA300-DX/main-01-800.jpg"
               alt="Plattformwagen PLA300-DX in blau, aufgestellt mit klappbarem Griff"
               class="mx-auto w-full h-auto" loading="eager" fetchpriority="high" width="800" height="800">
        </picture>
      </div>
    </div>
  </div>
</section>

<!-- USPs (dunkelblau, schliesst optisch direkt an den Hero an) -->
<section class="py-16 md:py-20 bg-brand-900 text-white">
  <div class="container-x">
    <div class="grid md:grid-cols-3 gap-8">
      <div class="text-center md:text-left">
        <div class="inline-flex h-12 w-12 items-center justify-center rounded-lg bg-white/10 text-white ring-1 ring-white/20" aria-hidden="true">
          <svg class="h-6 w-6" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M19 11a7 7 0 11-14 0M12 4v3m0 14v-3m8-8h-3M7 12H4"/></svg>
        </div>
        <h3 class="mt-4 text-white">Geräuscharm</h3>
        <p class="mt-2 text-brand-200">Naturkautschuk-Räder mit Doppelkugellager - ideal für Bibliotheken, Kliniken und Nachtschichten.</p>
      </div>
      <div class="text-center md:text-left">
        <div class="inline-flex h-12 w-12 items-center justify-center rounded-lg bg-white/10 text-white ring-1 ring-white/20" aria-hidden="true">
          <svg class="h-6 w-6" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z"/></svg>
        </div>
        <h3 class="mt-4 text-white">Robust &amp; korrosionsfrei</h3>
        <p class="mt-2 text-brand-200">PP-Kunststoff, pulverbeschichteter Stahl oder rostfreier Edelstahl V2A - passt zu jeder Umgebung.</p>
      </div>
      <div class="text-center md:text-left">
        <div class="inline-flex h-12 w-12 items-center justify-center rounded-lg bg-white/10 text-white ring-1 ring-white/20" aria-hidden="true">
          <svg class="h-6 w-6" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M3 7l9-4 9 4-9 4-9-4zM3 7v10l9 4M21 7v10l-9 4M12 11v10"/></svg>
        </div>
        <h3 class="mt-4 text-white">Direkt vom Lieferant</h3>
        <p class="mt-2 text-brand-200">B2B-Stückzahlpreise auf Anfrage. Versand aus Villingen-Schwenningen, kurze Lieferzeiten in der EU.</p>
      </div>
    </div>
  </div>
</section>

<!-- PRODUKT-TEASER -->
<section class="py-16 md:py-20 bg-slate-50">
  <div class="container-x">
    <div class="flex items-end justify-between flex-wrap gap-4 mb-10">
      <div>
        <span class="badge">Unser Programm</span>
        <h2 class="mt-2">Plattformwagen für jeden Einsatz</h2>
        <p class="mt-3 text-slate-600 max-w-2xl">Von der kompakten 150-kg-Variante bis zum doppelstöckigen Kommissionierwagen - alle Modelle teilen unsere geräuscharmen Räder.</p>
      </div>
      <a href="/produkte" class="btn-ghost">Alle Produkte ansehen →</a>
    </div>

    <?php if (empty($featured)): ?>
      <div class="rounded-lg bg-amber-50 ring-1 ring-amber-200 p-6 text-amber-900">
        Die Datenbank ist noch nicht initialisiert. Bitte <code>app/config/database.sql</code> und <code>app/config/seed.sql</code> einspielen.
      </div>
    <?php else: ?>
      <div class="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
        <?php foreach ($featured as $p): ?>
          <a href="/produkt/<?= ea($p['slug']) ?>" class="card overflow-hidden group no-underline">
            <div class="aspect-square bg-white">
              <?= picture('products/' . $p['slug'] . '/main-01', 'Plattformwagen ' . $p['name'], ['class' => 'h-full w-full object-contain p-4 group-hover:scale-105 transition-transform duration-300']) ?>
            </div>
            <div class="p-5 border-t border-slate-100">
              <div class="flex items-center justify-between gap-2">
                <h3 class="text-base font-semibold text-brand-900"><?= e($p['name']) ?></h3>
                <span class="badge"><?= e($p['art_nr']) ?></span>
              </div>
              <p class="mt-1 text-sm text-slate-600 line-clamp-2"><?= e($p['subtitle'] ?? '') ?></p>
              <div class="mt-4 flex items-center gap-3 text-xs text-slate-500">
                <?php if (!empty($p['capacity_kg'])): ?><span><strong class="text-brand-900"><?= (int)$p['capacity_kg'] ?> kg</strong> Tragkraft</span><?php endif; ?>
                <?php if (!empty($p['material'])): ?><span aria-hidden="true">·</span><span><?= e($p['material']) ?></span><?php endif; ?>
              </div>
              <span class="mt-4 inline-flex items-center text-sm font-medium text-brand-700 group-hover:text-accent-600">Details ansehen →</span>
            </div>
          </a>
        <?php endforeach; ?>
      </div>
    <?php endif; ?>
  </div>
</section>

<!-- BRANCHEN -->
<section class="py-16 md:py-20 bg-white">
  <div class="container-x">
    <div class="text-center max-w-3xl mx-auto">
      <span class="badge">Branchen</span>
      <h2 class="mt-2">Bewährt in anspruchsvollen Umgebungen</h2>
      <p class="mt-3 text-slate-600">Vom Krankenhausgang bis zur Reinraum-Produktion - unsere Plattformwagen passen sich Ihrem Einsatz an.</p>
    </div>
    <div class="mt-12 grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
      <?php
      $branches = [
        ['Krankenhäuser & Pflege', 'Geräuscharm für patientennahe Bereiche, hygienisch dank Edelstahl-Varianten.'],
        ['Logistik & Lagerhallen', 'Doppeldeckerwagen für effiziente Kommissionierung, 300 kg Tragkraft.'],
        ['Lebensmittelindustrie',  'ST300-DX in lebensmittelechtem Edelstahl, korrosionsbeständig im Kühlhaus.'],
        ['Pharma & Reinraum',      'Vibrationsarmer Transport empfindlicher Geräte und Materialien.'],
        ['Produktion & Werkstatt', 'TB300-DX mit Bumper schützt Möbel und Wände beim Bauteiltransport.'],
        ['Museen & Bibliotheken',  'Leise Naturkautschuk-Räder hinterlassen keine Spuren auf empfindlichen Böden.'],
      ];
      foreach ($branches as [$t, $d]):
      ?>
        <div class="card p-6">
          <h3 class="text-lg"><?= e($t) ?></h3>
          <p class="mt-2 text-sm text-slate-600"><?= e($d) ?></p>
        </div>
      <?php endforeach; ?>
    </div>
  </div>
</section>

<!-- CTA -->
<section class="py-16 md:py-20 bg-brand-900 text-white">
  <div class="container-x text-center max-w-3xl mx-auto">
    <h2 class="text-white">Stückzahl benötigt?</h2>
    <p class="mt-3 text-brand-100">Senden Sie uns Ihre Anfrage - wir kalkulieren passende B2B-Konditionen und melden uns zeitnah zurück.</p>
    <div class="mt-8 flex flex-col sm:flex-row gap-3 justify-center">
      <a href="/anfrage"  class="btn-primary">Anfrage starten</a>
      <a href="/kontakt"  class="btn-ghost bg-white/10 text-white ring-white/30 hover:bg-white/20">Kontakt aufnehmen</a>
    </div>
  </div>
</section>
