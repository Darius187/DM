<?php
/**
 * Dynamische Sitemap. Mit Rewrite-Regel als /sitemap.xml gemappt.
 */
require __DIR__ . '/../app/core/bootstrap.php';
header('Content-Type: application/xml; charset=UTF-8');

$base = rtrim($GLOBALS['config']['site']['url'], '/');
$today = date('Y-m-d');
echo '<?xml version="1.0" encoding="UTF-8"?>' . "\n";
?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url><loc><?= ea($base) ?>/</loc><changefreq>weekly</changefreq><priority>1.0</priority></url>
  <url><loc><?= ea($base) ?>/produkte</loc><changefreq>weekly</changefreq><priority>0.9</priority></url>
  <url><loc><?= ea($base) ?>/anfrage</loc><changefreq>monthly</changefreq><priority>0.7</priority></url>
  <url><loc><?= ea($base) ?>/kontakt</loc><changefreq>monthly</changefreq><priority>0.6</priority></url>
<?php
try {
    foreach (Product::all() as $p) {
        echo '  <url><loc>' . ea($base) . '/produkt/' . ea($p['slug']) . '</loc><lastmod>' . ea(substr((string)$p['updated_at'], 0, 10) ?: $today) . '</lastmod><changefreq>monthly</changefreq><priority>0.8</priority></url>' . "\n";
    }
} catch (Throwable $e) {}
?>
  <url><loc><?= ea($base) ?>/impressum</loc><priority>0.3</priority></url>
  <url><loc><?= ea($base) ?>/datenschutz</loc><priority>0.3</priority></url>
  <url><loc><?= ea($base) ?>/agb</loc><priority>0.3</priority></url>
</urlset>
