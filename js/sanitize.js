/**
 * FitWithAnge — input sanitization utility
 * Exposes window.fwaSanitize with typed helpers for every field in the site.
 *
 * What it does:
 *  1. Strips all HTML/script tags  → prevents XSS if values ever hit the DOM
 *  2. Removes null bytes & control characters (except tab, LF, CR)
 *  3. Trims leading/trailing whitespace
 *  4. Enforces per-field maximum lengths
 *  5. Lowercases email addresses
 *
 * This runs client-side as a first pass. Supabase column constraints and the
 * DB-level rate-limit trigger provide the server-side backstop.
 */

(function () {
  'use strict';

  var MAX = {
    name:      100,
    email:     254,   // RFC 5321 hard limit
    phone:      30,
    instagram:  50,
    goals:     600,
    blockers:  600,
    notes:    1000,
    service:    80,
    text:      500,
  };

  /** Remove every HTML tag (e.g. <script>, <img onerror=...>) */
  function stripTags(str) {
    return str.replace(/<[^>]*>/g, '');
  }

  /** Remove null bytes and non-printable ASCII control chars (keep \t \n \r) */
  function stripControl(str) {
    return str.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');
  }

  /**
   * Core sanitize — applies all transforms then truncates to maxLen.
   * Always returns a string (never null/undefined).
   */
  function clean(value, maxLen) {
    if (value === null || value === undefined) return '';
    var s = String(value);
    s = stripTags(s);
    s = stripControl(s);
    s = s.trim();
    return s.length > maxLen ? s.slice(0, maxLen) : s;
  }

  window.fwaSanitize = {
    name:      function (v) { return clean(v, MAX.name); },
    email:     function (v) { return clean(v, MAX.email).toLowerCase(); },
    phone:     function (v) { return clean(v, MAX.phone); },
    instagram: function (v) { return clean(v, MAX.instagram); },
    goals:     function (v) { return clean(v, MAX.goals); },
    blockers:  function (v) { return clean(v, MAX.blockers); },
    notes:     function (v) { return clean(v, MAX.notes); },
    service:   function (v) { return clean(v, MAX.service); },
    text:      function (v) { return clean(v, MAX.text); },
  };

})();
