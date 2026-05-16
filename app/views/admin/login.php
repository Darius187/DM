<?php /** @var ?string $error */ ?>
<div class="max-w-md mx-auto mt-6">
  <div class="card p-6 md:p-8">
    <h1 class="text-2xl">Anmeldung</h1>
    <p class="mt-2 text-sm text-slate-600">Admin-Bereich von uni-silent.</p>

    <?php if ($error): ?>
      <div role="alert" class="mt-5 rounded-md bg-red-50 ring-1 ring-red-300 p-3 text-red-900 text-sm"><?= e($error) ?></div>
    <?php endif; ?>

    <form method="post" action="/admin/index.php" class="mt-6 space-y-4" novalidate>
      <?= Csrf::field() ?>
      <label class="block">
        <span class="text-sm font-medium text-slate-700">Benutzername</span>
        <input type="text" name="username" required autofocus autocomplete="username" maxlength="64"
               class="mt-1 block w-full rounded-md border-slate-300 focus:border-brand-500 focus:ring-brand-500">
      </label>
      <label class="block">
        <span class="text-sm font-medium text-slate-700">Passwort</span>
        <input type="password" name="password" required autocomplete="current-password" maxlength="200"
               class="mt-1 block w-full rounded-md border-slate-300 focus:border-brand-500 focus:ring-brand-500">
      </label>
      <button type="submit" class="btn-primary w-full">Anmelden</button>
    </form>

    <p class="mt-6 text-xs text-slate-500">
      Hinweis: Nach 5 Fehlversuchen wird die IP für 15 Minuten gesperrt.
    </p>
  </div>
</div>
