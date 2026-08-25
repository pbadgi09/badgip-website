// Shared full-screen matched-geometry (FLIP) panel used by both the
// project detail view and the blog post detail view, so they behave
// identically (and share the same, once-fixed, scroll-lock behavior)
// instead of each having their own subtly different implementation.
import { lockBodyScroll, unlockBodyScroll } from './scroll-lock.js';

let openState = null; // { id, sourceEl, panel, escHandler }

export function isFullscreenOpen(id) {
  return openState ? (id === undefined || openState.id === id) : false;
}

export function openFullscreen({ id, sourceEl, innerHTML, accentColor, textColor, onClosed }) {
  if (openState) return;

  const sourceRect = sourceEl.getBoundingClientRect();
  const sourceRadius = parseFloat(getComputedStyle(sourceEl).borderRadius) || 24;

  lockBodyScroll();

  const panel = document.createElement('div');
  panel.className = 'fullscreen-panel';
  panel.innerHTML = innerHTML;
  if (accentColor) {
    panel.style.setProperty('--color-accent', accentColor);
    panel.style.setProperty('--color-accent-dim', accentColor);
  }
  if (textColor) {
    panel.style.color = textColor;
    panel.style.setProperty('--color-text-dim', textColor);
  }
  document.body.appendChild(panel);

  const content = panel.querySelector('.fullscreen-panel__content');
  const closeBtn = panel.querySelector('.fullscreen-panel__close');
  const fadeTargets = [content, closeBtn].filter(Boolean);

  const escHandler = (e) => {
    if (e.key === 'Escape') closeFullscreen();
  };
  document.addEventListener('keydown', escHandler);
  closeBtn?.addEventListener('click', () => closeFullscreen());

  sourceEl.classList.add('is-expanded');
  openState = { id, sourceEl, panel, escHandler, onClosed };

  if (!window.gsap) {
    panel.style.position = 'fixed';
    panel.style.inset = '0';
    panel.style.overflowY = 'auto';
    fadeTargets.forEach((el) => (el.style.opacity = '1'));
    return;
  }

  const vw = window.innerWidth;
  const vh = window.innerHeight;

  window.gsap.set(panel, {
    position: 'fixed',
    top: sourceRect.top,
    left: sourceRect.left,
    width: sourceRect.width,
    height: sourceRect.height,
    borderRadius: sourceRadius,
    overflow: 'hidden',
  });
  window.gsap.set(fadeTargets, { opacity: 0, y: 16 });

  const tl = window.gsap.timeline({
    onComplete: () => {
      panel.style.overflowY = 'auto';
    },
  });
  tl.to(panel, {
    top: 0,
    left: 0,
    width: vw,
    height: vh,
    borderRadius: 0,
    duration: 0.6,
    ease: 'power3.inOut',
  }).to(fadeTargets, { opacity: 1, y: 0, duration: 0.4, ease: 'power2.out' }, '-=0.25');
}

export function closeFullscreen() {
  if (!openState) return;
  const { sourceEl, panel, escHandler, onClosed } = openState;
  document.removeEventListener('keydown', escHandler);
  sourceEl.classList.remove('is-expanded');
  openState = null;

  if (!window.gsap) {
    panel.remove();
    unlockBodyScroll();
    onClosed?.();
    return;
  }

  const sourceRect = sourceEl.getBoundingClientRect();
  const sourceRadius = parseFloat(getComputedStyle(sourceEl).borderRadius) || 24;
  const content = panel.querySelector('.fullscreen-panel__content');
  const closeBtn = panel.querySelector('.fullscreen-panel__close');
  const fadeTargets = [content, closeBtn].filter(Boolean);

  panel.style.overflowY = 'hidden';
  panel.scrollTop = 0;

  const tl = window.gsap.timeline({
    onComplete: () => {
      panel.remove();
      unlockBodyScroll();
      onClosed?.();
    },
  });
  tl.to(fadeTargets, { opacity: 0, y: 16, duration: 0.2, ease: 'power2.in' }).to(
    panel,
    {
      top: sourceRect.top,
      left: sourceRect.left,
      width: sourceRect.width,
      height: sourceRect.height,
      borderRadius: sourceRadius,
      duration: 0.5,
      ease: 'power3.inOut',
    },
    '-=0.05'
  );
}
