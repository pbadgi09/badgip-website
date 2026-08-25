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
  const { social } = settings;
  const year = new Date().getFullYear();
  document.getElementById('footerYear').textContent = String(year);

  const contactEmail = document.getElementById('contactEmail');
  contactEmail.textContent = social.email;
  contactEmail.href = `mailto:${social.email}`;

  const contactGithub = document.getElementById('contactGithub');
  contactGithub.href = social.github;

  const contactLinkedin = document.getElementById('contactLinkedin');
  contactLinkedin.href = social.linkedin || social.github;
  contactLinkedin.hidden = !social.linkedin;

  const footerGithub = document.getElementById('footerGithub');
  footerGithub.href = social.github;

  const footerLinkedin = document.getElementById('footerLinkedin');
  footerLinkedin.href = social.linkedin || social.github;
  footerLinkedin.hidden = !social.linkedin;
}
