(function () {
  const IFRAME_ALLOW =
    'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share';

  const PREVIEW_SEGMENT_SEC = 5;
  const PREVIEW_JUMP_MS = 4200;
  const PREVIEW_MIN_DURATION = 12;

  const canHoverPreview = window.matchMedia(
    '(hover: hover) and (pointer: fine) and (prefers-reduced-motion: no-preference)'
  ).matches;

  let youtubeApiPromise = null;
  let activePreview = null;
  let previewUid = 0;

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

  function loadYouTubeAPI() {
    if (youtubeApiPromise) return youtubeApiPromise;

    youtubeApiPromise = new Promise((resolve) => {
      const finish = () => {
        if (window.YT && window.YT.Player) resolve();
      };

      if (window.YT && window.YT.Player) {
        resolve();
        return;
      }

      const previousReady = window.onYouTubeIframeAPIReady;
      window.onYouTubeIframeAPIReady = () => {
        if (typeof previousReady === 'function') previousReady();
        finish();
      };

      if (!document.getElementById('youtube-iframe-api')) {
        const tag = document.createElement('script');
        tag.id = 'youtube-iframe-api';
        tag.src = 'https://www.youtube.com/iframe_api';
        document.head.appendChild(tag);
      }

      const poll = setInterval(() => {
        if (window.YT && window.YT.Player) {
          clearInterval(poll);
          resolve();
        }
      }, 80);
      setTimeout(() => clearInterval(poll), 12000);
    });

    return youtubeApiPromise;
  }

  function pickRandomStart(durationSec) {
    const duration = Math.max(1, Math.floor(Number(durationSec) || 60));
    const windowSec = Math.min(
      PREVIEW_SEGMENT_SEC,
      Math.max(3, Math.floor(duration * 0.12))
    );
    const maxStart = Math.max(0, duration - windowSec);
    if (maxStart <= 0) return 0;
    return Math.floor(Math.random() * (maxStart + 1));
  }

  function createYoutubeIframe(id, title, autoplay) {
    const iframe = document.createElement('iframe');
    const params = new URLSearchParams({
      rel: '0',
      modestbranding: '1',
    });
    if (autoplay) params.set('autoplay', '1');
    iframe.src = `https://www.youtube.com/embed/${id}?${params}`;
    iframe.title = title;
    iframe.allow = IFRAME_ALLOW;
    iframe.referrerPolicy = 'strict-origin-when-cross-origin';
    iframe.allowFullscreen = true;
    iframe.loading = 'lazy';
    return iframe;
  }

  function stopPreview(preview) {
    if (!preview) return;

    if (preview.jumpTimer) {
      clearInterval(preview.jumpTimer);
      preview.jumpTimer = null;
    }

    if (preview.player) {
      try {
        preview.player.destroy();
      } catch {
        /* player may already be torn down */
      }
      preview.player = null;
    }

    if (preview.layer && preview.layer.parentNode) {
      preview.layer.remove();
    }

    if (preview.container) {
      preview.container.classList.remove('is-previewing');
    }

    if (activePreview === preview) activePreview = null;
  }

  function stopActivePreview() {
    if (activePreview) stopPreview(activePreview);
  }

  function scheduleSegmentJump(preview) {
    if (preview.jumpTimer) clearInterval(preview.jumpTimer);

    preview.jumpTimer = setInterval(() => {
      if (!preview.player || typeof preview.player.seekTo !== 'function') return;

      const next = pickRandomStart(preview.durationSec);
      try {
        preview.player.seekTo(next, true);
        preview.player.playVideo();
      } catch {
        /* ignore seek errors while tearing down */
      }
    }, PREVIEW_JUMP_MS);
  }

  function startPreview(button) {
    const id = button.dataset.youtubeId;
    const container = button.closest('.video-block-inner, .short-player');
    if (!id || !container || container.classList.contains('is-playing')) return;
    if (activePreview && activePreview.button === button) return;

    const durationSec = Number(button.dataset.duration) || PREVIEW_MIN_DURATION;
    if (durationSec < 3) return;

    stopActivePreview();

    const layer = document.createElement('div');
    layer.className = 'video-preview-layer';
    layer.setAttribute('aria-hidden', 'true');

    const mount = document.createElement('div');
    const mountId = `video-preview-${++previewUid}`;
    mount.id = mountId;
    layer.appendChild(mount);
    container.insertBefore(layer, button);
    container.classList.add('is-previewing');

    const preview = {
      button,
      container,
      layer,
      mountId,
      durationSec,
      player: null,
      jumpTimer: null,
    };
    activePreview = preview;

    loadYouTubeAPI().then(() => {
      if (activePreview !== preview || !document.getElementById(mountId)) return;

      const startAt = pickRandomStart(durationSec);

      preview.player = new window.YT.Player(mountId, {
        videoId: id,
        width: '100%',
        height: '100%',
        playerVars: {
          autoplay: 1,
          mute: 1,
          controls: 0,
          rel: 0,
          modestbranding: 1,
          playsinline: 1,
          start: startAt,
          iv_load_policy: 3,
          disablekb: 1,
          fs: 0,
          origin: window.location.origin,
        },
        events: {
          onReady: (event) => {
            if (activePreview !== preview) return;
            event.target.mute();
            event.target.playVideo();
            if (durationSec >= PREVIEW_MIN_DURATION) {
              scheduleSegmentJump(preview);
            }
          },
          onStateChange: (event) => {
            if (activePreview !== preview) return;
            if (event.data === window.YT.PlayerState.ENDED) {
              event.target.seekTo(pickRandomStart(durationSec), true);
              event.target.playVideo();
            }
          },
        },
      });
    });
  }

  function bindHoverPreview(button) {
    const container = button.closest('.video-block-inner, .short-player');
    if (!container) return;

    let leaveTimer = null;

    const clearLeaveTimer = () => {
      if (leaveTimer) {
        clearTimeout(leaveTimer);
        leaveTimer = null;
      }
    };

    button.addEventListener('mouseenter', () => {
      clearLeaveTimer();
      startPreview(button);
    });

    container.addEventListener('mouseenter', () => {
      clearLeaveTimer();
      startPreview(button);
    });

    button.addEventListener('mouseleave', () => {
      clearLeaveTimer();
      leaveTimer = setTimeout(() => {
        if (activePreview && activePreview.button === button) {
          stopPreview(activePreview);
        }
      }, 80);
    });

    container.addEventListener('mouseleave', (event) => {
      if (event.relatedTarget && container.contains(event.relatedTarget)) return;
      clearLeaveTimer();
      leaveTimer = setTimeout(() => {
        if (activePreview && activePreview.container === container) {
          stopPreview(activePreview);
        }
      }, 80);
    });
  }

  document.querySelectorAll('.video-placeholder[data-youtube-id]').forEach((button) => {
    if (canHoverPreview) bindHoverPreview(button);

    button.addEventListener('click', () => {
      const id = button.dataset.youtubeId;
      const container = button.closest('.video-block-inner, .short-player');
      const title = button.getAttribute('aria-label') || 'Vidéo YouTube';

      if (!id || !container || container.classList.contains('is-playing')) return;

      if (activePreview && activePreview.button === button) {
        stopPreview(activePreview);
      } else {
        stopActivePreview();
      }

      container.classList.remove('is-previewing');
      container.classList.add('video-embed', 'is-playing');
      button.replaceWith(createYoutubeIframe(id, title, true));
      button.removeAttribute('data-cursor');
    });
  });
})();
