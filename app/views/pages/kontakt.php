<?php /** @var array $errors; @var bool $success */ ?>
<section class="py-12 md:py-16">
  <div class="container-x max-w-5xl grid md:grid-cols-2 gap-10">
    <div>
      <span class="badge">Kontakt</span>
      <h1 class="mt-2">Sprechen Sie uns an</h1>
      <p class="mt-3 text-slate-700">Wir beraten Sie persönlich zum passenden Modell für Ihren Einsatzbereich.</p>

      <dl class="mt-8 space-y-5 text-slate-800">
        <div>
          <dt class="text-sm font-medium text-slate-500">Anschrift</dt>
          <dd class="mt-1">db-bas / uni-silent<br>Neckarpark 51<br>78056 Villingen-Schwenningen</dd>
        </div>
        <div>
          <dt class="text-sm font-medium text-slate-500">Telefon</dt>
          <dd class="mt-1"><a href="tel:+4977203041933" class="text-brand-700 hover:text-accent-600 no-underline">+49 (0)7720 3041933</a></dd>
        </div>
        <div>
          <dt class="text-sm font-medium text-slate-500">Mobil</dt>
          <dd class="mt-1"><a href="tel:+491733131701" class="text-brand-700 hover:text-accent-600 no-underline">+49 (0)173 3131701</a></dd>
        </div>
        <div>
          <dt class="text-sm font-medium text-slate-500">E-Mail</dt>
          <dd class="mt-1"><a href="mailto:info@db-bas.de" class="text-brand-700 hover:text-accent-600 no-underline">info@db-bas.de</a></dd>
        </div>
      </dl>
    </div>

    <?php if (!empty($success)): ?>
      <div role="status" class="card p-6 md:p-8 bg-green-50 ring-green-300 text-green-900">
        <h2 class="text-lg font-semibold">Vielen Dank — Ihre Nachricht ist angekommen.</h2>
        <p class="mt-2">Wir melden uns zeitnah persönlich zurück.</p>
        <a href="/" class="btn-primary mt-5 inline-flex">Zur Startseite</a>
      </div>
    <?php else: ?>
    <form method="post" action="/kontakt.php" class="card p-6 md:p-8 space-y-4" novalidate>
      <?= Csrf::field() ?>
      <?php if (!empty($errors['_global'])): ?>
        <div role="alert" class="rounded-md bg-red-50 ring-1 ring-red-300 p-3 text-red-900 text-sm"><?= e($errors['_global']) ?></div>
      <?php endif; ?>
      <label class="block"><span class="text-sm font-medium text-slate-700">Name *</span>
        <input type="text" name="name" required maxlength="255" value="<?= ea($_POST['name'] ?? '') ?>"
               class="mt-1 block w-full rounded-md border-slate-300 focus:border-brand-500 focus:ring-brand-500 <?= isset($errors['name']) ? 'ring-1 ring-red-400' : '' ?>">
        <?php if (!empty($errors['name'])): ?><span class="text-xs text-red-700"><?= e($errors['name']) ?></span><?php endif; ?>
      </label>
      <label class="block"><span class="text-sm font-medium text-slate-700">E-Mail *</span>
        <input type="email" name="email" required maxlength="255" value="<?= ea($_POST['email'] ?? '') ?>"
               class="mt-1 block w-full rounded-md border-slate-300 focus:border-brand-500 focus:ring-brand-500 <?= isset($errors['email']) ? 'ring-1 ring-red-400' : '' ?>">
        <?php if (!empty($errors['email'])): ?><span class="text-xs text-red-700"><?= e($errors['email']) ?></span><?php endif; ?>
      </label>
      <label class="block"><span class="text-sm font-medium text-slate-700">Firma</span>
        <input type="text" name="company" maxlength="255" value="<?= ea($_POST['company'] ?? '') ?>"
               class="mt-1 block w-full rounded-md border-slate-300 focus:border-brand-500 focus:ring-brand-500">
      </label>
      <label class="block"><span class="text-sm font-medium text-slate-700">Nachricht *</span>
        <textarea name="message" rows="5" required maxlength="2000"
                  class="mt-1 block w-full rounded-md border-slate-300 focus:border-brand-500 focus:ring-brand-500 <?= isset($errors['message']) ? 'ring-1 ring-red-400' : '' ?>"><?= e($_POST['message'] ?? '') ?></textarea>
        <?php if (!empty($errors['message'])): ?><span class="text-xs text-red-700"><?= e($errors['message']) ?></span><?php endif; ?>
      </label>
      <label class="flex items-start gap-2 text-sm">
        <input type="checkbox" name="consent" required class="mt-1 h-4 w-4 rounded border-slate-300 text-brand-700">
        <span>Ich willige ein, dass meine Angaben zur Bearbeitung gespeichert werden. <a href="/datenschutz" class="text-brand-700 underline">Datenschutz</a> *</span>
      </label>
      <?php if (!empty($errors['consent'])): ?><p class="text-xs text-red-700 -mt-2"><?= e($errors['consent']) ?></p><?php endif; ?>
      <input type="text" name="website" tabindex="-1" autocomplete="off" class="hidden" aria-hidden="true">
      <button type="submit" class="btn-primary w-full">Nachricht senden</button>
    </form>
    <?php endif; ?>
  </div>
</section>
