import { updateSectionNumbers } from './render-sections.js';

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

  initAutoHideNearContact();
}

// The mode switch is a fixed, viewport-relative pill — without this it would
// permanently sit on top of whatever content is at that screen position once
// the page is scrolled near the end, including the contact form's submit
// button. Stepping it out of the way once Contact is in view avoids that.
function initAutoHideNearContact() {
  const contact = document.getElementById('contact');
  const modeSwitch = document.getElementById('modeSwitch');
  if (!contact || !modeSwitch || !window.IntersectionObserver) return;

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        modeSwitch.classList.toggle('is-near-footer', entry.isIntersecting);
      });
    },
    { rootMargin: '0px 0px -20% 0px', threshold: 0 }
  );
  observer.observe(contact);
}

function applyMode(mode, { animate }) {
  document.body.dataset.mode = mode;

  document.querySelectorAll('[data-mode-btn]').forEach((btn) => {
    const isActive = btn.dataset.modeBtn === mode;
    btn.classList.toggle('is-active', isActive);
    btn.setAttribute('aria-selected', String(isActive));
  });

  updateSectionNumbers(mode);

  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  document.querySelectorAll('#dynamicSections > [data-mode], #navList > li[data-mode]').forEach((el) => {
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
