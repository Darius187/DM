<?php
/** @var string $content; @var ?string $pageTitle; @var ?array $user */
$pageTitle = ($pageTitle ?? 'Admin') . ' - uni-silent Admin';
$user = $user ?? Auth::user();
?>
<!DOCTYPE html>
<html lang="de">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title><?= e($pageTitle) ?></title>
<meta name="robots" content="noindex, nofollow">
<link rel="stylesheet" href="/assets/css/tailwind.min.css">
<link rel="icon" href="/favicon.ico" sizes="32x32">
</head>
<body class="bg-slate-100 min-h-screen flex flex-col">
<a href="#admin-main" class="skip-link">Zum Hauptinhalt springen</a>

<header class="bg-brand-900 text-white">
  <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
    <div class="flex items-center justify-between h-14">
      <a href="/admin/dashboard.php" class="flex items-center gap-2 no-underline">
        <span class="inline-flex h-7 w-7 items-center justify-center rounded bg-accent-500 text-white font-bold text-sm" aria-hidden="true">u</span>
        <span class="font-semibold">uni-silent Admin</span>
      </a>
      <nav aria-label="Admin-Navigation" class="hidden md:flex items-center gap-1 text-sm">
        <a href="/admin/dashboard.php" class="px-3 py-1.5 rounded hover:bg-brand-800 no-underline">Dashboard</a>
        <a href="/admin/produkte.php"  class="px-3 py-1.5 rounded hover:bg-brand-800 no-underline">Produkte</a>
        <a href="/admin/anfragen.php"  class="px-3 py-1.5 rounded hover:bg-brand-800 no-underline">Anfragen</a>
        <a href="/" target="_blank" rel="noopener" class="px-3 py-1.5 rounded hover:bg-brand-800 no-underline">Website ↗</a>
      </nav>
      <div class="flex items-center gap-3 text-sm">
        <?php if ($user): ?>
          <span class="hidden sm:inline text-brand-200">eingeloggt: <?= e($user['username']) ?></span>
          <form method="post" action="/admin/logout.php" class="inline">
            <?= Csrf::field() ?>
            <button class="px-3 py-1.5 rounded bg-brand-800 hover:bg-brand-700">Abmelden</button>
          </form>
        <?php endif; ?>
      </div>
    </div>
  </div>
</header>

<main id="admin-main" class="flex-1 py-8">
  <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
<?php if (!empty($_SESSION['flash'])):
    $flash = $_SESSION['flash']; unset($_SESSION['flash']); ?>
    <div role="status" class="mb-6 rounded-md p-4 text-sm <?= $flash['type'] === 'error' ? 'bg-red-50 text-red-900 ring-1 ring-red-300' : ($flash['type'] === 'success' ? 'bg-green-50 text-green-900 ring-1 ring-green-300' : 'bg-blue-50 text-blue-900 ring-1 ring-blue-300') ?>">
      <?= e($flash['msg']) ?>
    </div>
<?php endif; ?>

<?= $content ?>

  </div>
</main>

<footer class="bg-white border-t border-slate-200 py-4">
  <div class="max-w-7xl mx-auto px-4 text-xs text-slate-500 flex flex-wrap items-center justify-between gap-2">
    <span>uni-silent Admin · <?= date('Y') ?></span>
    <a href="/" class="hover:text-brand-700">Zur Website</a>
  </div>
</footer>
</body>
</html>
