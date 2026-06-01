(function () {
  const widget = document.querySelector('.calendly-inline-widget');
  if (!widget) return;

  const MIN_DESKTOP = 700;
  const MIN_MOBILE = 980;

  function isMobile() {
    return window.matchMedia('(max-width: 900px)').matches;
  }

  function baseMinHeight() {
    return isMobile() ? MIN_MOBILE : MIN_DESKTOP;
  }

  function applyHeight(height) {
    const h = Math.max(baseMinHeight(), Math.ceil(Number(height) || 0));
    widget.style.height = `${h}px`;
    widget.style.minHeight = `${h}px`;
  }

  function onMessage(event) {
    if (event.origin !== 'https://calendly.com') return;

    const data = event.data;
    if (!data || typeof data !== 'object') return;

    if (data.event === 'calendly.page_height' && data.payload?.height) {
      applyHeight(data.payload.height);
      return;
    }

    if (data.type === 'calendly:resize' && data.payload?.height) {
      applyHeight(data.payload.height);
    }
  }

  applyHeight(baseMinHeight());
  window.addEventListener('message', onMessage);
  window.matchMedia('(max-width: 900px)').addEventListener('change', () => {
    applyHeight(baseMinHeight());
  });
})();
