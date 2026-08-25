export function initNav() {
  const nav = document.getElementById('siteNav');
  const toggle = document.getElementById('navToggle');
  const navList = document.getElementById('navList');

  toggle.addEventListener('click', () => {
    const isOpen = nav.dataset.open === 'true';
    nav.dataset.open = String(!isOpen);
    toggle.setAttribute('aria-expanded', String(!isOpen));
  });

  navList.querySelectorAll('a').forEach((link) => {
    link.addEventListener('click', () => {
      nav.dataset.open = 'false';
      toggle.setAttribute('aria-expanded', 'false');
    });
  });

  const sections = ['home', 'about', 'projects', 'contact']
    .map((id) => document.getElementById(id))
    .filter(Boolean);

  const links = document.querySelectorAll('[data-nav-link]');

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          const id = entry.target.id;
          links.forEach((link) => {
            link.classList.toggle('is-active', link.dataset.navLink === id);
          });
        }
      });
    },
    { rootMargin: '-45% 0px -45% 0px' }
  );

  sections.forEach((section) => observer.observe(section));
}

export function initCursor() {
  if (!window.matchMedia('(hover: hover) and (pointer: fine)').matches) return;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  const dot = document.getElementById('cursorDot');
  let x = 0;
  let y = 0;
  let targetX = 0;
  let targetY = 0;
  let scale = 1;

  window.addEventListener('mousemove', (e) => {
    targetX = e.clientX;
    targetY = e.clientY;
  });

  function tick() {
    x += (targetX - x) * 0.2;
    y += (targetY - y) * 0.2;
    dot.style.transform = `translate(${x}px, ${y}px) translate(-50%, -50%) scale(${scale})`;
    requestAnimationFrame(tick);
  }
  tick();

  document.querySelectorAll('a, button, .project-card').forEach((el) => {
    el.addEventListener('mouseenter', () => {
      scale = 2.2;
    });
    el.addEventListener('mouseleave', () => {
      scale = 1;
    });
  });
}
