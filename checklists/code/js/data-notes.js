// notes.js — Module for note editing using Quill.js
// --data-notes.js--
import { sharedState,WORKER_URL, NOTES_DIR } from './constants.js';
import { traverse,timestampNow } from './utils.js';
import { markSaveDirty,saveChecklist } from './data.js';
//import { updatemainstatustext } from './ui-mainrender.js';

let quillEditor = null;
let isDragging = false;
let offsetX = 0, offsetY = 0;
let currentNoteFile = null;
let currentNoteTargetItem = null;

/**
 * Initialize the Quill editor and make the note modal draggable.
 * Call this once on app startup.
 */
export function initNoteModule() {
  const modal = document.getElementById('noteModal');
  if (!modal) return console.error('⚠️ #noteModal not found');

  // Instantiate Quill once
  if (!quillEditor) {
    quillEditor = new Quill('#editor', { theme: 'snow' });
  }

  // Make modal draggable via its header
  const header = modal.querySelector('.note-header');
  if (header) {
    header.style.cursor = 'move';
    header.addEventListener('mousedown', e => {
      isDragging = true;
      const rect = modal.getBoundingClientRect();
      offsetX = e.clientX - rect.left;
      offsetY = e.clientY - rect.top;
      document.body.style.userSelect = 'none';
    });
    document.addEventListener('mousemove', e => {
      if (!isDragging) return;
      modal.style.left = `${e.clientX - offsetX}px`;
      modal.style.top = `${e.clientY - offsetY}px`;
    });
    document.addEventListener('mouseup', () => {
      isDragging = false;
      document.body.style.userSelect = '';
    });
  } else {
    console.warn('⚠️ .note-header not found; dragging disabled');
  }

  // Wire Save/Cancel buttons (remove existing listeners first to prevent duplicates)
  const saveBtn = document.getElementById('saveNoteBtn');
  const cancelBtn = document.getElementById('cancelNoteBtn');
  
  if (saveBtn) {
    saveBtn.removeEventListener('click', saveNote);
    saveBtn.addEventListener('click', saveNote);
  }
  
  if (cancelBtn) {
    cancelBtn.removeEventListener('click', closeNoteModal);
    cancelBtn.addEventListener('click', closeNoteModal);
  }
}

/**
 * Open the note modal for a given checklist item.
 * Fetches existing note HTML + SHA via WORKER_URL/load.
 * @param {string} path - HTML note path under NOTES_DIR
 * @param {Object} item - Checklist item object
 */
export async function openNoteModal(path, item) {
  currentNoteFile = path;
  currentNoteTargetItem = item;

  // Fetch existing note content
  const res = await fetch(`${WORKER_URL}/?file=${encodeURIComponent(path)}`);
  if (!res.ok) {
    quillEditor.setContents([]);
  } else {
    const html = await res.text();
    item._pendingNoteSha = null; // replace if SHA available
    quillEditor.root.innerHTML = html;
  }

  // Show modal
  const modal = document.getElementById('noteModal');
  modal.style.display = 'block';
}

/**
 * Close the note editing modal without saving.
 */
export function closeNoteModal() {
  console.log('closeNoteModal called');
  console.trace('closeNoteModal call stack'); // This will show us WHO called closeNoteModal
  const modal = document.getElementById('noteModal');
  if (!modal) return console.error('⚠️ #noteModal not found');
  modal.style.display = 'none';
  currentNoteFile = null;
  currentNoteTargetItem = null;
  console.log('closeNoteModal: Reset note context variables');
}

/**
 * Add or load a note for the selected item, then open modal.
 */
export async function addNote() {
  if (!sharedState.selectedItem) {
    return alert('⚠ No item selected.');
  }

  let content = '';
  if (sharedState.selectedItem.noteFile) {
    const url = `${WORKER_URL}?file=${encodeURIComponent(sharedState.selectedItem.noteFile)}`;
    const res = await fetch(url);
    if (res.ok) {
      content = await res.text();
    } else if (res.status === 404) {
      alert(`⚠ Note file not found: ${sharedState.selectedItem.noteFile}`);
      delete sharedState.selectedItem.noteFile;
    }
  }

  if (!sharedState.selectedItem.noteFile) {
    sharedState.selectedItem.noteFile = `${NOTES_DIR}/${timestampNow()}.html`;
  }
  currentNoteFile = sharedState.selectedItem.noteFile;
  currentNoteTargetItem = sharedState.selectedItem;
  console.log('addNote: Set note context', { currentNoteFile, currentNoteTargetItem });

  if (!quillEditor) {
    console.error('⚠️ Quill editor not initialized');
    return;
  }

  quillEditor.setContents(quillEditor.clipboard.convert(content));
  
  // Update button text for new note
  document.getElementById('saveNoteBtn').textContent = '💾 Save Note';
  document.getElementById('noteModal').style.display = 'block';
}

/**
 * Edit an existing note: load SHA and content, then open modal.
 */
export async function editNote(noteFile, item) {
  currentNoteFile = noteFile;
  currentNoteTargetItem = item;
  console.log('editNote: Set note context', { currentNoteFile, currentNoteTargetItem });
  
  // Try to load with SHA first (for existing files)
  try {
    const res = await fetch(`${WORKER_URL}/load?file=${encodeURIComponent(noteFile)}`);
    if (!res.ok) throw new Error('Load failed');
    
    const contentType = res.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      // JSON response with SHA
      const json = await res.json();
      const content = json.html || '';
      item._pendingNoteSha = json.sha;
      quillEditor.setContents(quillEditor.clipboard.convert(content));
    } else {
      // HTML response, no SHA
      const content = await res.text();
      item._pendingNoteSha = null;
      quillEditor.setContents(quillEditor.clipboard.convert(content));
    }
  } catch (error) {
    // Fallback to simple endpoint
    const res = await fetch(`${WORKER_URL}?file=${encodeURIComponent(noteFile)}`);
    if (!res.ok) return alert('⚠ Failed to load note.');
    const content = await res.text();
    item._pendingNoteSha = null;
    quillEditor.setContents(quillEditor.clipboard.convert(content));
  }
  
  // Update button text for editing existing note
  document.getElementById('saveNoteBtn').textContent = '💾 Update Note';
  document.getElementById('noteModal').style.display = 'block';
}

/**
 * Save the current note back into checklist and persist.
 * Appends footer with current user & timestamp.
 */
export function saveNote() {
  console.log('saveNote called with:', { currentNoteFile, currentNoteTargetItem });
  
  if (!currentNoteFile || !currentNoteTargetItem) {
    console.warn('saveNote: Missing note context', { currentNoteFile, currentNoteTargetItem });
    return alert('⚠ No note is currently open.');
  }

  const ts = timestampNow();
  const footer = `<p style="font-size:0.8em;color:#888;">update by ${sharedState.currentUser}@${ts}</p>`;
  const html = `<!DOCTYPE html><html><body>${quillEditor.root.innerHTML}${footer}</body></html>`;

  currentNoteTargetItem._pendingNoteContent = html;
  markSaveDirty(true);
  
  // Store references before closing modal (which resets them)
  const savedPath = sharedState.selectedPath;
  const savedFile = currentNoteFile;
  const savedItem = currentNoteTargetItem;
  
  console.log('saveNote: About to close modal and save');
  closeNoteModal();

  saveChecklist().then(() => {
    console.log('saveNote: Checklist saved successfully');
    setTimeout(() => {
      const selector = `tr[data-path='${JSON.stringify(savedPath)}']`;
      const row = document.querySelector(selector);
      if (row) {
        row.classList.add('selected');
        row.scrollIntoView({ behavior: 'smooth', block: 'center' });
        setTimeout(() => row.classList.remove('selected'), 1500);
      }
    }, 100);
  }).catch(err => {
    console.error('saveNote: Error saving checklist:', err);
  });
}

/**
 * Upload any pending notes immediately.
 */
export async function uploadPendingNotes() {
  const tasks = [];
  traverse(sharedState.checklistData.items, item => {
    if (item._pendingNoteContent && item.noteFile) {
      const payload = { file: item.noteFile, json: item._pendingNoteContent, message: `Save note: ${item.noteFile}` };
      tasks.push(
        fetch(`${WORKER_URL}/save`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        }).then(res => {
          if (!res.ok) console.warn(`❌ Failed to upload note: ${item.noteFile}`);
          else delete item._pendingNoteContent;
        })
      );
    }
  });
  await Promise.all(tasks);
}

/**
 * View a note in the built-in viewer modal.
 */
export async function viewNote() {
  const it = sharedState.getItemByPath(sharedState.selectedPath);
  if (!it.noteFile) return alert('No note');

  const res = await fetch(`${WORKER_URL}/?file=${encodeURIComponent(it.noteFile)}`);
  if (!res.ok) return alert('Load failed');

  const html = await res.text();
  document.getElementById('viewerContent').innerHTML = html;
  document.getElementById('viewerModal').style.display = 'block';
}
