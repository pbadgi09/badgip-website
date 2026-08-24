export function initPreloader() {
  return new Promise((resolve) => {
    const preloader = document.getElementById('preloader');
    const digit = document.getElementById('preloaderDigit');
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (prefersReducedMotion || !window.gsap) {
      preloader.classList.add('is-hidden');
      resolve();
      return;
    }

    const counter = { value: 0 };
    window.gsap.to(counter, {
      value: 100,
      duration: 1.1,
      ease: 'power2.out',
      onUpdate: () => {
        digit.textContent = String(Math.floor(counter.value)).padStart(2, '0');
      },
      onComplete: () => {
        window.gsap.to(preloader, {
          opacity: 0,
          duration: 0.5,
          delay: 0.15,
          onComplete: () => {
            preloader.classList.add('is-hidden');
            resolve();
          },
        });
      },
    });
  });
}

export function initHeroEntrance() {
  if (!window.gsap) return;
  const tl = window.gsap.timeline({ defaults: { ease: 'power3.out', duration: 0.9 } });
  tl.to('#heroGreeting', { opacity: 1, y: 0 })
    .to('#heroName', { opacity: 1, y: 0 }, '-=0.6')
    .to('#heroRole', { opacity: 1, y: 0 }, '-=0.6')
    .to('#heroDescription', { opacity: 1, y: 0 }, '-=0.6')
    .to('.hero__cta', { opacity: 1, y: 0 }, '-=0.5');
}

export function initScrollReveals() {
  if (!window.gsap || !window.ScrollTrigger) return;
  window.gsap.registerPlugin(window.ScrollTrigger);

  const targets = document.querySelectorAll('.reveal:not(.hero .reveal)');
  targets.forEach((el) => {
    window.gsap.fromTo(
      el,
      { opacity: 0, y: 32 },
      {
        opacity: 1,
        y: 0,
        duration: 0.8,
        ease: 'power3.out',
        scrollTrigger: {
          trigger: el,
          start: 'top 88%',
          toggleActions: 'play none none reverse',
        },
      }
    );
  });
}

export function initTimelineScroll() {
  if (!window.gsap || !window.ScrollTrigger) return;

  const timelineEl = document.getElementById('timelineProfessional');
  const progressEl = document.getElementById('timelineProgress');
  if (!timelineEl || !progressEl) return;

  window.gsap.to(progressEl, {
    height: '100%',
    ease: 'none',
    scrollTrigger: {
      trigger: timelineEl,
      start: 'top 60%',
      end: 'bottom 60%',
      scrub: 0.5,
    },
  });

  const items = timelineEl.querySelectorAll('.timeline__item');
  items.forEach((item) => {
    window.ScrollTrigger.create({
      trigger: item,
      start: 'top 70%',
      onEnter: () => item.classList.add('is-visible'),
      onLeaveBack: () => item.classList.remove('is-visible'),
    });
  });
}
