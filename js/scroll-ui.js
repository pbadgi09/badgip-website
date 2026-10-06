// Page-level scroll chrome: a thin top progress bar. Lenis is the
// authoritative scroll source when present — its `scroll` event carries
// `progress` and fires every frame it moves. A plain window listener is the
// fallback (reduced-motion, where Lenis isn't initialized).

export function initScrollUI() {
  const progress = document.createElement('div');
  progress.className = 'scroll-progress';
  progress.setAttribute('aria-hidden', 'true');
  document.body.appendChild(progress);

  function render(ratio) {
    progress.style.transform = `scaleX(${Math.max(0, Math.min(1, ratio || 0))})`;
  }

  function updateFromWindow() {
    const scrollTop = window.scrollY || document.documentElement.scrollTop || 0;
    const max = document.documentElement.scrollHeight - window.innerHeight;
    render(max > 0 ? scrollTop / max : 0);
  }

  if (window.__lenis) {
    window.__lenis.on('scroll', (e) => {
      const ratio =
        typeof e?.progress === 'number'
          ? e.progress
          : e?.limit > 0
          ? (e.scroll || 0) / e.limit
          : 0;
      render(ratio);
    });
  }

  let ticking = false;
  window.addEventListener(
    'scroll',
    () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        ticking = false;
        updateFromWindow();
      });
    },
    { passive: true }
  );
  window.addEventListener('resize', updateFromWindow);
  updateFromWindow();
}
