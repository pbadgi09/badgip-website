import { getSettings, getAbout, getProjects } from './data-service.js';
import { renderHero, renderNav, renderContactAndFooter } from './render-home.js';
import { renderAbout } from './render-about.js';
import { renderProjects } from './render-projects.js';
import { initContactForm } from './contact-form.js';
import { initModeSwitch } from './mode-switch.js';
import { initNav } from './nav.js';
import { initSmoothScroll } from './smooth-scroll.js';
import { initPreloader, initHeroEntrance, initScrollReveals, initTimelineScroll } from './animations.js';
import { initWebglHero } from './webgl-hero.js';

async function boot() {
  document.body.classList.add('js-ready');

  initModeSwitch();
  initNav();
  initContactForm();

  const preloaderDone = initPreloader();

  const [settings, about, projects] = await Promise.all([getSettings(), getAbout(), getProjects()]);

  renderHero(settings);
  renderNav(settings);
  renderContactAndFooter(settings);
  renderAbout(about);
  renderProjects(projects);

  if (settings.theme?.accentColor) {
    document.documentElement.style.setProperty('--color-accent', settings.theme.accentColor);
  }

  await preloaderDone;

  initSmoothScroll();
  initHeroEntrance();
  initScrollReveals();
  initTimelineScroll();
  initWebglHero();
}

boot();
