// Shared full-screen matched-geometry (FLIP) panel used by both the
// project detail view and the blog post detail view, so they behave
// identically (and share the same, once-fixed, scroll-lock behavior)
// instead of each having their own subtly different implementation.
import { lockBodyScroll, unlockBodyScroll } from './scroll-lock.js';

let openState = null; // { id, sourceEl, panel, escHandler }
// Panels mid-close-animation when a new one is requested — openState goes
// null the instant close() is called (so a rapid re-open isn't blocked),
// but the old panel's shrink/fade tween is still running for ~0.5s. Without
// this, opening again in that window stacks a second .fullscreen-panel on
// top of the still-animating old one.
const closingPanels = []; // [{ panel, onClosed }]

export function isFullscreenOpen(id) {
  return openState ? (id === undefined || openState.id === id) : false;
}

function finishClosingPanelsNow() {
  closingPanels.splice(0).forEach(({ panel, onClosed }) => {
    window.gsap?.killTweensOf(panel);
    panel.remove();
    // The killed tween's onComplete never fires, so the lock it was going
    // to release on completion has to be released here instead — otherwise
    // lockCount never returns to 0 and scroll stays disabled forever.
    unlockBodyScroll();
    onClosed?.();
  });
}

export function openFullscreen({ id, sourceEl, innerHTML, accentColor, textColor, onClosed }) {
  if (openState) return;

  finishClosingPanelsNow();

  const sourceRect = sourceEl.getBoundingClientRect();
  const sourceRadius = parseFloat(getComputedStyle(sourceEl).borderRadius) || 24;

  lockBodyScroll();

  const panel = document.createElement('div');
  panel.className = 'fullscreen-panel';
  // Lenis hijacks wheel input globally; without this it keeps intercepting
  // (and preventDefault-ing) wheel events even inside this panel's own
  // overflow-y:auto content, so trackpad scroll silently does nothing here
  // and only dragging the native scrollbar thumb works. data-lenis-prevent
  // is Lenis's documented opt-out for nested scroll regions.
  panel.setAttribute('data-lenis-prevent', '');
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

  // GSAP tweens to explicit pixel top/left/width/height (needed for the FLIP
  // math), which then sit as inline styles that never track the viewport —
  // without this, resizing the window (or a mobile browser's chrome
  // showing/hiding and changing the viewport height) leaves the panel
  // pinned at whatever size it was when opened.
  const resizeHandler = () => {
    if (window.gsap) {
      window.gsap.set(panel, { top: 0, left: 0, width: window.innerWidth, height: window.innerHeight });
    } else {
      panel.style.width = '100vw';
      panel.style.height = '100vh';
    }
  };

  sourceEl.classList.add('is-expanded');
  openState = { id, sourceEl, panel, escHandler, onClosed, resizeHandler };

  if (!window.gsap) {
    panel.style.position = 'fixed';
    panel.style.inset = '0';
    panel.style.overflowY = 'auto';
    fadeTargets.forEach((el) => (el.style.opacity = '1'));
    window.addEventListener('resize', resizeHandler);
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
      window.addEventListener('resize', resizeHandler);
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
  const { sourceEl, panel, escHandler, onClosed, resizeHandler } = openState;
  document.removeEventListener('keydown', escHandler);
  window.removeEventListener('resize', resizeHandler);
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

  const closingEntry = { panel, onClosed };
  closingPanels.push(closingEntry);

  const tl = window.gsap.timeline({
    onComplete: () => {
      const index = closingPanels.indexOf(closingEntry);
      if (index !== -1) closingPanels.splice(index, 1);
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
