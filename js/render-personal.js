import { jsDelivrBase } from './config.js';

function imageUrl(path) {
  if (!path) return '';
  if (/^https?:\/\//.test(path)) return path;
  return `${jsDelivrBase}/${path.replace(/^\/+/, '')}`;
}

function youtubeVideoId(url) {
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

// ---------- YouTube carousel ----------

export function renderYoutubeCarousel(videos) {
  const carousel = document.getElementById('youtubeCarousel');
  carousel.innerHTML = '';

  if (videos.length === 0) {
    carousel.innerHTML = '<p class="mono" style="color: var(--color-text-dim)">No videos yet.</p>';
    return;
  }

  videos.forEach((video) => {
    const videoId = youtubeVideoId(video.url);
    if (!videoId) return;

    const card = document.createElement('div');
    card.className = 'youtube-card reveal';
    card.innerHTML = `
      <div class="youtube-card__media">
        <img src="https://img.youtube.com/vi/${videoId}/hqdefault.jpg" alt="${escapeHtml(video.title)}" loading="lazy" />
        <button class="youtube-card__play" aria-label="Play ${escapeHtml(video.title)}">
          <svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>
        </button>
      </div>
      <p class="youtube-card__title">${escapeHtml(video.title)}</p>
    `;

    const playButton = card.querySelector('.youtube-card__play');
    playButton.addEventListener('click', () => {
      const media = card.querySelector('.youtube-card__media');
      media.innerHTML = `<iframe src="https://www.youtube.com/embed/${videoId}?autoplay=1" title="${escapeHtml(video.title)}" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>`;
    });

    carousel.appendChild(card);
  });
}

// ---------- Blog ----------

function firstValueOfType(sections, type) {
  const match = (sections || []).find((s) => s.type === type);
  return match ? match.value : '';
}

export function renderBlogGrid(posts) {
  const grid = document.getElementById('blogGrid');
  grid.innerHTML = '';

  if (posts.length === 0) {
    grid.innerHTML = '<p class="mono" style="color: var(--color-text-dim)">No posts yet.</p>';
    return;
  }

  posts.forEach((post) => {
    const title = firstValueOfType(post.sections, 'title') || 'Untitled';
    const subtitle = firstValueOfType(post.sections, 'subtitle');

    const card = document.createElement('article');
    card.className = 'blog-card reveal';
    card.tabIndex = 0;
    card.setAttribute('role', 'button');
    card.innerHTML = `
      <div class="blog-card__media${post.coverImage ? '' : ' project-card__media--empty'}">
        ${
          post.coverImage
            ? `<img src="${imageUrl(post.coverImage)}" alt="${escapeHtml(title)}" loading="lazy" />`
            : `<span class="project-card__initial mono">${escapeHtml(title.charAt(0).toUpperCase())}</span>`
        }
      </div>
      <div class="blog-card__body">
        <h3 class="blog-card__title">${escapeHtml(title)}</h3>
        ${subtitle ? `<p class="blog-card__subtitle">${escapeHtml(subtitle)}</p>` : ''}
        ${post.publishedAt ? `<span class="blog-card__date mono">${new Date(post.publishedAt).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}</span>` : ''}
      </div>
    `;

    const img = card.querySelector('.blog-card__media img');
    if (img) {
      img.addEventListener(
        'error',
        () => {
          const media = card.querySelector('.blog-card__media');
          media.classList.add('project-card__media--empty');
          img.remove();
          const initial = document.createElement('span');
          initial.className = 'project-card__initial mono';
          initial.textContent = title.charAt(0).toUpperCase();
          media.prepend(initial);
        },
        { once: true }
      );
    }

    card.addEventListener('click', () => openBlogOverlay(post));
    card.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        openBlogOverlay(post);
      }
    });

    grid.appendChild(card);
  });
}

function renderBlogSection(section) {
  const value = section.value;
  switch (section.type) {
    case 'title':
      return `<h2 class="blog-section__title">${escapeHtml(value)}</h2>`;
    case 'subtitle':
      return `<p class="blog-section__subtitle">${escapeHtml(value)}</p>`;
    case 'text':
      return `<p class="blog-section__text">${escapeHtml(value)}</p>`;
    case 'image':
      return `<img class="blog-section__image" src="${imageUrl(value)}" alt="" loading="lazy" />`;
    case 'map':
      return `<div class="blog-section__map"><iframe src="https://www.google.com/maps?q=${encodeURIComponent(value)}&output=embed" loading="lazy" referrerpolicy="no-referrer-when-downgrade" title="Map: ${escapeHtml(value)}"></iframe></div>`;
    default:
      return '';
  }
}

function openBlogOverlay(post) {
  document.getElementById('blogOverlay')?.remove();

  const template = document.getElementById('blogOverlayTemplate');
  const fragment = template.content.cloneNode(true);
  document.body.appendChild(fragment);

  const overlay = document.getElementById('blogOverlay');
  const sectionsEl = document.getElementById('blogOverlaySections');
  sectionsEl.innerHTML = (post.sections || []).map(renderBlogSection).join('');

  const close = () => {
    overlay.classList.remove('is-open');
    document.body.style.overflow = '';
    setTimeout(() => overlay.remove(), 400);
  };

  document.getElementById('blogOverlayClose').addEventListener('click', close);
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) close();
  });
  document.addEventListener('keydown', function escHandler(e) {
    if (e.key === 'Escape') {
      close();
      document.removeEventListener('keydown', escHandler);
    }
  });

  document.body.style.overflow = 'hidden';
  requestAnimationFrame(() => overlay.classList.add('is-open'));
}
