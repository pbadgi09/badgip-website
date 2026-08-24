export function renderAbout(about) {
  document.getElementById('aboutBioProfessional').textContent =
    about.professionalBio || "I'm a developer who cares about building things well.";
  document.getElementById('aboutBioPersonal').textContent = about.personalBio || '';

  const timelineEl = document.getElementById('timelineProfessional');
  const entries = [...(about.professionalTimeline || [])].sort(
    (a, b) => (b.order ?? 0) - (a.order ?? 0)
  );

  entries.forEach((entry) => {
    const item = document.createElement('div');
    item.className = 'timeline__item reveal';
    item.innerHTML = `
      <span class="timeline__dot"></span>
      <span class="timeline__year mono">${escapeHtml(entry.year)}</span>
      <h3 class="timeline__title">${escapeHtml(entry.title)}</h3>
      <p class="timeline__description">${escapeHtml(entry.description)}</p>
    `;
    timelineEl.appendChild(item);
  });
}

function escapeHtml(str) {
  if (str == null) return '';
  const div = document.createElement('div');
  div.textContent = String(str);
  return div.innerHTML;
}
