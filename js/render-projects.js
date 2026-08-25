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
      </div>
      <div class="project-card__body">
        <h3 class="project-card__title">${escapeHtml(project.title)}</h3>
        <p class="project-card__summary">${escapeHtml(project.summary)}</p>
        <div class="project-card__tags">
          ${(project.tags || []).map((t) => `<span class="tag mono">${escapeHtml(t)}</span>`).join('')}
        </div>
      </div>
    `;
    const open = () => openProjectOverlay(project);
    card.addEventListener('click', open);
    card.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        open();
      }
    });
    grid.appendChild(card);
  });
}

function openProjectOverlay(project) {
  // Guard against stacking overlays if a card is clicked/activated more than
  // once before the previous overlay finishes its close animation/removal.
  document.getElementById('projectOverlay')?.remove();

  const template = document.getElementById('projectOverlayTemplate');
  const fragment = template.content.cloneNode(true);
  document.body.appendChild(fragment);

  const overlay = document.getElementById('projectOverlay');

  document.getElementById('overlayTag').textContent = (project.tags || [])[0] || 'Project';
  document.getElementById('overlayTitle').textContent = project.title;
  document.getElementById('overlayDescription').textContent = project.description || project.summary;

  const videoEl = document.getElementById('overlayVideo');
  const embedId = youtubeEmbedId(project.youtubeUrl);
  if (embedId) {
    videoEl.hidden = false;
    videoEl.innerHTML = `<iframe src="https://www.youtube.com/embed/${embedId}" title="${escapeHtml(project.title)} video" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>`;
  }

  const galleryEl = document.getElementById('overlayGallery');
  (project.gallery || []).forEach((path) => {
    const img = document.createElement('img');
    img.src = imageUrl(path);
    img.loading = 'lazy';
    img.alt = project.title;
    galleryEl.appendChild(img);
  });

  const linksEl = document.getElementById('overlayLinks');
  const addLink = (href, label, className) => {
    const a = document.createElement('a');
    a.href = href;
    a.textContent = label;
    a.className = className;
    a.target = '_blank';
    a.rel = 'noopener';
    linksEl.appendChild(a);
  };
  if (project.liveUrl) addLink(project.liveUrl, 'Live Site', 'btn btn--primary');
  if (project.repoUrl) addLink(project.repoUrl, 'Source', 'btn btn--ghost');

  const close = () => {
    overlay.classList.remove('is-open');
    document.body.style.overflow = '';
    setTimeout(() => overlay.remove(), 400);
  };

  document.getElementById('projectOverlayClose').addEventListener('click', close);
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) close();
  });
  document.addEventListener(
    'keydown',
    function escHandler(e) {
      if (e.key === 'Escape') {
        close();
        document.removeEventListener('keydown', escHandler);
      }
    }
  );

  document.body.style.overflow = 'hidden';
  requestAnimationFrame(() => overlay.classList.add('is-open'));
}
