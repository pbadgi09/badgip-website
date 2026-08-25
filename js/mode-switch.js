const STORAGE_KEY = 'badgip.mode';

export function initModeSwitch() {
  const stored = localStorage.getItem(STORAGE_KEY);
  const initialMode = stored === 'personal' ? 'personal' : 'professional';
  applyMode(initialMode, { animate: false });

  const buttons = document.querySelectorAll('[data-mode-btn]');
  buttons.forEach((btn) => {
    btn.addEventListener('click', () => {
      const mode = btn.dataset.modeBtn;
      applyMode(mode, { animate: true });
      localStorage.setItem(STORAGE_KEY, mode);
    });
  });
}

function applyMode(mode, { animate }) {
  document.body.dataset.mode = mode;

  document.querySelectorAll('[data-mode-btn]').forEach((btn) => {
    const isActive = btn.dataset.modeBtn === mode;
    btn.classList.toggle('is-active', isActive);
    btn.setAttribute('aria-selected', String(isActive));
  });

  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  document.querySelectorAll('[data-mode-section] [data-mode]').forEach((el) => {
    const matches = el.dataset.mode === mode;
    if (animate && window.gsap && !reducedMotion) {
      if (matches) {
        el.hidden = false;
        window.gsap.fromTo(el, { opacity: 0, y: 12 }, { opacity: 1, y: 0, duration: 0.4, ease: 'power2.out' });
      } else {
        window.gsap.to(el, {
          opacity: 0,
          y: -12,
          duration: 0.25,
          ease: 'power2.in',
          onComplete: () => {
            el.hidden = true;
          },
        });
      }
    } else {
      el.hidden = !matches;
    }
  });
}
