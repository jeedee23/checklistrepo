// data2.js — CRUD operations and checklist management

import { WORKER_URL, CHECKLISTS_DIR, sharedState } from './constants.js';
import { timestampNow } from './utils.js';
import { updatemainstatustext } from './ui-mainrender.js';
import { renderChecklist } from './renderchecklist.js';
import { updateUsersJson } from './auth-login.js';
import { fetchRemoteChecklist } from './data.js';
import { uploadPendingFiles } from './data-files.js';

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
    sources: {
      unitChoices: ["kg", "ton", "hr", "sec", "m", "m²", "m³", "l", "pc"],
      collaborators: [sharedState.currentUser || ""]
    },
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
    // Backward compatibility properties (point to sources)
    collaborators: [sharedState.currentUser || ""],
    unitChoices: ["kg", "ton", "hr", "sec", "m", "m²", "m³", "l", "pc"],
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
    
    // 2. Upload any pending files before saving
    try {
      console.log('[saveChecklist] Uploading pending files...');
      await uploadPendingFiles(sharedState.checklistData);
      console.log('[saveChecklist] File uploads completed');
    } catch (error) {
      console.error('[saveChecklist] File upload failed:', error);
      updatemainstatustext(`❌ File upload failed: ${error.message}`, { color: 'red' });
      alert(`File upload failed: ${error.message}`);
      return;
    }

    // 3. Update the lastSave timestamp
    const saveTimestamp = timestampNow();
    sharedState.checklistData.lastSave = saveTimestamp;
    
    // 4. Save to GitHub via worker
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
