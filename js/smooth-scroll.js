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

  lenis.on('scroll', window.ScrollTrigger.update);

  window.gsap.ticker.add((time) => {
    lenis.raf(time * 1000);
  });
  window.gsap.ticker.lagSmoothing(0);

  const nav = document.getElementById('siteNav');

  document.querySelectorAll('a[href^="#"]').forEach((link) => {
    link.addEventListener('click', (e) => {
      const id = link.getAttribute('href');
      const target = document.querySelector(id);
      if (target) {
        e.preventDefault();
        const navOffset = nav ? nav.offsetHeight + 16 : 20;
        lenis.scrollTo(target, { offset: -navOffset });
      }
    });
  });

  return lenis;
}
