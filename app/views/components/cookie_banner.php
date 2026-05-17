<?php
/**
 * Cookie-Hinweis. Aktuell nutzt die Seite NUR technisch notwendige Cookies
 * (Session + CSRF), für die nach § 25 Abs. 2 TDDDG keine Einwilligung
 * erforderlich ist. Daher zeigt der Banner nur einen Hinweis-Text und
 * einen einzelnen Bestätigungs-Button - keine Schein-Auswahl für nicht
 * existierende Analytics.
 *
 * Sobald ein nicht-essenzieller Dienst (Matomo, GA, Maps, YouTube etc.)
 * eingebunden wird, MUSS die Auswahl wieder rein und gleichwertig
 * prominent für Ablehnen/Akzeptieren sein (EuGH 11.09.2024).
 */
?>
<div id="cookie-banner" class="fixed inset-x-0 bottom-0 z-50 hidden" role="dialog" aria-modal="false"
     aria-labelledby="cookie-title" aria-describedby="cookie-desc">
  <div class="mx-auto max-w-4xl m-3 rounded-xl bg-white shadow-2xl ring-1 ring-slate-200 p-5 md:p-6">
    <h2 id="cookie-title" class="text-base md:text-lg font-semibold text-brand-900">
      Cookies &amp; Datenschutz
    </h2>
    <p id="cookie-desc" class="mt-2 text-sm text-slate-700 leading-relaxed">
      Diese Webseite verwendet ausschließlich <strong>technisch notwendige Cookies</strong>
      (Session, CSRF-Schutz) - keine Tracking-, Analyse- oder Werbe-Cookies.
      Details in der <a href="/datenschutz" class="text-brand-700 hover:text-accent-600 underline">Datenschutzerklärung</a>.
    </p>

    <div class="mt-5 flex justify-end">
      <button type="button" data-cookie="accept" class="btn-primary">Verstanden</button>
    </div>
  </div>
</div>
