(function () {
  window.__showSiteLoader = true;

  try {
    const nav = performance.getEntriesByType('navigation')[0];
    if (nav && nav.type === 'reload') return;
    if (sessionStorage.getItem('molluss:loader-done') === '1') {
      window.__showSiteLoader = false;
      document.documentElement.classList.add('loader-skip');
    }
  } catch (err) {
    window.__showSiteLoader = true;
  }
})();
