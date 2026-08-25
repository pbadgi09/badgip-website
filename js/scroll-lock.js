// Shared scroll-lock helper for full-screen/modal overlays.
//
// This locks `<html>`, not `<body>`: <html> is the actual scroll owner on
// this site (see reset.css — overflow-x:hidden lives on html specifically
// so the mismatched-axis rule promotes html's overflow-y to auto, making it
// the root scroller Lenis drives). Locking `<body>` instead is a classic
// trap here: body also has `height: 100%` (reset.css), and once body gets
// `overflow: hidden` too, its overflowing content stops contributing to
// html's scrollable area at all — html's scrollHeight collapses to a single
// viewport, scrollTop snaps to 0, and every ScrollTrigger-driven .reveal
// below the fold reverses back to invisible. Locking html directly avoids
// that collapse entirely.
let lockCount = 0;
let savedOverflow = '';

export function lockBodyScroll() {
  lockCount += 1;
  if (lockCount > 1) return;

  savedOverflow = document.documentElement.style.overflow;
  document.documentElement.style.overflow = 'hidden';
  window.ScrollTrigger?.config({ autoRefreshEvents: 'none' });
  window.__lenis?.stop();
}

export function unlockBodyScroll() {
  lockCount = Math.max(0, lockCount - 1);
  if (lockCount > 0) return;

  document.documentElement.style.overflow = savedOverflow;
  // Restore GSAP's actual default (autoRefreshEvents defaults to including
  // "resize" — leaving it off here would permanently disable ScrollTrigger's
  // normal resize-refresh behavior for the rest of the page's life).
  window.ScrollTrigger?.config({ autoRefreshEvents: 'visibilitychange,DOMContentLoaded,load,resize' });
  window.__lenis?.start();
}
