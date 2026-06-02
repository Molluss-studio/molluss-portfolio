(function () {
  const THRESHOLD_MIN = 400;
  const THRESHOLD_MAX = 600;
  const THRESHOLD_RATIO = 0.85;

  function getThreshold() {
    return Math.min(
      THRESHOLD_MAX,
      Math.max(THRESHOLD_MIN, Math.round(window.innerHeight * THRESHOLD_RATIO))
    );
  }

  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'scroll-top';
  btn.setAttribute('aria-label', 'Retour en haut');
  btn.setAttribute('aria-hidden', 'true');
  btn.tabIndex = -1;
  btn.setAttribute('data-cursor', 'Haut');
  btn.innerHTML =
    '<svg class="scroll-top-icon" xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 19V5M5 12l7-7 7 7"/></svg>';
  document.body.appendChild(btn);

  let visible = false;
  let threshold = getThreshold();

  function setVisible(show) {
    if (show === visible) return;
    visible = show;
    btn.classList.toggle('is-visible', show);
    btn.setAttribute('aria-hidden', show ? 'false' : 'true');
    btn.tabIndex = show ? 0 : -1;
  }

  function onScroll() {
    setVisible(window.scrollY >= threshold);
  }

  window.addEventListener(
    'scroll',
    () => {
      onScroll();
    },
    { passive: true }
  );

  window.addEventListener(
    'resize',
    () => {
      threshold = getThreshold();
      onScroll();
    },
    { passive: true }
  );

  btn.addEventListener('click', () => {
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    window.scrollTo({ top: 0, behavior: reduceMotion ? 'auto' : 'smooth' });
  });

  onScroll();
})();
