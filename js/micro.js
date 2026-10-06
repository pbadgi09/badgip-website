// Small cursor-level micro-interactions that don't belong to any one
// section. Currently: "magnetic" large CTAs that lean toward the cursor
// while hovered. Disabled entirely under reduced-motion (and on coarse
// pointers, where there's no cursor to be magnetic toward).

const MAX_PULL = 6; // px

export function initMicroInteractions() {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  if (window.matchMedia('(hover: none)').matches) return;

  document.querySelectorAll('.btn--lg').forEach((btn) => {
    btn.addEventListener('pointermove', (e) => {
      const rect = btn.getBoundingClientRect();
      const relX = (e.clientX - rect.left) / rect.width - 0.5; // -0.5..0.5
      const relY = (e.clientY - rect.top) / rect.height - 0.5;
      const x = Math.max(-MAX_PULL, Math.min(MAX_PULL, relX * rect.width * 0.25));
      const y = Math.max(-MAX_PULL, Math.min(MAX_PULL, relY * rect.height * 0.5));
      btn.style.transform = `translate(${x}px, ${y}px)`;
    });
    btn.addEventListener('pointerleave', () => {
      btn.style.transform = '';
    });
  });
}
