// Most anchors (#home, #projects, #contact) are fixed ids and resolve via
// an exact match. #about doesn't: the About section's real id is
// mode-suffixed (about-professional/about-personal, see render-sections.js
// — needed so both can coexist in the DOM) so a literal "#about" href never
// matches anything on its own. Falling back to a prefix match lets any
// #about link (hero CTAs, hand-typed settings) resolve to whichever mode's
// About section is actually mounted, without needing every link to know
// the current mode.
function resolveScrollTarget(hash) {
  const exact = document.querySelector(hash);
  if (exact) return exact;
  const id = hash.slice(1);
  if (!id) return null;
  return document.querySelector(`[id^="${id}-"]`);
}

export function initSmoothScroll() {
  if (!window.Lenis || !window.gsap || !window.ScrollTrigger) return null;

  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (prefersReducedMotion) return null;

  // Short duration + a fast-decelerating cubic ease-out reads as "snappy"
  // rather than the heavier, slower-settling feel a longer duration or an
  // expo curve gives — the scroll should feel like it's keeping up with
  // the wheel, not gliding on its own after you've stopped.
  const lenis = new window.Lenis({
    duration: 0.45,
    easing: (t) => 1 - Math.pow(1 - t, 2.5),
    smoothWheel: true,
    wheelMultiplier: 1.4,
    touchMultiplier: 2,
  });

  // Exposed so modal/overlay code (scroll-lock.js) can stop/start Lenis
  // around opening a full-screen panel — toggling body's overflow while
  // Lenis keeps recalculating its scroll dimensions on its own RAF loop is
  // what was causing scroll-reveal animations to spuriously reverse.
  window.__lenis = lenis;

  lenis.on('scroll', window.ScrollTrigger.update);

  window.gsap.ticker.add((time) => {
    lenis.raf(time * 1000);
  });
  window.gsap.ticker.lagSmoothing(0);

  const nav = document.getElementById('siteNav');

  document.querySelectorAll('a[href^="#"]').forEach((link) => {
    link.addEventListener('click', (e) => {
      const id = link.getAttribute('href');
      const target = resolveScrollTarget(id);
      if (target) {
        e.preventDefault();
        const navOffset = nav ? nav.offsetHeight + 16 : 20;
        lenis.scrollTo(target, { offset: -navOffset });
      }
    });
  });

  return lenis;
}
