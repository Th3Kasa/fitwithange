/**
 * FitWithAnge — main.js
 * Mobile nav toggle, header shrink, smooth scroll,
 * current year, fade-in on scroll (IntersectionObserver)
 */

(function () {
  'use strict';

  /* ── Current Year ────────────────────────────────────── */
  const yearEls = document.querySelectorAll('.current-year');
  const thisYear = new Date().getFullYear();
  yearEls.forEach(el => (el.textContent = thisYear));

  /* ── Header Shrink on Scroll ─────────────────────────── */
  const header = document.querySelector('.site-header');
  if (header) {
    const onScroll = () => {
      header.classList.toggle('shrunk', window.scrollY > 40);
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll(); // run once on load
  }

  /* ── Mobile Nav Toggle ───────────────────────────────── */
  const hamburger = document.querySelector('.hamburger');
  const mobileNav = document.querySelector('.mobile-nav');

  if (hamburger && mobileNav) {
    hamburger.addEventListener('click', () => {
      const isOpen = hamburger.classList.toggle('open');
      mobileNav.classList.toggle('open', isOpen);
      hamburger.setAttribute('aria-expanded', isOpen);
      // Prevent body scroll when nav is open
      document.body.style.overflow = isOpen ? 'hidden' : '';
    });

    // Close mobile nav on link click
    mobileNav.querySelectorAll('a').forEach(link => {
      link.addEventListener('click', () => {
        hamburger.classList.remove('open');
        mobileNav.classList.remove('open');
        hamburger.setAttribute('aria-expanded', 'false');
        document.body.style.overflow = '';
      });
    });

    // Close on Escape key
    document.addEventListener('keydown', e => {
      if (e.key === 'Escape' && mobileNav.classList.contains('open')) {
        hamburger.classList.remove('open');
        mobileNav.classList.remove('open');
        hamburger.setAttribute('aria-expanded', 'false');
        document.body.style.overflow = '';
      }
    });
  }

  /* ── Active Nav Link ─────────────────────────────────── */
  const currentPath = window.location.pathname.split('/').pop() || 'index.html';
  document.querySelectorAll('.nav-links a, .mobile-nav a').forEach(link => {
    const href = link.getAttribute('href');
    if (href && (href === currentPath || href === './' + currentPath)) {
      link.classList.add('active');
    }
    // Special case: root / index
    if ((currentPath === '' || currentPath === 'index.html') && (href === 'index.html' || href === './')) {
      link.classList.add('active');
    }
  });

  /* ── Smooth Scroll for in-page anchors ───────────────── */
  document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
      const targetId = this.getAttribute('href').slice(1);
      const target = document.getElementById(targetId);
      if (target) {
        e.preventDefault();
        const headerOffset = parseInt(getComputedStyle(document.documentElement)
          .getPropertyValue('--header-h') || '72');
        const top = target.getBoundingClientRect().top + window.scrollY - headerOffset - 16;
        window.scrollTo({ top, behavior: 'smooth' });
        // Set focus for accessibility
        target.setAttribute('tabindex', '-1');
        target.focus({ preventScroll: true });
      }
    });
  });

  /* ── Fade-in on Scroll (IntersectionObserver) ────────── */
  if ('IntersectionObserver' in window) {
    const fadeEls = document.querySelectorAll('.fade-in');
    if (fadeEls.length) {
      const observer = new IntersectionObserver(
        (entries) => {
          entries.forEach(entry => {
            if (entry.isIntersecting) {
              // Stagger siblings in the same parent
              const siblings = entry.target.parentElement
                ? [...entry.target.parentElement.querySelectorAll('.fade-in')]
                : [];
              const index = siblings.indexOf(entry.target);
              const delay = index * 80; // 80ms stagger
              setTimeout(() => {
                entry.target.classList.add('visible');
              }, delay);
              observer.unobserve(entry.target);
            }
          });
        },
        { threshold: 0.12, rootMargin: '0px 0px -40px 0px' }
      );

      fadeEls.forEach(el => observer.observe(el));
    }
  } else {
    // Fallback: show all immediately
    document.querySelectorAll('.fade-in').forEach(el => el.classList.add('visible'));
  }

  /* ── Toast Helper (exported to window for other scripts) */
  window.showToast = function (message, type = 'success', duration = 4500) {
    let toast = document.querySelector('.toast');
    if (!toast) {
      toast = document.createElement('div');
      toast.className = 'toast';
      toast.setAttribute('role', 'alert');
      toast.setAttribute('aria-live', 'polite');
      document.body.appendChild(toast);
    }

    const icon = type === 'success' ? '✓' : '✕';
    toast.className = `toast ${type}`;
    toast.innerHTML = `<span style="font-size:1.1rem">${icon}</span> ${message}`;

    // Force reflow to restart animation
    void toast.offsetWidth;
    toast.classList.add('show');

    clearTimeout(toast._hideTimeout);
    toast._hideTimeout = setTimeout(() => {
      toast.classList.remove('show');
    }, duration);
  };

})();
