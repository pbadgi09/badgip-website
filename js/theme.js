const STORAGE_KEY = 'badgip.theme';

let currentSettings = null;

function currentTheme() {
  return document.documentElement.getAttribute('data-theme') === 'dark' ? 'dark' : 'light';
}

function setOrClear(prop, value) {
  const root = document.documentElement.style;
  if (value) root.setProperty(prop, value);
  else root.removeProperty(prop);
}

// Applies the current theme's custom colors (from settings.theme.light /
// settings.theme.dark) as inline overrides on top of variables.css's own
// light/dark defaults — clearing a property (rather than leaving a stale
// inline value from the *other* theme) whenever a color wasn't configured,
// so an incompletely-set palette still falls back correctly per property.
function applyThemeColors(theme) {
  const palette = currentSettings?.theme?.[theme] || {};
  setOrClear('--color-bg', palette.background);
  setOrClear('--color-text', palette.text);
  setOrClear('--color-accent', palette.accent);
  setOrClear('--color-border', palette.border);

  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute('content', palette.background || (theme === 'dark' ? '#0a0a0c' : '#ffffff'));
}

// Wired independent of settings having loaded yet — the toggle itself only
// needs variables.css's built-in [data-theme] defaults to work; the custom
// per-theme colors from settings are a progressive enhancement applied on
// top once/if they're available (see applySettingsTheme below).
export function initThemeToggle() {
  const toggle = document.getElementById('themeToggle');
  if (!toggle) return;
  toggle.addEventListener('click', () => {
    const next = currentTheme() === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', next);
    localStorage.setItem(STORAGE_KEY, next);
    applyThemeColors(next);
  });
}

export function applySettingsTheme(settings) {
  currentSettings = settings;
  applyThemeColors(currentTheme());
}
