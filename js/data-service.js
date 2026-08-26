import { ref, get, push } from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-database.js';
import { db } from './firebase-init.js';

const DEFAULT_SETTINGS = {
  hero: {
    greeting: "Hello, I'm",
    name: 'Pranav Badgi',
    role: 'Full Stack Developer',
    description: 'Building modern, thoughtful software — from idea to shipped product.',
    ctaPrimaryText: 'View My Work',
    ctaPrimaryHref: '#projects',
    ctaSecondaryText: 'Get In Touch',
    ctaSecondaryHref: '#contact',
    profileImage: '',
  },
  contact: {
    heading: 'Get in touch',
    subheading: 'Any questions or remarks? Just write a message.',
    infoTitle: 'Contact information',
    infoSubtitle: "Fill up this form and I'll get back to you within 24 hours.",
    backgroundImage: '',
    infoItems: [],
    socialLinks: [{ icon: '💻', url: 'https://github.com/pbadgi09' }],
  },
  theme: {
    light: { background: '#ffffff', text: '#0a0a0a', accent: '#3effa3', border: '#e2e2e2' },
    dark: { background: '#0a0a0c', text: '#f5f5f5', accent: '#3effa3', border: '#2a2a30' },
  },
  meta: {
    title: 'Pranav Badgi — Portfolio',
    description: 'Portfolio of Pranav Badgi — projects, work, and contact.',
    ogImage: '',
  },
};

const DEFAULT_ABOUT = {
  professionalBio: '',
  personalBio: '',
  professionalTimeline: [],
  personalTimeline: [],
  professionalBioFontSize: 0,
  personalBioFontSize: 0,
  professionalHighlights: [],
  personalHighlights: [],
};

function deepMerge(base, override) {
  if (!override || typeof override !== 'object') return base;
  const result = Array.isArray(base) ? [...base] : { ...base };
  for (const key of Object.keys(override)) {
    const value = override[key];
    if (value && typeof value === 'object' && !Array.isArray(value) && base[key]) {
      result[key] = deepMerge(base[key], value);
    } else {
      result[key] = value;
    }
  }
  return result;
}

export async function getSettings() {
  try {
    const snapshot = await get(ref(db, 'settings'));
    return deepMerge(DEFAULT_SETTINGS, snapshot.val());
  } catch (err) {
    console.error('Failed to fetch settings, using defaults:', err);
    return DEFAULT_SETTINGS;
  }
}

export async function getAbout() {
  try {
    const snapshot = await get(ref(db, 'about'));
    return deepMerge(DEFAULT_ABOUT, snapshot.val());
  } catch (err) {
    console.error('Failed to fetch about content:', err);
    return DEFAULT_ABOUT;
  }
}

export async function getProjects() {
  try {
    const snapshot = await get(ref(db, 'projects'));
    const val = snapshot.val();
    if (!val) return [];
    return Object.entries(val)
      .map(([id, project]) => ({ id, ...project }))
      .filter((p) => p.status === 'published')
      .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  } catch (err) {
    console.error('Failed to fetch projects:', err);
    return [];
  }
}

export async function getPersonalYoutube() {
  try {
    const snapshot = await get(ref(db, 'personalYoutube'));
    const val = snapshot.val();
    if (!val) return [];
    return Object.entries(val)
      .map(([id, video]) => ({ id, ...video }))
      .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  } catch (err) {
    console.error('Failed to fetch YouTube videos:', err);
    return [];
  }
}

export async function getPersonalBlog() {
  try {
    const snapshot = await get(ref(db, 'personalBlog'));
    const val = snapshot.val();
    if (!val) return [];
    return Object.entries(val)
      .map(([id, post]) => ({ id, ...post }))
      .filter((p) => p.status === 'published')
      .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  } catch (err) {
    console.error('Failed to fetch blog posts:', err);
    return [];
  }
}

// Fallback used before `pageSections` exists in RTDB (or its rules haven't
// been published yet) so the site still renders in its original section
// order instead of coming up empty.
const DEFAULT_PAGE_SECTIONS = [
  { id: 'default-about', kind: 'about', mode: 'professional', order: 0 },
  { id: 'default-projects', kind: 'projects', mode: 'professional', order: 1 },
  { id: 'default-youtube', kind: 'youtube', mode: 'personal', order: 0 },
  { id: 'default-blog', kind: 'blog', mode: 'personal', order: 1 },
];

export async function getPageSections() {
  try {
    const snapshot = await get(ref(db, 'pageSections'));
    const val = snapshot.val();
    if (!val) return DEFAULT_PAGE_SECTIONS;
    return Object.entries(val).map(([id, section]) => ({ id, ...section }));
  } catch (err) {
    console.error('Failed to fetch page sections, using defaults:', err);
    return DEFAULT_PAGE_SECTIONS;
  }
}

export async function submitMessage({ name, email, message, phone }) {
  await push(ref(db, 'messages'), {
    name,
    email,
    message,
    phone: phone || '',
    createdAt: Date.now(),
    read: false,
  });
}
