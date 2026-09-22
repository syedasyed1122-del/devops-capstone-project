/* ─────────────────────────────────────────────────────────────
   NoteVault — Frontend Application Logic
   ───────────────────────────────────────────────────────────── */

const API = '/api/notes';

// ── State ─────────────────────────────────────────────────────
let notes = [];        // cached note list
let activeId = null;   // currently selected note id (null = new note)
let searchDebounce;

// ── DOM refs ──────────────────────────────────────────────────
const notesList      = document.getElementById('notes-list');
const notesCount     = document.getElementById('notes-count');
const emptyState     = document.getElementById('empty-state');
const editorPlaceholder = document.getElementById('editor-placeholder');
const editorForm     = document.getElementById('editor-form');
const noteTitle      = document.getElementById('note-title');
const noteBody       = document.getElementById('note-body');
const editorMeta     = document.getElementById('editor-meta');
const saveBtn        = document.getElementById('save-btn');
const deleteBtn      = document.getElementById('delete-btn');
const cancelBtn      = document.getElementById('cancel-btn');
const newNoteBtn     = document.getElementById('new-note-btn');
const searchInput    = document.getElementById('search-input');
const toast          = document.getElementById('toast');

// ── Toast ─────────────────────────────────────────────────────
let toastTimer;
function showToast(msg, type = 'default') {
  clearTimeout(toastTimer);
  toast.textContent = msg;
  toast.className = `toast ${type} show`;
  toastTimer = setTimeout(() => {
    toast.classList.remove('show');
  }, 3000);
}

// ── Helpers ───────────────────────────────────────────────────
function formatDate(iso) {
  const d = new Date(iso);
  return d.toLocaleString(undefined, {
    month: 'short', day: 'numeric', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

function truncate(str, n = 80) {
  return str.length > n ? str.slice(0, n) + '…' : str;
}

// ── API calls ─────────────────────────────────────────────────
async function fetchNotes(q = '') {
  const url = q ? `${API}?q=${encodeURIComponent(q)}` : API;
  const res = await fetch(url);
  if (!res.ok) throw new Error('Failed to load notes');
  return res.json();
}

async function createNote(title, body) {
  const res = await fetch(API, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ title, body }),
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || 'Failed to create note');
  }
  return res.json();
}

async function updateNote(id, title, body) {
  const res = await fetch(`${API}/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ title, body }),
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || 'Failed to update note');
  }
  return res.json();
}

async function deleteNote(id) {
  const res = await fetch(`${API}/${id}`, { method: 'DELETE' });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || 'Failed to delete note');
  }
  return res.json();
}

// ── Render ────────────────────────────────────────────────────
function renderNotesList() {
  notesList.innerHTML = '';
  notesCount.textContent = notes.length;

  if (notes.length === 0) {
    emptyState.hidden = false;
  } else {
    emptyState.hidden = true;
    notes.forEach((note) => {
      const li = document.createElement('li');
      li.className = 'note-item' + (note.id === activeId ? ' active' : '');
      li.setAttribute('role', 'listitem');
      li.setAttribute('tabindex', '0');
      li.setAttribute('aria-label', `Note: ${note.title}`);
      li.dataset.id = note.id;
      li.innerHTML = `
        <div class="note-item__title">${escapeHtml(note.title)}</div>
        <div class="note-item__preview">${escapeHtml(truncate(note.body || 'No content'))}</div>
        <div class="note-item__date">${formatDate(note.updated_at)}</div>
      `;
      li.addEventListener('click', () => openNote(note.id));
      li.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') openNote(note.id);
      });
      notesList.appendChild(li);
    });
  }
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

// ── Open / show editor ────────────────────────────────────────
function openNote(id) {
  const note = notes.find((n) => n.id === id);
  if (!note) return;
  activeId = id;

  editorPlaceholder.hidden = true;
  editorForm.hidden = false;
  deleteBtn.hidden = false;

  noteTitle.value = note.title;
  noteBody.value  = note.body || '';
  editorMeta.textContent =
    `Created ${formatDate(note.created_at)} · Last edited ${formatDate(note.updated_at)}`;

  renderNotesList();
  noteTitle.focus();
}

function openNewNoteEditor() {
  activeId = null;
  editorPlaceholder.hidden = true;
  editorForm.hidden = false;
  deleteBtn.hidden = true;

  noteTitle.value = '';
  noteBody.value  = '';
  editorMeta.textContent = '';

  renderNotesList();
  noteTitle.focus();
}

function closeEditor() {
  activeId = null;
  editorPlaceholder.hidden = false;
  editorForm.hidden = true;
  renderNotesList();
}

// ── Load & refresh ────────────────────────────────────────────
async function loadNotes(q = '') {
  try {
    notes = await fetchNotes(q);
    renderNotesList();

    // If the active note was deleted or filtered out, close editor
    if (activeId && !notes.find((n) => n.id === activeId)) {
      closeEditor();
    }
  } catch (err) {
    showToast('⚠ Could not load notes', 'error');
    console.error(err);
  }
}

// ── Event Handlers ────────────────────────────────────────────

// New Note button
newNoteBtn.addEventListener('click', openNewNoteEditor);

// Cancel button
cancelBtn.addEventListener('click', closeEditor);

// Save button
saveBtn.addEventListener('click', async () => {
  const title = noteTitle.value.trim();
  const body  = noteBody.value;

  if (!title) {
    showToast('Title is required', 'error');
    noteTitle.focus();
    return;
  }

  try {
    saveBtn.disabled = true;
    saveBtn.textContent = 'Saving…';

    if (activeId) {
      const updated = await updateNote(activeId, title, body);
      showToast('✓ Note saved', 'success');
      // Update in local cache
      const idx = notes.findIndex((n) => n.id === activeId);
      if (idx !== -1) notes[idx] = updated;
      openNote(updated.id);
    } else {
      const created = await createNote(title, body);
      showToast('✓ Note created', 'success');
      await loadNotes(searchInput.value);
      openNote(created.id);
    }

    renderNotesList();
  } catch (err) {
    showToast(`⚠ ${err.message}`, 'error');
  } finally {
    saveBtn.disabled = false;
    saveBtn.textContent = '💾 Save';
  }
});

// Delete button
deleteBtn.addEventListener('click', async () => {
  if (!activeId) return;
  const note = notes.find((n) => n.id === activeId);
  if (!note) return;

  // Simple inline confirmation via toast-based flow
  if (!window.__deleteConfirm) {
    window.__deleteConfirm = true;
    showToast('Click Delete again to confirm', 'error');
    setTimeout(() => { window.__deleteConfirm = false; }, 3000);
    return;
  }

  window.__deleteConfirm = false;
  try {
    await deleteNote(activeId);
    showToast('🗑 Note deleted', 'default');
    closeEditor();
    await loadNotes(searchInput.value);
  } catch (err) {
    showToast(`⚠ ${err.message}`, 'error');
  }
});

// Search
searchInput.addEventListener('input', () => {
  clearTimeout(searchDebounce);
  searchDebounce = setTimeout(() => {
    loadNotes(searchInput.value.trim());
  }, 300);
});

// Keyboard shortcut: Ctrl/Cmd+S to save
document.addEventListener('keydown', (e) => {
  if ((e.ctrlKey || e.metaKey) && e.key === 's') {
    e.preventDefault();
    if (!editorForm.hidden) saveBtn.click();
  }
});

// ── Init ──────────────────────────────────────────────────────
loadNotes();
