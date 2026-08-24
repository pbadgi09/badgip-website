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
  },
  nav: {
    items: [
      { label: 'Home', href: '#home', number: '00' },
      { label: 'About', href: '#about', number: '01' },
      { label: 'Projects', href: '#projects', number: '02' },
      { label: 'Contact', href: '#contact', number: '03' },
    ],
  },
  social: {
    github: 'https://github.com/pbadgi09',
    linkedin: '',
    twitter: '',
    email: 'badgip@yahoo.com',
  },
  theme: {
    accentColor: '#3effa3',
    backgroundColor: '#0a0a0a',
    textColor: '#e5e5e5',
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

export async function submitMessage({ name, email, message }) {
  await push(ref(db, 'messages'), {
    name,
    email,
    message,
    createdAt: Date.now(),
    read: false,
  });
}
