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

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function initContactForm() {
  const form = document.getElementById('contactForm');
  const status = document.getElementById('contactStatus');
  const submitBtn = document.getElementById('contactSubmit');
  const label = submitBtn.querySelector('.btn__label');

  // Per-field validators keyed to the [data-field] wrappers in the markup.
  const fields = {
    name: { el: form.name, msg: 'Please enter your name.', valid: (v) => !!v },
    email: { el: form.email, msg: 'Please enter a valid email address.', valid: (v) => EMAIL_RE.test(v) },
    message: { el: form.message, msg: 'Please enter a message.', valid: (v) => !!v },
  };

  function setFieldError(key, show) {
    const wrap = form.querySelector(`[data-field="${key}"]`);
    const err = wrap?.querySelector('.form-field__error');
    if (!wrap || !err) return;
    wrap.classList.toggle('is-invalid', show);
    err.textContent = show ? fields[key].msg : '';
  }

  // Clear a field's error as soon as the user starts fixing it.
  Object.entries(fields).forEach(([key, f]) => {
    f.el.addEventListener('input', () => {
      if (fields[key].valid(f.el.value.trim())) setFieldError(key, false);
    });
  });

  function setLoading(on) {
    submitBtn.classList.toggle('is-loading', on);
    submitBtn.disabled = on;
    if (label) label.textContent = on ? 'Sending…' : 'Send Message';
  }

  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const name = form.name.value.trim();
    const email = form.email.value.trim();
    const message = form.message.value.trim();
    const phone = form.phone.value.trim();
    const honeypot = form.company.value.trim();

    if (honeypot) return; // silently drop bot submissions

    // Inline per-field validation; focus the first invalid field.
    let firstInvalid = null;
    for (const [key, f] of Object.entries(fields)) {
      const ok = f.valid(f.el.value.trim());
      setFieldError(key, !ok);
      if (!ok && !firstInvalid) firstInvalid = f.el;
    }
    if (firstInvalid) {
      status.textContent = '';
      status.dataset.state = '';
      firstInvalid.focus();
      return;
    }

    setLoading(true);
    status.textContent = '';
    status.dataset.state = '';

    try {
      await submitMessage({ name, email, message, phone });
      sendEmailNotification({ name, email, message });
      status.innerHTML = '<span class="contact-form__status-icon" aria-hidden="true">✓</span> Message sent — thank you!';
      status.dataset.state = 'success';
      form.reset();
      // Let the success banner linger, then clear it.
      window.setTimeout(() => {
        if (status.dataset.state === 'success') {
          status.textContent = '';
          status.dataset.state = '';
        }
      }, 6000);
    } catch (err) {
      console.error('Failed to submit contact message:', err);
      status.textContent = 'Something went wrong — please try again or email me directly.';
      status.dataset.state = 'error';
    } finally {
      setLoading(false);
    }
  });
}
