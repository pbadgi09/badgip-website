import { jsDelivrBase } from './config.js';
import { firstValueOfType, openBlogDetail } from './render-personal.js';

export function renderAbout(about, blogPosts) {
  renderProfessionalTimeline(
    about.professionalBio,
    about.professionalTimeline,
    about.professionalBioFontSize,
    about.professionalHighlights
  );
  renderPersonalTimeline(
    about.personalBio,
    about.personalTimeline,
    about.personalBioFontSize,
    about.personalHighlights,
    blogPosts || []
  );
}

// Wraps case-insensitive matches of each {keyword, color} in a colored
// span. Runs on already-escaped HTML, so only the wrapping <span> tags are
// real markup — the bio text itself can never inject anything. Keywords
// are sorted longest-first so e.g. "iOS Dev" doesn't get partially
// swallowed by a shorter "iOS" match first.
function highlightKeywords(escapedText, keywords) {
  const entries = (keywords || [])
    .filter((k) => k && k.keyword && k.keyword.trim())
    .sort((a, b) => b.keyword.length - a.keyword.length);
  if (!entries.length) return escapedText;

  const pattern = entries.map((k) => escapeRegExp(escapeHtml(k.keyword))).join('|');
  const colorByLower = new Map(entries.map((k) => [escapeHtml(k.keyword).toLowerCase(), k.color]));
  // Lookaround word boundaries (not \b) so a keyword like "Swift" doesn't
  // also match inside "SwiftUI" — \b would still split that in half.
  const re = new RegExp(`(?<![A-Za-z0-9])(${pattern})(?![A-Za-z0-9])`, 'gi');
  return escapedText.replace(re, (match) => {
    const color = colorByLower.get(match.toLowerCase()) || 'inherit';
    return `<span style="color:${escapeHtml(color)}">${match}</span>`;
  });
}

function escapeRegExp(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// Fills `#aboutBio-<mode>`, which only exists if a page section for that
// mode was actually mounted (see render-sections.js) — harmless no-op
// otherwise, so a mode without an About section configured just silently
// has nothing to fill in.
function renderBio(mode, bio, fontSize, highlights) {
  const bioEl = document.getElementById(`aboutBio-${mode}`);
  if (!bioEl) return;
  const text = bio || (mode === 'professional' ? "I'm a developer who cares about building things well." : '');
  bioEl.innerHTML = highlightKeywords(escapeHtml(text), highlights);
  if (fontSize > 0) {
    bioEl.style.fontSize = `${fontSize}px`;
  } else {
    bioEl.style.removeProperty('font-size');
  }
}

function renderProfessionalTimeline(bio, timelineEntries, fontSize, highlights) {
  renderBio('professional', bio, fontSize, highlights);

  const timelineEl = document.getElementById('timeline-professional');
  if (!timelineEl) return;

  (timelineEntries || []).forEach((entry) => {
    const item = document.createElement('div');
    item.className = 'timeline__item reveal';
    item.innerHTML = `
      <span class="timeline__dot"></span>
      <span class="timeline__year mono">${escapeHtml(formatYearRange(entry))}</span>
      <div class="timeline__header">
        ${entry.logo ? `<img class="timeline__logo" src="${resolveUrl(entry.logo)}" alt="" loading="lazy" onerror="this.remove()" />` : ''}
        <h3 class="timeline__title">${escapeHtml(entry.title)}</h3>
      </div>
      <p class="timeline__description">${escapeHtml(entry.description)}</p>
    `;
    timelineEl.appendChild(item);
  });
}

// Personal timeline: a horizontal scrolling strip (see .timeline-horizontal
// in css/layout.css, and the mode==='personal' class-swap in
// render-sections.js) mixing plain location/milestone entries with
// blog-post-linked ones (TimelineEntry.blogRef), in whatever order the mac
// app's drag-to-reorder left them in.
function renderPersonalTimeline(bio, timelineEntries, fontSize, highlights, blogPosts) {
  renderBio('personal', bio, fontSize, highlights);

  const timelineEl = document.getElementById('timeline-personal');
  if (!timelineEl) return;

  const postsById = new Map(blogPosts.map((p) => [p.id, p]));

  (timelineEntries || []).forEach((entry) => {
    if (entry.blogRef) {
      const post = postsById.get(entry.blogRef);
      if (post) timelineEl.appendChild(buildBlogTimelineCard(post));
      return;
    }
    timelineEl.appendChild(buildLocationTimelineCard(entry));
  });
}

function timelineCardMedia(imagePath, fallbackLetter) {
  if (imagePath) {
    return `<img src="${resolveUrl(imagePath)}" alt="" loading="lazy" onerror="this.closest('.timeline-card__media').classList.add('timeline-card__media--empty'); this.remove();" />`;
  }
  return `<span class="mono">${escapeHtml(fallbackLetter)}</span>`;
}

function buildLocationTimelineCard(entry) {
  const card = document.createElement('div');
  card.className = 'timeline-card reveal';
  const fallbackLetter = (entry.title || '?').charAt(0).toUpperCase();
  card.innerHTML = `
    <div class="timeline-card__media${entry.logo ? '' : ' timeline-card__media--empty'}">
      ${timelineCardMedia(entry.logo, fallbackLetter)}
    </div>
    <div class="timeline-card__body">
      <span class="timeline-card__year mono">${escapeHtml(formatYearRange(entry))}</span>
      <h3 class="timeline-card__title">${escapeHtml(entry.title)}</h3>
      ${entry.description ? `<p class="timeline-card__description">${escapeHtml(entry.description)}</p>` : ''}
    </div>
  `;
  return card;
}

function buildBlogTimelineCard(post) {
  const title = firstValueOfType(post.sections, 'title') || 'Untitled';
  const card = document.createElement('div');
  card.className = 'timeline-card timeline-card--blog reveal';
  card.tabIndex = 0;
  card.setAttribute('role', 'button');
  const fallbackLetter = title.charAt(0).toUpperCase();
  card.innerHTML = `
    <div class="timeline-card__media${post.coverImage ? '' : ' timeline-card__media--empty'}">
      ${timelineCardMedia(post.coverImage, fallbackLetter)}
    </div>
    <div class="timeline-card__body">
      ${post.timelineYear ? `<span class="timeline-card__year mono">${escapeHtml(post.timelineYear)}</span>` : ''}
      <h3 class="timeline-card__title">${escapeHtml(title)}</h3>
    </div>
  `;
  const open = () => openBlogDetail(post, card);
  card.addEventListener('click', open);
  card.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      open();
    }
  });
  return card;
}

function formatYearRange(entry) {
  return entry.endYear ? `${entry.year} – ${entry.endYear}` : entry.year;
}

function resolveUrl(path) {
  if (!path) return '';
  if (/^https?:\/\//.test(path)) return path;
  // Stored paths are built from a picked filename, which routinely has
  // spaces or other characters that aren't valid raw in a URL.
  const encoded = path.replace(/^\/+/, '').split('/').map(encodeURIComponent).join('/');
  return `${jsDelivrBase}/${encoded}`;
}

function escapeHtml(str) {
  if (str == null) return '';
  const div = document.createElement('div');
  div.textContent = String(str);
  return div.innerHTML;
}
