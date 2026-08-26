import { jsDelivrBase } from './config.js';

export function renderAbout(about) {
  renderTimelineFor(
    'professional',
    about.professionalBio,
    about.professionalTimeline,
    about.professionalBioFontSize,
    about.professionalHighlights
  );
  renderTimelineFor(
    'personal',
    about.personalBio,
    about.personalTimeline,
    about.personalBioFontSize,
    about.personalHighlights
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

// Renders into `#aboutBio-<mode>`/`#timeline-<mode>`, which only exist if a
// page section for that mode was actually mounted (see render-sections.js) —
// harmless no-op otherwise, so a mode without an About section configured
// just silently has nothing to fill in.
function renderTimelineFor(mode, bio, timelineEntries, fontSize, highlights) {
  const bioEl = document.getElementById(`aboutBio-${mode}`);
  if (bioEl) {
    const text = bio || (mode === 'professional' ? "I'm a developer who cares about building things well." : '');
    bioEl.innerHTML = highlightKeywords(escapeHtml(text), highlights);
    if (fontSize > 0) {
      bioEl.style.fontSize = `${fontSize}px`;
    } else {
      bioEl.style.removeProperty('font-size');
    }
  }

  const timelineEl = document.getElementById(`timeline-${mode}`);
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
