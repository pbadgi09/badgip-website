import { jsDelivrBase } from './config.js';

function resolveUrl(path) {
  if (!path) return '';
  if (/^https?:\/\//.test(path)) return path;
  // Stored paths are built from a picked filename, which routinely has
  // spaces or other characters that aren't valid raw in a URL.
  const encoded = path.replace(/^\/+/, '').split('/').map(encodeURIComponent).join('/');
  return `${jsDelivrBase}/${encoded}`;
}

function isImagePath(icon) {
  return /^https?:\/\//.test(icon) || /\.(png|jpe?g|svg|webp|gif)$/i.test(icon);
}

function iconMarkup(icon) {
  if (!icon) return '';
  if (isImagePath(icon)) {
    return `<img src="${resolveUrl(icon)}" alt="" loading="lazy" onerror="this.remove()" />`;
  }
  const div = document.createElement('div');
  div.textContent = icon;
  return div.innerHTML;
}

function escapeHtml(str) {
  if (str == null) return '';
  const div = document.createElement('div');
  div.textContent = String(str);
  return div.innerHTML;
}

// The Home/Contact nav items are the only two NOT already driven by the
// dynamic page-sections system (About/Projects get their nav entries from
// mountPageSections instead) — so this only ever touches those two, matched
// by href rather than array position, and is a harmless no-op for any other
// entries someone adds to settings.nav.items.
export function applyNavItems(settings) {
  const items = settings.nav?.items || [];
  for (const href of ['#home', '#contact']) {
    const match = items.find((item) => item.href === href);
    if (!match) continue;
    const link = document.querySelector(`.site-nav__link[href="${href}"]`);
    if (!link) continue;
    const label = link.querySelector('.label');
    const num = link.querySelector('.num');
    if (label && match.label) label.textContent = match.label;
    if (num && match.number) num.textContent = match.number;
  }
}

export function renderHero(settings) {
  const { hero } = settings;

  const avatar = document.getElementById('heroAvatar');
  if (hero.profileImage) {
    avatar.src = resolveUrl(hero.profileImage);
    avatar.alt = hero.name;
    avatar.hidden = false;
    avatar.addEventListener('error', () => { avatar.hidden = true; }, { once: true });
  } else {
    avatar.hidden = true;
  }

  document.getElementById('heroGreeting').textContent = hero.greeting;
  document.getElementById('heroName').textContent = hero.name;
  document.getElementById('heroRole').textContent = hero.role;
  document.getElementById('heroDescription').textContent = hero.description;

  const ctaPrimary = document.getElementById('heroCtaPrimary');
  document.getElementById('heroCtaPrimaryText').textContent = hero.ctaPrimaryText;
  ctaPrimary.href = hero.ctaPrimaryHref;

  const ctaSecondary = document.getElementById('heroCtaSecondary');
  ctaSecondary.textContent = hero.ctaSecondaryText;
  ctaSecondary.href = hero.ctaSecondaryHref;

  document.title = settings.meta.title;
  const metaDesc = document.querySelector('meta[name="description"]');
  if (metaDesc) metaDesc.setAttribute('content', settings.meta.description);
}

export function renderContactAndFooter(settings) {
  const { contact } = settings;
  const year = new Date().getFullYear();
  document.getElementById('footerYear').textContent = String(year);

  // Footer icons are a fully custom icon+url list (settings.contact.
  // socialLinks) — no fixed/built-in platform fields; add as many or as
  // few as you want from the macOS app's "Footer Icons" settings.
  const footerSocials = document.getElementById('footerSocials');
  footerSocials.innerHTML = (contact.socialLinks || [])
    .map(
      (link) => `
      <a class="site-footer__social-link" href="${escapeHtml(link.url || '#')}" target="_blank" rel="noopener" aria-label="Social link">
        ${iconMarkup(link.icon)}
      </a>
    `
    )
    .join('');

  document.getElementById('contactInfoTitle').textContent = contact.infoTitle;
  document.getElementById('contactInfoSubtitle').textContent = contact.infoSubtitle;
  document.getElementById('contactFormTitle').textContent = contact.heading;
  document.getElementById('contactFormSubtitle').textContent = contact.subheading;

  // Falls back to a light "plain" card (matching the site's own theme)
  // when no photo has been set, instead of an empty-looking dark box.
  const panel = document.getElementById('contactInfoPanel');
  const bg = document.getElementById('contactInfoPanelBg');
  if (contact.backgroundImage) {
    panel.classList.add('contact-info-panel--photo');
    panel.classList.remove('contact-info-panel--plain');
    bg.style.backgroundImage = `url("${resolveUrl(contact.backgroundImage)}")`;
  } else {
    panel.classList.add('contact-info-panel--plain');
    panel.classList.remove('contact-info-panel--photo');
  }

  const infoList = document.getElementById('contactInfoList');
  infoList.innerHTML = (contact.infoItems || [])
    .map(
      (item) => `
      <div class="contact-info-item">
        <span class="contact-info-item__icon">${iconMarkup(item.icon)}</span>
        <span class="contact-info-item__label">${escapeHtml(item.label)}</span>
      </div>
    `
    )
    .join('');
}
