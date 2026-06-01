(function () {
  const loader = document.getElementById('site-loader');

  function waitFonts() {
    if (typeof window.whenSiteFontsReady === 'function') {
      return window.whenSiteFontsReady();
    }
    if (document.fonts && document.fonts.ready) {
      return document.fonts.ready;
    }
    return Promise.resolve();
  }

  function revealPage() {
    document.body.classList.remove('is-loading');
    document.body.classList.add('is-loaded');
    document.dispatchEvent(new CustomEvent('site:loaded'));
  }

  function skipLoader() {
    if (typeof window.releaseTopoPaths === 'function') {
      window.releaseTopoPaths();
    }
    loader?.remove();
    waitFonts().then(revealPage);
  }

  if (!window.__showSiteLoader) {
    document.addEventListener('topo:ready', () => {
      if (typeof window.releaseTopoPaths === 'function') {
        window.releaseTopoPaths();
      }
    }, { once: true });
    skipLoader();
    return;
  }

  if (!loader) {
    if (document.body.classList.contains('is-loading')) {
      revealPage();
    }
    return;
  }

  const percentEl = loader.querySelector('.loader-percent');
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const DURATION = reduceMotion ? 400 : 1500;
  const HOLD_AT_100 = reduceMotion ? 60 : 120;

  let animStart = null;
  let started = false;
  let finished = false;
  let topoPaths = [];

  function easeInOutCubic(t) {
    return t < 0.5 ? 4 * t * t * t : 1 - ((-2 * t + 2) ** 3) / 2;
  }

  function easeOutQuad(t) {
    return 1 - (1 - t) * (1 - t);
  }

  function prepareTopoPaths() {
    const paths = document.querySelectorAll('#topo-lines path');
    topoPaths = Array.from(paths).map((path) => {
      path.getBoundingClientRect();
      const len = Math.max(path.getTotalLength(), 1);
      path.style.strokeDasharray = `${len}`;
      path.style.strokeDashoffset = `${len}`;
      return { path, len };
    });
  }

  function drawTopo(progress) {
    if (!topoPaths.length) return;

    const drawT = easeInOutCubic(Math.min(1, Math.max(0, (progress - 0.08) / 0.88)));
    topoPaths.forEach(({ path, len }) => {
      path.style.strokeDasharray = `${len}`;
      path.style.strokeDashoffset = `${len * (1 - drawT)}`;
    });
  }

  function updateUi(progress) {
    const frameOpen = easeInOutCubic(progress);
    const labelOpacity = Math.max(0, Math.min(1, (frameOpen - 0.28) / 0.2));
    const pct = Math.min(100, Math.round(progress * 100));

    loader.style.setProperty('--loader-open', frameOpen.toFixed(4));
    loader.style.setProperty('--loader-label-opacity', labelOpacity.toFixed(4));

    if (percentEl) {
      percentEl.textContent = labelOpacity > 0.05 ? `${pct}%` : '';
      percentEl.setAttribute('aria-hidden', labelOpacity > 0.05 ? 'false' : 'true');
    }

    drawTopo(progress);
  }

  function finish() {
    if (finished) return;
    finished = true;

    if (typeof window.releaseTopoPaths === 'function') {
      window.releaseTopoPaths();
    }

    const exitDelay = reduceMotion ? 60 : 180;
    const revealDelay = reduceMotion ? 80 : 200;
    const removeDelay = reduceMotion ? 400 : 620;

    loader.classList.add('is-exiting');

    waitFonts().then(() => {
      window.setTimeout(() => {
        loader.classList.add('is-done');
        loader.setAttribute('aria-hidden', 'true');

        window.setTimeout(() => {
          document.body.classList.remove('is-loading');
          document.body.classList.add('is-loaded');
          document.dispatchEvent(new CustomEvent('site:loaded'));
        }, revealDelay);

        window.setTimeout(() => loader.remove(), removeDelay);

        try {
          sessionStorage.setItem('molluss:loader-done', '1');
        } catch (err) {}
      }, exitDelay);
    });
  }

  function tick(now) {
    if (finished || animStart === null) return;

    const elapsed = now - animStart;
    const t = Math.min(1, elapsed / DURATION);
    const progress = easeOutQuad(t);

    updateUi(progress);

    if (t >= 1) {
      window.setTimeout(finish, HOLD_AT_100);
      return;
    }

    requestAnimationFrame(tick);
  }

  function startAnimation() {
    if (started) return;
    started = true;
    prepareTopoPaths();
    animStart = performance.now();
    updateUi(0);
    requestAnimationFrame(tick);
  }

  function onTopoReady() {
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        prepareTopoPaths();
        startAnimation();
      });
    });
  }

  document.addEventListener('topo:ready', onTopoReady, { once: true });

  window.setTimeout(() => {
    if (!started) onTopoReady();
  }, 2200);

  window.setTimeout(() => {
    if (!document.body.classList.contains('is-loading')) return;
    if (typeof window.releaseTopoPaths === 'function') {
      window.releaseTopoPaths();
    }
    loader?.remove();
    revealPage();
  }, 10000);
})();
