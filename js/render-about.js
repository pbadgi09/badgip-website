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

// Personal timeline: a real zigzag timeline (a continuous strip with a dot
// per item, content alternating above/below — see .timeline-horizontal in
// css/layout.css) mixing plain location/milestone entries with
// blog-post-linked ones (TimelineEntry.blogRef), in whatever order the mac
// app's drag-to-reorder left them in. Horizontally scrollable since the
// list is unbounded, unlike the reference design it's modeled on.
function renderPersonalTimeline(bio, timelineEntries, fontSize, highlights, blogPosts) {
  renderBio('personal', bio, fontSize, highlights);

  const timelineEl = document.getElementById('timeline-personal');
  if (!timelineEl) return;

  const track = document.createElement('div');
  track.className = 'timeline-horizontal__track';

  const postsById = new Map(blogPosts.map((p) => [p.id, p]));
  // Index only advances for items actually rendered (a blogRef pointing at
  // a missing/unpublished post is skipped) so the above/below alternation
  // never has a silent gap in it.
  let index = 0;
  (timelineEntries || []).forEach((entry) => {
    let item;
    if (entry.blogRef) {
      const post = postsById.get(entry.blogRef);
      if (!post) return;
      item = buildBlogTimelineItem(post, index);
    } else {
      item = buildLocationTimelineItem(entry, index);
    }
    track.appendChild(item);
    index += 1;
  });

  timelineEl.appendChild(track);
}

// Image sits above year/title, per how this section is meant to read —
// but is omitted entirely (not a placeholder box) when there's no image,
// so an entry without one is simply shorter, not full of empty space.
function timelineItemMedia(imagePath) {
  if (!imagePath) return '';
  return `<div class="timeline-item__media"><img src="${resolveUrl(imagePath)}" alt="" loading="lazy" onerror="this.closest('.timeline-item__media').remove();" /></div>`;
}

// Builds the shared above/dot/below skeleton every timeline item uses —
// `content` (already-built inner HTML) goes on whichever side `index`'s
// parity puts it on; the other side stays an empty (but still
// flex-sized) sibling, which is what keeps every item's dot vertically
// centered on the shared line regardless of how tall its neighbors'
// content is (see the flex layout in css/layout.css).
function timelineItemSkeleton(content, index) {
  const isAbove = index % 2 === 0;
  return `
    <div class="timeline-item__above">${isAbove ? content : ''}</div>
    <div class="timeline-item__dot-row"><span class="timeline-item__dot"></span></div>
    <div class="timeline-item__below">${isAbove ? '' : content}</div>
  `;
}

function buildLocationTimelineItem(entry, index) {
  const content = `
    ${timelineItemMedia(entry.logo)}
    <span class="timeline-item__year mono">${escapeHtml(formatYearRange(entry))}</span>
    <h3 class="timeline-item__title">${escapeHtml(entry.title)}</h3>
    ${entry.description ? `<p class="timeline-item__description">${escapeHtml(entry.description)}</p>` : ''}
  `;
  const item = document.createElement('div');
  item.className = 'timeline-item reveal';
  item.innerHTML = timelineItemSkeleton(content, index);
  return item;
}

function buildBlogTimelineItem(post, index) {
  const title = firstValueOfType(post.sections, 'title') || 'Untitled';
  const content = `
    ${timelineItemMedia(post.coverImage)}
    ${post.timelineYear ? `<span class="timeline-item__year mono">${escapeHtml(post.timelineYear)}</span>` : ''}
    <h3 class="timeline-item__title">${escapeHtml(title)}</h3>
  `;
  const item = document.createElement('div');
  item.className = 'timeline-item timeline-item--blog reveal';
  item.tabIndex = 0;
  item.setAttribute('role', 'button');
  item.innerHTML = timelineItemSkeleton(content, index);
  const open = () => openBlogDetail(post, item);
  item.addEventListener('click', open);
  item.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      open();
    }
  });
  return item;
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
