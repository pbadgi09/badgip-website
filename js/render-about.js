import { jsDelivrBase } from './config.js';

export function renderAbout(about) {
  document.getElementById('aboutBioProfessional').textContent =
    about.professionalBio || "I'm a developer who cares about building things well.";

  const timelineEl = document.getElementById('timelineProfessional');
  const entries = about.professionalTimeline || [];

  entries.forEach((entry) => {
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
