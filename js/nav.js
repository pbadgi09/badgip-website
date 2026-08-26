import { getMountedSectionIds } from './render-sections.js';

export function initNav() {
  const nav = document.getElementById('siteNav');
  const toggle = document.getElementById('navToggle');
  const navList = document.getElementById('navList');

  const closeMobileNav = () => {
    nav.dataset.open = 'false';
    toggle.setAttribute('aria-expanded', 'false');
  };

  toggle.addEventListener('click', () => {
    const isOpen = nav.dataset.open === 'true';
    nav.dataset.open = String(!isOpen);
    toggle.setAttribute('aria-expanded', String(!isOpen));
  });

  navList.querySelectorAll('a').forEach((link) => {
    link.addEventListener('click', closeMobileNav);
  });

  // The overlay had no keyboard escape hatch before this — once open via
  // the hamburger, Escape did nothing, so a keyboard user had to tab all
  // the way through every link to get back out.
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && nav.dataset.open === 'true') {
      closeMobileNav();
      toggle.focus();
    }
  });

  const sections = getMountedSectionIds()
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
