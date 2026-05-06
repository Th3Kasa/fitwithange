/**
 * FitWithAnge — Supabase client (single source of truth)
 *
 * SETUP:
 *   1. Create a free Supabase project at https://supabase.com
 *   2. Project Settings → API → copy "Project URL" and "anon public" key
 *   3. Replace the two placeholders below
 *   4. Run supabase/schema.sql in the SQL Editor
 *   5. Authentication → Users → Add user → create Angelina's admin account
 *
 * SECURITY: The anon key is SAFE to expose in client code. Row Level Security
 * (RLS) on the enquiries table is what actually enforces access control — anon
 * users can only INSERT, only authenticated users can SELECT/UPDATE/DELETE.
 *
 * GRACEFUL DEGRADATION: Until configured, all calls fall back to localStorage
 * (key: fitwithange_enquiries) so the site keeps working during setup.
 */

(function () {
  'use strict';

  // ------------------------------------------------------------
  // CONFIGURATION — replace both values after creating your Supabase project
  // ------------------------------------------------------------
  var SUPABASE_URL      = 'https://REPLACE-WITH-PROJECT-ID.supabase.co';
  var SUPABASE_ANON_KEY = 'REPLACE-WITH-ANON-KEY';

  // ------------------------------------------------------------
  // CONSTANTS
  // ------------------------------------------------------------
  var LS_KEY      = 'fitwithange_enquiries';   // localStorage key for enquiry backup
  var ADMIN_FLAG  = 'fitwithange_admin_auth';  // legacy sessionStorage flag

  // ------------------------------------------------------------
  // SUPABASE CLIENT — loaded once on first use, cached as a promise
  // ------------------------------------------------------------
  var _clientPromise = null;

  function getClient() {
    if (_clientPromise) return _clientPromise;
    _clientPromise = import('https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm')
      .then(function (mod) {
        var createClient = mod.createClient;
        return createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
      })
      .catch(function (err) {
        console.error('[fwa] Failed to load Supabase JS library:', err);
        return null;
      });
    return _clientPromise;
  }

  // ------------------------------------------------------------
  // CASE CONVERSION HELPERS
  // ------------------------------------------------------------

  /** JS camelCase payload → DB snake_case row */
  function toSnake(payload) {
    return {
      first_name:          payload.firstName         || null,
      last_name:           payload.lastName          || null,
      email:               payload.email             || null,
      phone:               payload.phone             || null,
      instagram:           payload.instagram         || null,
      goals:               payload.goals             || null,
      blockers:            payload.blockers          || null,
      status:              payload.status            || undefined,
      calendly_scheduled:  payload.calendlyScheduled !== undefined
                             ? payload.calendlyScheduled : undefined,
      notes:               payload.notes             !== undefined
                             ? payload.notes         : undefined,
    };
  }

  /** Remove undefined keys from an object (for partial updates) */
  function stripUndefined(obj) {
    var out = {};
    Object.keys(obj).forEach(function (k) {
      if (obj[k] !== undefined) out[k] = obj[k];
    });
    return out;
  }

  /** DB snake_case row → JS camelCase shape */
  function toCamel(row) {
    return {
      id:                 row.id,
      createdAt:          row.created_at,
      firstName:          row.first_name,
      lastName:           row.last_name,
      email:              row.email,
      phone:              row.phone,
      instagram:          row.instagram,
      goals:              row.goals,
      blockers:           row.blockers,
      status:             row.status,
      calendlyScheduled:  row.calendly_scheduled,
      notes:              row.notes,
    };
  }

  // ------------------------------------------------------------
  // RATE LIMITING — client-side (localStorage-backed)
  // Max 3 enquiry submissions per browser per hour.
  // A server-side trigger in supabase/migrations/ enforces a harder
  // limit of 5 per email per 24 h regardless of client bypass.
  // ------------------------------------------------------------
  var RL_KEY    = 'fitwithange_rl';
  var RL_MAX    = 3;
  var RL_WINDOW = 60 * 60 * 1000; // 1 hour in ms

  function rateLimitCheck() {
    try {
      var now  = Date.now();
      var data = JSON.parse(localStorage.getItem(RL_KEY) || '{"count":0,"since":0}');
      if (now - data.since > RL_WINDOW) {
        data = { count: 0, since: now };
      }
      if (data.count >= RL_MAX) {
        return false; // blocked
      }
      data.count += 1;
      localStorage.setItem(RL_KEY, JSON.stringify(data));
      return true;
    } catch (e) {
      return true; // if storage unavailable, allow through
    }
  }

  // ------------------------------------------------------------
  // LOCALSTORAGE HELPERS
  // ------------------------------------------------------------

  function lsRead() {
    try {
      return JSON.parse(localStorage.getItem(LS_KEY) || '[]');
    } catch (e) {
      return [];
    }
  }

  function lsWrite(arr) {
    try {
      localStorage.setItem(LS_KEY, JSON.stringify(arr));
    } catch (e) {
      // Storage full or unavailable — silently ignore
    }
  }

  /** Write a single enquiry to localStorage (used as a backup / fallback insert) */
  function lsInsert(payload) {
    var id = 'ls-' + Date.now() + '-' + Math.random().toString(36).slice(2, 8);
    var entry = {
      id:                 id,
      created_at:         new Date().toISOString(),
      first_name:         payload.firstName  || '',
      last_name:          payload.lastName   || '',
      email:              payload.email      || '',
      phone:              payload.phone      || '',
      instagram:          payload.instagram  || null,
      goals:              payload.goals      || '',
      blockers:           payload.blockers   || '',
      status:             'pending',
      calendly_scheduled: false,
      notes:              null,
      // Legacy fields so existing enquire.html code still works
      timestamp:          new Date().toISOString(),
      calendlyScheduled:  false,
    };
    var arr = lsRead();
    arr.unshift(entry);
    lsWrite(arr);
    return id;
  }

  // ------------------------------------------------------------
  // PUBLIC API — window.fwa
  // ------------------------------------------------------------

  var fwa = {

    /**
     * isConfigured()
     * Returns true only when both Supabase constants have been filled in.
     */
    isConfigured: function () {
      return (
        SUPABASE_URL.indexOf('REPLACE-WITH') === -1 &&
        SUPABASE_ANON_KEY.indexOf('REPLACE-WITH') === -1
      );
    },

    /**
     * createEnquiry(payload)
     * Inserts a new enquiry row. Falls back to localStorage if Supabase is not
     * configured or if the insert fails.
     * Returns { id, error } — never throws.
     */
    createEnquiry: function (payload) {
      return (async function () {
        // ----- Sanitize inputs (defence-in-depth — callers should sanitize too) -----
        if (window.fwaSanitize) {
          var _s = window.fwaSanitize;
          payload = {
            firstName: _s.name(payload.firstName  || ''),
            lastName:  _s.name(payload.lastName   || ''),
            email:     _s.email(payload.email     || ''),
            phone:     _s.phone(payload.phone     || ''),
            instagram: payload.instagram != null ? _s.instagram(payload.instagram) : null,
            goals:     _s.goals(payload.goals     || ''),
            blockers:  _s.blockers(payload.blockers || ''),
          };
        }

        // ----- Rate limit check -----
        if (!rateLimitCheck()) {
          return { id: null, error: 'Too many submissions. Please wait a while before trying again.' };
        }

        // ----- Supabase path -----
        if (fwa.isConfigured()) {
          try {
            var client = await getClient();
            if (client) {
              var row = stripUndefined(toSnake(payload));
              // Remove undefined-able patch-only fields from insert payload
              delete row.status;           // let DB default apply
              delete row.calendly_scheduled;
              delete row.notes;

              var result = await client
                .from('enquiries')
                .insert([row])
                .select('id')
                .single();

              if (!result.error) {
                // Best-effort local backup — never let it break the insert
                try { lsInsert(payload); } catch (e) { /* ignore */ }
                return { id: result.data.id, error: null };
              }
              console.error('[fwa] createEnquiry Supabase error:', result.error);
              // Fall through to localStorage fallback
            }
          } catch (err) {
            console.error('[fwa] createEnquiry unexpected error:', err);
          }
        }

        // ----- localStorage fallback -----
        try {
          var localId = lsInsert(payload);
          return { id: localId, error: null };
        } catch (lsErr) {
          console.error('[fwa] createEnquiry localStorage error:', lsErr);
          return { id: null, error: 'Could not save enquiry locally.' };
        }
      })();
    },

    /**
     * signIn(email, password)
     * Signs Angelina in with her Supabase email/password account.
     * Returns { user, error }.
     */
    signIn: function (email, password) {
      return (async function () {
        if (!fwa.isConfigured()) {
          return { user: null, error: 'Backend not configured. See SETUP.md.' };
        }
        try {
          var client = await getClient();
          if (!client) return { user: null, error: 'Supabase client unavailable.' };
          var result = await client.auth.signInWithPassword({ email: email, password: password });
          if (result.error) {
            console.error('[fwa] signIn error:', result.error);
            return { user: null, error: result.error.message };
          }
          return { user: result.data.user, error: null };
        } catch (err) {
          console.error('[fwa] signIn unexpected error:', err);
          return { user: null, error: err.message || 'Unknown error during sign in.' };
        }
      })();
    },

    /**
     * signOut()
     * Signs the current user out.
     * Returns { error }.
     */
    signOut: function () {
      return (async function () {
        if (!fwa.isConfigured()) return { error: null };
        try {
          var client = await getClient();
          if (!client) return { error: 'Supabase client unavailable.' };
          var result = await client.auth.signOut();
          if (result.error) {
            console.error('[fwa] signOut error:', result.error);
            return { error: result.error.message };
          }
          return { error: null };
        } catch (err) {
          console.error('[fwa] signOut unexpected error:', err);
          return { error: err.message || 'Unknown error during sign out.' };
        }
      })();
    },

    /**
     * getSession()
     * Returns the currently signed-in user, or null.
     * In fallback (unconfigured) mode, honours the legacy sessionStorage flag
     * so the existing admin panel keeps working until Supabase is set up.
     */
    getSession: function () {
      return (async function () {
        if (!fwa.isConfigured()) {
          var legacyFlag = null;
          try { legacyFlag = sessionStorage.getItem(ADMIN_FLAG); } catch (e) { /* ignore */ }
          if (legacyFlag === 'true') {
            return { user: { email: 'local-fallback', isFallback: true } };
          }
          return { user: null };
        }
        try {
          var client = await getClient();
          if (!client) return { user: null };
          var result = await client.auth.getSession();
          if (result.error) {
            console.error('[fwa] getSession error:', result.error);
            return { user: null };
          }
          var session = result.data && result.data.session;
          return { user: session ? session.user : null };
        } catch (err) {
          console.error('[fwa] getSession unexpected error:', err);
          return { user: null };
        }
      })();
    },

    /**
     * onAuthChange(callback)
     * Calls callback(user) whenever auth state changes.
     * Returns an unsubscribe function.
     */
    onAuthChange: function (callback) {
      if (!fwa.isConfigured()) {
        // No-op in fallback mode
        return function () {};
      }
      var unsubscribeFn = function () {};
      getClient().then(function (client) {
        if (!client) return;
        try {
          var result = client.auth.onAuthStateChange(function (event, session) {
            try {
              callback(session ? session.user : null);
            } catch (cbErr) {
              console.error('[fwa] onAuthChange callback error:', cbErr);
            }
          });
          // Supabase v2 returns { data: { subscription } }
          if (result && result.data && result.data.subscription) {
            unsubscribeFn = function () {
              try { result.data.subscription.unsubscribe(); } catch (e) { /* ignore */ }
            };
          }
        } catch (err) {
          console.error('[fwa] onAuthChange setup error:', err);
        }
      });
      // Return a proxy that calls the real unsubscribe once it's available
      return function () { unsubscribeFn(); };
    },

    /**
     * listEnquiries()
     * Returns all enquiries ordered by newest first.
     * Falls back to localStorage (converted to camelCase) when not configured or signed out.
     * Returns { data, error }.
     */
    listEnquiries: function () {
      return (async function () {
        if (fwa.isConfigured()) {
          try {
            var client = await getClient();
            if (client) {
              var result = await client
                .from('enquiries')
                .select('*')
                .order('created_at', { ascending: false });

              if (!result.error) {
                return { data: (result.data || []).map(toCamel), error: null };
              }
              // Likely not authenticated — fall through to localStorage
              console.error('[fwa] listEnquiries Supabase error:', result.error);
            }
          } catch (err) {
            console.error('[fwa] listEnquiries unexpected error:', err);
          }
        }

        // localStorage fallback
        try {
          var rows = lsRead();
          return { data: rows.map(toCamel), error: null };
        } catch (lsErr) {
          console.error('[fwa] listEnquiries localStorage error:', lsErr);
          return { data: [], error: 'Could not read local enquiries.' };
        }
      })();
    },

    /**
     * updateEnquiry(id, patch)
     * patch may contain any of: { status, calendlyScheduled, notes }
     * Returns { error }.
     */
    updateEnquiry: function (id, patch) {
      return (async function () {
        if (fwa.isConfigured()) {
          try {
            var client = await getClient();
            if (client) {
              var snakePatch = stripUndefined({
                status:             patch.status,
                calendly_scheduled: patch.calendlyScheduled,
                notes:              patch.notes,
              });
              var result = await client
                .from('enquiries')
                .update(snakePatch)
                .eq('id', id);

              if (!result.error) {
                // Mirror update to localStorage backup
                try {
                  var arr = lsRead();
                  var idx = arr.findIndex(function (r) { return r.id === id; });
                  if (idx !== -1) {
                    if (patch.status             !== undefined) arr[idx].status              = patch.status;
                    if (patch.calendlyScheduled  !== undefined) arr[idx].calendly_scheduled  = patch.calendlyScheduled;
                    if (patch.notes              !== undefined) arr[idx].notes               = patch.notes;
                    lsWrite(arr);
                  }
                } catch (e) { /* ignore backup errors */ }
                return { error: null };
              }
              console.error('[fwa] updateEnquiry Supabase error:', result.error);
              return { error: result.error.message };
            }
          } catch (err) {
            console.error('[fwa] updateEnquiry unexpected error:', err);
            return { error: err.message || 'Unknown error during update.' };
          }
        }

        // localStorage fallback
        try {
          var lsArr = lsRead();
          var lsIdx = lsArr.findIndex(function (r) { return r.id === id; });
          if (lsIdx !== -1) {
            if (patch.status             !== undefined) lsArr[lsIdx].status              = patch.status;
            if (patch.calendlyScheduled  !== undefined) lsArr[lsIdx].calendly_scheduled  = patch.calendlyScheduled;
            if (patch.notes              !== undefined) lsArr[lsIdx].notes               = patch.notes;
            lsWrite(lsArr);
          }
          return { error: null };
        } catch (lsErr) {
          console.error('[fwa] updateEnquiry localStorage error:', lsErr);
          return { error: 'Could not update local enquiry.' };
        }
      })();
    },

    /**
     * deleteEnquiry(id)
     * Permanently removes an enquiry.
     * Returns { error }.
     */
    deleteEnquiry: function (id) {
      return (async function () {
        if (fwa.isConfigured()) {
          try {
            var client = await getClient();
            if (client) {
              var result = await client
                .from('enquiries')
                .delete()
                .eq('id', id);

              if (!result.error) {
                // Mirror delete to localStorage backup
                try {
                  var arr = lsRead().filter(function (r) { return r.id !== id; });
                  lsWrite(arr);
                } catch (e) { /* ignore */ }
                return { error: null };
              }
              console.error('[fwa] deleteEnquiry Supabase error:', result.error);
              return { error: result.error.message };
            }
          } catch (err) {
            console.error('[fwa] deleteEnquiry unexpected error:', err);
            return { error: err.message || 'Unknown error during delete.' };
          }
        }

        // localStorage fallback
        try {
          var filtered = lsRead().filter(function (r) { return r.id !== id; });
          lsWrite(filtered);
          return { error: null };
        } catch (lsErr) {
          console.error('[fwa] deleteEnquiry localStorage error:', lsErr);
          return { error: 'Could not delete local enquiry.' };
        }
      })();
    },

  }; // end window.fwa

  // Expose globally
  window.fwa = fwa;

})();
