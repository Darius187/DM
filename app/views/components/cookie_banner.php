<?php
/**
 * DSGVO-konformer Cookie-Banner.
 * - Opt-in (nicht Opt-out), keine vorausgewählten Checkboxen
 * - "Ablehnen" gleich prominent wie "Akzeptieren"
 * - Keine externen Skripte werden VOR Consent geladen
 * - Speichert Auswahl in localStorage (kein Tracking-Cookie ohne Consent)
 *
 * Da aktuell KEINE externen Tracker/Analytics aktiv sind, ist der Banner
 * primär informativ + "Privacy-by-default". Sobald du z.B. Matomo
 * o.Ä. einbaust, schalten wir die Kategorie 'analytics' frei.
 */
?>
<div id="cookie-banner" class="fixed inset-x-0 bottom-0 z-50 hidden" role="dialog" aria-modal="false"
     aria-labelledby="cookie-title" aria-describedby="cookie-desc">
  <div class="mx-auto max-w-4xl m-3 rounded-xl bg-white shadow-2xl ring-1 ring-slate-200 p-5 md:p-6">
    <h2 id="cookie-title" class="text-base md:text-lg font-semibold text-brand-900">
      Cookies & Datenschutz
    </h2>
    <p id="cookie-desc" class="mt-2 text-sm text-slate-700 leading-relaxed">
      Wir verwenden technisch notwendige Cookies für Funktionen wie Formulare und
      Sicherheit (CSRF-Schutz). Optional dürfen wir mit Ihrer Einwilligung
      anonyme Statistiken erheben, um die Seite zu verbessern. Sie können Ihre
      Einwilligung jederzeit in den
      <a href="/datenschutz" class="text-brand-700 hover:text-accent-600 underline">Datenschutzeinstellungen</a>
      ändern.
    </p>

    <fieldset class="mt-4 space-y-2 text-sm">
      <label class="flex items-start gap-2 cursor-not-allowed opacity-70">
        <input type="checkbox" checked disabled class="mt-0.5 h-4 w-4 rounded border-slate-300 text-brand-700">
        <span><strong>Notwendig.</strong> Sicherheits- und Formular-Cookies (immer aktiv).</span>
      </label>
      <label class="flex items-start gap-2">
        <input id="cookie-analytics" type="checkbox" class="mt-0.5 h-4 w-4 rounded border-slate-300 text-brand-700">
        <span><strong>Statistik (anonym).</strong> Hilft uns, die Webseite zu verbessern. Aktuell nicht im Einsatz — Vorbereitet für später.</span>
      </label>
    </fieldset>

    <div class="mt-5 flex flex-col sm:flex-row gap-2 sm:gap-3">
      <button type="button" data-cookie="reject" class="btn-ghost flex-1">Alle ablehnen</button>
      <button type="button" data-cookie="custom" class="btn-ghost flex-1">Auswahl speichern</button>
      <button type="button" data-cookie="accept" class="btn-primary flex-1">Alle akzeptieren</button>
    </div>
  </div>
</div>
