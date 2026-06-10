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

  function isMobile() {
    return mobileCarousel.matches;
  }

  function prefersReducedMotion() {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }

  function syncCardMetrics() {
    if (!isMobile()) {
      carousel.style.removeProperty('--short-card-width');
      return;
    }

    const peek = Math.round(Math.max(52, viewport.clientWidth * 0.26));
    const width = Math.max(132, viewport.clientWidth - peek);
    carousel.style.setProperty('--short-card-width', `${width}px`);
  }

  function getCardScrollLeft(index) {
    const card = cards[index];
    if (!card) return 0;
    return Math.max(0, card.offsetLeft - track.offsetLeft);
  }

  function getMaxScroll() {
    return Math.max(0, viewport.scrollWidth - viewport.clientWidth);
  }

  function getActiveIndex() {
    const scrollLeft = viewport.scrollLeft;
    let activeIndex = 0;
    let minDistance = Infinity;

    cards.forEach((_, index) => {
      const distance = Math.abs(scrollLeft - getCardScrollLeft(index));
      if (distance < minDistance) {
        minDistance = distance;
        activeIndex = index;
      }
    });

    return activeIndex;
  }

  function updateButtons() {
    const maxScroll = getMaxScroll();
    prevBtn.disabled = viewport.scrollLeft <= 2;
    nextBtn.disabled = viewport.scrollLeft >= maxScroll - 2;
  }

  function updateCardFocus() {
    const bounds = viewport.getBoundingClientRect();

    cards.forEach((card) => {
      const rect = card.getBoundingClientRect();
      const visibleWidth = Math.min(rect.right, bounds.right) - Math.max(rect.left, bounds.left);
      const ratio = rect.width > 0 ? visibleWidth / rect.width : 0;
      const isFocused = ratio >= 0.88;
      const isPeek = visibleWidth > 10 && !isFocused;

      card.classList.toggle('is-short-focused', isFocused);
      card.classList.toggle('is-short-peek', isPeek);
    });
  }

  function refreshCarousel() {
    syncCardMetrics();
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

  function scrollToIndex(index) {
    const clamped = Math.min(cards.length - 1, Math.max(0, index));
    const target = Math.min(getCardScrollLeft(clamped), getMaxScroll());

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

  viewport.addEventListener('scroll', scheduleRefresh, { passive: true });

  viewport.addEventListener('scrollend', scheduleRefresh, { passive: true });

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

  mobileCarousel.addEventListener('change', scheduleRefresh);

  window.addEventListener('load', refreshCarousel, { passive: true });

  refreshCarousel();
})();
