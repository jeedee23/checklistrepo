// ui-mainrender.js

import { sharedState } from './constants.js';
import { fieldDefs } from './data-fields.js';
import { renderItem, showColumnVisibilityMenu } from './ui-subrender.js';
import { viewFile, downloadFile } from './data-files.js';
import { traverse, blockFlicker } from './utils.js';
import { markSaveDirty, getParentArray, getItemByPath } from './data.js';
import { showNotification } from './menu-system.js';
import { renderChecklist, renumberChecklist } from './renderchecklist.js';
/**
 * Try to grab the event flag, polling until successful or timeout.
 * @param {string} name – the "reason" you pass into sharedState.setEventFlag/clearEventFlag
 * @param {number} timeoutMs
 * @param {number} pollIntervalMs
 * @returns {Promise<void>} – resolves once flag is set, rejects on timeout
 */
export function waitForEventFlag(setFlag, name, timeoutMs = 500, pollIntervalMs = 10) {
  return new Promise((resolve, reject) => {
    if (setFlag === false) {
      // Release flag immediately
      sharedState.clearEventFlag(name);
      return resolve(true);
    }
    
    // Acquire flag with polling
    const start = Date.now();
    const tryGrab = () => {
      if (sharedState.setEventFlag(name)) {
        return resolve(true);
      }
      if (Date.now() - start > timeoutMs) {
        return reject(new Error(`Timeout waiting for "${name}" flag`));
      }
      setTimeout(tryGrab, pollIntervalMs);
    };
    tryGrab();
  });
}
export function updateFilterButtonStyle(btn) {
  if (!btn) return;

  if (sharedState.filterState === 'all') {
    btn.innerHTML = '🔲 Filter (all)';
    btn.style.background = '#ccc';
    btn.style.color = '#000';
  } else if (sharedState.filterState === 'notdone') {
    btn.innerHTML = '☐ Not done';
    btn.style.background = '#fdd';
    btn.style.color = '#a00';
  } else if (sharedState.filterState === 'done') {
    btn.innerHTML = '☑ Done';
    btn.style.background = '#dfd';
    btn.style.color = '#080';
  }
}

export function updatemainstatustext(text, cssStyle = {}) {
  const status = document.getElementById('mainstatusText');
  if (status) {
    status.textContent = text;
    Object.assign(status.style, cssStyle);
  }
}

/**
 * Highlight the selected row by adding/removing CSS classes
 */
export function highlightSelectedRow(row) {
  // Remove the highlight from any previously selected row
  const rows = document.querySelectorAll('.tr-item');
  rows.forEach(r => r.classList.remove('selected'));  // Remove 'selected' class from all rows

  // Add 'selected' class to the clicked row
  row.classList.add('selected');
}

/**
 * Collapse all items with children
 */
export function collapseAll() {
  traverse(sharedState.checklistData.items, item => {
    if (item.children && item.children.length > 0) {
      item.collapsed = true;
    }
  });
  renderChecklist();
}

/**
 * Expand all items with children
 */
export function expandAll() {
  traverse(sharedState.checklistData.items, item => {
    if (item.children && item.children.length > 0) {
      item.collapsed = false;
    }
  });
  renderChecklist();
}

export async function addSameLevel() {
  const eventName = 'addSameLevel';

  try {
    // Acquire flag
    await waitForEventFlag(true, eventName, 100, 50);

    // === your existing logic starts here ===
    const path = sharedState.selectedPath;
    if (!Array.isArray(path) || path.length === 0 || !sharedState.selectedItem) {
      alert('⚠ No item selected.');
      return;
    }

    const parentArr = getParentArray(path) || sharedState.checklistData.items;
    const idx = path[path.length - 1] - 1;

    const newItem = {
      label: 'Type content here (ctrl-del to delete row)',
      done: false,
      unit: '', qty_est: '', qty_real: '', price_unit: '', total_price: 0,
      date: new Date().toISOString().split('T')[0],
      who: sharedState.currentUser || '',
      children: [],
      no: '0'
    };

    parentArr.splice(idx + 1, 0, newItem);

    sharedState.selectedItem = newItem;
    const newPath = path.slice(0, -1).concat(idx + 2);
    sharedState.selectedPath = newPath;

    // Release flag
    await waitForEventFlag(false, eventName, 100, 50);

    // Do renumbering
    await waitForEventFlag(true, 'renumber', 100, 50);
    renumberChecklist();
    await waitForEventFlag(false, 'renumber', 100, 50);

    markSaveDirty(true);
    renderChecklist();

    setTimeout(() => {
      const selector = `tr.tr-item[data-path='${JSON.stringify(newPath)}']`;
      const row = document.querySelector(selector);
      if (row) {
        highlightSelectedRow(row);
        const input = row.querySelector("input[type='text']");
        if (input) {
          input.focus();
          input.select();
        }
      }
    }, 0);
    // === existing logic ends here ===

  } catch (err) {
    console.error('[addSameLevel] ', err);
    // Cleanup in case of error
    await waitForEventFlag(false, eventName, 100, 50);
  }
}
/**
 * Move selected item up one level in hierarchy (reduces nesting level)
 */
export function moveUpLevel() {
  // Can only move up if we're at least 2 levels deep
  if (!sharedState.selectedPath || sharedState.selectedPath.length < 2) {
    alert("Already top level");
    return;
  }
  
  // Get the current item's parent array and its index
  const currentArr = getParentArray(sharedState.selectedPath);
  if (!currentArr) {
    return;
  }
  
  const currentIdx = sharedState.selectedPath[sharedState.selectedPath.length - 1] - 1; // Convert to 0-based
  const currentItem = currentArr.splice(currentIdx, 1)[0]; // Remove and get item
  
  // Get the grandparent array (like original code)
  const grandparentArr = sharedState.selectedPath.length === 2
    ? sharedState.checklistData.items
    : getItemByPath(sharedState.selectedPath.slice(0, -2)).children;
  
  const parentIdx = sharedState.selectedPath[sharedState.selectedPath.length - 2] - 1;
  grandparentArr.splice(parentIdx + 1, 0, currentItem);
  
  // Update selection (like original code)
  sharedState.selectedPath = [...sharedState.selectedPath.slice(0, -2), parentIdx + 2];
  sharedState.selectedItem = currentItem;
  
  // Update UI like original code (synchronous)
  markSaveDirty(true);
  renderChecklist();
  
  // Re-highlight the moved row (like original code)
  const row = document.querySelector(`tr.tr-item[data-path='${JSON.stringify(sharedState.selectedPath)}']`);
  if (row) highlightSelectedRow(row);
}

/**
 * Move selected item down one level in hierarchy (increases nesting level)
 * Makes the item a child of the previous sibling
 */
export function moveDownLevel() {
  const arr = getParentArray(sharedState.selectedPath);
  if (!arr) {
    return;
  }
  
  const idx = sharedState.selectedPath[sharedState.selectedPath.length - 1] - 1;
  
  // We need a previous sibling to become our new parent
  if (idx <= 0) {
    alert("No previous sibling");
    return;
  }
  
  const currentItem = arr.splice(idx, 1)[0]; // Remove and get item
  const newParentItem = arr[idx - 1];
  
  // Ensure the new parent has a children array
  if (!newParentItem.children) {
    newParentItem.children = [];
  }
  
  // Add as last child of the previous sibling (like original code)
  newParentItem.children.push(currentItem);
  
  // Update selection (like original code)
  sharedState.selectedPath = [...sharedState.selectedPath.slice(0, -1), idx];
  sharedState.selectedItem = currentItem;
  
  // Update UI like original code (synchronous)
  markSaveDirty(true);
  renderChecklist();
  
  // Re-highlight the moved row (like original code)
  const row = document.querySelector(`tr.tr-item[data-path='${JSON.stringify(sharedState.selectedPath)}']`);
  if (row) highlightSelectedRow(row);
}

/**
 * Open a printable view of the checklist
 */
export function openPrintView() {
  // Build a printable HTML from checklistData
  function listHTML(items, prefix = []) {
    let html = '<ul style="margin:0; padding:0; list-style:none;">';
    items.forEach((it, idx) => {
      const number = [...prefix, idx + 1].join('.');
      const isChapter = prefix.length === 0;
      const color = it.color ? `color:${it.color};` : '';
      const style = [
        isChapter ? 'font-weight:bold; font-size:14pt;' : '',
        (!isChapter && it.bold) ? 'font-weight:bold;' : '',
        color
      ].join(' ').trim();

      const rightMeta = isChapter && (it.who || it.date)
        ? `${it.who || ''} | ${it.date || ''}`.trim().replace(/^ \| | \| $/g, '')
        : '';

      html += `
        <li style="padding:0.2rem 0; line-height:1.25;">
          <div style="display:flex; justify-content:space-between; align-items:flex-start; border-bottom:0.5px solid #ccc; width:18cm; ${style}">
            <div style="display:flex; gap:0.4rem; flex-wrap:wrap; flex-grow:1;">
              <span style="flex-shrink:0;">░</span>
              <span style="display:inline-block;">${number}</span>
              <span>${it.label}</span>
            </div>
            ${rightMeta ? `<div style="text-align:right; font-size:10pt; color:#555; white-space:nowrap; margin-left:1rem;">${rightMeta}</div>` : ''}
          </div>
        </li>`;

      if (it.children && it.children.length) {
        html += listHTML(it.children, [...prefix, idx + 1]);
      }

      if (isChapter && it.children?.length) {
        html += `<div style="margin:0 0 1rem 0;">${'<div style="border-bottom:0.5px solid #ccc; width:18cm; height:0.6cm;"></div>'.repeat(5)}</div>`;
      }
    });
    html += '</ul>';
    return html;
  }

  // Derive a clean title from the filename  
  const title = sharedState.FILE_PATH
    .split('/').pop()
    .replace(/\.json$/, '')
    .replace(/^(\d{4}_\d{2}_\d{2})_@_\d{2}-\d{2}-\d{2}_?/, '')
    .replace(/_/g, ' ')
    .trim();

  const printable = `
    <html>
      <head>
        <title>Printable Checklist</title>
        <style>
          @media print {
            body { margin:1.5cm; font-family:Consolas,monospace; font-size:11pt; line-height:1.3; }
            h1 { font-size:18pt; margin:0 0 1rem 0; }
          }
          body { margin:1.5cm; font-family:Consolas,monospace; font-size:11pt; line-height:1.3; }
        </style>
      </head>
      <body>
        <h1>${title}</h1>
        ${listHTML(sharedState.checklistData.items)}
        <hr style="margin:1.5rem 0; width:18cm;">
        <p>Notes:</p>
        <div style="height:4cm; border:1px solid #999; width:18cm;"></div>
      </body>
    </html>`;

  const w = window.open('');
  w.document.write(printable);
  w.document.close();
}

/**
 * Toggle bold formatting on selected item
 */
export function toggleBold() {
  if (!sharedState.selectedItem) return;
  sharedState.selectedItem.bold = !sharedState.selectedItem.bold;
  markSaveDirty(true, sharedState.DIRTY_EVENTS.CONTENT_CHANGE);
  renderChecklist();
}


export async function addSubLevel() {
  const eventName = 'addSubLevel';

  try {
    // Acquire flag
    await waitForEventFlag(true, eventName, 100, 50);

    if (!sharedState.selectedItem || !sharedState.selectedPath) {
      alert('⚠ No item selected.');
      return;
    }
    
    if (!sharedState.selectedItem.children) {
      sharedState.selectedItem.children = [];
    }
    
    // Create new child item with standard fields
    const newItem = {
      label: 'Type content here (ctrl-del to delete row)',
      done: false,
      unit: '', qty_est: '', qty_real: '', price_unit: '', total_price: 0,
      date: new Date().toISOString().split('T')[0],
      who: sharedState.currentUser || '',
      children: [],
      no: '0'
    };
    
    // Add as child
    sharedState.selectedItem.children.push(newItem);
    sharedState.selectedItem.collapsed = false; // Expand to show new child
    
    // Update selection to the new child item (1-indexed path)
    const newChildIndex = sharedState.selectedItem.children.length; // 1-indexed
    const newPath = [...sharedState.selectedPath, newChildIndex];
    sharedState.selectedPath = newPath;
    sharedState.selectedItem = newItem;
    
    // Release flag
    await waitForEventFlag(false, eventName, 100, 50);
    
    // Do renumbering
    await waitForEventFlag(true, 'renumber', 100, 50);
    renumberChecklist();
    await waitForEventFlag(false, 'renumber', 100, 50);
    
    // Update UI like original code (synchronous)
    markSaveDirty(true);
    renderChecklist();
    
    // Small timeout to let the DOM update, then focus + highlight
    setTimeout(() => {
      const selector = `tr.tr-item[data-path='${JSON.stringify(newPath)}']`;
      const row = document.querySelector(selector);
      if (row) {
        highlightSelectedRow(row);
        const input = row.querySelector("input[type='text']");
        if (input) {
          input.focus();
          input.select();
        }
      }
    }, 0);
    
  } catch (err) {
    console.error('[addSubLevel] ', err);
    // Cleanup in case of error
    await waitForEventFlag(false, eventName, 100, 50);
  }
}

/**
 * Expand ancestors of a given path to make the item visible
 */
export function expandAncestors(path) {
  let currentItems = sharedState.checklistData.items;
  
  for (let i = 0; i < path.length - 1; i++) {
    const idx = path[i];
    if (currentItems[idx]) {
      currentItems[idx].collapsed = false;
      currentItems = currentItems[idx].children || [];
    }
  }
  
  renderChecklist();
}

/**
 * Reorder columns by updating the layout.columnOrder array
 * @param {string} sourceKey - The key of the column being moved
 * @param {string|null} targetKey - The key of the column to move it to, or null to move to the end
 */
export function reorderColumns(sourceKey, targetKey) {
  // Ensure columnOrder exists
  const layout = sharedState.checklistData.layout;
  layout.columnOrder = layout.columnOrder || Object.keys(layout.columns);
  const order = layout.columnOrder;

  // Remove the source column from its current position
  const idx = order.indexOf(sourceKey);
  if (idx === -1) {
    console.warn(`Column "${sourceKey}" not found in columnOrder`);
    return;
  }
  order.splice(idx, 1);

  // Insert at target position or push to end
  if (targetKey) {
    const targetIdx = order.indexOf(targetKey);
    if (targetIdx === -1) {
      order.push(sourceKey);
    } else {
      order.splice(targetIdx, 0, sourceKey);
    }
  } else {
    order.push(sourceKey);
  }

  // Mark layout change
  markSaveDirty(true, sharedState.DIRTY_EVENTS.COLUMN_REORDER);
}

/**
 * Move selected item up in visual order (swap with previous sibling)
 * EXACT copy from oldscript.js + guard flag to prevent double execution
 */
export function moveAltUp() {
  console.log('[moveAltUp] CALLED - selectedPath:', JSON.stringify(sharedState.selectedPath));
  
  // Guard against double execution
  if (sharedState.moveInProgress) {
    console.log('[moveAltUp] BLOCKED - move already in progress');
    return;
  }
  
  if (!sharedState.selectedPath || sharedState.selectedPath.length === 0) return;

  // Set guard flag
  sharedState.moveInProgress = true;

  const siblings = getParentArray(sharedState.selectedPath);
  const idx = sharedState.selectedPath[sharedState.selectedPath.length - 1] - 1;

  // Block if already first in this level
  if (idx === 0) {
    const row = document.querySelector(`tr.tr-item[data-path='${JSON.stringify(sharedState.selectedPath)}']`);
    if (row) blockFlicker(row);
    sharedState.moveInProgress = false; // Clear flag
    return;
  }

  // Swap with previous sibling
  [siblings[idx - 1], siblings[idx]] = [siblings[idx], siblings[idx - 1]];
  // adjust path to point at the same moved item
  sharedState.selectedPath[sharedState.selectedPath.length - 1] = idx;
  sharedState.selectedItem = siblings[idx - 1];

  renumberChecklist();
  markSaveDirty(true); 
  sharedState.changeCount++;
  renderChecklist();

  // Re-highlight
  const newRow = document.querySelector(`tr.tr-item[data-path='${JSON.stringify(sharedState.selectedPath)}']`);
  if (newRow) highlightSelectedRow(newRow);
  
  // Clear guard flag
  sharedState.moveInProgress = false;
}

/**
 * Move selected item down in visual order (swap with next sibling)
 * EXACT copy from oldscript.js + guard flag to prevent double execution
 */
export function moveAltDown() {
  console.log('[moveAltDown] CALLED - selectedPath:', JSON.stringify(sharedState.selectedPath));
  
  // Guard against double execution
  if (sharedState.moveInProgress) {
    console.log('[moveAltDown] BLOCKED - move already in progress');
    return;
  }
  
  if (!sharedState.selectedPath || sharedState.selectedPath.length === 0) return;

  // Set guard flag
  sharedState.moveInProgress = true;

  const siblings = getParentArray(sharedState.selectedPath);
  const idx = sharedState.selectedPath[sharedState.selectedPath.length - 1] - 1;

  // Block if already last in this level
  if (idx === siblings.length - 1) {
    const row = document.querySelector(`tr.tr-item[data-path='${JSON.stringify(sharedState.selectedPath)}']`);
    if (row) blockFlicker(row);
    sharedState.moveInProgress = false; // Clear flag
    return;
  }

  // Swap with next sibling
  [siblings[idx], siblings[idx + 1]] = [siblings[idx + 1], siblings[idx]];
  sharedState.selectedPath[sharedState.selectedPath.length - 1] = idx + 2;
  sharedState.selectedItem = siblings[idx + 1];

  renumberChecklist();
  markSaveDirty(true); 
  sharedState.changeCount++;
  renderChecklist();

  // Re-highlight
  const newRow = document.querySelector(`tr.tr-item[data-path='${JSON.stringify(sharedState.selectedPath)}']`);
  if (newRow) highlightSelectedRow(newRow);
  
  // Clear guard flag
  sharedState.moveInProgress = false;
}

