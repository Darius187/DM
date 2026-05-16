<?php /** @var array $products; @var ?array $preselect */ ?>
<section class="py-12 md:py-16 bg-slate-50">
  <div class="container-x max-w-4xl">
    <span class="badge">B2B-Anfrage</span>
    <h1 class="mt-2">Stückzahl anfragen</h1>
    <p class="mt-3 text-slate-700 max-w-2xl">Geben Sie Modell und gewünschte Stückzahl an — wir melden uns innerhalb von 24 Stunden (werktags) mit einem Angebot.</p>

    <form method="post" action="/anfrage" class="mt-10 card p-6 md:p-8 space-y-6" novalidate>
      <?= Csrf::field() ?>

      <fieldset class="space-y-4">
        <legend class="text-base font-semibold text-brand-900">Ihre Firma</legend>
        <div class="grid sm:grid-cols-2 gap-4">
          <label class="block"><span class="text-sm font-medium text-slate-700">Firma *</span>
            <input type="text" name="company" required maxlength="255" class="mt-1 block w-full rounded-md border-slate-300 focus:border-brand-500 focus:ring-brand-500">
          </label>
          <label class="block"><span class="text-sm font-medium text-slate-700">Ansprechpartner *</span>
            <input type="text" name="name" required maxlength="255" class="mt-1 block w-full rounded-md border-slate-300 focus:border-brand-500 focus:ring-brand-500">
          </label>
          <label class="block"><span class="text-sm font-medium text-slate-700">E-Mail *</span>
            <input type="email" name="email" required maxlength="255" class="mt-1 block w-full rounded-md border-slate-300 focus:border-brand-500 focus:ring-brand-500">
          </label>
          <label class="block"><span class="text-sm font-medium text-slate-700">Telefon</span>
            <input type="tel" name="phone" maxlength="64" class="mt-1 block w-full rounded-md border-slate-300 focus:border-brand-500 focus:ring-brand-500">
          </label>
        </div>
      </fieldset>

      <fieldset class="space-y-4">
        <legend class="text-base font-semibold text-brand-900">Ihr Bedarf</legend>
        <div class="space-y-3">
          <?php foreach ($products as $p): ?>
            <label class="flex items-center gap-4 rounded-md border border-slate-200 px-4 py-3 hover:bg-slate-50">
              <span class="flex-1">
                <span class="block font-medium text-brand-900"><?= e($p['name']) ?></span>
                <span class="block text-xs text-slate-500"><?= e($p['art_nr']) ?> · <?= e($p['material'] ?? '') ?><?= !empty($p['capacity_kg']) ? ' · ' . (int)$p['capacity_kg'] . ' kg' : '' ?></span>
              </span>
              <span class="flex items-center gap-2 shrink-0">
                <label class="text-xs text-slate-500" for="qty_<?= ea($p['slug']) ?>">Stk.</label>
                <input id="qty_<?= ea($p['slug']) ?>" type="number" name="qty[<?= ea($p['slug']) ?>]" min="0" max="99999"
                       value="<?= ($preselect && $preselect['id']===$p['id']) ? '1' : '' ?>"
                       class="w-24 rounded-md border-slate-300 focus:border-brand-500 focus:ring-brand-500">
              </span>
            </label>
          <?php endforeach; ?>
        </div>
      </fieldset>

      <label class="block"><span class="text-sm font-medium text-slate-700">Nachricht / Lieferadresse</span>
        <textarea name="message" rows="4" maxlength="2000" class="mt-1 block w-full rounded-md border-slate-300 focus:border-brand-500 focus:ring-brand-500" placeholder="Lieferadresse, Wunschtermin, weitere Anforderungen ..."></textarea>
      </label>

      <label class="flex items-start gap-2 text-sm">
        <input type="checkbox" name="consent" required class="mt-1 h-4 w-4 rounded border-slate-300 text-brand-700">
        <span>Ich willige ein, dass meine Angaben zur Bearbeitung meiner Anfrage gespeichert und verwendet werden. Details siehe <a href="/datenschutz" class="text-brand-700 underline">Datenschutzerklärung</a>. *</span>
      </label>

      <!-- Honeypot (für Bots) -->
      <input type="text" name="website" tabindex="-1" autocomplete="off" class="hidden" aria-hidden="true">

      <div class="flex items-center justify-between">
        <p class="text-xs text-slate-500">* Pflichtfelder</p>
        <button type="submit" class="btn-primary">Anfrage senden</button>
      </div>

      <p class="text-xs text-amber-700 bg-amber-50 ring-1 ring-amber-200 rounded p-3">
        <strong>Hinweis:</strong> Der Versand per E-Mail wird in Session 2 vollständig implementiert (PHPMailer + Speicherung in DB + Admin-Benachrichtigung). Aktuell ist das Formular vorbereitet, aber noch nicht versandfähig.
      </p>
    </form>
  </div>
</section>
