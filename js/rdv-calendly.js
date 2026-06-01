(function () {
  const widget = document.querySelector('.calendly-inline-widget');
  if (!widget) return;

  const LOADING_MIN_DESKTOP = 640;
  const LOADING_MIN_MOBILE = 480;
  const HEIGHT_PAD = 2;
  const mq = window.matchMedia('(max-width: 900px)');

  let lastHeight = 0;

  function isMobile() {
    return mq.matches;
  }

  function loadingMin() {
    return isMobile() ? LOADING_MIN_MOBILE : LOADING_MIN_DESKTOP;
  }

  function setHeight(px) {
    const h = Math.max(0, Math.ceil(px));
    if (h === lastHeight) return;
    lastHeight = h;
    widget.style.height = `${h}px`;
    widget.style.minHeight = `${h}px`;
  }

  function applyCalendlyHeight(height) {
    const n = Number(height);
    if (!n || n < 120) return;
    setHeight(n + HEIGHT_PAD);
  }

  function applyLoadingMin() {
    setHeight(loadingMin());
  }

  function readIframeHeight() {
    const iframe = widget.querySelector('iframe');
    if (!iframe) return 0;
    try {
      return iframe.getBoundingClientRect().height || iframe.offsetHeight || 0;
    } catch {
      return 0;
    }
  }

  function onMessage(event) {
    if (event.origin !== 'https://calendly.com') return;
    const data = event.data;
    if (!data || typeof data !== 'object') return;

    if (data.event === 'calendly.page_height' && data.payload?.height) {
      applyCalendlyHeight(data.payload.height);
      return;
    }

    if (data.type === 'calendly:resize' && data.payload?.height) {
      applyCalendlyHeight(data.payload.height);
    }
  }

  applyLoadingMin();
  window.addEventListener('message', onMessage);

  mq.addEventListener('change', () => {
    if (lastHeight <= loadingMin() + 20) {
      applyLoadingMin();
    }
  });

  let polls = 0;
  const pollId = window.setInterval(() => {
    polls += 1;
    const iframeH = readIframeHeight();
    if (iframeH > 200 && Math.abs(iframeH - lastHeight) > 24) {
      setHeight(iframeH);
    }
    if (polls >= 40) {
      window.clearInterval(pollId);
    }
  }, 500);
})();
