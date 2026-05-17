<?php
$_b = __DIR__;
while ($_b && !is_file($_b . '/app/core/bootstrap.php')) {
    $_p = dirname($_b);
    if ($_p === $_b) { http_response_code(500); exit('bootstrap.php not found'); }
    $_b = $_p;
}
require $_b . '/app/core/bootstrap.php';
http_response_code(404);
$pageTitle = 'Seite nicht gefunden';
ob_start(); ?>
<section class="py-20 md:py-28 text-center">
  <div class="container-x max-w-2xl">
    <p class="text-6xl font-bold text-brand-700">404</p>
    <h1 class="mt-4">Seite nicht gefunden</h1>
    <p class="mt-3 text-slate-600">Die angeforderte Seite existiert nicht (mehr). Vielleicht hilft Ihnen einer dieser Links:</p>
    <div class="mt-8 flex flex-wrap gap-3 justify-center">
      <a href="/" class="btn-primary">Zur Startseite</a>
      <a href="/produkte" class="btn-ghost">Alle Produkte</a>
      <a href="/kontakt"  class="btn-ghost">Kontakt</a>
    </div>
  </div>
</section>
<?php
$content = ob_get_clean();
require APP_PATH . '/views/layout/main.php';
