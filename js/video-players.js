(function () {
  const IFRAME_ALLOW =
    'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share';

  function formatDuration(totalSeconds) {
    const seconds = Number(totalSeconds);
    if (!Number.isFinite(seconds) || seconds <= 0) return '';

    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const remaining = seconds % 60;

    if (hours > 0) {
      return `${hours}:${String(minutes).padStart(2, '0')}:${String(remaining).padStart(2, '0')}`;
    }

    return `${minutes}:${String(remaining).padStart(2, '0')}`;
  }

  document.querySelectorAll('[data-duration]').forEach((button) => {
    const display = button.querySelector('[data-duration-display]');
    if (display) {
      display.textContent = formatDuration(button.dataset.duration);
    }
  });

  function createYoutubeIframe(id, title) {
    const iframe = document.createElement('iframe');
    iframe.src = `https://www.youtube.com/embed/${id}?rel=0&modestbranding=1&autoplay=1`;
    iframe.title = title;
    iframe.allow = IFRAME_ALLOW;
    iframe.referrerPolicy = 'strict-origin-when-cross-origin';
    iframe.allowFullscreen = true;
    iframe.loading = 'lazy';
    return iframe;
  }

  document.querySelectorAll('.video-placeholder[data-youtube-id]').forEach((button) => {
    button.addEventListener('click', () => {
      const id = button.dataset.youtubeId;
      const container = button.closest('.video-block-inner, .short-player');
      const title = button.getAttribute('aria-label') || 'Vidéo YouTube';

      if (!id || !container || container.classList.contains('is-playing')) return;

      container.classList.add('video-embed', 'is-playing');
      button.replaceWith(createYoutubeIframe(id, title));
      button.removeAttribute('data-cursor');
    });
  });
})();
