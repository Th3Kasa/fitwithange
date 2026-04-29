/**
 * FitWithAnge — admin.js  (v2)
 * Supabase-backed admin dashboard.
 * Depends on window.fwa (supabase-client.js).
 *
 * No frameworks · No build step · Plain ES2020
 */

(function () {
  'use strict';

  /* ─────────────────────────────────────────────────────────
   *  DOM refs
   * ───────────────────────────────────────────────────────── */
  const gateEl       = document.getElementById('admin-gate');
  const dashEl       = document.getElementById('admin-dashboard');
  const loginForm    = document.getElementById('login-form');
  const emailInput   = document.getElementById('login-email');
  const passInput    = document.getElementById('login-password');
  const loginError   = document.getElementById('login-error');
  const loginBtn     = document.getElementById('login-btn');
  const logoutBtn    = document.getElementById('logout-btn');
  const userEmailEl  = document.getElementById('dash-user-email');
  const unconfigWarn = document.getElementById('unconfigured-warning');
  const fallbackBanner = document.getElementById('fallback-banner');

  // Stats
  const statTotal    = document.getElementById('enq-total-count');
  const statPending  = document.getElementById('enq-pending-count');
  const statConfirmed= document.getElementById('enq-confirmed-count');

  // Toolbar
  const searchInput  = document.getElementById('enq-search');
  const filterSelect = document.getElementById('enq-filter-status');
  const refreshBtn   = document.getElementById('enq-refresh');
  const exportBtn    = document.getElementById('enq-export-csv');

  // Table
  const tbody        = document.getElementById('enquiries-tbody');
  const emptyState   = document.getElementById('enq-empty-state');
  const lastRefEl    = document.getElementById('last-refreshed');

  // Notes modal
  const notesModal   = document.getElementById('notes-modal');
  const notesText    = document.getElementById('notes-textarea');
  const notesSaveBtn = document.getElementById('notes-save');
  const notesCancelBtn = document.getElementById('notes-cancel');

  /* ─────────────────────────────────────────────────────────
   *  State
   * ───────────────────────────────────────────────────────── */
  let allEnquiries  = [];
  let sortCol       = 'createdAt';
  let sortDir       = 'desc';
  let currentNotesId = null;
  let refreshTimer  = null;

  /* ─────────────────────────────────────────────────────────
   *  Boot — auth listener
   * ───────────────────────────────────────────────────────── */
  async function boot() {
    // Show unconfigured warning in login gate if needed
    if (window.fwa && !window.fwa.isConfigured()) {
      if (unconfigWarn) unconfigWarn.style.display = 'block';
    }

    if (!window.fwa) {
      showGate();
      showLoginError('Admin module failed to load (supabase-client.js missing).');
      return;
    }

    // Subscribe to auth changes
    window.fwa.onAuthChange(function (user) {
      if (user) {
        onLoggedIn(user);
      } else {
        onLoggedOut();
      }
    });

    // Determine initial state
    const { user } = await window.fwa.getSession();
    if (user) {
      onLoggedIn(user);
    } else {
      onLoggedOut();
    }
  }

  function onLoggedIn(user) {
    if (userEmailEl) userEmailEl.textContent = user.email || '';
    if (user.isFallback && fallbackBanner) fallbackBanner.style.display = 'block';
    showDash();
    loadEnquiries();
    startAutoRefresh();
  }

  function onLoggedOut() {
    stopAutoRefresh();
    showGate();
  }

  /* ─────────────────────────────────────────────────────────
   *  Login form
   * ───────────────────────────────────────────────────────── */
  if (loginForm) {
    loginForm.addEventListener('submit', async function (e) {
      e.preventDefault();
      const email = emailInput ? emailInput.value.trim() : '';
      const pass  = passInput  ? passInput.value : '';

      hideLoginError();
      setLoginBusy(true);

      const { user, error } = await window.fwa.signIn(email, pass);
      setLoginBusy(false);

      if (error) {
        showLoginError(error.message || 'Sign in failed. Check your credentials and try again.');
        if (passInput) { passInput.value = ''; passInput.focus(); }
      }
      // success is handled by onAuthChange
    });
  }

  /* ─────────────────────────────────────────────────────────
   *  Logout
   * ───────────────────────────────────────────────────────── */
  if (logoutBtn) {
    logoutBtn.addEventListener('click', async function () {
      await window.fwa.signOut();
    });
  }

  /* ─────────────────────────────────────────────────────────
   *  Load enquiries from Supabase
   * ───────────────────────────────────────────────────────── */
  async function loadEnquiries() {
    if (!window.fwa) return;
    const { data, error } = await window.fwa.listEnquiries();

    if (error) {
      toast('Failed to load enquiries: ' + (error.message || 'Unknown error'), 'error');
      return;
    }

    allEnquiries = data || [];
    updateStats();
    renderTable();
    if (lastRefEl) {
      const now = new Date();
      lastRefEl.textContent = 'Last refreshed at ' +
        now.toLocaleTimeString('en-AU', { hour: '2-digit', minute: '2-digit' });
    }
  }

  /* ─────────────────────────────────────────────────────────
   *  Auto-refresh every 60s while visible
   * ───────────────────────────────────────────────────────── */
  function startAutoRefresh() {
    stopAutoRefresh();
    refreshTimer = setInterval(function () {
      if (!document.hidden) loadEnquiries();
    }, 60000);
  }

  function stopAutoRefresh() {
    if (refreshTimer) { clearInterval(refreshTimer); refreshTimer = null; }
  }

  /* ─────────────────────────────────────────────────────────
   *  Toolbar buttons
   * ───────────────────────────────────────────────────────── */
  if (refreshBtn) {
    refreshBtn.addEventListener('click', loadEnquiries);
  }

  if (searchInput) {
    searchInput.addEventListener('input', renderTable);
  }

  if (filterSelect) {
    filterSelect.addEventListener('change', renderTable);
  }

  /* ─────────────────────────────────────────────────────────
   *  Stats
   * ───────────────────────────────────────────────────────── */
  function updateStats() {
    const total     = allEnquiries.length;
    const pending   = allEnquiries.filter(e => e.status === 'pending').length;
    const confirmed = allEnquiries.filter(e => e.status === 'confirmed').length;
    if (statTotal)    statTotal.textContent    = total;
    if (statPending)  statPending.textContent  = pending;
    if (statConfirmed) statConfirmed.textContent = confirmed;
  }

  /* ─────────────────────────────────────────────────────────
   *  Filter + Sort helpers
   * ───────────────────────────────────────────────────────── */
  function getFiltered() {
    const query  = searchInput  ? searchInput.value.toLowerCase() : '';
    const status = filterSelect ? filterSelect.value : 'all';

    return allEnquiries.filter(e => {
      const matchStatus = status === 'all' || e.status === status;
      const matchSearch = !query ||
        ((e.firstName  || '') + ' ' + (e.lastName || '')).toLowerCase().includes(query) ||
        (e.email       || '').toLowerCase().includes(query) ||
        (e.instagram   || '').toLowerCase().includes(query);
      return matchStatus && matchSearch;
    });
  }

  function getSorted(list) {
    return [...list].sort((a, b) => {
      let aVal = a[sortCol] ?? '';
      let bVal = b[sortCol] ?? '';
      if (sortCol === 'createdAt') {
        aVal = new Date(aVal);
        bVal = new Date(bVal);
      } else {
        aVal = String(aVal).toLowerCase();
        bVal = String(bVal).toLowerCase();
      }
      if (aVal < bVal) return sortDir === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortDir === 'asc' ?  1 : -1;
      return 0;
    });
  }

  /* ─────────────────────────────────────────────────────────
   *  Render table
   * ───────────────────────────────────────────────────────── */
  function renderTable() {
    if (!tbody) return;
    const rows = getSorted(getFiltered());

    if (rows.length === 0) {
      tbody.innerHTML = '';
      if (emptyState) emptyState.style.display = 'block';
      return;
    }
    if (emptyState) emptyState.style.display = 'none';

    tbody.innerHTML = rows.map(e => rowHtml(e)).join('');

    // Bind row events
    tbody.querySelectorAll('.status-select').forEach(sel => {
      sel.addEventListener('change', handleStatusChange);
    });
    tbody.querySelectorAll('.notes-btn').forEach(btn => {
      btn.addEventListener('click', handleNotesOpen);
    });
    tbody.querySelectorAll('.delete-btn').forEach(btn => {
      btn.addEventListener('click', handleDelete);
    });
  }

  function rowHtml(e) {
    const dateStr = e.createdAt
      ? new Date(e.createdAt).toLocaleString('en-AU', {
          day: '2-digit', month: 'short', year: 'numeric',
          hour: '2-digit', minute: '2-digit'
        })
      : '—';

    const fullName = escHtml((e.firstName || '') + ' ' + (e.lastName || '')).trim() || '—';
    const goalsShort    = truncate(e.goals    || '', 50);
    const blockersShort = truncate(e.blockers || '', 50);
    const igDisplay = e.instagram ? '@' + escHtml(e.instagram) : '—';
    const calBadge = e.calendlyScheduled
      ? '<span class="adm-badge adm-badge--green">Yes</span>'
      : '<span class="adm-badge adm-badge--gray">No</span>';
    const notesSnippet = e.notes ? truncate(e.notes, 30) : '—';

    const statusOpts = ['pending', 'confirmed', 'archived'].map(s =>
      `<option value="${s}"${e.status === s ? ' selected' : ''}>${capitalize(s)}</option>`
    ).join('');

    return `
      <tr data-id="${escHtml(e.id)}">
        <td data-label="Submitted">${dateStr}</td>
        <td data-label="Name"><strong>${fullName}</strong></td>
        <td data-label="Contact">
          <a href="mailto:${escHtml(e.email || '')}" class="adm-link">${escHtml(e.email || '—')}</a><br>
          <span class="adm-muted">${escHtml(e.phone || '—')}</span>
        </td>
        <td data-label="Instagram">${igDisplay}</td>
        <td data-label="Goals" title="${escHtml(e.goals || '')}">${escHtml(goalsShort)}</td>
        <td data-label="Blockers" title="${escHtml(e.blockers || '')}">${escHtml(blockersShort)}</td>
        <td data-label="Status">
          <select class="status-select adm-status-select" data-id="${escHtml(e.id)}" aria-label="Change status">
            ${statusOpts}
          </select>
        </td>
        <td data-label="Calendly">${calBadge}</td>
        <td data-label="Notes">
          <button class="notes-btn adm-btn-sm" data-id="${escHtml(e.id)}" data-notes="${escHtml(e.notes || '')}" aria-label="Edit notes">
            ${escHtml(notesSnippet)}
          </button>
        </td>
        <td data-label="Actions">
          <button class="delete-btn adm-btn-sm adm-btn-danger" data-id="${escHtml(e.id)}" aria-label="Delete enquiry">Delete</button>
        </td>
      </tr>`;
  }

  /* ─────────────────────────────────────────────────────────
   *  Row actions
   * ───────────────────────────────────────────────────────── */
  async function handleStatusChange(e) {
    const sel    = e.currentTarget;
    const id     = sel.dataset.id;
    const newStatus = sel.value;

    // Optimistic update
    const prev = allEnquiries.find(q => q.id === id);
    const prevStatus = prev ? prev.status : null;
    if (prev) prev.status = newStatus;
    updateStats();

    const { error } = await window.fwa.updateEnquiry(id, { status: newStatus });
    if (error) {
      toast('Failed to update status: ' + (error.message || 'Unknown error'), 'error');
      // Roll back
      if (prev) prev.status = prevStatus;
      updateStats();
      renderTable();
    } else {
      toast('Status updated to ' + capitalize(newStatus) + '.', 'success');
    }
  }

  function handleNotesOpen(e) {
    const btn = e.currentTarget;
    currentNotesId = btn.dataset.id;
    if (notesText) notesText.value = btn.dataset.notes || '';
    openModal();
  }

  async function handleDelete(e) {
    const id = e.currentTarget.dataset.id;
    if (!confirm('Delete this enquiry? This cannot be undone.')) return;

    const { error } = await window.fwa.deleteEnquiry(id);
    if (error) {
      toast('Failed to delete: ' + (error.message || 'Unknown error'), 'error');
      return;
    }
    allEnquiries = allEnquiries.filter(q => q.id !== id);
    updateStats();
    renderTable();
    toast('Enquiry deleted.', 'error');
  }

  /* ─────────────────────────────────────────────────────────
   *  Notes modal
   * ───────────────────────────────────────────────────────── */
  function openModal() {
    if (notesModal) {
      notesModal.style.display = 'flex';
      notesModal.setAttribute('aria-hidden', 'false');
      if (notesText) notesText.focus();
    }
  }

  function closeModal() {
    if (notesModal) {
      notesModal.style.display = 'none';
      notesModal.setAttribute('aria-hidden', 'true');
    }
    currentNotesId = null;
  }

  if (notesCancelBtn) notesCancelBtn.addEventListener('click', closeModal);

  if (notesModal) {
    notesModal.addEventListener('click', function (e) {
      if (e.target === notesModal) closeModal();
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && notesModal.style.display === 'flex') closeModal();
    });
  }

  if (notesSaveBtn) {
    notesSaveBtn.addEventListener('click', async function () {
      if (!currentNotesId) return;
      const notes = notesText ? notesText.value : '';

      const { error } = await window.fwa.updateEnquiry(currentNotesId, { notes });
      if (error) {
        toast('Failed to save notes: ' + (error.message || 'Unknown error'), 'error');
        return;
      }

      // Update local state
      const enquiry = allEnquiries.find(q => q.id === currentNotesId);
      if (enquiry) enquiry.notes = notes;
      closeModal();
      renderTable();
      toast('Notes saved.', 'success');
    });
  }

  /* ─────────────────────────────────────────────────────────
   *  Column header sort
   * ───────────────────────────────────────────────────────── */
  document.querySelectorAll('#enquiries-table th[data-col]').forEach(th => {
    th.style.cursor = 'pointer';
    th.addEventListener('click', function () {
      const col = th.dataset.col;
      if (sortCol === col) {
        sortDir = sortDir === 'asc' ? 'desc' : 'asc';
      } else {
        sortCol = col;
        sortDir = 'asc';
      }
      document.querySelectorAll('#enquiries-table th[data-col]').forEach(t => {
        t.textContent = t.textContent.replace(/ [▲▼]$/, '');
      });
      th.textContent += sortDir === 'asc' ? ' ▲' : ' ▼';
      renderTable();
    });
  });

  /* ─────────────────────────────────────────────────────────
   *  CSV Export
   * ───────────────────────────────────────────────────────── */
  if (exportBtn) {
    exportBtn.addEventListener('click', function () {
      const data = getSorted(getFiltered());
      if (!data.length) {
        toast('No enquiries to export.', 'error');
        return;
      }

      const cols = ['id', 'createdAt', 'status', 'firstName', 'lastName', 'email',
                    'phone', 'instagram', 'goals', 'blockers', 'calendlyScheduled', 'notes'];
      const header = cols.join(',');
      const rows = data.map(e => cols.map(c => csvCell(e[c] != null ? e[c] : '')).join(','));
      const csv  = [header, ...rows].join('\r\n');

      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement('a');
      a.href     = url;
      a.download = 'fitwithange-enquiries-' + new Date().toISOString().slice(0, 10) + '.csv';
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);

      toast('Exported ' + data.length + ' enquiry(s) to CSV.', 'success');
    });
  }

  /* ─────────────────────────────────────────────────────────
   *  Dev helper — Add Sample Enquiry
   * ───────────────────────────────────────────────────────── */
  const addSampleBtn = document.getElementById('add-test-enquiry');
  if (addSampleBtn) {
    addSampleBtn.addEventListener('click', async function () {
      const sample = {
        firstName: 'Sarah',
        lastName: 'Johnson',
        email: 'sarah.johnson.' + Date.now() + '@example.com',
        phone: '+61 412 345 678',
        instagram: 'sarah.fitness',
        goals: 'I want to lose about 10kg, build lean muscle and feel confident at the gym.',
        blockers: 'Consistency. I\'ve tried a few programs but always fall off after 2-3 weeks.',
        status: 'pending',
        calendlyScheduled: false,
        notes: null
      };

      if (window.fwa && window.fwa.createEnquiry) {
        const { error } = await window.fwa.createEnquiry(sample);
        if (error) {
          toast('Sample create failed: ' + (error.message || 'Unknown error'), 'error');
          return;
        }
      } else {
        // Graceful degradation: insert into local array so the UI still responds
        sample.id = 'local_' + Date.now();
        sample.createdAt = new Date().toISOString();
        allEnquiries.unshift(sample);
        updateStats();
        renderTable();
        toast('Sample enquiry added (local only — no createEnquiry on fwa).', 'success');
        return;
      }

      await loadEnquiries();
      toast('Sample enquiry added.', 'success');
    });
  }

  /* ─────────────────────────────────────────────────────────
   *  UI show/hide helpers
   * ───────────────────────────────────────────────────────── */
  function showGate() {
    if (gateEl) gateEl.style.display = 'flex';
    if (dashEl) dashEl.style.display = 'none';
    if (emailInput) emailInput.focus();
    hideLoginError();
    setLoginBusy(false);
  }

  function showDash() {
    if (gateEl) gateEl.style.display = 'none';
    if (dashEl) dashEl.style.display = 'block';
  }

  function showLoginError(msg) {
    if (loginError) {
      loginError.textContent = msg;
      loginError.style.display = 'block';
    }
  }

  function hideLoginError() {
    if (loginError) {
      loginError.textContent = '';
      loginError.style.display = 'none';
    }
  }

  function setLoginBusy(busy) {
    if (loginBtn) {
      loginBtn.disabled = busy;
      loginBtn.textContent = busy ? 'Signing in…' : 'Sign in';
    }
  }

  /* ─────────────────────────────────────────────────────────
   *  Helpers
   * ───────────────────────────────────────────────────────── */
  function escHtml(str) {
    return String(str)
      .replace(/&/g,  '&amp;')
      .replace(/</g,  '&lt;')
      .replace(/>/g,  '&gt;')
      .replace(/"/g,  '&quot;')
      .replace(/'/g,  '&#39;');
  }

  function truncate(str, max) {
    const s = String(str);
    return s.length > max ? s.slice(0, max) + '…' : s;
  }

  function capitalize(s) {
    return s ? s.charAt(0).toUpperCase() + s.slice(1) : s;
  }

  function csvCell(val) {
    const s = String(val).replace(/"/g, '""');
    return /[,"\r\n]/.test(s) ? `"${s}"` : s;
  }

  function toast(msg, type) {
    if (window.showToast) {
      window.showToast(msg, type === 'error' ? 'error' : 'success');
    }
  }

  /* ─────────────────────────────────────────────────────────
   *  Go
   * ───────────────────────────────────────────────────────── */
  boot();

})();
