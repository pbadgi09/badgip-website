// Shared text helpers used by the hero subtitle, the About bios, and the
// project-detail tiles so keyword highlighting behaves identically
// everywhere instead of each renderer carrying its own copy.

export function escapeHtml(str) {
  if (str == null) return '';
  const div = document.createElement('div');
  div.textContent = String(str);
  return div.innerHTML;
}

export function escapeRegExp(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// Wraps case-insensitive matches of each {keyword, color} in a colored
// span. Runs on already-escaped HTML, so only the wrapping <span> tags are
// real markup — the source text itself can never inject anything. Keywords
// are sorted longest-first so e.g. "iOS Dev" doesn't get partially
// swallowed by a shorter "iOS" match first.
export function highlightKeywords(escapedText, keywords) {
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

// Renders text that may contain manual line breaks (\n) into escaped HTML
// with <br> between lines — used by the multiline hero title.
export function escapeHtmlMultiline(str) {
  return escapeHtml(str).replace(/\r?\n/g, '<br>');
}
