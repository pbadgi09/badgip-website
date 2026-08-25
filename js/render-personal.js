import { jsDelivrBase } from './config.js';
import { openFullscreen, isFullscreenOpen } from './fullscreen-panel.js';

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

// Blog is deliberately a list, not a card grid — it should read as
// distinct from the Projects section rather than a second grid of tiles.
export function renderBlogGrid(posts) {
  const list = document.getElementById('blogGrid');
  list.innerHTML = '';

  if (posts.length === 0) {
    list.innerHTML = '<p class="mono" style="color: var(--color-text-dim)">No posts yet.</p>';
    return;
  }

  posts.forEach((post) => {
    const title = firstValueOfType(post.sections, 'title') || 'Untitled';
    const subtitle = firstValueOfType(post.sections, 'subtitle');
    const dateLabel = post.publishedAt
      ? new Date(post.publishedAt).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })
      : '';

    const row = document.createElement('article');
    row.className = 'blog-list-item reveal';
    row.tabIndex = 0;
    row.setAttribute('role', 'button');
    row.innerHTML = `
      <div class="blog-list-item__media${post.coverImage ? '' : ' blog-list-item__media--empty'}">
        ${
          post.coverImage
            ? `<img src="${imageUrl(post.coverImage)}" alt="${escapeHtml(title)}" loading="lazy" />`
            : `<span class="mono">${escapeHtml(title.charAt(0).toUpperCase())}</span>`
        }
      </div>
      <div class="blog-list-item__body">
        ${dateLabel ? `<span class="blog-list-item__date mono">${dateLabel}</span>` : ''}
        <h3 class="blog-list-item__title">${escapeHtml(title)}</h3>
        ${subtitle ? `<p class="blog-list-item__subtitle">${escapeHtml(subtitle)}</p>` : ''}
      </div>
      <span class="blog-list-item__arrow" aria-hidden="true">→</span>
    `;

    const img = row.querySelector('.blog-list-item__media img');
    if (img) {
      img.addEventListener(
        'error',
        () => {
          const media = row.querySelector('.blog-list-item__media');
          media.classList.add('blog-list-item__media--empty');
          img.remove();
          const initial = document.createElement('span');
          initial.className = 'mono';
          initial.textContent = title.charAt(0).toUpperCase();
          media.prepend(initial);
        },
        { once: true }
      );
    }

    const open = () => openBlogDetail(post, row);
    row.addEventListener('click', open);
    row.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        open();
      }
    });

    list.appendChild(row);
  });
}

// A "chip": bold white-on-black text, using box-decoration-break so a
// caption that wraps onto multiple lines renders as separate stacked
// blocks per line (the look from the reference site) rather than one
// rectangle stretching across every line.
function renderChip(text) {
  return `<span class="text-chip">${escapeHtml(text)}</span>`;
}

function sectionStyle(section) {
  const decls = [];
  if (section.accentColor) decls.push(`--chip-bg: ${section.accentColor}`);
  if (section.textColor) decls.push(`color: ${section.textColor}`);
  return decls.length ? ` style="${decls.join('; ')}"` : '';
}

function renderBlogSection(section) {
  const value = section.value;
  const style = sectionStyle(section);
  const subtitleHtml = section.subtitle ? `<p class="blog-section__item-subtitle">${escapeHtml(section.subtitle)}</p>` : '';

  if (section.type === 'image') {
    const captionHtml = section.title
      ? `<div class="blog-section__image-caption">${renderChip(section.title)}</div>`
      : '';
    return `<div class="blog-section-block"${style}>
      <div class="blog-section__image-wrap">
        <img class="blog-section__image" src="${imageUrl(value)}" alt="" loading="lazy" />
        ${captionHtml}
      </div>
      ${subtitleHtml}
    </div>`;
  }

  const chipHeading = section.title ? `<div class="blog-section__chip-heading">${renderChip(section.title)}</div>` : '';
  const caption = chipHeading + subtitleHtml;

  switch (section.type) {
    case 'title':
      return `<h2 class="blog-section__title"${style}>${escapeHtml(value)}</h2>`;
    case 'subtitle':
      return `<p class="blog-section__subtitle"${style}>${escapeHtml(value)}</p>`;
    case 'text':
      return `<div class="blog-section-block"${style}>${caption}<p class="blog-section__text">${escapeHtml(value)}</p></div>`;
    case 'code':
      return `<div class="blog-section-block"${style}>${caption}<pre class="blog-section__code"><code>${escapeHtml(value)}</code></pre></div>`;
    case 'map':
      // Google Maps embeds capture the wheel for zoom, which makes the page
      // scroll appear to "stick" the moment the cursor crosses the map. A
      // click-to-activate cover keeps the wheel scrolling the page until the
      // reader deliberately opts into interacting with the map.
      return `<div class="blog-section-block"${style}>${caption}<div class="blog-section__map">
        <iframe src="https://www.google.com/maps?q=${encodeURIComponent(value)}&output=embed" loading="lazy" referrerpolicy="no-referrer-when-downgrade" title="Map: ${escapeHtml(value)}"></iframe>
        <button type="button" class="blog-section__map-overlay mono">Click to interact with map</button>
      </div></div>`;
    default:
      return '';
  }
}

function buildBlogFullscreenMarkup(post) {
  const sections = post.sections || [];
  const titleIndex = sections.findIndex((s) => s.type === 'title');
  const titleValue = titleIndex >= 0 ? sections[titleIndex].value : '';

  let bodySections = sections;
  let heroHtml = '';
  if (post.coverImage) {
    heroHtml = `<div class="fullscreen-panel__hero">
      <img src="${imageUrl(post.coverImage)}" alt="${escapeHtml(titleValue)}" />
      ${titleValue ? `<div class="fullscreen-panel__hero-caption">${renderChip(titleValue)}</div>` : ''}
    </div>`;
    if (titleIndex >= 0) bodySections = sections.filter((_, i) => i !== titleIndex);
  }

  return `
    ${heroHtml}
    <button class="fullscreen-panel__close mono" aria-label="Close and return to blog">
      <span aria-hidden="true">←</span> Back to Blog
    </button>
    <div class="fullscreen-panel__content fullscreen-panel__content--article">
      ${bodySections.map(renderBlogSection).join('')}
    </div>
  `;
}

function openBlogDetail(post, row) {
  if (isFullscreenOpen()) return;
  const panelReady = () => {
    document.querySelectorAll('.blog-section__map-overlay').forEach((btn) => {
      btn.addEventListener('click', () => btn.remove());
    });
  };
  openFullscreen({
    id: `blog:${post.id}`,
    sourceEl: row,
    innerHTML: buildBlogFullscreenMarkup(post),
  });
  // The overlay buttons only exist once openFullscreen has inserted the
  // markup — wire them up right after.
  panelReady();
}
