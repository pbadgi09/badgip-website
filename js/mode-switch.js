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

let pendingRefreshTimer = null;

function applyMode(mode, { animate }) {
  document.body.dataset.mode = mode;

  document.querySelectorAll('[data-mode-btn]').forEach((btn) => {
    const isActive = btn.dataset.modeBtn === mode;
    btn.classList.toggle('is-active', isActive);
    btn.setAttribute('aria-selected', String(isActive));
  });

  updateSectionNumbers(mode);

  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // A user-triggered switch always jumps back to the top of the page —
  // without this, switching modes while scrolled into content that only
  // exists in one mode could fade things in/out entirely outside the
  // current viewport, reading as "nothing happened." Reuses the same
  // Lenis instance nav-link clicks already scroll with, so it's the same
  // smooth motion as the rest of the site; falls back to a native smooth
  // scroll when Lenis isn't active yet (reduced motion, or before
  // smooth-scroll has initialized this early in boot).
  if (animate) {
    // window.__lenis only ever exists when reduced-motion is off (Lenis
    // itself declines to initialize otherwise), so the native fallback
    // below already covers the reduced-motion case correctly.
    if (window.__lenis) {
      window.__lenis.scrollTo(0);
    } else {
      window.scrollTo({ top: 0, behavior: reducedMotion ? 'auto' : 'smooth' });
    }
  }

  document.querySelectorAll('#dynamicSections > [data-mode], #navList > li[data-mode], #contact[data-mode]').forEach((el) => {
    const matches = el.dataset.mode === mode;
    if (animate && window.gsap && !reducedMotion) {
      // Toggling the mode again before a previous transition finished left
      // a real bug: an in-flight "hide" tween's onComplete (fired ~250ms
      // later) would still set `hidden = true` on an element a newer,
      // faster toggle had already decided should be visible again — killing
      // any tween still running on this element before starting a fresh one
      // means only the most recent call's transition ever completes.
      window.gsap.killTweensOf(el);
      if (matches) {
        el.hidden = false;
        window.gsap.fromTo(el, { opacity: 0, y: 8 }, { opacity: 1, y: 0, duration: 0.25, ease: 'power2.out' });
      } else {
        window.gsap.to(el, {
          opacity: 0,
          y: -8,
          duration: 0.15,
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
    // Debounced: rapid re-toggling would otherwise stack up one of these
    // per click, each reading a still-mid-transition layout.
    if (pendingRefreshTimer) clearTimeout(pendingRefreshTimer);
    pendingRefreshTimer = setTimeout(() => {
      pendingRefreshTimer = null;
      refreshScroll();
    }, 200);
  } else {
    if (pendingRefreshTimer) {
      clearTimeout(pendingRefreshTimer);
      pendingRefreshTimer = null;
    }
    refreshScroll();
  }
}
