// ============================================================
// LEO Penal Code Calculator — app logic
// Edit penal-codes.js to change the actual code list.
// ============================================================

const STORAGE_KEY = 'leo-pc-recent-charges';

const els = {
  search: document.getElementById('search'),
  results: document.getElementById('results'),
  recentCharges: document.getElementById('recentCharges'),
  previewContent: document.getElementById('previewContent'),
  goBackBtn: document.getElementById('goBackBtn'),
  addBtn: document.getElementById('addBtn'),
  copyBtn: document.getElementById('copyBtn'),
  resetBtn: document.getElementById('resetBtn'),
  toast: document.getElementById('toast'),
};

let selectedCode = null; // currently previewed code object
let recentCharges = loadCharges();

// ---------- helpers ----------

function codeLabel(entry) {
  return `(${entry.class})${entry.code}`;
}

function formatMoney(n) {
  return `$${n.toLocaleString('en-US')}`;
}

function formatJail(seconds) {
  if (!seconds) return 'None';
  return `${seconds}s`;
}

function classBadgeClass(classification) {
  if (classification === 'Felony') return 'badge-felony';
  if (classification === 'Misdemeanor') return 'badge-misdemeanor';
  return 'badge-citation';
}

function impoundLabel(impound) {
  if (impound === true) return 'Yes';
  if (impound === 'discretion') return 'Trooper discretion';
  return 'No';
}

function loadCharges() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveCharges() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(recentCharges));
}

function showToast(msg) {
  els.toast.textContent = msg;
  els.toast.classList.add('show');
  clearTimeout(showToast._t);
  showToast._t = setTimeout(() => els.toast.classList.remove('show'), 1800);
}

// ---------- results list ----------

function renderResults(query = '') {
  const q = query.trim().toLowerCase();

  const matches = PENAL_CODES.filter((entry) => {
    if (!q) return true;
    return (
      entry.title.toLowerCase().includes(q) ||
      codeLabel(entry).toLowerCase().includes(q) ||
      String(entry.code).toLowerCase().includes(q) ||
      String(entry.class).includes(q) ||
      entry.classification.toLowerCase().includes(q) ||
      entry.category.toLowerCase().includes(q)
    );
  });

  els.results.innerHTML = '';

  if (matches.length === 0) {
    els.results.innerHTML = `<div class="empty-state">No penal codes match "${escapeHtml(query)}"</div>`;
    return;
  }

  matches.forEach((entry) => {
    const row = document.createElement('div');
    row.className = 'result-row';
    if (selectedCode && selectedCode.class === entry.class && selectedCode.code === entry.code) {
      row.classList.add('active');
    }
    row.innerHTML = `
      <span class="code-chip">${codeLabel(entry)}</span>
      <span class="result-title">${escapeHtml(entry.title)}</span>
      <span class="class-badge ${classBadgeClass(entry.classification)}">${entry.classification}</span>
    `;
    row.addEventListener('click', () => selectCode(entry));
    els.results.appendChild(row);
  });
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

// ---------- preview panel ----------

function selectCode(entry) {
  selectedCode = entry;
  renderPreview();
  renderResults(els.search.value);
}

function renderPreview() {
  if (!selectedCode) {
    els.previewContent.innerHTML = `<div class="empty-state small">Select a code to preview it here</div>`;
    els.goBackBtn.disabled = true;
    els.addBtn.disabled = true;
    return;
  }

  els.goBackBtn.disabled = false;
  els.addBtn.disabled = false;

  els.previewContent.innerHTML = `
    <span class="preview-code">${codeLabel(selectedCode)}</span>
    <span class="class-badge ${classBadgeClass(selectedCode.classification)}" style="margin-left:8px;">${selectedCode.classification}</span>
    <p class="preview-title">${escapeHtml(selectedCode.title)}</p>
    <div class="preview-row"><span>Fine</span><span>${selectedCode.fine > 0 ? formatMoney(selectedCode.fine) : 'None'}</span></div>
    <div class="preview-row"><span>Jail time</span><span>${formatJail(selectedCode.jailSeconds)}</span></div>
    <div class="preview-row"><span>Impoundment</span><span>${impoundLabel(selectedCode.impound)}</span></div>
    <div class="preview-row"><span>Section</span><span style="font-family: var(--font-body); font-size: 12.5px;">${escapeHtml(selectedCode.category)}</span></div>
  `;
}

els.goBackBtn.addEventListener('click', () => {
  selectedCode = null;
  renderPreview();
  renderResults(els.search.value);
});

els.addBtn.addEventListener('click', () => {
  if (!selectedCode) return;
  recentCharges.push({ ...selectedCode });
  saveCharges();
  renderRecentCharges();
  showToast(`Added ${codeLabel(selectedCode)}`);
  selectedCode = null;
  renderPreview();
  renderResults(els.search.value);
});

// ---------- recent charges panel ----------

function renderRecentCharges() {
  if (recentCharges.length === 0) {
    els.recentCharges.innerHTML = `<div class="empty-state small">No charges added yet</div>`;
    return;
  }

  els.recentCharges.innerHTML = '';
  recentCharges.forEach((entry, i) => {
    const row = document.createElement('div');
    row.className = 'charge-row';
    row.innerHTML = `
      <span class="code-chip">${codeLabel(entry)}</span>
      <span class="charge-title">${escapeHtml(entry.title)}</span>
      <span class="class-badge ${classBadgeClass(entry.classification)}">${entry.classification}</span>
      <button class="remove-btn" title="Remove" aria-label="Remove ${escapeHtml(entry.title)}">&times;</button>
    `;
    row.querySelector('.remove-btn').addEventListener('click', () => {
      recentCharges.splice(i, 1);
      saveCharges();
      renderRecentCharges();
    });
    els.recentCharges.appendChild(row);
  });
}

// ---------- search ----------

els.search.addEventListener('input', () => renderResults(els.search.value));

// ---------- copy information ----------

els.copyBtn.addEventListener('click', async () => {
  if (recentCharges.length === 0) {
    showToast('No charges to copy');
    return;
  }

  const chargeList = recentCharges.map((c) => `${codeLabel(c)} — ${c.title}`).join(', ');
  const totalFine = recentCharges.reduce((sum, c) => sum + c.fine, 0);
  const totalJail = recentCharges.reduce((sum, c) => sum + c.jailSeconds, 0);

  let text = `**Charge(s):** ${chargeList}\n*Total Fine:* ${formatMoney(totalFine)}`;
  if (totalJail > 0) {
    text += `\n*Sentence Imposed:* ${totalJail}s`;
  }

  try {
    await navigator.clipboard.writeText(text);
    showToast('Copied to clipboard');
  } catch {
    // clipboard API unavailable (e.g. non-HTTPS) — fall back to a manual copy prompt
    window.prompt('Copy this text:', text);
  }
});

// ---------- reset ----------

els.resetBtn.addEventListener('click', () => {
  if (recentCharges.length === 0) return;
  const confirmed = window.confirm('Clear all recent charges?');
  if (!confirmed) return;
  recentCharges = [];
  saveCharges();
  renderRecentCharges();
  showToast('Cleared');
});

// ---------- init ----------

renderResults();
renderRecentCharges();
renderPreview();
