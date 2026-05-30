(function () {
  const target = document.getElementById('topo-lines');
  const host = document.querySelector('.topo-bg');
  if (!target || !host) return;

  fetch('assets/topo-lines.svg')
    .then((res) => {
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return res.text();
    })
    .then((svgText) => {
      const doc = new DOMParser().parseFromString(svgText, 'image/svg+xml');
      const source = doc.querySelector('#topo-lines');
      const sourceSvg = doc.querySelector('svg');
      if (!source) throw new Error('Missing #topo-lines in topo-lines.svg');

      if (sourceSvg) {
        const viewBox = sourceSvg.getAttribute('viewBox');
        if (viewBox) host.setAttribute('viewBox', viewBox);
        host.setAttribute('preserveAspectRatio', 'xMidYMid slice');
      }

      target.innerHTML = source.innerHTML;
      document.dispatchEvent(new CustomEvent('topo:ready', { detail: { host } }));
    })
    .catch((err) => {
      console.warn('Topographic background failed to load:', err);
    });
})();
