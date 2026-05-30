(function () {
  const topo = document.querySelector('.topo-bg');
  if (!topo) return;

  const SCROLL_FACTOR = 0.72;
  const BUFFER = 0.25;
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  let ticking = false;

  function setTopoHeight() {
    const viewH = window.innerHeight;
    const maxScroll = Math.max(0, document.documentElement.scrollHeight - viewH);
    const travel = reducedMotion ? maxScroll : maxScroll * SCROLL_FACTOR;
    topo.style.height = `${viewH + travel + viewH * BUFFER}px`;
  }

  function update() {
    if (!reducedMotion) {
      topo.style.transform = `translate3d(0, ${-window.scrollY * SCROLL_FACTOR}px, 0)`;
    }
    ticking = false;
  }

  function refresh() {
    setTopoHeight();
    update();
  }

  window.addEventListener(
    'scroll',
    () => {
      if (!ticking) {
        ticking = true;
        requestAnimationFrame(update);
      }
    },
    { passive: true }
  );

  window.addEventListener('resize', refresh);
  window.addEventListener('load', refresh);

  if ('ResizeObserver' in window) {
    const ro = new ResizeObserver(refresh);
    ro.observe(document.documentElement);
  }

  refresh();
})();
