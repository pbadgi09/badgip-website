import { jsDelivrBase } from './config.js';
import { lockBodyScroll, unlockBodyScroll } from './scroll-lock.js';

function imageUrl(path) {
  if (!path) return '';
  if (/^https?:\/\//.test(path)) return path;
  return `${jsDelivrBase}/${path.replace(/^\/+/, '')}`;
}

function youtubeEmbedId(url) {
  if (!url) return null;
  const match = url.match(/(?:youtu\.be\/|v=|embed\/)([a-zA-Z0-9_-]{11})/);
  return match ? match[1] : null;
}

function escapeHtml(str) {
  if (str == null) return '';
  const div = document.createElement('div');
  div.textContent = String(str);
  return div.innerHTML;
}

export function renderProjects(projects) {
  const grid = document.getElementById('projectsGrid');
  grid.innerHTML = '';

  if (projects.length === 0) {
    grid.innerHTML = '<p class="mono" style="color: var(--color-text-dim)">No projects published yet.</p>';
    return;
  }

  projects.forEach((project) => {
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

    grid.appendChild(card);
  });
}

// Only one project can be open full-screen at a time.
let openDetail = null; // { id, card, panel, escHandler }

function buildFullscreenMarkup(project) {
  const embedId = youtubeEmbedId(project.youtubeUrl);
  const galleryPaths = project.gallery || [];

  const heroHtml = project.coverImage
    ? `<div class="project-fullscreen__hero"><img src="${imageUrl(project.coverImage)}" alt="${escapeHtml(project.title)}" /></div>`
    : '';

  const galleryHtml = galleryPaths.length
    ? `<div class="project-detail-inline__gallery">
        ${galleryPaths
          .map(
            (path) =>
              `<img src="${imageUrl(path)}" alt="${escapeHtml(project.title)}" loading="lazy" onerror="this.remove()" />`
          )
          .join('')}
      </div>`
    : '';

  const videoHtml = embedId
    ? `<div class="project-detail-inline__video"><iframe src="https://www.youtube.com/embed/${embedId}" title="${escapeHtml(project.title)} video" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe></div>`
    : '';

  const links = [];
  if (project.liveUrl) links.push(`<a href="${project.liveUrl}" target="_blank" rel="noopener" class="btn btn--primary">Live Site</a>`);
  if (project.repoUrl) links.push(`<a href="${project.repoUrl}" target="_blank" rel="noopener" class="btn btn--ghost">Source</a>`);

  return `
    ${heroHtml}
    <button class="project-fullscreen__close mono" aria-label="Close and return to projects">
      <span aria-hidden="true">←</span> Back to Projects
    </button>
    <div class="project-fullscreen__content">
      <div class="project-detail-inline__body">
        <span class="eyebrow">${escapeHtml((project.tags || [])[0] || 'Project')}</span>
        <h2 class="section-title">${escapeHtml(project.title)}</h2>
        <p>${escapeHtml(project.description || project.summary)}</p>
        ${links.length ? `<div class="project-detail-inline__links">${links.join('')}</div>` : ''}
      </div>
      ${galleryHtml}
      ${videoHtml}
    </div>
  `;
}

function openProjectDetail(project, card) {
  if (openDetail) return;

  const cardRect = card.getBoundingClientRect();
  const cardRadius = parseFloat(getComputedStyle(card).borderRadius) || 28;

  lockBodyScroll();

  const panel = document.createElement('div');
  panel.className = 'project-fullscreen';
  panel.innerHTML = buildFullscreenMarkup(project);
  document.body.appendChild(panel);

  const content = panel.querySelector('.project-fullscreen__content');
  const closeBtn = panel.querySelector('.project-fullscreen__close');

  const escHandler = (e) => {
    if (e.key === 'Escape') closeProjectDetail();
  };
  document.addEventListener('keydown', escHandler);
  closeBtn.addEventListener('click', () => closeProjectDetail());

  card.classList.add('is-expanded');
  openDetail = { id: project.id, card, panel, escHandler };

  if (!window.gsap) {
    panel.style.position = 'fixed';
    panel.style.inset = '0';
    panel.style.overflowY = 'auto';
    content.style.opacity = '1';
    closeBtn.style.opacity = '1';
    return;
  }

  const vw = window.innerWidth;
  const vh = window.innerHeight;

  window.gsap.set(panel, {
    position: 'fixed',
    top: cardRect.top,
    left: cardRect.left,
    width: cardRect.width,
    height: cardRect.height,
    borderRadius: cardRadius,
    overflow: 'hidden',
  });
  window.gsap.set([content, closeBtn], { opacity: 0, y: 16 });

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
  }).to([content, closeBtn], { opacity: 1, y: 0, duration: 0.4, ease: 'power2.out' }, '-=0.25');
}

function closeProjectDetail() {
  if (!openDetail) return;
  const { card, panel, escHandler } = openDetail;
  document.removeEventListener('keydown', escHandler);
  card.classList.remove('is-expanded');
  openDetail = null;

  if (!window.gsap) {
    panel.remove();
    unlockBodyScroll();
    return;
  }

  const cardRect = card.getBoundingClientRect();
  const cardRadius = parseFloat(getComputedStyle(card).borderRadius) || 28;
  const content = panel.querySelector('.project-fullscreen__content');
  const closeBtn = panel.querySelector('.project-fullscreen__close');

  panel.style.overflowY = 'hidden';
  panel.scrollTop = 0;

  const tl = window.gsap.timeline({
    onComplete: () => {
      panel.remove();
      unlockBodyScroll();
    },
  });
  tl.to([content, closeBtn], { opacity: 0, y: 16, duration: 0.2, ease: 'power2.in' }).to(
    panel,
    {
      top: cardRect.top,
      left: cardRect.left,
      width: cardRect.width,
      height: cardRect.height,
      borderRadius: cardRadius,
      duration: 0.5,
      ease: 'power3.inOut',
    },
    '-=0.05'
  );
}
