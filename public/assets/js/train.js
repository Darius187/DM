/* uni-silent.de — Plattformwagen-Zug Endlos-Loop.
 * Web Animations API, pixelgenau gemessen nach window.load.
 * Respektiert prefers-reduced-motion (CSS), restartet bei resize.
 */
(function () {
  'use strict';

  const track = document.getElementById('train-track');
  if (!track) return;

  const SPEED_PPS = 60;        // pixel per second
  const GAP = 8;
  let animation = null;
  let halfWidth = 0;

  function measureAndAnimate() {
    if (animation) {
      try { animation.cancel(); } catch (e) {}
      animation = null;
    }
    const imgs = track.querySelectorAll('img');
    if (!imgs.length) return;

    const half = imgs.length / 2;
    halfWidth = 0;
    for (let i = 0; i < half; i++) {
      halfWidth += imgs[i].offsetWidth + GAP;
    }
    if (halfWidth === 0) {
      requestAnimationFrame(measureAndAnimate);
      return;
    }

    /* prefers-reduced-motion: kein Loop, statisch */
    if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      return;
    }

    animation = track.animate(
      [
        { transform: 'translateX(0px)' },
        { transform: 'translateX(-' + halfWidth + 'px)' }
      ],
      {
        duration: (halfWidth / SPEED_PPS) * 1000,
        iterations: Infinity,
        easing: 'linear'
      }
    );
  }

  /* Wait for images to be loaded */
  function waitForImages() {
    const imgs = Array.from(track.querySelectorAll('img'));
    const pending = imgs.filter(i => !i.complete);
    if (!pending.length) { measureAndAnimate(); return; }
    let remaining = pending.length;
    pending.forEach(img => {
      const done = () => { if (--remaining === 0) measureAndAnimate(); };
      img.addEventListener('load',  done, { once: true });
      img.addEventListener('error', done, { once: true });
    });
  }

  if (document.readyState === 'complete') {
    waitForImages();
  } else {
    window.addEventListener('load', waitForImages);
  }

  /* Re-measure on resize (debounced) */
  let resizeTimer;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(measureAndAnimate, 200);
  });
})();
