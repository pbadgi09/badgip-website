import { jsDelivrBase } from './config.js';

function resolveUrl(path) {
  if (!path) return '';
  if (/^https?:\/\//.test(path)) return path;
  return `${jsDelivrBase}/${path.replace(/^\/+/, '')}`;
}

function isImagePath(icon) {
  return /^https?:\/\//.test(icon) || /\.(png|jpe?g|svg|webp|gif)$/i.test(icon);
}

function iconMarkup(icon) {
  if (!icon) return '';
  if (isImagePath(icon)) {
    return `<img src="${resolveUrl(icon)}" alt="" loading="lazy" />`;
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

export function renderHero(settings) {
  const { hero } = settings;
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
  const { social, contact } = settings;
  const year = new Date().getFullYear();
  document.getElementById('footerYear').textContent = String(year);

  const footerGithub = document.getElementById('footerGithub');
  footerGithub.href = social.github;

  const footerLinkedin = document.getElementById('footerLinkedin');
  footerLinkedin.href = social.linkedin || social.github;
  footerLinkedin.hidden = !social.linkedin;

  document.getElementById('contactInfoTitle').textContent = contact.infoTitle;
  document.getElementById('contactInfoSubtitle').textContent = contact.infoSubtitle;
  document.getElementById('contactFormTitle').textContent = contact.heading;
  document.getElementById('contactFormSubtitle').textContent = contact.subheading;

  const bg = document.getElementById('contactInfoPanelBg');
  if (contact.backgroundImage) {
    bg.style.backgroundImage = `url("${resolveUrl(contact.backgroundImage)}")`;
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

  const socialsEl = document.getElementById('contactSocials');
  socialsEl.innerHTML = (contact.socialLinks || [])
    .map(
      (link) => `
      <a class="contact-socials__link" href="${escapeHtml(link.url || '#')}" target="_blank" rel="noopener" aria-label="Social link">
        ${iconMarkup(link.icon)}
      </a>
    `
    )
    .join('');
}
