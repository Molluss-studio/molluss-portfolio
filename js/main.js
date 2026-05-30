(function () {
  const dot = document.querySelector('.cursor-dot');
  const ring = document.querySelector('.cursor-ring');
  const label = document.querySelector('.cursor-label');
  const isTouch = window.matchMedia('(pointer: coarse)').matches;

  let mouseX = 0;
  let mouseY = 0;
  let ringX = 0;
  let ringY = 0;
  let activeCursorEl = null;

  if (!isTouch && dot && ring) {
    document.addEventListener('mousemove', (e) => {
      mouseX = e.clientX;
      mouseY = e.clientY;
      dot.style.left = mouseX + 'px';
      dot.style.top = mouseY + 'px';
    });

    function animateRing() {
      ringX += (mouseX - ringX) * 0.15;
      ringY += (mouseY - ringY) * 0.15;
      ring.style.left = ringX + 'px';
      ring.style.top = ringY + 'px';
      if (label) {
        label.style.left = ringX + 'px';
        label.style.top = ringY + 'px';
      }
      requestAnimationFrame(animateRing);
    }
    animateRing();

    function activateCursor(el, text) {
      activeCursorEl = el;
      ring.classList.add('hover');
      if (label) {
        label.textContent = text;
        label.classList.add('visible');
      }
    }

    function clearCursor() {
      activeCursorEl = null;
      ring.classList.remove('hover');
      if (label) {
        label.classList.remove('visible');
        label.textContent = '';
      }
    }

    document.querySelectorAll('[data-cursor]').forEach((el) => {
      el.addEventListener('pointerenter', () => {
        activateCursor(el, el.dataset.cursor || '');
      });
      el.addEventListener('pointerleave', () => {
        if (activeCursorEl === el) clearCursor();
      });
    });

    document.querySelectorAll('a, button, .btn-primary, .btn-accent').forEach((el) => {
      if (el.hasAttribute('data-cursor')) return;

      el.addEventListener('pointerenter', () => {
        if (!activeCursorEl) ring.classList.add('hover');
      });
      el.addEventListener('pointerleave', () => {
        if (!activeCursorEl) ring.classList.remove('hover');
      });
    });
  }

  const reveals = document.querySelectorAll('.reveal');
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
          observer.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.12, rootMargin: '0px 0px -40px 0px' }
  );
  reveals.forEach((el) => observer.observe(el));

  function revealHero() {
    document.querySelectorAll('.hero .reveal').forEach((el) => {
      el.classList.add('visible');
    });
  }

  if (document.getElementById('site-loader')) {
    document.addEventListener('site:loaded', revealHero, { once: true });
  } else {
    revealHero();
  }
})();
