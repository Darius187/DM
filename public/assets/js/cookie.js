/* uni-silent.de - Cookie-Banner (DSGVO Opt-in).
 * Speichert Consent als JSON in localStorage. Sendet keine Daten an Server.
 * Aktuell keine externen Tracker - Banner ist Privacy-by-default.
 */
(function () {
  'use strict';

  const KEY = 'usil_consent_v1';
  const banner = document.getElementById('cookie-banner');
  if (!banner) return;

  function getConsent() {
    try { return JSON.parse(localStorage.getItem(KEY) || 'null'); }
    catch (e) { return null; }
  }
  function setConsent(c) {
    try { localStorage.setItem(KEY, JSON.stringify({ ...c, ts: Date.now() })); }
    catch (e) {}
  }

  function show() { banner.classList.remove('hidden'); }
  function hide() { banner.classList.add('hidden'); }

  function applyConsent(c) {
    /* Hook für später: hier würden Tracker geladen, wenn c.analytics === true */
    document.documentElement.dataset.consentAnalytics = c.analytics ? '1' : '0';
  }

  /* Initial: zeige Banner, wenn noch keine Entscheidung */
  const existing = getConsent();
  if (!existing) {
    show();
  } else {
    applyConsent(existing);
  }

  banner.addEventListener('click', (ev) => {
    const t = ev.target.closest('[data-cookie]');
    if (!t) return;
    let consent = { necessary: true, analytics: false };
    if (t.dataset.cookie === 'accept') consent.analytics = true;
    if (t.dataset.cookie === 'reject') consent.analytics = false;
    if (t.dataset.cookie === 'custom') {
      const cb = document.getElementById('cookie-analytics');
      consent.analytics = !!(cb && cb.checked);
    }
    setConsent(consent);
    applyConsent(consent);
    hide();
  });

  /* Re-Öffnen über Link in /datenschutz */
  document.addEventListener('click', (ev) => {
    const t = ev.target.closest('[data-cookie-open]');
    if (t) { ev.preventDefault(); show(); }
  });
})();
