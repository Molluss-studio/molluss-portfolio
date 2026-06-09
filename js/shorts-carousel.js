(function () {
  const carousel = document.querySelector('[data-shorts-carousel]');
  if (!carousel) return;

  const viewport = carousel.querySelector('.shorts-carousel-viewport');
  const track = carousel.querySelector('.shorts-grid');
  const prevBtn = carousel.querySelector('.shorts-carousel-btn--prev');
  const nextBtn = carousel.querySelector('.shorts-carousel-btn--next');
  const cards = [...carousel.querySelectorAll('.short-card')];

  if (!viewport || !track || !prevBtn || !nextBtn || !cards.length) return;

  let scrollRaf = 0;

  function prefersReducedMotion() {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }

  function getScrollStep() {
    const card = cards[0];
    if (!card) return 0;

    const styles = getComputedStyle(track);
    const gap = parseFloat(styles.columnGap || styles.gap) || 0;
    return card.offsetWidth + gap;
  }

  function updateButtons() {
    const maxScroll = viewport.scrollWidth - viewport.clientWidth;
    prevBtn.disabled = viewport.scrollLeft <= 2;
    nextBtn.disabled = viewport.scrollLeft >= maxScroll - 2;
  }

  function updateCardFocus() {
    const bounds = viewport.getBoundingClientRect();
    const tolerance = 6;

    cards.forEach((card) => {
      const rect = card.getBoundingClientRect();
      const fullyVisible =
        rect.left >= bounds.left - tolerance && rect.right <= bounds.right + tolerance;
      const partiallyVisible = rect.right > bounds.left && rect.left < bounds.right;

      card.classList.toggle('is-short-focused', fullyVisible);
      card.classList.toggle('is-short-peek', partiallyVisible && !fullyVisible);
    });
  }

  function refreshCarousel() {
    updateButtons();
    updateCardFocus();
  }

  function scheduleRefresh() {
    if (scrollRaf) return;

    scrollRaf = window.requestAnimationFrame(() => {
      scrollRaf = 0;
      refreshCarousel();
    });
  }

  function scrollByCard(direction) {
    const step = getScrollStep();
    if (!step) return;

    viewport.scrollBy({
      left: direction * step,
      behavior: prefersReducedMotion() ? 'auto' : 'smooth',
    });
  }

  prevBtn.addEventListener('click', () => scrollByCard(-1));
  nextBtn.addEventListener('click', () => scrollByCard(1));

  viewport.addEventListener('scroll', scheduleRefresh, { passive: true });

  viewport.addEventListener('keydown', (event) => {
    if (event.key === 'ArrowLeft') {
      event.preventDefault();
      scrollByCard(-1);
    } else if (event.key === 'ArrowRight') {
      event.preventDefault();
      scrollByCard(1);
    }
  });

  window.addEventListener('resize', scheduleRefresh, { passive: true });
  window.addEventListener('load', refreshCarousel, { passive: true });

  refreshCarousel();
})();
