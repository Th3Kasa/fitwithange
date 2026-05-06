/**
 * FitWithAnge — booking.js
 * Handles the native booking form on book.html:
 *  - Client-side validation
 *  - Saves to localStorage under key "fitwithange_bookings"
 *  - Attempts Formspree POST
 *  - Shows success / error toast
 */

(function () {
  'use strict';

  const STORAGE_KEY = 'fitwithange_bookings';

  /* ── Retrieve existing bookings ───────────────────────── */
  function getBookings() {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
    } catch {
      return [];
    }
  }

  /* ── Save a new booking ───────────────────────────────── */
  function saveBooking(data) {
    const bookings = getBookings();
    const booking = {
      id: 'bk_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7),
      timestamp: new Date().toISOString(),
      status: 'pending',
      ...data
    };
    bookings.push(booking);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(bookings));
    return booking;
  }

  /* ── Simple email validation ──────────────────────────── */
  function isValidEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  }

  /* ── Show field error ─────────────────────────────────── */
  function setFieldError(field, message) {
    field.style.borderColor = '#d9534f';
    let err = field.parentElement.querySelector('.field-error');
    if (!err) {
      err = document.createElement('span');
      err.className = 'field-error';
      err.style.cssText = 'color:#d9534f;font-size:0.8rem;margin-top:0.25rem;display:block;';
      field.parentElement.appendChild(err);
    }
    err.textContent = message;
    field.setAttribute('aria-invalid', 'true');
  }

  /* ── Clear field error ────────────────────────────────── */
  function clearFieldError(field) {
    field.style.borderColor = '';
    const err = field.parentElement.querySelector('.field-error');
    if (err) err.remove();
    field.removeAttribute('aria-invalid');
  }

  /* ── Validate entire form ─────────────────────────────── */
  function validateForm(form) {
    let valid = true;

    const fields = {
      'booking-name':    { label: 'Full name',          check: v => v.trim().length >= 2 },
      'booking-email':   { label: 'Email address',      check: v => isValidEmail(v.trim()) },
      'booking-phone':   { label: 'Phone number',       check: v => v.trim().length >= 6 },
      'booking-service': { label: 'Service',            check: v => v !== '' },
      'booking-date':    { label: 'Preferred date',     check: v => v !== '' },
      'booking-time':    { label: 'Preferred time',     check: v => v !== '' },
      'booking-goals':   { label: 'Goals',              check: v => v.trim().length >= 10 },
    };

    Object.entries(fields).forEach(([id, { label, check }]) => {
      const field = form.querySelector(`#${id}`);
      if (!field) return;
      clearFieldError(field);
      if (!check(field.value)) {
        const messages = {
          'booking-name':    'Please enter your full name.',
          'booking-email':   'Please enter a valid email address.',
          'booking-phone':   'Please enter a valid phone number.',
          'booking-service': 'Please select a service.',
          'booking-date':    'Please choose a preferred date.',
          'booking-time':    'Please choose a preferred time.',
          'booking-goals':   'Please share a bit about your goals (at least 10 characters).',
        };
        setFieldError(field, messages[id]);
        valid = false;
      }
    });

    return valid;
  }

  /* ── Submit to Formspree ──────────────────────────────── */
  async function submitToFormspree(formEl, data) {
    // [REPLACE: formspree-id] — replace "YOUR_FORMSPREE_ID" with your actual Formspree form ID
    // Get a free form at https://formspree.io — free tier: 50 submissions/month
    // After creating your form, replace "YOUR_FORMSPREE_ID" below (e.g., "xpwzabcd")
    const FORMSPREE_URL = formEl.action; // set on the <form action="..."> attribute

    if (!FORMSPREE_URL || FORMSPREE_URL.includes('[REPLACE')) {
      console.warn('FitWithAnge: Formspree URL not set. Booking saved to localStorage only.');
      return { ok: false, localOnly: true };
    }

    const payload = new FormData();
    Object.entries(data).forEach(([k, v]) => payload.append(k, v));

    try {
      const response = await fetch(FORMSPREE_URL, {
        method: 'POST',
        body: payload,
        headers: { Accept: 'application/json' }
      });
      return { ok: response.ok, status: response.status };
    } catch (err) {
      console.error('Formspree submission failed:', err);
      return { ok: false, error: err.message };
    }
  }

  /* ── Main Init ────────────────────────────────────────── */
  const form = document.getElementById('booking-form');
  if (!form) return;

  // Real-time validation on blur
  form.querySelectorAll('.form-control').forEach(field => {
    field.addEventListener('blur', () => {
      if (field.value.trim() !== '') {
        clearFieldError(field);
      }
    });
  });

  form.addEventListener('submit', async function (e) {
    e.preventDefault();

    if (!validateForm(this)) {
      // Focus first invalid field
      const firstInvalid = this.querySelector('[aria-invalid="true"]');
      if (firstInvalid) firstInvalid.focus();
      return;
    }

    const submitBtn = this.querySelector('[type="submit"]');
    const originalText = submitBtn.textContent;
    submitBtn.disabled = true;
    submitBtn.textContent = 'Sending…';

    const s = window.fwaSanitize || { name: v=>v.trim(), email: v=>v.trim(), phone: v=>v.trim(), service: v=>v, text: v=>v.trim(), goals: v=>v.trim() };
    const data = {
      name:    s.name(this.querySelector('#booking-name').value),
      email:   s.email(this.querySelector('#booking-email').value),
      phone:   s.phone(this.querySelector('#booking-phone').value),
      service: s.service(this.querySelector('#booking-service').value),
      date:    s.text(this.querySelector('#booking-date').value),
      time:    s.text(this.querySelector('#booking-time').value),
      goals:   s.goals(this.querySelector('#booking-goals').value),
    };

    // 1. Always save to localStorage first (works offline / as fallback)
    const saved = saveBooking(data);
    console.log('Booking saved locally:', saved.id);

    // 2. Attempt Formspree submission
    const result = await submitToFormspree(this, data);

    submitBtn.disabled = false;
    submitBtn.textContent = originalText;

    if (result.localOnly) {
      // No Formspree URL set — local save only
      showSuccessState('Your booking request has been saved! Angelina will contact you shortly.');
      window.showToast && window.showToast(
        'Booking saved! (Set up Formspree to receive email notifications.)', 'success', 6000
      );
    } else if (result.ok) {
      showSuccessState('Booking request sent! Check your inbox — Angelina will be in touch within 24 hours.');
      window.showToast && window.showToast('Booking sent successfully!', 'success');
    } else {
      // Formspree failed but we saved locally
      showSuccessState('Your request has been saved locally. Please also email Angelina directly if you don\'t hear back within 48 hours.');
      window.showToast && window.showToast(
        'Saved locally. Email delivery may have failed — please follow up if needed.', 'error', 7000
      );
    }
  });

  function showSuccessState(message) {
    const successEl = document.getElementById('booking-success');
    const formWrapper = document.getElementById('booking-form-wrapper');

    if (successEl && formWrapper) {
      formWrapper.style.display = 'none';
      successEl.style.display = 'block';
      successEl.querySelector('.success-message').textContent = message;
      successEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
    } else {
      // Fallback
      window.showToast && window.showToast(message, 'success', 6000);
      form.reset();
    }
  }

})();
