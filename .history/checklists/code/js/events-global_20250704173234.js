// --events-global.js--
import { sharedState, USER_CONFIG_PATH, WORKER_URL } from './constants.js';
import { initNoteModule } from './data-notes.js';
import { initFileUpload } from './data-files.js';
import { tryAutoLoginFromURL, secureLogin } from './auth-login.js';
import {  collapseAll, expandAll, updateFilterButtonStyle } from './ui-mainrender.js';
import { renderChecklist } from './renderchecklist.js';
import { showContextMenu, hideContextMenu } from './menu-context.js';
import { fetchChecklists, loadChecklist } from './data.js';
import { saveChecklist } from './data2.js';


let inactivityTimer = null;
const INACTIVITY_LIMIT = 30 * 60 * 1000; // 30 minutes
let loadedFileTimestamp = null;
let selectedItem = null;
let selectedPath = null;

/**
 * FILTER HELPERS
 */
export function filterNotDone() {
  if (sharedState.filterState === 'all') sharedState.filterState = 'notdone';
  else if (sharedState.filterState === 'notdone') sharedState.filterState = 'done';
  else sharedState.filterState = 'all';

  selectedItem = null;
  selectedPath = null;

  const btn = document.getElementById('filterBtn');
  updateFilterButtonStyle(btn);
  renderChecklist();
}

export function resetFilters() {
  sharedState.filterState = 'all';
  sharedState.showOnlyMine = false;
  selectedItem = null;
  selectedPath = null;

  const filterBtn = document.getElementById('filterBtn');
  const mineBtn   = document.getElementById('onlymineBtn');
  if (filterBtn) filterBtn.textContent = '🔲 Filter (all)';
  if (mineBtn)   mineBtn.textContent   = '🔍 Show Mine';

  renderChecklist();
}

export function selectmine() {
  sharedState.showOnlyMine = !sharedState.showOnlyMine;
  selectedItem = null;
  selectedPath = null;

  const btn = document.getElementById('onlymineBtn');
  if (btn) btn.textContent = sharedState.showOnlyMine ? '🔍 Show All' : '🔍 Show Mine';

  renderChecklist();
}

/**
 * INACTIVITY MONITOR
 */
function resetInactivityTimer() {
  if (inactivityTimer) clearTimeout(inactivityTimer);
  inactivityTimer = setTimeout(showInactivityPopup, INACTIVITY_LIMIT);
}

function setupInactivityMonitor() {
  ['mousemove', 'keydown', 'click', 'scroll'].forEach(evt =>
    document.addEventListener(evt, resetInactivityTimer)
  );
  resetInactivityTimer();
}

function showInactivityPopup() {
  let overlay = document.getElementById('inactivityOverlay');
  if (!overlay) {
    overlay = document.createElement('div');
    overlay.id = 'inactivityOverlay';
    Object.assign(overlay.style, {
      position: 'fixed',
      top: 0, left: 0, right: 0, bottom: 0,
      background: 'rgba(0,0,0,0.5)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 9999
    });
    overlay.innerHTML = `
      <div style="background:#fff;padding:2em;border-radius:8px;text-align:center;">
        <p>You have been inactive for over 30 minutes.</p>
        <button id="inactReload">Reload</button>
        <button id="inactLogout">Logout</button>
      </div>`;
    document.body.appendChild(overlay);

    document.getElementById('inactReload')
      .addEventListener('click', () => location.reload());
    document.getElementById('inactLogout')
      .addEventListener('click', () => {
        sharedState.currentUser = null;
        sharedState.readyForEdits = false;
        sharedState.isDirty = false;
        document.getElementById('identityOverlay').style.display = 'flex';
        overlay.remove();
      });
  }
}

/**
 * AUTOSAVE TIMESTAMP TRACKING
 * This is only used for inactivity monitoring - to know when the file was loaded
 * for the 30-minute inactivity timer. Version conflict detection is handled 
 * separately in data.js using the lastSave field in the JSON data.
 */
function stampLoadedFile(timestamp) {
  loadedFileTimestamp = timestamp;
}

/**
 * Setup function that initializes all global events
 * This serves as a central place to call initEvents and other global setup
 */
export function setupGlobalEvents() {
  initEvents();
}

/**
 * ENTRYPOINT
 */
export async function initEvents() {
  // 1. Notes & image‐upload
  initNoteModule();
  initFileUpload();

  // 2. Attempt token‐login once
  if (!sharedState.currentUser) {
    await tryAutoLoginFromURL();
  }

  // 3. Login form
  const loginForm = document.getElementById('loginForm');
  if (loginForm) {
    loginForm.addEventListener('submit', e => {
      e.preventDefault();
      secureLogin();
    });
  }

  // 4. Context menu
  document.addEventListener('click', hideContextMenu);
  // Note: contextmenu handler is on individual rows in ui-subrender.js

  // 5. Keyboard shortcuts
  document.addEventListener('keydown', e => {
    if ((e.ctrlKey || e.metaKey) && e.key === 's') {
      e.preventDefault();
      if (sharedState.isDirty) saveChecklist(sharedState.FILE_PATH);
    }
  });

  // 6. Before unload
  window.addEventListener('beforeunload', e => {
    if (sharedState.isDirty) {
      e.returnValue = 'You have unsaved changes—are you sure you want to leave?';
    }
  });

  // 7. Filter & collapse/expand buttons
  const filterBtn   = document.getElementById('filterBtn');
  const mineBtn     = document.getElementById('onlymineBtn');
  const collapseBtn = document.getElementById('collapseAllBtn');
  const expandBtn   = document.getElementById('expandAllBtn');

  if (filterBtn)   filterBtn.onclick   = filterNotDone;
  if (mineBtn)     mineBtn.onclick     = selectmine;
  if (collapseBtn) collapseBtn.onclick = collapseAll;
  if (expandBtn)   expandBtn.onclick   = expandAll;

  // 8. Only load default checklist if not already loaded by login
  if (!sharedState._loadedByLogin) {
    const listEl = document.getElementById('checklistList');
    if (listEl) {
      const files = await fetchChecklists();
      let defaultPath = null;
      if (sharedState.currentUser && Array.isArray(sharedState.usersData.users)) {
        const user = sharedState.usersData.users.find(
          u => u.username.toLowerCase() === sharedState.currentUser.toLowerCase()
        );
        if (user?.checklists?.length) {
          const lastEntry = user.checklists.reduce((a, b) =>
            new Date(a.lastAccessed) > new Date(b.lastAccessed) ? a : b
          );
          defaultPath = files.find(f => f.name === lastEntry.id)?.path || null;
        }
      }
      if (!defaultPath && files.length) {
        defaultPath = files[0].path;
      }
      if (defaultPath) {
        await loadChecklist(defaultPath);
        stampLoadedFile(Date.now());
      } else {
        renderChecklist();
      }
    } else {
      console.log('Sidebar not found, skipping default checklist load');
    }
  }

  // 9. Start inactivity monitor
  setupInactivityMonitor();
}
