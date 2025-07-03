// data.js — Module for loading, saving, and listing checklists

import { WORKER_URL, CHECKLISTS_DIR, USER_CONFIG_PATH, sharedState } from './constants.js';
import { traverse, timestampNow } from './utils.js';
import { updatemainstatustext } from './ui-mainrender.js';
import { renderChecklist } from './renderchecklist.js';
import { createCheckpoint, hasChanged, findChanges, logChanges } from './debug-helpers.js';
import { updateUsersJson } from './auth-login.js';
import { populateLayoutSubmenu } from './menu-system.js';

// For version‐conflict monitoring (handled in events.js)
sharedState.readyForEdits = false;

/**
 * Fetches the JSON list of available checklist files, renders the sidebar (if exists),
 * and returns the array of files.
 */
export async function fetchChecklists() {
  const listEl = document.getElementById('checklistList');
  
  // Check if the sidebar element exists
  if (listEl) {
    listEl.innerHTML = '🔄 Loading...';
  } else {
    console.log('Checklist list element not found (sidebar removed), fetching data only');
  }

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

    // 5. Render the sidebar buttons (only if listEl exists)
    if (listEl) {
      listEl.innerHTML = '';
      jsonFiles.forEach(file => {
        const li = document.createElement('li');
        li.style.listStyle = 'none';

        const btn = document.createElement('button');
        btn.style.display = 'block';

        // Human-friendly label
        const label = file.name
          .replace(/^\d{4}_\d{2}_\d{2}_@_/, '')
          .replace(/\.json$/, '')
          .replace(/_/g, ' ');
        btn.textContent = label;

        btn.onclick = () => loadChecklist(file.path);

        li.appendChild(btn);
        listEl.appendChild(li);
      });
    }
  } catch (err) {
    console.error('[fetchChecklists]', err);
    if (listEl) {
      listEl.innerHTML = '❌ Failed to load list';
    }
  }

  console.log('[data.js] fetchChecklists jsonFiles =', jsonFiles);
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
  
   console.log(`🔄 Loading checklist from ${path}...`);
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

    // Create a checkpoint for later comparison
    const originalCheckpoint = createCheckpoint(data);
    console.log('Checklist data checkpoint created before loading');

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
      console.log('[loadChecklist] Data integrity issues detected and fixed, attempting to save corrected data...');
      // Mark this as an integrity fix reload to prevent infinite loops
      sessionStorage.setItem('integrityFixReload', path);
      
      try {
        // Save the corrected data immediately
        console.log('[loadChecklist] About to call saveChecklist...');
        await saveChecklist(path);
        console.log('[loadChecklist] saveChecklist completed successfully');
        
        // Small delay to ensure the save is processed
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        console.log('[loadChecklist] Corrected data saved, reloading page...');
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
      console.log('[loadChecklist] Found new layouts format');
      
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
      console.log('[loadChecklist] Found old layout format or missing layout');
      
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
      console.log('✅ No unintended modifications occurred during loading');
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
    console.error('[loadChecklist]', err);
  }
}

/**
 * Create a brand-new checklist template and save immediately.
 */
export async function newChecklist() {
  const name = prompt('New checklist name:', 'My Checklist');
  if (!name) return;

  const timestamp = timestampNow();
  const filename = `${timestamp}_${name.replace(/\s+/g, '_')}.json`;
  const path = `${CHECKLISTS_DIR}/${filename}`;
  
  const template = {
    title: name,
    lastSave: timestamp,
    items: [
      {
        label: "First item",
        done: false,
        children: []
      }
    ],
    layout: {
      columns: {
        label: { visible: true, width: 400 },
        done: { visible: true, width: 50 },
        who: { visible: true, width: 100 },
        date: { visible: true, width: 100 }
      }
    },
    collaborators: [sharedState.currentUser],
    files: []
  };
  
  sharedState.FILE_PATH = path;
  sharedState.checklistData = template;
  sharedState.lastSave = timestamp;
  sharedState.isDirty = true;
  sharedState.readyForEdits = true;
  
  renderChecklist();
  updatemainstatustext(`✅ Created new checklist "${name}"`);
  
  // Save immediately
  await saveChecklist();
}

/**
 * Rename the current checklist file (in-memory).
 */
export function renameChecklist() {
  const curPath = sharedState.FILE_PATH;
  if (!curPath) return;

  const curName = curPath.split('/').pop().replace(/^\d{4}_\d{2}_\d{2}_@_\d{2}-\d{2}-\d{2}_/, '').replace(/\.json$/, '');
  const newName = prompt('New checklist name:', curName);
  if (!newName || newName === curName) return;

  const timestamp = timestampNow();
  const newFilename = `${timestamp}_${newName.replace(/\s+/g, '_')}.json`;
  const newPath = `${CHECKLISTS_DIR}/${newFilename}`;
  
  sharedState.FILE_PATH = newPath;
  sharedState.checklistData.title = newName;
  markSaveDirty(true, sharedState.DIRTY_EVENTS.RENAME_CHECKLIST);
  
  renderChecklist();
  updatemainstatustext(`✅ Renamed to "${newName}" (will save as new file)`);
}

/**
 * Make a copy of the current checklist under a new name.
 */
export async function copyChecklist() {
  const curPath = sharedState.FILE_PATH;
  if (!curPath) return;

  const curName = sharedState.checklistData.title || curPath.split('/').pop().replace(/^\d{4}_\d{2}_\d{2}_@_\d{2}-\d{2}-\d{2}_/, '').replace(/\.json$/, '');
  const newName = prompt('Copy checklist as:', `Copy of ${curName}`);
  if (!newName) return;

  const timestamp = timestampNow();
  const newFilename = `${timestamp}_${newName.replace(/\s+/g, '_')}.json`;
  const newPath = `${CHECKLISTS_DIR}/${newFilename}`;
  
  // Keep current data but update filename and title
  sharedState.FILE_PATH = newPath;
  sharedState.checklistData.title = newName;
  sharedState.checklistData.lastSave = timestamp;
  markSaveDirty(true, sharedState.DIRTY_EVENTS.COPY_CHECKLIST);
  
  renderChecklist();
  updatemainstatustext(`✅ Created copy "${newName}"`);
  
  // Save immediately
  await saveChecklist();
}

/**
 * Persist notes, checklist JSON, and update users.json with lastAccessed.
 * @param {string} [pathOverride]
 */
/** 
 * Find items that were edited both locally and remotely.
 * Returns an array of { no, localItem, remoteItem } 
 */
function findConflictingItems(localState, remoteState) {
  const conflicts = [];
  
  // TODO: implement proper conflict detection logic
  
  return conflicts;
}

/**
 * Format conflicts as plain-text for user to review.
 */
function formatConflictsAsPlainText(conflicts) {
  if (!conflicts.length) return '';
  
  // TODO: implement conflict formatting
  
  return 'Conflicts detected - implementation pending';
}

/**
 * Save the current checklist, with conflict-on-save detection.
 * @param {string} [pathOverride]
 */
export async function saveChecklist(pathOverride) {
  const path = pathOverride || sharedState.FILE_PATH;
  console.log('[saveChecklist] Called with path:', path);
  
  if (!path) {
    console.error('[saveChecklist] No path provided!');
    alert('No checklist path set!');
    return;
  }
  
  if (sharedState.saveInProgress) {
    console.log('[saveChecklist] Save already in progress, ignoring duplicate request');
    return;
  }
  
  sharedState.saveInProgress = true;
  console.log('[saveChecklist] Starting save process...');
  updatemainstatustext('💾 Saving...');
  
  try {
    // 1. Check for conflicts with the server version
    let serverVersion = null;
    try {
      serverVersion = await fetchRemoteChecklist(path);
      
      // If timestamps don't match, check for conflicts
      if (serverVersion.lastSave !== sharedState.lastSave) {
        console.warn(`Potential conflict: local lastSave=${sharedState.lastSave}, server lastSave=${serverVersion.lastSave}`);
        
        // Look for specific conflicts
        const conflicts = findConflictingItems(sharedState.checklistData, serverVersion);
        
        if (conflicts.length) {
          const proceed = confirm(
            `Warning: This checklist was modified since you opened it.\n\n` +
            formatConflictsAsPlainText(conflicts) +
            `\n\nDo you want to overwrite these changes?`
          );
          
          if (!proceed) {
            updatemainstatustext('❌ Save cancelled due to conflicts');
            return;
          }
        }
      }
    } catch (err) {
      console.log('No server version found or error fetching:', err);
      // Continue with save (likely a new file)
    }
    
    // 1.5 Ensure a named layout exists for saving
    const ld = sharedState.checklistData.layout;
    if (ld && !ld.layouts) {
      ld.layouts = [{
        layoutName: 'lastused',
        columns: JSON.parse(JSON.stringify(ld.columns)),
        rows: ld.rows ? JSON.parse(JSON.stringify(ld.rows)) : { height: 30 },
        columnOrder: Array.isArray(ld.columnOrder) ? ld.columnOrder.slice() : Object.keys(ld.columns)
      }];
      ld.activeLayoutIndex = 0;
    }
    
    // 2. Update the lastSave timestamp
    const saveTimestamp = timestampNow();
    sharedState.checklistData.lastSave = saveTimestamp;
    
    // 3. Save to GitHub via worker
    const payload = {
      file: path,
      json: sharedState.checklistData,
      message: `Update checklist via webapp (${sharedState.currentUser || 'anonymous'})`
    };
    
    console.log('[saveChecklist] About to POST to GitHub with payload:', {
      file: payload.file,
      message: payload.message,
      itemCount: payload.json.items ? payload.json.items.length : 0
    });
    
    const res = await fetch(`${WORKER_URL}/save`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    
    console.log('[saveChecklist] GitHub response status:', res.status, res.statusText);
    
    if (!res.ok) {
      throw new Error(`Save failed: ${res.status} ${res.statusText}`);
    }
    
    // 4. Update local state
    sharedState.lastSave = saveTimestamp;
    sharedState.isDirty = false;
    // Hide the Save button after saving
    markSaveDirty(false);
    sharedState.changeCount = 0;
    sharedState.layoutDirty = false;
    
    // 5. Update users.json with lastAccessed
    if (sharedState.currentUser) {
      await updateUsersJson(path.split('/').pop(), sharedState.currentUser, saveTimestamp);
    }
    
    updatemainstatustext('✅ Saved successfully');
  } catch (err) {
    console.error('[saveChecklist]', err);
    updatemainstatustext(`❌ Save failed: ${err.message}`, { color: 'red' });
    alert(`Error saving: ${err.message}`);
  } finally {
    sharedState.saveInProgress = false;
  }
}

/**
 * Mark the checklist as dirty/needs saving.
 * Returns a Promise that resolves when the render is complete
 */
export async function markSaveDirty(flag = true, eventId = 0) {
  // Only allow marking as dirty if we're ready for edits
  if (!sharedState.readyForEdits) return;
  
  sharedState.isDirty = flag;
  sharedState.isDirtyType = flag ? eventId : 0;
  
  if (flag) {
    sharedState.changeCount++;
    sharedState.renderCount++;
    
    // Auto-save suggestion after many changes - COMMENTED OUT FOR NOW
    // Structural changes like renumbering cause too many changes and trigger this unnecessarily
    /*
    if (sharedState.renderCount >= 50) {
      const shouldSave = confirm(`You've made ${sharedState.renderCount} changes. Save now?`);
      if (shouldSave) {
        saveChecklist();
        return; // Exit early, saveChecklist will reset counters
      }
    }
    */
  } else {
    // Reset counters on save
    sharedState.renderCount = 0;
    sharedState.changeCount = 0;
  }
  
  // Update save button
  const btn = document.getElementById('saveChecklistButton');
  if (btn) {
    // Toggle visibility: show when dirty, hide when clean
    btn.style.display = sharedState.isDirty ? 'inline-block' : 'none';
    // Keep red styling through CSS class if needed
    btn.classList.toggle('dirty', sharedState.isDirty);
  }
  
  // Auto-trigger specific render based on event ID
  if (sharedState.isDirty && sharedState.isDirtyType > 0) {
    // Trigger render with the specific event ID
    console.log(`[markSaveDirty] Triggering render with event: ${eventId}`);
    try {
      // Use the imported renderChecklist function
      await renderChecklist(sharedState.isDirtyType);
      sharedState.isDirtyType = 0; // Reset after rendering
      console.log(`[markSaveDirty] Render complete for event: ${eventId}`);
    } catch (error) {
      console.error('[markSaveDirty] Error during render:', error);
    }
  }
}

/**
 * Merge helpers (future version-history integration)
 */
export function mergeChecklistData(local, remote) {
  // Basic merge strategy - prefer local changes but include remote items
  // TODO: implement proper merging logic
  return local;
}

function mergeItems(localItems, remoteItems) {
  // TODO: implement item merging logic
  return localItems;
}

// Helper functions for item and path management
export function getItemByPath(path) {
  console.log('[getItemByPath] Called with path:', path);
  
  if (!path || !path.length) {
    console.log('[getItemByPath] Invalid path, returning null');
    return null;
  }
  
  let current = sharedState.checklistData.items;
  let pathSoFar = "checklistData.items";
  
  for (let i = 0; i < path.length; i++) {
    const idx = path[i] - 1; // Convert from 1-indexed to 0-indexed
    pathSoFar += `[${idx}]`;
    
    // Check if this index exists
    if (idx < 0 || idx >= current.length) {
      console.error(`[getItemByPath] Index out of bounds at ${pathSoFar}, array length ${current.length}`);
      return null;
    }
    
    // Check if this is the last segment (item itself)
    if (i === path.length - 1) {
      console.log(`[getItemByPath] Found item at ${pathSoFar}`);
      return current[idx];
    }
    
    // Otherwise navigate to children
    pathSoFar += ".children";
    if (!current[idx].children || !Array.isArray(current[idx].children)) {
      console.error(`[getItemByPath] No children at ${pathSoFar}`);
      return null;
    }
    
    current = current[idx].children;
  }
  
  // This should not happen if path has at least one element
  console.error("[getItemByPath] Path traversal failed unexpectedly");
  return null;
}

export function getParentArray(path) {
  console.log('[getParentArray] Called with path:', path);
  
  if (!path || path.length === 0) {
    console.log('[getParentArray] Returning top-level items array (empty path)');
    return sharedState.checklistData.items;
  }
  
  if (path.length === 1) {
    console.log('[getParentArray] Returning top-level items array (path length 1)');
    return sharedState.checklistData.items;
  }
  
  // For deeper paths, navigate to the parent's children array
  const parentPath = path.slice(0, -1);
  console.log('[getParentArray] Looking for parent at path:', parentPath);
  
  // Traverse the path manually to ensure we're getting the right parent
  let current = sharedState.checklistData.items;
  let pathSoFar = "checklistData.items";
  
  for (let i = 0; i < parentPath.length; i++) {
    const idx = parentPath[i] - 1; // Convert 1-indexed to 0-indexed
    pathSoFar += `[${idx}]`;
    
    // Make sure current[idx] exists
    if (!current[idx]) {
      console.error(`[getParentArray] Cannot find item at ${pathSoFar}`);
      return null;
    }
    
    // If this is the last segment, we found our parent
    if (i === parentPath.length - 1) {
      // Make sure children array exists
      if (!current[idx].children) {
        console.log(`[getParentArray] Creating children array for ${pathSoFar}`);
        current[idx].children = [];
      }
      console.log(`[getParentArray] Returning children array from ${pathSoFar}.children`);
      return current[idx].children;
    }
    
    // Otherwise move to the next level down
    if (!current[idx].children) {
      console.error(`[getParentArray] No children at ${pathSoFar}`);
      return null;
    }
    
    pathSoFar += ".children";
    current = current[idx].children;
  }
  
  // This should not happen if parentPath has at least one element
  console.error("[getParentArray] Path traversal failed unexpectedly");
  return null;
}
