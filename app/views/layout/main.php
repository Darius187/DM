<?php
/** @var string $content */
/** @var string|null $pageTitle */
/** @var string|null $pageDescription */
/** @var string|null $ogImage */
/** @var array|null $structuredData */
/** @var bool|null $hideTrain */

$site = $GLOBALS['config']['site'];
$title = isset($pageTitle) && $pageTitle !== ''
    ? $pageTitle . ' | uni-silent'
    : 'uni-silent — Plattformwagen für die Industrie';
$desc = $pageDescription ?? 'Premium-Plattformwagen für die Industrie: geräuscharm, robust, langlebig. PP-Kunststoff, Edelstahl, Stahl. 150–300 kg Tragkraft. Aus Villingen-Schwenningen.';
$canonical = current_url();
$ogImg = $ogImage ?? '/images/products/PLA300-DX/main-01-800.jpg';
?>
<!DOCTYPE html>
<html lang="de">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title><?= e($title) ?></title>
<meta name="description" content="<?= e($desc) ?>">
<meta name="robots" content="index, follow, max-image-preview:large">
<meta name="theme-color" content="#1e3a5f">
<link rel="canonical" href="<?= ea($canonical) ?>">

<!-- Open Graph / Social -->
<meta property="og:type" content="website">
<meta property="og:locale" content="de_DE">
<meta property="og:site_name" content="uni-silent">
<meta property="og:title" content="<?= e($title) ?>">
<meta property="og:description" content="<?= e($desc) ?>">
<meta property="og:url" content="<?= ea($canonical) ?>">
<meta property="og:image" content="<?= ea(base_url($ogImg)) ?>">
<meta name="twitter:card" content="summary_large_image">

<!-- Stylesheets (lokal, kein CDN) -->
<link rel="stylesheet" href="/assets/css/tailwind.min.css">
<link rel="icon" href="/favicon.ico" sizes="32x32">
<link rel="icon" href="/assets/icons/icon.svg" type="image/svg+xml">
<link rel="apple-touch-icon" href="/assets/icons/apple-touch-icon.png">

<!-- Strukturierte Daten -->
<script type="application/ld+json">
<?= json_encode([
    '@context' => 'https://schema.org',
    '@type'    => 'Organization',
    'name'     => 'uni-silent',
    'url'      => $site['url'],
    'logo'     => $site['url'] . '/assets/icons/logo.svg',
    'address'  => [
        '@type'           => 'PostalAddress',
        'streetAddress'   => 'Neckarpark 51',
        'postalCode'      => '78056',
        'addressLocality' => 'Villingen-Schwenningen',
        'addressCountry'  => 'DE',
    ],
    'contactPoint' => [
        '@type'       => 'ContactPoint',
        'contactType' => 'sales',
        'telephone'   => '+49-7720-3041933',
        'email'       => 'info@db-bas.de',
        'areaServed'  => 'DE',
        'availableLanguage' => ['de', 'en'],
    ],
], JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE) ?>
</script>
<?php if (!empty($structuredData)): ?>
<script type="application/ld+json">
<?= json_encode($structuredData, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE) ?>
</script>
<?php endif; ?>
</head>
<body class="min-h-screen flex flex-col">

<a href="#main" class="skip-link">Zum Hauptinhalt springen</a>

<?php require APP_PATH . '/views/components/header.php'; ?>

<?php if (empty($hideTrain)): ?>
  <?php require APP_PATH . '/views/components/train.php'; ?>
<?php endif; ?>

<main id="main" class="flex-1">
<?= $content ?>
</main>

<?php require APP_PATH . '/views/components/footer.php'; ?>
<?php require APP_PATH . '/views/components/cookie_banner.php'; ?>

<script src="/assets/js/main.js" defer></script>
<script src="/assets/js/train.js" defer></script>
<script src="/assets/js/cookie.js" defer></script>
</body>
</html>
