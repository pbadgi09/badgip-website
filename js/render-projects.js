import { jsDelivrBase } from './config.js';
import { openFullscreen, isFullscreenOpen } from './fullscreen-panel.js';

function imageUrl(path) {
  if (!path) return '';
  if (/^https?:\/\//.test(path)) return path;
  // Stored paths are built from a picked filename, which routinely has
  // spaces or other characters that aren't valid raw in a URL.
  const encoded = path.replace(/^\/+/, '').split('/').map(encodeURIComponent).join('/');
  return `${jsDelivrBase}/${encoded}`;
}

function youtubeEmbedId(url) {
  if (!url) return null;
  const match = url.match(/(?:youtu\.be\/|v=|embed\/|shorts\/)([a-zA-Z0-9_-]{11})/);
  return match ? match[1] : null;
}

function escapeHtml(str) {
  if (str == null) return '';
  const div = document.createElement('div');
  div.textContent = String(str);
  return div.innerHTML;
}

const INITIAL_PROJECT_COUNT = 6;

function buildProjectCard(project) {
  const card = document.createElement('article');
  card.className = 'project-card reveal';
  card.tabIndex = 0;
  card.setAttribute('role', 'button');
  card.innerHTML = `
    <div class="project-card__media${project.coverImage ? '' : ' project-card__media--empty'}">
      ${
        project.coverImage
          ? `<img src="${imageUrl(project.coverImage)}" alt="${escapeHtml(project.title)}" loading="lazy" />`
          : `<span class="project-card__initial mono">${escapeHtml((project.title || '?').charAt(0).toUpperCase())}</span>`
      }
      ${project.featured ? '<span class="project-card__featured mono">Featured</span>' : ''}
    </div>
    <div class="project-card__body">
      <h3 class="project-card__title">${escapeHtml(project.title)}</h3>
      <p class="project-card__summary">${escapeHtml(project.summary)}</p>
      <div class="project-card__tags">
        ${(project.tags || []).map((t) => `<span class="tag mono">${escapeHtml(t)}</span>`).join('')}
      </div>
    </div>
  `;
  const open = () => openProjectDetail(project, card);
  card.addEventListener('click', open);
  card.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      open();
    }
  });
  const img = card.querySelector('.project-card__media img');
  if (img) {
    img.addEventListener(
      'error',
      () => {
        const media = card.querySelector('.project-card__media');
        media.classList.add('project-card__media--empty');
        img.remove();
        const initial = document.createElement('span');
        initial.className = 'project-card__initial mono';
        initial.textContent = (project.title || '?').charAt(0).toUpperCase();
        media.prepend(initial);
      },
      { once: true }
    );
  }
  return card;
}

export function renderProjects(projects) {
  const grid = document.getElementById('projectsGrid');
  grid.innerHTML = '';

  if (projects.length === 0) {
    grid.innerHTML = '<p class="mono" style="color: var(--color-text-dim)">No projects published yet.</p>';
    return;
  }

  // Featured projects (picked in the macOS app) fill the initial visible
  // rows first; the rest stay in their normal order behind "Show More".
  const featured = projects.filter((p) => p.featured);
  const rest = projects.filter((p) => !p.featured);
  const initial = [...featured, ...rest].slice(0, INITIAL_PROJECT_COUNT);
  const initialIds = new Set(initial.map((p) => p.id));
  const remaining = projects.filter((p) => !initialIds.has(p.id));

  initial.forEach((project) => grid.appendChild(buildProjectCard(project)));

  if (remaining.length === 0) return;

  const wrap = document.getElementById('projectsGrid').closest('.section');
  const showMoreWrap = document.createElement('div');
  showMoreWrap.className = 'projects__show-more';
  showMoreWrap.innerHTML = `<button type="button" class="btn btn--ghost" id="projectsShowMore">Show More</button>`;
  wrap.appendChild(showMoreWrap);

  document.getElementById('projectsShowMore').addEventListener('click', () => {
    const newCards = remaining.map((project) => buildProjectCard(project));
    newCards.forEach((card) => grid.appendChild(card));
    showMoreWrap.remove();
    // The boot-time initScrollReveals() only ever saw the initial batch —
    // newly-appended cards need their own reveal tween bound directly
    // instead of just showing up at full opacity mid-scroll.
    if (window.gsap && window.ScrollTrigger) {
      newCards.forEach((el) => {
        window.gsap.fromTo(
          el,
          { opacity: 0, y: 32 },
          {
            opacity: 1,
            y: 0,
            duration: 0.8,
            ease: 'power3.out',
            scrollTrigger: { trigger: el, start: 'top 88%', toggleActions: 'play none none reverse' },
          }
        );
      });
    } else {
      newCards.forEach((el) => {
        el.style.opacity = '1';
        el.style.transform = 'none';
      });
    }
  });
}

function buildFullscreenMarkup(project) {
  const embedId = youtubeEmbedId(project.youtubeUrl);
  const galleryPaths = project.gallery || [];

  const chipStyleDecls = [];
  if (project.accentColor) chipStyleDecls.push(`--chip-bg: ${project.accentColor}`);
  if (project.titleFontSize) chipStyleDecls.push(`font-size: ${project.titleFontSize}px`);
  const chipStyle = chipStyleDecls.length ? ` style="${chipStyleDecls.join('; ')}"` : '';

  const heroHtml = project.coverImage
    ? `<div class="fullscreen-panel__hero">
        <img src="${imageUrl(project.coverImage)}" alt="${escapeHtml(project.title)}" />
        <div class="fullscreen-panel__hero-caption"><span class="text-chip"${chipStyle}>${escapeHtml(project.title)}</span></div>
      </div>`
    : '';

  const dotsHtml =
    galleryPaths.length > 1
      ? `<div class="project-detail-inline__gallery-dots">
          ${galleryPaths.map((_, i) => `<span class="gallery-dot${i === 0 ? ' is-active' : ''}"></span>`).join('')}
        </div>`
      : '';

  const galleryHtml = galleryPaths.length
    ? `<div class="project-detail-inline__gallery">
        ${galleryPaths
          .map(
            (path) =>
              `<img src="${imageUrl(path)}" alt="${escapeHtml(project.title)}" loading="lazy" onerror="this.remove()" />`
          )
          .join('')}
      </div>
      ${dotsHtml}`
    : '';

  const videoHtml = embedId
    ? `<div class="project-detail-inline__video"><iframe src="https://www.youtube.com/embed/${embedId}" title="${escapeHtml(project.title)} video" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe></div>`
    : '';

  const links = [];
  if (project.liveUrl)
    links.push(
      `<a href="${escapeHtml(project.liveUrl)}" target="_blank" rel="noopener" class="btn btn--primary">${escapeHtml(project.liveButtonLabel || 'Live Site')}</a>`
    );
  if (project.repoUrl) links.push(`<a href="${escapeHtml(project.repoUrl)}" target="_blank" rel="noopener" class="btn btn--ghost">Source</a>`);

  return `
    ${heroHtml}
    <button class="fullscreen-panel__close" aria-label="Close">✕</button>
    <div class="fullscreen-panel__content">
      <div class="project-detail-inline__body">
        <span class="eyebrow">${escapeHtml((project.tags || [])[0] || 'Project')}</span>
        ${project.coverImage ? '' : `<h2 class="section-title">${escapeHtml(project.title)}</h2>`}
        <p>${escapeHtml(project.description || project.summary)}</p>
        ${links.length ? `<div class="project-detail-inline__links">${links.join('')}</div>` : ''}
      </div>
      ${galleryHtml}
      ${videoHtml}
    </div>
  `;
}

// Highlights the dot nearest the gallery's current scroll position — the
// active dot's color comes from --color-accent, which openFullscreen
// already sets per-project, so no per-project styling needed here.
function wireGalleryDots(panel) {
  const gallery = panel.querySelector('.project-detail-inline__gallery');
  const dots = panel.querySelectorAll('.project-detail-inline__gallery-dots .gallery-dot');
  if (!gallery || !dots.length) return;
  const images = Array.from(gallery.querySelectorAll('img'));

  let ticking = false;
  gallery.addEventListener('scroll', () => {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(() => {
      ticking = false;
      const center = gallery.scrollLeft + gallery.clientWidth / 2;
      let closest = 0;
      let closestDistance = Infinity;
      images.forEach((img, i) => {
        const distance = Math.abs(img.offsetLeft + img.offsetWidth / 2 - center);
        if (distance < closestDistance) {
          closestDistance = distance;
          closest = i;
        }
      });
      dots.forEach((dot, i) => dot.classList.toggle('is-active', i === closest));
    });
  });
}

function openProjectDetail(project, card) {
  if (isFullscreenOpen()) return;
  openFullscreen({
    id: `project:${project.id}`,
    sourceEl: card,
    innerHTML: buildFullscreenMarkup(project),
    accentColor: project.accentColor,
    textColor: project.textColor,
  });
  // Only exists once openFullscreen has inserted the markup — wire right after.
  const panel = document.querySelector('.fullscreen-panel');
  if (panel) wireGalleryDots(panel);
}
