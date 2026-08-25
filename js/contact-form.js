import { submitMessage } from './data-service.js';
import { emailjsConfig } from './config.js';

let emailjsLoaded = false;

function loadEmailJs() {
  if (emailjsLoaded) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/npm/@emailjs/browser@4/dist/email.min.js';
    script.onload = () => {
      try {
        window.emailjs.init({ publicKey: emailjsConfig.publicKey });
        emailjsLoaded = true;
        resolve();
      } catch (err) {
        reject(err);
      }
    };
    script.onerror = reject;
    document.head.appendChild(script);
  });
}

async function sendEmailNotification({ name, email, message }) {
  const isPlaceholder = emailjsConfig.publicKey.startsWith('REPLACE_WITH');
  if (isPlaceholder) return;
  try {
    await loadEmailJs();
    await window.emailjs.send(emailjsConfig.serviceId, emailjsConfig.templateId, {
      name,
      email,
      message,
    });
  } catch (err) {
    console.error('EmailJS notification failed (message was still saved):', err);
  }
}

export function initContactForm() {
  const form = document.getElementById('contactForm');
  const status = document.getElementById('contactStatus');
  const submitBtn = document.getElementById('contactSubmit');

  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const name = form.name.value.trim();
    const email = form.email.value.trim();
    const message = form.message.value.trim();
    const phone = form.phone.value.trim();
    const honeypot = form.company.value.trim();

    if (honeypot) return; // silently drop bot submissions

    if (!name || !message || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      status.textContent = 'Please fill out all required fields with a valid email.';
      status.dataset.state = 'error';
      return;
    }

    submitBtn.disabled = true;
    status.textContent = 'Sending…';
    status.dataset.state = '';

    try {
      await submitMessage({ name, email, message, phone });
      sendEmailNotification({ name, email, message });
      status.textContent = 'Message sent — thank you!';
      status.dataset.state = 'success';
      form.reset();
    } catch (err) {
      console.error('Failed to submit contact message:', err);
      status.textContent = 'Something went wrong — please try again or email me directly.';
      status.dataset.state = 'error';
    } finally {
      submitBtn.disabled = false;
    }
  });
}
