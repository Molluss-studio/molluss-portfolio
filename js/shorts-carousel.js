(function () {
  const carousel = document.querySelector('[data-shorts-carousel]');
  if (!carousel) return;

  const viewport = carousel.querySelector('.shorts-carousel-viewport');
  const track = carousel.querySelector('.shorts-grid');
  const prevBtn = carousel.querySelector('.shorts-carousel-btn--prev');
  const nextBtn = carousel.querySelector('.shorts-carousel-btn--next');
  const cards = [...carousel.querySelectorAll('.short-card')];

  if (!viewport || !track || !prevBtn || !nextBtn || !cards.length) return;

  const mobileCarousel = window.matchMedia('(max-width: 900px)');

  let scrollRaf = 0;
  let snapTimer = 0;

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

  function getActiveIndex() {
    const step = getScrollStep();
    if (!step) return 0;

    const maxScroll = Math.max(0, viewport.scrollWidth - viewport.clientWidth);
    const index = Math.round(viewport.scrollLeft / step);
    const maxIndex = cards.length - 1;

    if (viewport.scrollLeft >= maxScroll - 2) return maxIndex;
    return Math.min(maxIndex, Math.max(0, index));
  }

  function updateButtons() {
    const maxScroll = viewport.scrollWidth - viewport.clientWidth;
    prevBtn.disabled = viewport.scrollLeft <= 2;
    nextBtn.disabled = viewport.scrollLeft >= maxScroll - 2;
  }

  function updateCardFocus() {
    const bounds = viewport.getBoundingClientRect();
    const tolerance = 6;

    if (mobileCarousel.matches) {
      const activeIndex = getActiveIndex();

      cards.forEach((card, index) => {
        const rect = card.getBoundingClientRect();
        const partiallyVisible = rect.right > bounds.left + 2 && rect.left < bounds.right - 2;
        const isFocused = index === activeIndex;

        card.classList.toggle('is-short-focused', isFocused);
        card.classList.toggle('is-short-peek', partiallyVisible && !isFocused);
      });
      return;
    }

    cards.forEach((card) => {
      const rect = card.getBoundingClientRect();
      const fullyVisible =
        rect.left >= bounds.left - tolerance && rect.right <= bounds.right + tolerance;
      const partiallyVisible = rect.right > bounds.left && rect.left < bounds.right;

      card.classList.toggle('is-short-focused', fullyVisible);
      card.classList.toggle('is-short-peek', partiallyVisible && !fullyVisible);
    });
  }

  function snapToNearestCard() {
    const step = getScrollStep();
    if (!step) return;

    const maxScroll = Math.max(0, viewport.scrollWidth - viewport.clientWidth);
    const target = Math.min(getActiveIndex() * step, maxScroll);

    if (Math.abs(viewport.scrollLeft - target) > 3) {
      viewport.scrollTo({
        left: target,
        behavior: prefersReducedMotion() ? 'auto' : 'smooth',
      });
      return;
    }

    updateCardFocus();
    updateButtons();
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

  function scheduleSnap() {
    if (snapTimer) window.clearTimeout(snapTimer);

    snapTimer = window.setTimeout(() => {
      snapTimer = 0;
      snapToNearestCard();
    }, 90);
  }

  function scrollToIndex(index) {
    const step = getScrollStep();
    if (!step) return;

    const maxScroll = Math.max(0, viewport.scrollWidth - viewport.clientWidth);
    const target = Math.min(Math.max(0, index) * step, maxScroll);

    viewport.scrollTo({
      left: target,
      behavior: prefersReducedMotion() ? 'auto' : 'smooth',
    });
  }

  function scrollByCard(direction) {
    scrollToIndex(getActiveIndex() + direction);
  }

  prevBtn.addEventListener('click', () => scrollByCard(-1));
  nextBtn.addEventListener('click', () => scrollByCard(1));

  viewport.addEventListener(
    'scroll',
    () => {
      scheduleRefresh();
      scheduleSnap();
    },
    { passive: true }
  );

  viewport.addEventListener('scrollend', snapToNearestCard, { passive: true });

  viewport.addEventListener('keydown', (event) => {
    if (event.key === 'ArrowLeft') {
      event.preventDefault();
      scrollByCard(-1);
    } else if (event.key === 'ArrowRight') {
      event.preventDefault();
      scrollByCard(1);
    }
  });

  window.addEventListener('resize', () => {
    scheduleRefresh();
    scheduleSnap();
  }, { passive: true });

  mobileCarousel.addEventListener('change', () => {
    scheduleRefresh();
    scheduleSnap();
  });

  window.addEventListener('load', () => {
    refreshCarousel();
    snapToNearestCard();
  }, { passive: true });

  refreshCarousel();
})();
