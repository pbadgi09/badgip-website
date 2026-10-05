import { jsDelivrBase } from './config.js';
import { escapeHtml, escapeHtmlMultiline, highlightKeywords } from './highlight.js';

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

// Shared by the hero CTA row and (previously) the footer. Social links are a
// custom icon+url list; emojis, image URLs, and repo asset paths all work.
function socialLinksHtml(links) {
  return (links || [])
    .map(
      (link) => `
      <a class="social-link" href="${escapeHtml(link.url || '#')}" target="_blank" rel="noopener" aria-label="Social link">
        ${iconMarkup(link.icon)}
      </a>
    `
    )
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

// Falls back to the legacy ctaPrimary/ctaSecondary pair when no `ctas` list
// has been saved yet, so existing data keeps showing two buttons until the
// app re-saves the hero with the new configurable list.
function heroCtaList(hero) {
  const list = (hero.ctas || []).filter((c) => c && (c.text || c.href));
  if (list.length) return list;
  const legacy = [];
  if (hero.ctaPrimaryText) legacy.push({ text: hero.ctaPrimaryText, href: hero.ctaPrimaryHref || '#projects' });
  if (hero.ctaSecondaryText) legacy.push({ text: hero.ctaSecondaryText, href: hero.ctaSecondaryHref || '#contact' });
  return legacy;
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

  // Multiline title (manual \n honored) + a subtitle that supports the same
  // keyword-highlighting + font-size controls as the About bios.
  document.getElementById('heroName').innerHTML = escapeHtmlMultiline(hero.name);
  const subtitle = document.getElementById('heroDescription');
  subtitle.innerHTML = highlightKeywords(escapeHtml(hero.description), hero.subtitleHighlights);
  if (hero.subtitleFontSize > 0) {
    subtitle.style.fontSize = `${hero.subtitleFontSize}px`;
  } else {
    subtitle.style.removeProperty('font-size');
  }

  // Configurable CTA list (first is primary, rest ghost) followed inline by
  // the social icons — moved here from the footer, same socialLinks data.
  document.getElementById('heroCtas').innerHTML = heroCtaList(hero)
    .map((c, i) => {
      const cls = i === 0 ? 'btn btn--primary btn--lg' : 'btn btn--ghost btn--lg';
      const href = c.href || '#';
      const external = !href.startsWith('#');
      const attrs = external ? ' target="_blank" rel="noopener"' : '';
      const arrow = i === 0 ? '<span class="btn__arrow" aria-hidden="true">→</span>' : '';
      return `<a href="${escapeHtml(href)}" class="${cls}"${attrs}>${escapeHtml(c.text || '')}${arrow}</a>`;
    })
    .join('');
  document.getElementById('heroSocials').innerHTML = socialLinksHtml(settings.contact?.socialLinks);

  document.title = settings.meta.title;
  const metaDesc = document.querySelector('meta[name="description"]');
  if (metaDesc) metaDesc.setAttribute('content', settings.meta.description);
}

export function renderContactAndFooter(settings) {
  const { contact } = settings;
  const year = new Date().getFullYear();
  document.getElementById('footerYear').textContent = String(year);

  // Social icons now live next to the hero CTAs (see renderHero); the footer
  // is just the copyright line.

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
