import { getSettings, getAbout, getProjects, getPersonalYoutube, getPersonalBlog, getPageSections } from './data-service.js';
import { renderHero, renderContactAndFooter, applyNavItems } from './render-home.js';
import { renderAbout } from './render-about.js';
import { renderProjects } from './render-projects.js';
import { renderYoutubeCarousel, renderBlogGrid, setBlogAuthor } from './render-personal.js';
import { mountPageSections } from './render-sections.js';
import { initContactForm } from './contact-form.js';
import { initModeSwitch } from './mode-switch.js';
import { initThemeToggle, applySettingsTheme } from './theme.js';
import { initNav } from './nav.js';
import { initSmoothScroll } from './smooth-scroll.js';
import { initPreloader, initHeroEntrance, initScrollReveals, initTimelineScroll } from './animations.js';

async function boot() {
  document.body.classList.add('js-ready');

  initContactForm();

  const dataPromise = Promise.all([
    getSettings(),
    getAbout(),
    getProjects(),
    getPersonalYoutube(),
    getPersonalBlog(),
    getPageSections(),
  ]);
  const preloaderDone = initPreloader(dataPromise);

  const [settings, about, projects, youtubeVideos, blogPosts, pageSections] = await dataPromise;

  // Sections must exist in the DOM before mode-switch/nav try to select
  // them. `about` is passed through so a personal/professional bio with no
  // explicitly-configured page section still gets somewhere to render.
  mountPageSections(pageSections, about);
  initModeSwitch();
  initThemeToggle();
  initNav();

  renderHero(settings);
  applyNavItems(settings);
  renderContactAndFooter(settings);
  renderAbout(about);
  renderProjects(projects);
  renderYoutubeCarousel(youtubeVideos);
  setBlogAuthor({ name: settings.hero?.name, avatar: settings.hero?.profileImage });
  renderBlogGrid(blogPosts);

  applySettingsTheme(settings);

  await preloaderDone;

  initSmoothScroll();
  initHeroEntrance();
  initScrollReveals();
  initTimelineScroll();
}

boot();
