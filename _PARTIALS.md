# FitWithAnge — Canonical Partials
Drop-in markup for every page. All IDs/classes match `js/main.js` and `js/motion-fx.js` hooks exactly.

---

## `<head>` additions

Add these inside every page's `<head>` (after existing meta tags). Fonts preconnect is already correct; just confirm the two script tags are present:

```html
<!-- Fonts preconnect -->
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,600;0,700;1,400;1,600&family=Inter:wght@300;400;500;600&display=swap">

<!-- Stylesheet -->
<link rel="stylesheet" href="css/styles.css">

<!-- Scripts (defer — order matters: main first, then motion) -->
<script src="js/main.js" defer></script>
<script src="js/motion-fx.js" defer></script>
```

---

## Announcement Bar

Dismissible via `dismissBar()` wired to `#announcement-bar`. Update the copy inside `<p>` only.

```html
<div class="announcement-bar" id="announcement-bar" role="region" aria-label="Site announcement">
  <p>
    Partner discount — use code <strong>ANGEX10</strong> at
    <a href="https://clubathletica.com.au" target="_blank" rel="noopener">Club Athletica DC</a>
    for 10% off activewear.
  </p>
  <button
    class="announcement-bar__close"
    onclick="dismissBar()"
    aria-label="Dismiss announcement"
  >&#10005;</button>
</div>
```

> `dismissBar()` must be defined in a `<script>` block or in `main.js`. A minimal version:
> ```js
> function dismissBar() {
>   const bar = document.getElementById('announcement-bar');
>   if (bar) { bar.style.display = 'none'; sessionStorage.setItem('barDismissed', '1'); }
> }
> // On load, check:
> if (sessionStorage.getItem('barDismissed')) dismissBar();
> ```

---

## Header

Preserves `.site-header`, `.hamburger`, `.mobile-nav`, `.nav-links`, `.current-year` hooks.
Update `href` values to match your URL structure (clean URLs, no `.html` extensions).

```html
<a href="#main-content" class="skip-link">Skip to main content</a>

<header class="site-header" role="banner">
  <div class="header-inner">

    <!-- Logo -->
    <a href="/" class="site-logo" aria-label="FitWithAnge — home">
      FitWith<span>Ange</span>
    </a>

    <!-- Desktop nav -->
    <nav class="nav-links" role="navigation" aria-label="Main navigation">
      <a href="/">Home</a>
      <a href="/about">About</a>
      <a href="/services">Services</a>
      <a href="/gallery">Gallery</a>
      <a href="/contact">Contact</a>
      <a href="/enquire" class="btn btn--primary btn--magnetic" style="border-radius:50px; padding:0.6rem 1.25rem; font-size:0.8rem;">
        Book a Free Enquiry
      </a>
    </nav>

    <!-- Mobile hamburger -->
    <button
      class="hamburger"
      aria-label="Toggle navigation menu"
      aria-expanded="false"
      aria-controls="mobile-nav"
    >
      <span></span>
      <span></span>
      <span></span>
    </button>

  </div>
</header>

<!-- Mobile nav drawer (controlled by main.js) -->
<nav class="mobile-nav" id="mobile-nav" aria-label="Mobile navigation">
  <a href="/">Home</a>
  <a href="/about">About</a>
  <a href="/services">Services</a>
  <a href="/gallery">Gallery</a>
  <a href="/contact">Contact</a>
  <a href="/enquire" class="btn btn--primary">Book a Free Enquiry</a>
</nav>
```

**Notes for Phase 2:**
- `.nav-links a` picks up `.active` class automatically via `main.js` path matching.
- The CTA button inside `.nav-links` intentionally has inline `border-radius` / `padding` to reduce visual weight at desktop nav scale — keep those inline styles or extract to a `.btn--nav` modifier.
- Mobile nav `id="mobile-nav"` is referenced by `aria-controls` on the hamburger.

---

## Footer

3-column grid: Brand + partner / Quick links / Get in touch. `.current-year` is populated by `main.js`.

```html
<footer class="site-footer" role="contentinfo">
  <div class="container">

    <div class="footer-grid">

      <!-- Column 1: Brand + partner -->
      <div class="footer-brand">
        <a href="/" class="site-logo" aria-label="FitWithAnge — home">
          FitWith<span>Ange</span>
        </a>
        <p>
          Science-backed coaching for women who train with purpose.
          Exercise Physiology &amp; Personal Training — online &amp; in-person
          at Martin Place, Sydney.
        </p>

        <!-- Social icons -->
        <div class="social-row" aria-label="Social media links">
          <a
            class="social-icon"
            href="https://www.instagram.com/fitWithAnge"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Instagram"
          >
            <!-- Instagram SVG icon -->
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <rect x="2" y="2" width="20" height="20" rx="5" ry="5"/>
              <circle cx="12" cy="12" r="4"/>
              <circle cx="17.5" cy="6.5" r="0.5" fill="currentColor" stroke="none"/>
            </svg>
          </a>
          <a
            class="social-icon"
            href="https://www.tiktok.com/@fitwithange"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="TikTok"
          >
            <!-- TikTok SVG icon -->
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-2.88 2.5 2.89 2.89 0 0 1-2.89-2.89 2.89 2.89 0 0 1 2.89-2.89c.28 0 .54.04.79.1V9.01a6.27 6.27 0 0 0-.79-.05 6.34 6.34 0 0 0-6.34 6.34 6.34 6.34 0 0 0 6.34 6.34 6.34 6.34 0 0 0 6.33-6.34V8.82a8.18 8.18 0 0 0 4.78 1.52V6.9a4.85 4.85 0 0 1-1.01-.21z"/>
            </svg>
          </a>
        </div>

        <!-- Partner notice -->
        <p class="footer-partner">
          Partner: <a href="https://clubathletica.com.au" target="_blank" rel="noopener">Club Athletica DC</a>
          — use code <strong>ANGEX10</strong> for 10% off.
        </p>
      </div>

      <!-- Column 2: Quick links -->
      <div>
        <span class="footer-heading">Quick links</span>
        <ul class="footer-links" role="list">
          <li><a href="/">Home</a></li>
          <li><a href="/about">About</a></li>
          <li><a href="/services">Services</a></li>
          <li><a href="/gallery">Gallery</a></li>
          <li><a href="/contact">Contact</a></li>
          <li><a href="/enquire">Book a Free Enquiry</a></li>
        </ul>
      </div>

      <!-- Column 3: Get in touch -->
      <div>
        <span class="footer-heading">Get in touch</span>
        <ul class="footer-links" role="list">
          <li>
            <a href="mailto:hello@fitwithange.com.au">
              hello@fitwithange.com.au
            </a>
          </li>
          <li>
            <a href="https://www.instagram.com/fitWithAnge" target="_blank" rel="noopener">
              @fitWithAnge
            </a>
          </li>
          <li>
            <span style="color:rgba(255,255,255,0.45); font-size:0.85rem; line-height:1.6; display:block; padding-block:0.25rem;">
              Martin Place, Sydney&nbsp;NSW
            </span>
          </li>
        </ul>

        <div style="margin-top:var(--space-md);">
          <a href="/enquire" class="btn btn--primary btn--magnetic">
            Book a Free Enquiry
          </a>
        </div>
      </div>

    </div><!-- /.footer-grid -->

    <!-- Footer bottom bar -->
    <div class="footer-bottom">
      <span>
        &copy; <span class="current-year"></span> FitWithAnge. All rights reserved.
      </span>
      <span>Sydney, NSW, Australia</span>
    </div>

  </div><!-- /.container -->
</footer>
```

---

## Phase 2 agent notes

### New CSS variables to use
| Token | Value | Use |
|---|---|---|
| `--ink` | `#1d1816` | Body text (warmer charcoal) |
| `--rust` | `#a85a3a` | Editorial accent highlights |
| `--paper` | `#faf6f1` | Page background (replaces `#faf8f6`) |
| `--cream` | `#f3ebe1` | Section alternate background |
| `--section-pad` | `clamp(5rem, 12vh, 10rem)` | Desktop section padding |
| `--shadow-frame` | `8px 8px 0 rgba(212,165,116,0.35)` | `.img-frame` offset shadow |
| `--ease-out-expo` | `cubic-bezier(0.16,1,0.3,1)` | Motion easing |

### New utility classes available
| Class | Purpose |
|---|---|
| `.display-hero` | Magazine-scale h1: `clamp(3.5rem, 9vw, 7.5rem)` |
| `.label-caps` | All-caps Inter, `letter-spacing: 0.18em` |
| `.italic-accent` | Italic Playfair, weight 400 |
| `.grid-editorial` | 12-column CSS grid |
| `.split-uneven` | 40/60 two-column split |
| `.stack-overlap` | Image+text with negative-margin overlap |
| `.sticky-col` | Sticky image column |
| `.chapter-number` | "01 / 04" small-caps label |
| `.divider-editorial` | Gold rule with glyph centerpiece |
| `.pull-quote` | Large italic blockquote with hanging mark |
| `.img-mask-arch` | Arch top border-radius |
| `.img-frame` | Thin gold inset border + offset shadow |
| `.img-grain` | SVG noise grain overlay |
| `.marquee` + `.marquee__track` + `.marquee__item` | Infinite horizontal credential scroll |
| `.reveal` / `.reveal-up` / `.reveal-fade` | Scroll-reveal (JS adds `.is-visible`) |
| `.reveal-stagger` | Staggered children reveal |
| `.editorial-card` | Flat-top card with gold corner accent |
| `.btn--magnetic` | Magnetic hover button (wired by `motion-fx.js`) |
| `[data-parallax]` | Scroll-linked parallax (`data-parallax="0.3"` = speed) |
| `.section--cream` | Cream background section |

### Caveats
1. **Body background is now `--paper` (`#faf6f1`)**, not `#ffffff`. Any inline `background: white` on section elements will look slightly off — use `.section--cream` or `.section--blush` for alternates instead.
2. **`--charcoal` and `--gold` are unchanged** — they are recognizable brand anchors and any existing inline references still resolve correctly.
3. **`.reveal-*` classes start at `opacity: 0`** — do not apply them to above-the-fold content unless `motion-fx.js` runs before first paint (it won't — it's deferred). For hero elements, use `.fade-in` (handled by `main.js`'s IntersectionObserver with a very short rootMargin).
4. **`motion-fx.js` is a dynamic ESM import** — it will silently no-op if CDN is unavailable, falling back to `.is-visible` on all reveal elements.
5. **Marquee JS clones children** — the original items remain in the DOM for accessibility; clones get `aria-hidden="true"`.
6. **`--rust`** is an editorial highlight only — do not use it for body text (contrast ratio on `--paper` is ~4.8:1, borderline AA for large text only).
7. **Admin/enquire pages** are unaffected — all `.adm-*`, `.enq-*`, `.calendly-*`, `.form-*`, `.toast` classes are fully preserved with only minor color token updates (`--light-bg` now resolves to `--paper`).
