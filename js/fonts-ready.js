(function () {
  window.whenSiteFontsReady = function whenSiteFontsReady() {
    if (window.__siteFontsReady) return window.__siteFontsReady;

    window.__siteFontsReady = (async () => {
      if (!document.fonts) return;

      await Promise.allSettled([
        document.fonts.load('300 1em "DM Sans"'),
        document.fonts.load('400 1em "DM Sans"'),
        document.fonts.load('500 1em "DM Sans"'),
        document.fonts.load('400 1em "Bebas Neue"'),
        document.fonts.load('300 1em "DM Mono"'),
        document.fonts.load('400 1em "DM Mono"'),
      ]);

      await document.fonts.ready;
      document.documentElement.classList.add('fonts-ready');
    })();

    return window.__siteFontsReady;
  };

  window.whenSiteFontsReady();
})();
