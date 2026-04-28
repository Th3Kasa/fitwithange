/**
 * FitWithAnge — admin.js
 * Password-gated admin dashboard for viewing, managing,
 * and exporting booking records stored in localStorage.
 *
 * ⚠️  SECURITY NOTE: This password gate is CLIENT-SIDE ONLY.
 * It is NOT secure — anyone who opens DevTools can bypass it.
 * This is purely a convenience feature to prevent accidental access.
 * Do NOT store sensitive client data here without a real backend.
 * Password: fitwithange2026
 */

(function () {
  'use strict';

  const STORAGE_KEY   = 'fitwithange_bookings';
  const SESSION_KEY   = 'fitwithange_admin_auth';
  const CORRECT_PASS  = 'fitwithange2026'; // ⚠️ NOT secure — see note above

  /* ── Elements ─────────────────────────────────────────── */
  const gateEl     = document.getElementById('admin-gate');
  const dashEl     = document.getElementById('admin-dashboard');
  const passForm   = document.getElementById('password-form');
  const passInput  = document.getElementById('admin-password');
  const passError  = document.getElementById('password-error');
  const tableBody  = document.getElementById('bookings-tbody');
  const emptyState = document.getElementById('empty-state');
  const countEl    = document.getElementById('booking-count');
  const pendingEl  = document.getElementById('pending-count');
  const confirmedEl= document.getElementById('confirmed-count');
  const exportBtn  = document.getElementById('export-csv');
  const logoutBtn  = document.getElementById('logout-btn');
  const searchInput= document.getElementById('search-input');
  const filterSelect= document.getElementById('filter-status');

  /* ── State ────────────────────────────────────────────── */
  let allBookings  = [];
  let sortCol      = 'timestamp';
  let sortDir      = 'desc'; // 'asc' or 'desc'

  /* ── Auth Check ───────────────────────────────────────── */
  function isAuthenticated() {
    return sessionStorage.getItem(SESSION_KEY) === 'true';
  }

  function authenticate() {
    sessionStorage.setItem(SESSION_KEY, 'true');
    gateEl.style.display = 'none';
    dashEl.style.display = 'block';
    loadBookings();
  }

  function logout() {
    sessionStorage.removeItem(SESSION_KEY);
    dashEl.style.display = 'none';
    gateEl.style.display = 'flex';
    if (passInput) { passInput.value = ''; passInput.focus(); }
  }

  /* ── Init ─────────────────────────────────────────────── */
  if (isAuthenticated()) {
    gateEl.style.display = 'none';
    dashEl.style.display = 'block';
    loadBookings();
  } else {
    gateEl.style.display = 'flex';
    dashEl.style.display = 'none';
    if (passInput) passInput.focus();
  }

  /* ── Password Form ────────────────────────────────────── */
  if (passForm) {
    passForm.addEventListener('submit', function (e) {
      e.preventDefault();
      const entered = passInput ? passInput.value : '';
      if (entered === CORRECT_PASS) {
        if (passError) passError.style.display = 'none';
        authenticate();
      } else {
        if (passError) {
          passError.textContent = 'Incorrect password. Please try again.';
          passError.style.display = 'block';
        }
        if (passInput) {
          passInput.value = '';
          passInput.focus();
          passInput.style.borderColor = '#d9534f';
          setTimeout(() => { passInput.style.borderColor = ''; }, 2000);
        }
      }
    });
  }

  /* ── Logout ───────────────────────────────────────────── */
  if (logoutBtn) logoutBtn.addEventListener('click', logout);

  /* ── Load & Display ───────────────────────────────────── */
  function loadBookings() {
    try {
      allBookings = JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
    } catch {
      allBookings = [];
    }
    updateStats();
    renderTable();
  }

  function updateStats() {
    const total     = allBookings.length;
    const pending   = allBookings.filter(b => b.status === 'pending').length;
    const confirmed = allBookings.filter(b => b.status === 'confirmed').length;

    if (countEl)    countEl.textContent    = total;
    if (pendingEl)  pendingEl.textContent  = pending;
    if (confirmedEl) confirmedEl.textContent = confirmed;
  }

  function getFiltered() {
    const query  = searchInput  ? searchInput.value.toLowerCase() : '';
    const status = filterSelect ? filterSelect.value : 'all';

    return allBookings.filter(b => {
      const matchStatus = status === 'all' || b.status === status;
      const matchSearch = !query ||
        (b.name  || '').toLowerCase().includes(query) ||
        (b.email || '').toLowerCase().includes(query) ||
        (b.service || '').toLowerCase().includes(query);
      return matchStatus && matchSearch;
    });
  }

  function getSorted(list) {
    return [...list].sort((a, b) => {
      let aVal = a[sortCol] || '';
      let bVal = b[sortCol] || '';
      if (sortCol === 'timestamp') {
        aVal = new Date(aVal);
        bVal = new Date(bVal);
      } else {
        aVal = String(aVal).toLowerCase();
        bVal = String(bVal).toLowerCase();
      }
      if (aVal < bVal) return sortDir === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortDir === 'asc' ? 1 : -1;
      return 0;
    });
  }

  function renderTable() {
    if (!tableBody) return;
    const filtered = getSorted(getFiltered());

    if (filtered.length === 0) {
      tableBody.innerHTML = '';
      if (emptyState) emptyState.style.display = 'block';
      return;
    }

    if (emptyState) emptyState.style.display = 'none';

    tableBody.innerHTML = filtered.map(b => {
      const dateStr = b.timestamp
        ? new Date(b.timestamp).toLocaleString('en-AU', {
            day: '2-digit', month: 'short', year: 'numeric',
            hour: '2-digit', minute: '2-digit'
          })
        : '—';

      const statusClass = b.status === 'confirmed' ? 'status-confirmed' : 'status-pending';
      const confirmLabel = b.status === 'confirmed' ? 'Unconfirm' : 'Confirm';

      return `
        <tr data-id="${escHtml(b.id)}">
          <td><code style="font-size:0.75rem;color:#888">${escHtml(b.id.slice(0,12))}…</code></td>
          <td>${dateStr}</td>
          <td><strong>${escHtml(b.name || '—')}</strong></td>
          <td><a href="mailto:${escHtml(b.email || '')}">${escHtml(b.email || '—')}</a></td>
          <td>${escHtml(b.phone || '—')}</td>
          <td>${escHtml(b.service || '—')}</td>
          <td>${escHtml(b.date || '—')}</td>
          <td>${escHtml(b.time || '—')}</td>
          <td title="${escHtml(b.goals || '')}">${truncate(b.goals || '—', 40)}</td>
          <td><span class="status-badge ${statusClass}">${escHtml(b.status || 'pending')}</span></td>
          <td>
            <button class="action-btn action-confirm" data-action="confirm" data-id="${escHtml(b.id)}" aria-label="${confirmLabel} booking">
              ${confirmLabel}
            </button>
            <button class="action-btn action-delete" data-action="delete" data-id="${escHtml(b.id)}" aria-label="Delete booking" style="margin-left:4px">
              Delete
            </button>
          </td>
        </tr>`;
    }).join('');

    // Attach row action listeners
    tableBody.querySelectorAll('.action-btn').forEach(btn => {
      btn.addEventListener('click', handleRowAction);
    });
  }

  function handleRowAction(e) {
    const btn    = e.currentTarget;
    const action = btn.dataset.action;
    const id     = btn.dataset.id;

    if (action === 'confirm') {
      toggleStatus(id);
    } else if (action === 'delete') {
      if (confirm('Delete this booking? This cannot be undone.')) {
        deleteBooking(id);
      }
    }
  }

  function toggleStatus(id) {
    allBookings = allBookings.map(b => {
      if (b.id !== id) return b;
      return { ...b, status: b.status === 'confirmed' ? 'pending' : 'confirmed' };
    });
    persist();
    updateStats();
    renderTable();
  }

  function deleteBooking(id) {
    allBookings = allBookings.filter(b => b.id !== id);
    persist();
    updateStats();
    renderTable();
    window.showToast && window.showToast('Booking deleted.', 'error', 3000);
  }

  function persist() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(allBookings));
  }

  /* ── Search & Filter ──────────────────────────────────── */
  if (searchInput) {
    searchInput.addEventListener('input', renderTable);
  }
  if (filterSelect) {
    filterSelect.addEventListener('change', renderTable);
  }

  /* ── Sort ─────────────────────────────────────────────── */
  document.querySelectorAll('.admin-table th[data-col]').forEach(th => {
    th.addEventListener('click', () => {
      const col = th.dataset.col;
      if (sortCol === col) {
        sortDir = sortDir === 'asc' ? 'desc' : 'asc';
      } else {
        sortCol = col;
        sortDir = 'asc';
      }
      // Update arrow indicators
      document.querySelectorAll('.admin-table th[data-col]').forEach(t => {
        t.textContent = t.textContent.replace(/ [▲▼]$/, '');
      });
      th.textContent += sortDir === 'asc' ? ' ▲' : ' ▼';
      renderTable();
    });
  });

  /* ── CSV Export ───────────────────────────────────────── */
  if (exportBtn) {
    exportBtn.addEventListener('click', () => {
      const data = getSorted(getFiltered());
      if (!data.length) {
        window.showToast && window.showToast('No bookings to export.', 'error', 3000);
        return;
      }

      const cols = ['id', 'timestamp', 'status', 'name', 'email', 'phone', 'service', 'date', 'time', 'goals'];
      const header = cols.join(',');
      const rows   = data.map(b =>
        cols.map(c => csvCell(b[c] || '')).join(',')
      );

      const csv  = [header, ...rows].join('\r\n');
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement('a');
      a.href     = url;
      a.download = `fitwithange-bookings-${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);

      window.showToast && window.showToast(`Exported ${data.length} booking(s) to CSV.`, 'success');
    });
  }

  /* ── Helpers ──────────────────────────────────────────── */
  function escHtml(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function truncate(str, max) {
    return str.length > max ? str.slice(0, max) + '…' : str;
  }

  function csvCell(val) {
    const s = String(val).replace(/"/g, '""');
    return /[,"\r\n]/.test(s) ? `"${s}"` : s;
  }

})();
