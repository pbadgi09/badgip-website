import { jsDelivrBase } from './config.js';

const TEMPLATE_IDS = {
  about: 'sectionTemplate-about',
  projects: 'sectionTemplate-projects',
  youtube: 'sectionTemplate-youtube',
  blog: 'sectionTemplate-blog',
};

const SECTION_LABELS = {
  about: 'About',
  projects: 'Projects',
  youtube: 'YouTube',
  blog: 'Blog',
};

let mountedByMode = { professional: [], personal: [] };

function escapeHtml(str) {
  if (str == null) return '';
  const div = document.createElement('div');
  div.textContent = String(str);
  return div.innerHTML;
}

function slugify(str) {
  return String(str || 'section')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '') || 'section';
}

function isImagePath(icon) {
  return /^https?:\/\//.test(icon) || /\.(png|jpe?g|svg|webp|gif)$/i.test(icon);
}

function iconMarkup(icon) {
  if (!icon) return '';
  if (isImagePath(icon)) {
    const src = /^https?:\/\//.test(icon) ? icon : `${jsDelivrBase}/${icon.replace(/^\/+/, '')}`;
    return `<img src="${src}" alt="" loading="lazy" />`;
  }
  return `<span class="custom-section__emoji">${escapeHtml(icon)}</span>`;
}

function buildCustomSection(entry) {
  const template = document.getElementById('sectionTemplate-custom');
  const section = template.content.firstElementChild.cloneNode(true);
  section.id = `custom-${slugify(entry.title || entry.id)}`;
  section.querySelector('.section-title').textContent = entry.title || 'Untitled Section';

  const grid = section.querySelector('.custom-section__grid');
  const items = [...(entry.items || [])].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  grid.innerHTML = items
    .map(
      (item) => `
      <div class="custom-section__item">
        <div class="custom-section__icon">${iconMarkup(item.icon)}</div>
        ${item.label ? `<span class="custom-section__label mono">${escapeHtml(item.label)}</span>` : ''}
      </div>
    `
    )
    .join('');

  return section;
}

export function mountPageSections(pageSections) {
  const container = document.getElementById('dynamicSections');
  const navContactItem = document.getElementById('navContactItem');
  container.innerHTML = '';
  document.querySelectorAll('#navList [data-dynamic-nav]').forEach((el) => el.remove());

  mountedByMode = { professional: [], personal: [] };

  const grouped = { professional: [], personal: [] };
  (pageSections || []).forEach((entry) => {
    if (grouped[entry.mode]) grouped[entry.mode].push(entry);
  });

  ['professional', 'personal'].forEach((mode) => {
    const sorted = [...grouped[mode]].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));

    sorted.forEach((entry) => {
      let sectionEl;
      let label;

      if (entry.kind === 'custom') {
        sectionEl = buildCustomSection(entry);
        label = entry.title || 'Section';
      } else {
        const template = document.getElementById(TEMPLATE_IDS[entry.kind]);
        if (!template) return;
        sectionEl = template.content.firstElementChild.cloneNode(true);
        label = SECTION_LABELS[entry.kind];
      }

      sectionEl.dataset.mode = mode;
      sectionEl.hidden = true;
      container.appendChild(sectionEl);

      // Every section still gets a page position/number regardless of nav
      // visibility — only whether it gets a <li> in the floating nav pill
      // is conditional. Lets someone keep a section on the page (in its own
      // scroll order) while leaving it out of the compact nav list.
      const showInNav = entry.showInNav !== false;
      let navNumEl = null;

      if (showInNav) {
        const navLi = document.createElement('li');
        navLi.dataset.mode = mode;
        navLi.dataset.dynamicNav = 'true';
        navLi.hidden = true;
        navLi.innerHTML = `<a href="#${sectionEl.id}" class="site-nav__link mono" data-nav-link="${sectionEl.id}"><span class="num"></span>${escapeHtml(label)}</a>`;
        navContactItem.insertAdjacentElement('beforebegin', navLi);
        navNumEl = navLi.querySelector('.num');
      }

      mountedByMode[mode].push({
        sectionNumEl: sectionEl.querySelector('.section-number'),
        navNumEl,
      });
    });
  });
}

export function updateSectionNumbers(mode) {
  const items = mountedByMode[mode] || [];
  let navIndex = 0;
  items.forEach((item, i) => {
    const pageNum = String(i + 1).padStart(2, '0');
    if (item.sectionNumEl) item.sectionNumEl.textContent = pageNum;
    if (item.navNumEl) {
      navIndex += 1;
      item.navNumEl.textContent = String(navIndex).padStart(2, '0');
    }
  });

  const contactSectionNumberEl = document.getElementById('contactSectionNumber');
  if (contactSectionNumberEl) contactSectionNumberEl.textContent = String(items.length + 1).padStart(2, '0');
  const contactNavNumEl = document.querySelector('#navContactItem .num');
  if (contactNavNumEl) contactNavNumEl.textContent = String(navIndex + 1).padStart(2, '0');
}

export function getMountedSectionIds() {
  const ids = new Set(['home', 'contact']);
  Object.values(mountedByMode)
    .flat()
    .forEach((item) => {
      const section = item.sectionNumEl?.closest('section');
      if (section?.id) ids.add(section.id);
    });
  return [...ids];
}
