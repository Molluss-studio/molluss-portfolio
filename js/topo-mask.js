(function () {
  function measurePath(path) {
    path.getBoundingClientRect();
    return Math.max(path.getTotalLength(), 1);
  }

  function maskTopoPaths(root) {
    const scope = root || document;
    scope.querySelectorAll('#topo-lines path, path').forEach((path) => {
      const len = measurePath(path);
      path.style.strokeDasharray = `${len}`;
      path.style.strokeDashoffset = `${len}`;
    });
  }

  function releaseTopoPaths() {
    document.querySelectorAll('#topo-lines path').forEach((path) => {
      path.style.removeProperty('stroke-dasharray');
      path.style.removeProperty('stroke-dashoffset');
    });
  }

  window.maskTopoPaths = maskTopoPaths;
  window.releaseTopoPaths = releaseTopoPaths;
})();
