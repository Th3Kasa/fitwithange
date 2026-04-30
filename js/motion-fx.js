// FitWithAnge motion-fx — Motion-powered editorial animations

(async function () {
  'use strict';

  /* ── Respect prefers-reduced-motion ─────────────────────────────────────── */
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  if (reduced) {
    // Immediately make all reveal elements visible — no animation
    document.querySelectorAll(
      '.reveal, .reveal-up, .reveal-fade, .reveal-stagger > *'
    ).forEach(el => el.classList.add('is-visible'));
    return; // bail — no Motion needed
  }

  /* ── Load Motion from CDN ────────────────────────────────────────────────── */
  let animate, inView, scroll, stagger;
  try {
    ({ animate, inView, scroll, stagger } = await import(
      'https://cdn.jsdelivr.net/npm/motion@12.23.12/+esm'
    ));
  } catch (e) {
    // CDN unavailable — fallback: reveal everything immediately
    document.querySelectorAll(
      '.reveal, .reveal-up, .reveal-fade, .reveal-stagger > *'
    ).forEach(el => el.classList.add('is-visible'));
    return;
  }

  /* ── 1. Scroll-reveal ────────────────────────────────────────────────────── */

  // .reveal-up — fade + slide up 24 px
  document.querySelectorAll('.reveal-up').forEach(el => {
    inView(el, () => {
      el.classList.add('is-visible');
    }, { amount: 0.15 });
  });

  // .reveal-fade — fade only
  document.querySelectorAll('.reveal-fade').forEach(el => {
    inView(el, () => {
      el.classList.add('is-visible');
    }, { amount: 0.15 });
  });

  // .reveal — generic (same as reveal-up, CSS handles style)
  document.querySelectorAll('.reveal').forEach(el => {
    inView(el, () => {
      el.classList.add('is-visible');
    }, { amount: 0.15 });
  });

  // .reveal-stagger — children appear in sequence (60 ms apart)
  document.querySelectorAll('.reveal-stagger').forEach(parent => {
    const children = [...parent.children];
    if (!children.length) return;

    inView(parent, () => {
      children.forEach((child, i) => {
        setTimeout(() => child.classList.add('is-visible'), i * 60);
      });
    }, { amount: 0.1 });
  });

  /* ── 2. Marquee — clone children for seamless infinite loop ─────────────── */
  document.querySelectorAll('.marquee').forEach(marquee => {
    const track = marquee.querySelector('.marquee__track');
    if (!track) return;

    // Clone once so the CSS animation loops seamlessly
    const items = [...track.children];
    if (!items.length) return;

    items.forEach(item => {
      const clone = item.cloneNode(true);
      clone.setAttribute('aria-hidden', 'true');
      track.appendChild(clone);
    });
  });

  /* ── 3. Magnetic buttons ─────────────────────────────────────────────────── */
  const MAGNETIC_STRENGTH = 6; // px toward cursor

  document.querySelectorAll('.btn--magnetic').forEach(btn => {
    btn.addEventListener('mousemove', onMagneticMove);
    btn.addEventListener('mouseleave', onMagneticLeave);
  });

  function onMagneticMove(e) {
    const btn = e.currentTarget;
    const rect = btn.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top  + rect.height / 2;
    const dx = ((e.clientX - cx) / (rect.width  / 2)) * MAGNETIC_STRENGTH;
    const dy = ((e.clientY - cy) / (rect.height / 2)) * MAGNETIC_STRENGTH;

    animate(btn, { x: dx, y: dy }, { duration: 0.25, easing: [0.16, 1, 0.3, 1] });
  }

  function onMagneticLeave(e) {
    const btn = e.currentTarget;
    animate(btn, { x: 0, y: 0 }, { duration: 0.4, easing: [0.16, 1, 0.3, 1] });
  }

  /* ── 4. Hero parallax ────────────────────────────────────────────────────── */
  document.querySelectorAll('[data-parallax]').forEach(el => {
    const speed = parseFloat(el.dataset.parallax) || 0.3;

    scroll(
      (progress) => {
        // progress 0→1 over the element's scroll range
        const offset = (progress - 0.5) * speed * 120;
        el.style.transform = `translateY(${offset}px)`;
      },
      { target: el, offset: ['start end', 'end start'] }
    );
  });

})();
