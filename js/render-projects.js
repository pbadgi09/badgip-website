import { jsDelivrBase } from './config.js';

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
    const open = () => toggleProjectDetail(project, card);
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

// Only one project can be expanded inline at a time.
let openDetail = null; // { id, card, panel }

function buildDetailMarkup(project) {
  const embedId = youtubeEmbedId(project.youtubeUrl);
  const galleryPaths = project.gallery || [];

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
    <div class="project-detail-inline__panel">
      <button class="project-detail-inline__close mono" aria-label="Close">✕</button>
      ${galleryHtml}
      ${videoHtml}
      <div class="project-detail-inline__body">
        <span class="eyebrow">${escapeHtml((project.tags || [])[0] || 'Project')}</span>
        <h3 class="section-title">${escapeHtml(project.title)}</h3>
        <p>${escapeHtml(project.description || project.summary)}</p>
        ${links.length ? `<div class="project-detail-inline__links">${links.join('')}</div>` : ''}
      </div>
    </div>
  `;
}

function closeDetail(immediate) {
  if (!openDetail) return;
  const { card, panel } = openDetail;
  card.classList.remove('is-expanded');
  openDetail = null;

  if (immediate || !window.gsap) {
    panel.remove();
    window.ScrollTrigger?.refresh();
    return;
  }

  window.gsap.to(panel, {
    height: 0,
    opacity: 0,
    duration: 0.35,
    ease: 'power2.in',
    onComplete: () => {
      panel.remove();
      window.ScrollTrigger?.refresh();
    },
  });
}

function toggleProjectDetail(project, card) {
  if (openDetail && openDetail.id === project.id) {
    closeDetail();
    return;
  }

  const wasOpenForAnotherCard = Boolean(openDetail);
  if (wasOpenForAnotherCard) closeDetail(true);

  const panel = document.createElement('div');
  panel.className = 'project-detail-inline';
  panel.innerHTML = buildDetailMarkup(project);
  card.insertAdjacentElement('afterend', panel);
  card.classList.add('is-expanded');

  panel.querySelector('.project-detail-inline__close').addEventListener('click', () => closeDetail());

  openDetail = { id: project.id, card, panel };

  if (!window.gsap) {
    panel.style.height = 'auto';
    panel.style.opacity = '1';
    return;
  }

  window.gsap.set(panel, { height: 0, opacity: 0 });
  requestAnimationFrame(() => {
    const targetHeight = panel.scrollHeight;
    window.gsap.to(panel, {
      height: targetHeight,
      opacity: 1,
      duration: 0.5,
      ease: 'power3.out',
      onComplete: () => {
        panel.style.height = 'auto';
        window.ScrollTrigger?.refresh();
      },
    });
  });
}
