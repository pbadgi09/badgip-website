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

// Compact, currentColor brand marks — inherit the same color/hover CSS as
// contact.socialLinks' <img>-based icons (.site-footer__social-link).
const BRAND_ICONS = {
  github:
    '<svg viewBox="0 0 16 16" fill="currentColor"><path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.01 8.01 0 0 0 16 8c0-4.42-3.58-8-8-8z"/></svg>',
  linkedin:
    '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M20.45 20.45h-3.55v-5.57c0-1.33-.02-3.04-1.85-3.04-1.85 0-2.14 1.45-2.14 2.94v5.67H9.36V9h3.41v1.56h.05c.47-.9 1.63-1.85 3.36-1.85 3.6 0 4.27 2.37 4.27 5.45v6.29zM5.34 7.43a2.06 2.06 0 1 1 0-4.12 2.06 2.06 0 0 1 0 4.12zM7.12 20.45H3.56V9h3.56v11.45z"/></svg>',
  twitter:
    '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>',
  email:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 7 9 6 9-6"/></svg>',
};

// settings.social's well-known platform fields (github/linkedin/twitter/
// email) — kept separate from contact.socialLinks (an arbitrary icon+url
// list, also still supported) since these get real brand marks instead of
// whatever icon/emoji was typed in.
function brandSocialLinksMarkup(social) {
  if (!social) return '';
  const entries = [
    social.github && { url: social.github, icon: BRAND_ICONS.github, label: 'GitHub' },
    social.linkedin && { url: social.linkedin, icon: BRAND_ICONS.linkedin, label: 'LinkedIn' },
    social.twitter && { url: social.twitter, icon: BRAND_ICONS.twitter, label: 'Twitter' },
    social.email && { url: `mailto:${social.email}`, icon: BRAND_ICONS.email, label: 'Email' },
  ].filter(Boolean);

  return entries
    .map((entry) => {
      const isMailto = entry.url.startsWith('mailto:');
      const targetAttrs = isMailto ? '' : ' target="_blank" rel="noopener"';
      return `<a class="site-footer__social-link" href="${escapeHtml(entry.url)}"${targetAttrs} aria-label="${entry.label}">${entry.icon}</a>`;
    })
    .join('');
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

  const footerSocials = document.getElementById('footerSocials');
  const customLinksMarkup = (contact.socialLinks || [])
    .map(
      (link) => `
      <a class="site-footer__social-link" href="${escapeHtml(link.url || '#')}" target="_blank" rel="noopener" aria-label="Social link">
        ${iconMarkup(link.icon)}
      </a>
    `
    )
    .join('');
  // Brand-icon links (settings.social) lead, followed by any additional
  // custom icon+url links (contact.socialLinks) — both render into the
  // same footer spot, neither replaces the other.
  footerSocials.innerHTML = brandSocialLinksMarkup(settings.social) + customLinksMarkup;

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
