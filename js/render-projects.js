import { jsDelivrBase } from './config.js';
import { openFullscreen, closeFullscreen, isFullscreenOpen } from './fullscreen-panel.js';
import { escapeHtml, escapeHtmlMultiline, highlightKeywords } from './highlight.js';
import { renderRichText } from './markdown.js';

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

const INITIAL_PROJECT_COUNT = 6;

// Deep-linking: every published project is registered by both id and slug so
// a `#project/<slug>` hash can reopen it on load or Back/Forward. Cards are
// registered too (when built) so the FLIP animation has a real source rect;
// projects behind "Show More" fall back to a synthetic centered source.
const projectRegistry = new Map();
const cardRegistry = new Map();
let currentDetailProject = null;

function buildProjectCard(project) {
  const card = document.createElement('article');
  card.className = `project-card reveal${project.featured ? ' project-card--featured' : ''}`;
  card.tabIndex = 0;
  card.setAttribute('role', 'button');

  // Cap visible tags so cards stay tidy; the rest collapse into a +N chip.
  const MAX_TAGS = 3;
  const tags = project.tags || [];
  const shownTags = tags.slice(0, MAX_TAGS).map((t) => `<span class="tag mono">${escapeHtml(t)}</span>`);
  if (tags.length > MAX_TAGS) {
    shownTags.push(`<span class="tag mono tag--more">+${tags.length - MAX_TAGS}</span>`);
  }

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
        ${shownTags.join('')}
      </div>
    </div>
  `;
  cardRegistry.set(project.id, card);
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

  // Register every project for deep-linking regardless of whether its card
  // is in the initial batch or hidden behind "Show More".
  projectRegistry.clear();
  cardRegistry.clear();
  projects.forEach((p) => {
    projectRegistry.set(p.id, p);
    if (p.slug) projectRegistry.set(p.slug, p);
  });

  if (projects.length === 0) {
    grid.innerHTML = `
      <div class="projects__empty">
        <span class="projects__empty-icon" aria-hidden="true">✦</span>
        <p class="mono">No projects published yet — check back soon.</p>
      </div>`;
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

// ---- Tile rendering (right-column mosaic) --------------------------------

// Inline style string shared by generic tiles: background, text color, and
// text alignment all come straight from the per-tile config in the app.
function tileStyle(tile) {
  const decls = [];
  if (tile.bgColor) decls.push(`background-color: ${tile.bgColor}`);
  if (tile.textColor) decls.push(`color: ${tile.textColor}`);
  if (tile.textAlign) decls.push(`text-align: ${tile.textAlign}`);
  return decls.length ? ` style="${decls.join('; ')}"` : '';
}

function tileTextHtml(tile, project) {
  if (!tile.text) return '';
  const styleDecls = [];
  if (tile.fontSize) styleDecls.push(`font-size: ${tile.fontSize}px`);
  const style = styleDecls.length ? ` style="${styleDecls.join('; ')}"` : '';
  const html = highlightKeywords(escapeHtmlMultiline(tile.text), tile.highlights);
  return `<div class="project-detail__tile-text"${style}>${html}</div>`;
}

function tileImageHtml(src, project, fit) {
  if (!src) return '';
  const fitClass = fit === 'contain' ? ' project-detail__tile-img--contain' : '';
  return `<img class="project-detail__tile-img${fitClass}" src="${imageUrl(src)}" alt="${escapeHtml(project.heroTitle || project.title)}" loading="lazy" onerror="this.remove()" />`;
}

function tileInnerHtml(tile, project) {
  switch (tile.type) {
    case 'carousel': {
      const images = (tile.images || []).filter(Boolean);
      if (!images.length) return '';
      const slides = images
        .map((p) => tileImageHtml(p, project, tile.imageFit || 'cover'))
        .join('');
      // Arrows + dots only matter with more than one image. The track itself
      // is also drag-to-scroll (wired in wireCarousels) so desktop mice can
      // swipe it, not just trackpads.
      const multi = images.length > 1;
      const arrows = multi
        ? `<button class="project-detail__carousel-arrow project-detail__carousel-arrow--prev" aria-label="Previous image">‹</button>
           <button class="project-detail__carousel-arrow project-detail__carousel-arrow--next" aria-label="Next image">›</button>`
        : '';
      const dots = multi
        ? `<div class="project-detail__carousel-dots">${images
            .map((_, i) => `<span class="gallery-dot${i === 0 ? ' is-active' : ''}"></span>`)
            .join('')}</div>`
        : '';
      return `<div class="project-detail__carousel-viewport"><div class="project-detail__carousel">${slides}</div>${arrows}</div>${dots}`;
    }
    case 'video': {
      const embedId = youtubeEmbedId(tile.videoUrl);
      if (!embedId) return '';
      return `<div class="project-detail__tile-video"><iframe src="https://www.youtube.com/embed/${embedId}" title="${escapeHtml(project.heroTitle || project.title)} video" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe></div>`;
    }
    case 'tags': {
      const tags = project.tags || [];
      if (!tags.length) return '';
      return `<div class="project-detail__tile-tags">${tags
        .map((t) => `<span class="tag mono">${escapeHtml(t)}</span>`)
        .join('')}</div>`;
    }
    default:
      // Generic text / image / both tile — render whichever fields are set.
      return `${tileImageHtml(tile.image, project, tile.imageFit || 'cover')}${tileTextHtml(tile, project)}`;
  }
}

function buildTileHtml(tile, project) {
  const inner = tileInnerHtml(tile, project);
  if (!inner) return '';
  const classes = ['project-detail__tile', `project-detail__tile--${tile.type || 'content'}`];
  if (tile.fullWidth) classes.push('project-detail__tile--full');
  const body = `<div class="${classes.join(' ')}"${tileStyle(tile)}>${inner}</div>`;
  // A clickable tile wraps the whole thing in an anchor (external → new tab).
  if (tile.href) {
    const external = !tile.href.startsWith('#');
    const attrs = external ? ' target="_blank" rel="noopener"' : '';
    return `<a class="project-detail__tile-link" href="${escapeHtml(tile.href)}"${attrs}>${body}</a>`;
  }
  return body;
}

function buildCtaHtml(ctas) {
  return (ctas || [])
    .filter((c) => c && (c.text || c.href))
    .map((c, i) => {
      const cls = i === 0 ? 'btn btn--primary btn--lg' : 'btn btn--ghost btn--lg';
      const href = c.href || '#';
      const external = !href.startsWith('#');
      const attrs = external ? ' target="_blank" rel="noopener"' : '';
      return `<a href="${escapeHtml(href)}" class="${cls}"${attrs}>${escapeHtml(c.text || '')}</a>`;
    })
    .join('');
}

function buildFullscreenMarkup(project) {
  const titleFontStyle = project.titleFontSize ? ` style="font-size: ${project.titleFontSize}px"` : '';
  const ctasHtml = buildCtaHtml(project.ctas);
  const tilesHtml = (project.tiles || []).map((tile) => buildTileHtml(tile, project)).join('');

  return `
    <button class="fullscreen-panel__close" aria-label="Close">✕</button>
    <div class="fullscreen-panel__content project-detail">
      <aside class="project-detail__aside">
        <h1 class="project-detail__title"${titleFontStyle}>${escapeHtmlMultiline(project.heroTitle || project.title)}</h1>
        ${project.subtitle ? `<p class="project-detail__subtitle">${escapeHtml(project.subtitle)}</p>` : ''}
        ${project.caption ? `<p class="project-detail__caption">${renderRichText(project.caption, [])}</p>` : ''}
        ${ctasHtml ? `<div class="project-detail__ctas">${ctasHtml}</div>` : ''}
      </aside>
      <div class="project-detail__mosaic"><div class="project-detail__mosaic-grid">${tilesHtml}</div></div>
    </div>
  `;
}

// Wires each carousel tile: keeps the dots in sync with scroll position,
// makes the track drag-to-scroll (so a desktop mouse can swipe, not just a
// trackpad), and wires the prev/next arrows. The active dot's color comes
// from --color-accent, which openFullscreen already sets per-project.
function wireCarousels(panel) {
  panel.querySelectorAll('.project-detail__tile--carousel').forEach((tile) => {
    const gallery = tile.querySelector('.project-detail__carousel');
    if (!gallery) return;
    const dots = tile.querySelectorAll('.project-detail__carousel-dots .gallery-dot');
    const images = Array.from(gallery.querySelectorAll('img'));

    // Dot sync.
    if (dots.length) {
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

    // Prev/next arrows scroll by a full slide.
    const viewport = tile.querySelector('.project-detail__carousel-viewport');
    viewport?.querySelector('.project-detail__carousel-arrow--prev')?.addEventListener('click', () => {
      gallery.scrollBy({ left: -gallery.clientWidth, behavior: 'smooth' });
    });
    viewport?.querySelector('.project-detail__carousel-arrow--next')?.addEventListener('click', () => {
      gallery.scrollBy({ left: gallery.clientWidth, behavior: 'smooth' });
    });

    // Drag-to-scroll (pointer events). scroll-snap is suspended mid-drag via
    // .is-dragging so the track follows the cursor freely, then snaps on
    // release. A past-threshold drag cancels the click so dragging across a
    // linked carousel tile doesn't also follow its href.
    let isDown = false;
    let startX = 0;
    let startScroll = 0;
    let moved = false;
    gallery.addEventListener('pointerdown', (e) => {
      isDown = true;
      moved = false;
      startX = e.clientX;
      startScroll = gallery.scrollLeft;
      gallery.classList.add('is-dragging');
      try { gallery.setPointerCapture(e.pointerId); } catch {}
    });
    gallery.addEventListener('pointermove', (e) => {
      if (!isDown) return;
      const dx = e.clientX - startX;
      if (Math.abs(dx) > 4) moved = true;
      gallery.scrollLeft = startScroll - dx;
    });
    const endDrag = (e) => {
      if (!isDown) return;
      isDown = false;
      gallery.classList.remove('is-dragging');
      try { gallery.releasePointerCapture(e.pointerId); } catch {}
    };
    gallery.addEventListener('pointerup', endDrag);
    gallery.addEventListener('pointercancel', endDrag);
    gallery.addEventListener(
      'click',
      (e) => {
        if (moved) {
          e.preventDefault();
          e.stopPropagation();
        }
      },
      true
    );
  });
}

function openProjectDetail(project, sourceEl, { syntheticSource } = {}) {
  if (isFullscreenOpen()) return;
  currentDetailProject = project;

  openFullscreen({
    id: `project:${project.id}`,
    sourceEl,
    innerHTML: buildFullscreenMarkup(project),
    accentColor: project.accentColor,
    textColor: project.textColor,
    onClosed: () => {
      currentDetailProject = null;
      syntheticSource?.remove();
      // Strip the project hash on close without firing hashchange (pushState
      // is silent) so we don't recursively re-enter handleProjectHash.
      if (location.hash.startsWith('#project/')) {
        history.pushState(null, '', location.pathname + location.search);
      }
    },
  });

  // Set the shareable hash AFTER openFullscreen so the hashchange it fires
  // sees the panel already open (and is a no-op) rather than racing it.
  const slug = project.slug || project.id;
  const targetHash = `#project/${encodeURIComponent(slug)}`;
  if (location.hash !== targetHash) {
    location.hash = targetHash;
  }

  const panel = document.querySelector('.fullscreen-panel');
  if (panel) wireCarousels(panel);
}

// Opens a project from a slug/id (deep link). Uses its card as the FLIP
// source when present; otherwise a 1×1 element at the viewport center so the
// expand still animates from somewhere sensible.
function openProjectByKey(key) {
  const project = projectRegistry.get(key);
  if (!project) return;
  if (isFullscreenOpen(`project:${project.id}`)) return;
  const card = cardRegistry.get(project.id);
  if (card) {
    openProjectDetail(project, card);
    return;
  }
  const synthetic = document.createElement('div');
  synthetic.style.cssText =
    'position:fixed;top:50%;left:50%;width:1px;height:1px;pointer-events:none;opacity:0;';
  document.body.appendChild(synthetic);
  openProjectDetail(project, synthetic, { syntheticSource: synthetic });
}

// Single source of truth for hash → panel state, so the browser Back/Forward
// buttons and shared links both work. Runs on load and on hashchange.
function handleProjectHash() {
  const match = location.hash.match(/^#project\/(.+)$/);
  if (match) {
    openProjectByKey(decodeURIComponent(match[1]));
  } else if (currentDetailProject) {
    closeFullscreen();
  }
}

window.addEventListener('hashchange', handleProjectHash);

// Called from main.js after the first renderProjects so a page loaded
// directly on a #project/<slug> URL opens that project.
export function openProjectFromHash() {
  handleProjectHash();
}
