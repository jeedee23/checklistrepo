// data.js — Module for loading, saving, and listing checklists

import { WORKER_URL, CHECKLISTS_DIR, USER_CONFIG_PATH, sharedState } from './constants.js';
import { traverse, timestampNow } from './utils.js';
import { updatemainstatustext } from './ui-mainrender.js';
import { renderChecklist } from './renderchecklist.js';
import { createCheckpoint, hasChanged, findChanges, logChanges } from './debug-helpers.js';
import { updateUsersJson } from './auth-login.js';
import { populateLayoutSubmenu } from './menu-layouts.js';

// For version‐conflict monitoring (handled in events.js)
sharedState.readyForEdits = false;

// Track checklist load attempts for debugging
let loadAttemptCounter = 0;

/**
 * Fetches the JSON list of available checklist files and returns the array of files.
 */
export async function fetchChecklists() {
  let jsonFiles = [];

  try {
    // 1. Get raw file listing
    const res = await fetch(`${WORKER_URL}?list=checklists`);
    if (!res.ok) throw new Error('Failed to fetch checklist list');
    const files = await res.json();

    // 2. Keep only our timestamped JSONs
    jsonFiles = files.filter(f =>
      f.name.endsWith('.json') &&
      /^\d{4}_\d{2}_\d{2}_@_\d{2}-\d{2}-\d{2}/.test(f.name) &&
      !f.path.startsWith('checklists/config/')
    );

    // 3. Load users.json to see lastAccessed for this user
    const usersRes = await fetch(
      `${WORKER_URL}?file=${encodeURIComponent(USER_CONFIG_PATH)}`
    );
    const usersConfig = usersRes.ok ? await usersRes.json() : { users: [] };
    const me = usersConfig.users.find(
      u => u.username?.toLowerCase() === sharedState.currentUser?.toLowerCase()
    );
    const myEntries = me?.checklists || [];

    // 4. Sort: your recent checklists first, then alphabetically
    jsonFiles.sort((a, b) => {
      const aEntry = myEntries.find(e => e.id === a.name);
      const bEntry = myEntries.find(e => e.id === b.name);
      if (aEntry && bEntry) {
        return new Date(bEntry.lastAccessed) - new Date(aEntry.lastAccessed);
      }
      if (aEntry) return -1;
      if (bEntry) return 1;
      return a.name.localeCompare(b.name);
    });

  } catch (err) {
    console.error('[fetchChecklists]', err);
  }

  return jsonFiles;
}

/**
 * Fetch a single checklist JSON by path.
 * @param {string} path
 * @returns {Promise<Object>}
 */
export async function fetchRemoteChecklist(path) {
  const res = await fetch(
    `${WORKER_URL}?file=${encodeURIComponent(path)}`,
    { cache: 'no-cache' }
  );
  if (!res.ok) throw new Error(`Failed to load checklist: ${path}`);
  return res.json();
}

/**
 * Load and display a checklist, validating lastSave and initializing state.
 * @param {string} path
 */
export async function loadChecklist(path) {
  // Increment and log load attempt counter
  loadAttemptCounter++;
  console.log(`📊 [${loadAttemptCounter}] Loading checklist from worker: ${path}`);
  
  // Prevent loading the same checklist path multiple times
  if (sharedState._lastLoadPath === path && sharedState._loadedOnce) {
    console.log(`Already loaded ${path}, skipping duplicate load.`);
    return;
  }
  // Mark new load attempt
  sharedState._lastLoadPath = path;
  sharedState._loadedOnce = false;
  
  // Check if this is a reload after integrity fix to prevent infinite loops
  const isIntegrityReload = sessionStorage.getItem('integrityFixReload') === path;
  if (isIntegrityReload) {
    sessionStorage.removeItem('integrityFixReload');
    console.log('[loadChecklist] Integrity fix reload detected, skipping integrity check');
  }
  
   updatemainstatustext(`🔄 Loading ${path}…`);
   try {
    // 1. Fetch the JSON
    const data = await fetchRemoteChecklist(path);

    // 2. Validate lastSave
    if (!data.lastSave) {
      alert('❌ Cannot load this checklist: no lastSave timestamp found.');
      updatemainstatustext('❌ Load failed: missing lastSave');
      return;
    }

    // 3. Initialize shared state
    sharedState.FILE_PATH = path;
    // Make a clean deep copy to avoid accidental mutations
    sharedState.checklistData = JSON.parse(JSON.stringify(data));
    sharedState.lastSave = data.lastSave;
    sharedState.isDirty = false;
    sharedState.changeCount = 0; // Reset change counter
    sharedState.layoutDirty = false; // Reset layout dirty flag
    sharedState.readyForEdits = false; // Prevent markDirty during initial rendering
    sharedState.filterState = 'all';
    
    // 4. Data integrity check - ensure all items have required properties
    let integrityIssuesFixed = false;
    
    // Only run integrity check if this is NOT a reload after integrity fix
    if (!isIntegrityReload) {
      // Recursively ensure all items have a children array
      function ensureChildrenArrays(items) {
        let fixed = false;
        if (!items || !Array.isArray(items)) return fixed;
        
        items.forEach(item => {
          // Check if children property exists and is an array
          if (!item.hasOwnProperty('children') || !Array.isArray(item.children)) {
            console.log(`[loadChecklist] Adding missing children array to item: ${item.label || item.no || 'unlabeled'}`);
            item.children = [];
            fixed = true;
          }
          // Recursively check children (now guaranteed to exist)
          if (ensureChildrenArrays(item.children)) {
            fixed = true;
          }
        });
        
        return fixed;
      }
      
      // Check and fix items structure
      if (sharedState.checklistData.items && Array.isArray(sharedState.checklistData.items)) {
        integrityIssuesFixed = ensureChildrenArrays(sharedState.checklistData.items);
      } else {
        console.warn('[loadChecklist] Invalid or missing items array, creating empty array');
        sharedState.checklistData.items = [];
        integrityIssuesFixed = true;
      }
    }
    
    // TODO: Place other integrity data checks here
    // Examples of future integrity checks:
    // - Ensure all items have required fields (label, done, etc.)
    // - Validate item numbering consistency
    // - Check for orphaned references
    // - Validate collaborators array
    // - Ensure file references are valid
    // - Check for circular dependencies in item relationships
    
    if (integrityIssuesFixed) {
      // Mark this as an integrity fix reload to prevent infinite loops
      sessionStorage.setItem('integrityFixReload', path);
      
      try {
        // Save the corrected data immediately
        await saveChecklist(path);
        
        // Small delay to ensure the save is processed
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        location.reload();
      } catch (error) {
        console.error('[loadChecklist] Error during saveChecklist:', error);
        alert(`Save failed: ${error.message}. Check console for details.`);
        // If save fails, still try to reload but without the session flag
        sessionStorage.removeItem('integrityFixReload');
      }
      return;  // Exit early; reload will occur with corrected data
    }
    
    // 5. Handle layout structure - support both old and new format
    let defaultsApplied = false;
    
    // Check if we have the new "layouts" structure at the top level
    if (sharedState.checklistData.layouts && Array.isArray(sharedState.checklistData.layouts)) {
      // New format: layouts array at top level
      
      // Set up active layout index if not present
      if (typeof sharedState.checklistData.activeLayoutIndex !== 'number') {
        sharedState.checklistData.activeLayoutIndex = 0;
        defaultsApplied = true;
      }
      
      // Ensure there's at least one layout
      if (sharedState.checklistData.layouts.length === 0) {
        sharedState.checklistData.layouts.push({
          layoutName: 'Default',
          columns: {},
          columnOrder: [],
          rows: { height: 30 }
        });
        defaultsApplied = true;
      }
      
      // Set up the current layout reference for compatibility
      const activeIndex = sharedState.checklistData.activeLayoutIndex || 0;
      const activeLayout = sharedState.checklistData.layouts[activeIndex];
      
      // Ensure active layout has required properties
      if (!activeLayout.columns) {
        activeLayout.columns = {};
        defaultsApplied = true;
      }
      if (!activeLayout.columnOrder) {
        activeLayout.columnOrder = Object.keys(activeLayout.columns);
        defaultsApplied = true;
      }
      if (!activeLayout.rows) {
        activeLayout.rows = { height: 30 };
        defaultsApplied = true;
      }
      
      // Create compatibility reference
      sharedState.checklistData.layout = activeLayout;
      
    } else {
      // Old format or missing layout - handle legacy cases
      
      // Ensure layout exists
      if (!sharedState.checklistData.layout) {
        sharedState.checklistData.layout = { columns: {} };
        defaultsApplied = true;
      }
      
      // Ensure layout.columns exists
      if (!sharedState.checklistData.layout.columns) {
        sharedState.checklistData.layout.columns = {};
        defaultsApplied = true;
      }
      
      // Ensure columnOrder exists
      if (!sharedState.checklistData.layout.columnOrder) {
        sharedState.checklistData.layout.columnOrder = Object.keys(sharedState.checklistData.layout.columns);
        defaultsApplied = true;
      }
      
      // Migrate old single layout to new layouts array
      if (!sharedState.checklistData.layouts) {
        const ld = sharedState.checklistData.layout;
        sharedState.checklistData.layouts = [{
          layoutName: 'Default',
          columns: JSON.parse(JSON.stringify(ld.columns)),
          columnOrder: Array.isArray(ld.columnOrder) ? ld.columnOrder.slice() : Object.keys(ld.columns),
          rows: { height: ld.rowHeight || ld.rows?.height || 30 }
        }];
        sharedState.checklistData.activeLayoutIndex = 0;
        defaultsApplied = true;
        
        // Remove old layout properties after migration
        delete sharedState.checklistData.layout;
        sharedState.checklistData.layout = sharedState.checklistData.layouts[0];
      }
    }
    
    // Create a checkpoint for later comparison after all layout setup is complete
    const originalCheckpoint = createCheckpoint(sharedState.checklistData);
    
    if (defaultsApplied) {
      // Show a modal overlay to indicate work in progress
      if (!sharedState._defaultsAppliedOnce) {
        sharedState._defaultsAppliedOnce = true;
        // Insert overlay
        const overlay = document.createElement('div');
        overlay.id = 'defaultsOverlay';
        Object.assign(overlay.style, {
          position: 'fixed', top: '0', left: '0', right: '0', bottom: '0',
          background: 'rgba(0,0,0,0.5)', display: 'flex',
          alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: '1.5rem', zIndex: '9999'
        });
        overlay.textContent = 'Please wait: applying defaults...';
        document.body.appendChild(overlay);
        // Delay save and reload by 5 seconds to prevent rapid loops
        setTimeout(() => {
          saveChecklist(path).then(() => location.reload());
        }, 5000);
      }
      return;  // Exit early; reload will occur after defaults are saved
    }
    
    // 6. Render the checklist
    renderChecklist();
    
    // Now check if any unintended changes happened during rendering
    if (hasChanged(originalCheckpoint, sharedState.checklistData)) {
      console.warn('⚠️ Checklist data was modified during loading/rendering!');
      const changes = findChanges(originalCheckpoint, sharedState.checklistData);
      logChanges(changes);
      
      // Fix unwanted changes by reverting to original data if only numbering changed
      if (changes.itemNumberingChanged && !changes.itemPropertiesChanged && !changes.layoutChanged && !changes.metadataChanged) {
        console.log('Reverting unintended numbering changes to maintain original state');
        sharedState.checklistData = JSON.parse(originalCheckpoint);
        sharedState.isDirty = false;
      }
    } else {
      // ✅ No unintended modifications occurred during loading
    }
    
    // Now it's safe to enable editing
    sharedState.readyForEdits = true;
    // Mark that initial load is complete
    sharedState._loadedOnce = true;

    // 7. Final status update
    updatemainstatustext(`✅ Loaded "${data.title || path}" (saved: ${data.lastSave})`);
    
    // 8. Populate layout submenu with available layouts
    populateLayoutSubmenu();
  } catch (err) {
    updatemainstatustext(`❌ Error loading: ${err.message}`, { color: 'red' });
    console.error(`[loadChecklist] Error on attempt ${loadAttemptCounter}:`, err);
  }
}



