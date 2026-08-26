import { updateSectionNumbers } from './render-sections.js';

export function initModeSwitch() {
  applyMode('professional', { animate: false });

  const buttons = document.querySelectorAll('[data-mode-btn]');
  buttons.forEach((btn) => {
    btn.addEventListener('click', () => {
      applyMode(btn.dataset.modeBtn, { animate: true });
    });
  });

  initAutoHideNearContact();

  // Some browsers restore the exact prior DOM/JS state from the back-
  // forward cache on navigation (e.g. hitting Back) instead of re-running
  // this script from scratch — without this, the site could come back
  // showing whatever mode was active when the tab was left, instead of
  // always starting on Professional.
  window.addEventListener('pageshow', (event) => {
    if (event.persisted) {
      applyMode('professional', { animate: false });
    }
  });
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

  document.querySelectorAll('#dynamicSections > [data-mode], #navList > li[data-mode], #contact[data-mode]').forEach((el) => {
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

  // Hiding/showing whole sections changes total page height, which leaves
  // Lenis's cached scroll range and GSAP ScrollTrigger's cached trigger
  // positions stale until refreshed — without this, switching modes could
  // leave the page scrollable past where content actually ends, or make
  // scroll-reveal/timeline animations fire at the wrong scroll position.
  const refreshScroll = () => {
    window.__lenis?.resize();
    window.ScrollTrigger?.refresh();
  };
  if (animate && window.gsap && !reducedMotion) {
    // Wait past the longest of the fade transitions above so refresh reads
    // final, settled layout instead of a mid-transition snapshot.
    setTimeout(refreshScroll, 320);
  } else {
    refreshScroll();
  }
}
