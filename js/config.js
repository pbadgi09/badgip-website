// Public/non-secret client config — safe to commit.
export const firebaseConfig = {
  apiKey: 'AIzaSyAQMaA8cQGchwVmsGSMC3Ouva6hXVoMmLU',
  authDomain: 'itspranavbadgi.firebaseapp.com',
  databaseURL: 'https://itspranavbadgi-default-rtdb.firebaseio.com',
  projectId: 'itspranavbadgi',
  storageBucket: 'itspranavbadgi.firebasestorage.app',
  messagingSenderId: '466226587643',
  appId: '1:466226587643:web:f4eaccca045b2b20374d5e',
  measurementId: 'G-7ZPQ1GLRNM',
};

// TODO: replace with real EmailJS account details before relying on email
// notifications for the contact form. Until then, submissions still land in
// Firebase RTDB (visible in the macOS admin app's inbox) — email sending is
// attempted best-effort and fails silently in the UI if these are placeholders.
export const emailjsConfig = {
  publicKey: 'REPLACE_WITH_EMAILJS_PUBLIC_KEY',
  serviceId: 'REPLACE_WITH_EMAILJS_SERVICE_ID',
  templateId: 'REPLACE_WITH_EMAILJS_TEMPLATE_ID',
};

export const jsDelivrBase = 'https://cdn.jsdelivr.net/gh/pbadgi09/badgip-website@main/assets';
