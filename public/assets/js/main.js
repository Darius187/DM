/* uni-silent.de - main.js (vanilla, no framework) */
(function () {
  'use strict';

  /* Mobile menu toggle */
  const btn  = document.querySelector('[data-mobile-menu-button]');
  const menu = document.querySelector('[data-mobile-menu]');
  if (btn && menu) {
    btn.addEventListener('click', () => {
      const open = menu.classList.toggle('hidden') === false;
      btn.setAttribute('aria-expanded', String(open));
    });
  }

  /* Produkt-Filter (Produktübersicht) */
  const filterBtns = document.querySelectorAll('[data-filter]');
  if (filterBtns.length) {
    filterBtns.forEach(b => {
      b.addEventListener('click', () => {
        const val = b.dataset.filter;
        filterBtns.forEach(x => {
          x.classList.toggle('bg-brand-700', x === b);
          x.classList.toggle('text-white',   x === b);
          x.classList.toggle('bg-white',     x !== b);
          x.classList.toggle('text-brand-700', x !== b);
          x.setAttribute('aria-pressed', x === b ? 'true' : 'false');
        });
        document.querySelectorAll('[data-product]').forEach(card => {
          const material = card.dataset.material || '';
          const show = val === 'all' || material === val;
          card.classList.toggle('hidden', !show);
        });
      });
    });
  }

  /* Galerie-Thumbnails (Produkt-Detail) */
  const thumbs = document.querySelectorAll('[data-gallery-thumb]');
  const main   = document.querySelector('[data-gallery-main]');
  if (thumbs.length && main) {
    thumbs.forEach(t => {
      t.addEventListener('click', () => {
        const fullSrc = t.dataset.full;
        const fullSrcset = t.dataset.fullset;
        if (!fullSrc) return;
        const img = main.querySelector('img');
        const src = main.querySelector('source[type="image/webp"]');
        const jpg = main.querySelector('source[type="image/jpeg"]');
        if (img) img.src = fullSrc;
        if (src) src.srcset = fullSrcset || fullSrc;
        if (jpg) jpg.srcset = fullSrcset || fullSrc;
        if (img && t.querySelector('img')) img.alt = t.querySelector('img').alt;
        thumbs.forEach(x => x.setAttribute('aria-current', 'false'));
        t.setAttribute('aria-current', 'true');
      });
    });
  }
})();
