// renderchecklist.js - Clean implementation of checklist rendering functionality

import { sharedState } from './constants.js';
import { fieldDefs } from './data-fields.js';
import { renderItem, showColumnVisibilityMenu } from './ui-subrender.js';
import { viewFile, downloadFile } from './data-files.js';
import { traverse } from './utils.js';
import { markSaveDirty, getParentArray, getItemByPath } from './data2.js';
import { showNotification } from './menu-dialogs.js';
import { waitForEventFlag } from './ui-mainrender.js';

/**
 * Main function to render the entire checklist
 * @param {number} eventId - Optional event ID that triggered this render
 */
export async function renderChecklist(eventId = 0) {
  // Log the specific event that triggered this render
  if (eventId > 0) {
    const eventName = sharedState.getDirtyEventName(eventId);
    console.log(`[renderChecklist] Event ID: ${eventId} - ${eventName}`);
  }
  
  // For structural changes, always renumber the checklist first
  // Only these events actually change the structure and require renumbering
  const STRUCTURAL_EVENTS = [
    sharedState.DIRTY_EVENTS.NEW_CHAPTER,
    sharedState.DIRTY_EVENTS.NEW_ITEM,
    sharedState.DIRTY_EVENTS.ADD_SAME_LEVEL,
    sharedState.DIRTY_EVENTS.ADD_SUB_LEVEL,
    sharedState.DIRTY_EVENTS.DUPLICATE_ITEM,
    sharedState.DIRTY_EVENTS.DELETE_ITEM,
    sharedState.DIRTY_EVENTS.MOVE_ALT_UP,
    sharedState.DIRTY_EVENTS.MOVE_ALT_DOWN,
    sharedState.DIRTY_EVENTS.MOVE_UP_LEVEL,
    sharedState.DIRTY_EVENTS.MOVE_DOWN_LEVEL
  ];
  
  const isStructuralChange = eventId > 0 && STRUCTURAL_EVENTS.includes(eventId);
  
  if (isStructuralChange) {
    console.log(`[renderChecklist] Structural change detected, renumbering checklist`);
    
    // Save current selection info for debugging
    const beforePath = sharedState.selectedPath ? [...sharedState.selectedPath] : null;
    const beforeLabel = sharedState.selectedItem ? sharedState.selectedItem.label : null;
    
    // Renumber the entire checklist
    renumberChecklist();
    
    // Verify selection is still valid after renumbering
    if (sharedState.selectedPath) {
      const itemAtPath = getItemByPath(sharedState.checklistData.items, sharedState.selectedPath);
      if (itemAtPath) {
        sharedState.selectedItem = itemAtPath;
        console.log(`[renderChecklist] Selection after renumbering: path=${JSON.stringify(sharedState.selectedPath)}, item=${itemAtPath.label}, hns=${itemAtPath.hns}`);
      } else {
        console.warn(`[renderChecklist] Could not find item at path after renumbering: ${JSON.stringify(sharedState.selectedPath)}`);
      }
    }
    
    console.log(`[renderChecklist] Renumbering complete: before=[path: ${JSON.stringify(beforePath)}, label: ${beforeLabel}], after=[path: ${JSON.stringify(sharedState.selectedPath)}, label: ${sharedState.selectedItem?.label}, hns: ${sharedState.selectedItem?.hns}]`);
  }

  // Log the specific event type
  if (eventId > 0) {
    if (STRUCTURAL_EVENTS.includes(eventId)) {
      console.log(`[renderChecklist] Structural change event`);
    } else if (eventId === sharedState.DIRTY_EVENTS.TOGGLE_COLLAPSE) {
      console.log(`[renderChecklist] Toggle collapse event - UI state change only`);
    } else if (eventId <= 40) {
      console.log(`[renderChecklist] Style change event`);
    } else if (eventId <= 60) {
      console.log(`[renderChecklist] Layout change event`);
    } else if (eventId <= 80) {
      console.log(`[renderChecklist] Metadata change event`);
    } else {
      console.log(`[renderChecklist] Other event: ${eventId}`);
    }
  } else {
    console.log(`[renderChecklist] Full render (no specific event)`);
  }

  // Update the header title with the loaded checklist title
  const titleEl = document.getElementById('loadedList');
  if (titleEl) {
    titleEl.textContent = sharedState.checklistData.title || '(untitled)';
  }

  console.log('[renderChecklist] Rendering checklist');
  
  // Get the correct container
  const container = document.getElementById('checklistContainer');
  if (!container) {
    console.error('[renderChecklist] ❌ #checklistContainer not found!');
    return;
  }

  container.innerHTML = '';

  // Ensure checklistData structure exists
  if (!sharedState.checklistData) {
    console.warn('[renderChecklist] No checklistData available');
    container.innerHTML = '<div class="empty-state">No checklist loaded. Please login or create a new checklist.</div>';
    return;
  }
  
  if (!sharedState.checklistData.layout) {
    console.warn('[renderChecklist] No layout in checklistData, creating default');
    sharedState.checklistData.layout = {
      columns: {
        label: { label: 'Task', visible: true, width: '300px' },
        status: { label: 'Status', visible: true, width: '100px' }
      },
      rowHeight: 30
    };
  }

  // Create the table element
  const table = document.createElement('table');
  table.className = 'checklist-table';
  table.id = 'checklistTable';
  
  // Determine which columns are visible and their order
  let columnKeys;
  if (sharedState.checklistData.layout.columnOrder && 
      Array.isArray(sharedState.checklistData.layout.columnOrder) &&
      sharedState.checklistData.layout.columnOrder.length > 0) {
    // Use the defined column order
    columnKeys = sharedState.checklistData.layout.columnOrder;
  } else {
    // No column order defined, use default order from layout columns
    columnKeys = Object.keys(sharedState.checklistData.layout.columns);
  }
  
  // Create table header
  const thead = document.createElement('thead');
  const headerRow = document.createElement('tr');
  
  // Add headers for each visible column (including 'hns' if visible)
  columnKeys.forEach(key => {
    if (sharedState.checklistData.layout.columns[key]?.visible === false) return;
    
    const headerCell = document.createElement('th');
    headerCell.textContent = sharedState.checklistData.layout.columns[key].label || key;
    headerCell.className = `col-${key}`;
    headerCell.style.position = 'relative';
    headerCell.dataset.colKey = key;
    
    // Set width if specified
    if (sharedState.checklistData.layout.columns[key].width) {
      headerCell.style.width = sharedState.checklistData.layout.columns[key].width;
    }
    
    // Add column drag & drop functionality (from oldscript.js)
    setupColumnDragDrop(headerCell, key);
    
    // Add column resize functionality
    setupColumnResize(headerCell, key);
    
    headerRow.appendChild(headerCell);
  });
  
  thead.appendChild(headerRow);
  table.appendChild(thead);

  // Create table body
  const tbody = document.createElement('tbody');
  table.appendChild(tbody);
  
  // Render the items recursively
  const rowHeight = sharedState.checklistData.layout.rowHeight || 30;
  if (sharedState.checklistData.items && sharedState.checklistData.items.length > 0) {
    sharedState.checklistData.items.forEach((item, index) => {
      renderItem(item, tbody, [index+1], sharedState.checklistData.layout.columns, rowHeight);
    });
  } else {
    const emptyRow = document.createElement('tr');
    const emptyCell = document.createElement('td');
    emptyCell.colSpan = columnKeys.filter(key => 
      sharedState.checklistData.layout.columns[key]?.visible !== false
    ).length; // Total visible columns (including 'hns' if visible)
    emptyCell.textContent = 'No items in this checklist. Click "Add" to create a new item.';
    emptyCell.style.textAlign = 'center';
    emptyCell.style.padding = '2rem';
    emptyRow.appendChild(emptyCell);
    tbody.appendChild(emptyRow);
  }

  // Append the table to container
  container.appendChild(table);
  
  // Update status indicator
  const statusIndicator = document.getElementById('saveStatus');
  if (statusIndicator) {
    statusIndicator.textContent = sharedState.isDirty ? 'Unsaved Changes' : 'Saved';
    statusIndicator.className = sharedState.isDirty ? 'status-dirty' : 'status-saved';
  }

  // For structural events, ensure the DOM is fully updated before setting focus
  // using a slightly longer timeout to allow browser to complete rendering
  if (isStructuralChange) {
    console.log('[renderChecklist] Structural event, setting focus after rendering:', 
                sharedState.getDirtyEventName(eventId));
    
    // Log the current selected item info for debugging
    console.log('[renderChecklist] Current selected item before focus:', 
                sharedState.selectedItem ? 
                `${sharedState.selectedItem.label} (${sharedState.selectedItem.hns}) at path ${JSON.stringify(sharedState.selectedPath)}` :
                'None');
                
    // For structural changes, verify selected item has a valid number
    if (sharedState.selectedItem && (!sharedState.selectedItem.hns || sharedState.selectedItem.hns === '')) {
      console.warn('[renderChecklist] Selected item has no number, attempting to fix');
      const itemAtPath = getItemByPath(sharedState.checklistData.items, sharedState.selectedPath);
      if (itemAtPath && itemAtPath.hns) {
        sharedState.selectedItem = itemAtPath;
        console.log('[renderChecklist] Fixed selected item reference:', sharedState.selectedItem.hns);
      }
    }
    
    // Allow a short delay for the browser to process the DOM changes
    await new Promise(resolve => setTimeout(resolve, 100));
    console.log('[renderChecklist] DOM should be updated now, setting focus');
    await setFocusAfterStructuralChange();
  } else {
    // For non-structural events, still set focus if we have a selected item
    if (sharedState.selectedItem && sharedState.selectedPath) {
      await setFocusAfterStructuralChange();
    }
  }

  console.log('[renderChecklist] complete');
}

/**
 * Renumbers all checklist items in hierarchical order (1, 1.1, 1.2, 2, 2.1, etc.)
 * @param {Array} items - Array of items to renumber (defaults to root items)
 * @param {Array} prefix - Number prefix for current level (used for recursion)
 */
/**
 * Simple, synchronous renumberChecklist - EXACT copy from working oldscript.js
 * Recursively assigns hierarchical numbers (1, 1.1, 1.1.1) based on array positions
 */
export function renumberChecklist(items = sharedState.checklistData.items, prefix = []) {
  items.forEach((item, idx) => {
    const number = [...prefix, idx + 1];
    item.hns = number.join('.');

    // Recurse into children (if any)
    if (Array.isArray(item.children) && item.children.length > 0) {
      renumberChecklist(item.children, number);
    }
  });
}

/**
 * Sets focus to the currently selected item after structural changes
 * Handles retries and fallback methods to ensure focus is set correctly
 */
async function setFocusAfterStructuralChange() {
  if (!sharedState.selectedItem || !sharedState.selectedPath) {
    console.warn('[setFocusAfterStructuralChange] No selected item or path, cannot set focus');
    return;
  }
  
  const pathStr = sharedState.selectedPath.join('-');
  console.log('[setFocusAfterStructuralChange] Attempting to focus item:', 
              sharedState.selectedItem.label, 
              'at path:', pathStr,
              'with number:', sharedState.selectedItem.hns);
  
  // Helper function to find and focus a row
  const findAndFocusRow = () => {
    console.log('[setFocusAfterStructuralChange] Setting focus to path:', pathStr);
    
    // Try to find the row by path
    let row = document.querySelector(`tr[data-path="${pathStr}"]`);
    
    if (!row) {
      console.log('[setFocusAfterStructuralChange] Row not found immediately, retrying with longer delay...');
      return false;
    }
    
    // Try multiple times if row not found immediately
    for (let attempt = 1; attempt <= 3 && !row; attempt++) {
      setTimeout(() => {
        row = document.querySelector(`tr[data-path="${pathStr}"]`);
        if (row) {
          console.log(`[setFocusAfterStructuralChange] Found row on attempt ${attempt}, highlighting`);
          return true;
        }
      }, 50 * attempt);
      console.log(`[setFocusAfterStructuralChange] Attempt ${attempt} failed, ${attempt < 3 ? 'retrying' : 'giving up'}`);
    }
    
    // If still not found, try finding by item number
    if (!row && sharedState.selectedItemhns) {
      console.log('[setFocusAfterStructuralChange] Trying alternate lookup by item number:', sharedState.selectedItemhns);
      const allRows = document.querySelectorAll('#checklistTable tbody tr');
      for (const rowEl of allRows) {
        const numberCell = rowEl.querySelector('.item-number');
        if (numberCell) {
          const itemNo = numberCell.textContent.trim();
          if (itemNo === sharedState.selectedItemhns) {
            console.log('[setFocusAfterStructuralChange] Found by item number:', itemNo);
            row = rowEl;
            break;
          }
        }
      }
    }
    
    if (row) {
      // Highlight the row
      row.classList.add('selected');
      
      // Try to focus the first input in the row
      const input = row.querySelector('input, textarea, select');
      if (input) {
        console.log('[setFocusAfterStructuralChange] Found input, focusing');
        input.focus();
        input.select?.();
      } else {
        console.log('[setFocusAfterStructuralChange] No input found in row');
      }
    } else {
      console.error('[setFocusAfterStructuralChange] Row not found by any method for item:', sharedState.selectedItem.label);
      const allRows = document.querySelectorAll('#checklistTable tbody tr');
      console.log(`[setFocusAfterStructuralChange] Available rows: ${allRows.length}`);
      allRows.forEach((r, i) => console.log(`  Row ${i}:`, r.getAttribute('data-path')));
    }
    
    return !!row;
  };
  
  // Try to find and focus immediately
  if (findAndFocusRow()) {
    console.log('[setFocusAfterStructuralChange] Found row, highlighting');
    const input = document.querySelector(`tr[data-path="${pathStr}"] input, tr[data-path="${pathStr}"] textarea, tr[data-path="${pathStr}"] select`);
    if (input) {
      console.log('[setFocusAfterStructuralChange] Found input, focusing');
      input.focus();
      input.select?.();
    }
  }
}

/**
 * Setup column drag & drop functionality (from oldscript.js)
 */
function setupColumnDragDrop(headerCell, columnKey) {
  headerCell.draggable = true;
  
  headerCell.addEventListener('dragstart', e => {
    e.dataTransfer.setData('text/plain', columnKey);
    headerCell.style.opacity = '0.5';
  });
  
  headerCell.addEventListener('dragend', e => {
    headerCell.style.opacity = '1';
  });
  
  headerCell.addEventListener('dragover', e => {
    e.preventDefault();
    headerCell.style.backgroundColor = '#e3f2fd';
  });
  
  headerCell.addEventListener('dragleave', e => {
    headerCell.style.backgroundColor = '';
  });
  
  headerCell.addEventListener('drop', e => {
    e.preventDefault();
    headerCell.style.backgroundColor = '';
    
    const sourceKey = e.dataTransfer.getData('text/plain');
    if (sourceKey !== columnKey) {
      // Import the reorderColumns function
      import('./ui-mainrender.js').then(module => {
        module.reorderColumns(sourceKey, columnKey);
        renderChecklist(); // Re-render to show new order
      });
    }
  });
}

/**
 * Setup column resize functionality
 */
function setupColumnResize(headerCell, columnKey) {
  // Create resize handle
  const resizeHandle = document.createElement('div');
  resizeHandle.className = 'resize-handle-col';
  resizeHandle.style.cssText = `
    position: absolute;
    top: 0;
    right: 0;
    width: 6px;
    height: 100%;
    cursor: col-resize;
    background: transparent;
    z-index: 10;
  `;
  
  headerCell.appendChild(resizeHandle);
  
  let isResizing = false;
  let startX = 0;
  let startWidth = 0;
  
  resizeHandle.addEventListener('mousedown', e => {
    e.preventDefault();
    e.stopPropagation();
    
    isResizing = true;
    startX = e.clientX;
    startWidth = headerCell.offsetWidth;
    
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    
    headerCell.style.userSelect = 'none';
    document.body.style.cursor = 'col-resize';
  });
  
  function handleMouseMove(e) {
    if (!isResizing) return;
    
    const deltaX = e.clientX - startX;
    const newWidth = Math.max(50, startWidth + deltaX); // Minimum width 50px
    
    headerCell.style.width = newWidth + 'px';
    
    // Update all cells in this column
    const table = headerCell.closest('table');
    const columnIndex = Array.from(headerCell.parentNode.children).indexOf(headerCell);
    
    table.querySelectorAll(`tbody tr`).forEach(row => {
      const cell = row.children[columnIndex];
      if (cell) {
        cell.style.width = newWidth + 'px';
      }
    });
  }
  
  function handleMouseUp(e) {
    if (!isResizing) return;
    
    isResizing = false;
    document.removeEventListener('mousemove', handleMouseMove);
    document.removeEventListener('mouseup', handleMouseUp);
    
    headerCell.style.userSelect = '';
    document.body.style.cursor = '';
    
    // Save the new width to the layout
    const newWidth = headerCell.offsetWidth;
    if (sharedState.checklistData.layout.columns[columnKey]) {
      sharedState.checklistData.layout.columns[columnKey].width = newWidth + 'px';
      markSaveDirty(true, sharedState.DIRTY_EVENTS.COLUMN_VISIBILITY);
    }
  }
}

// ─── renderchecklist.js ────────────────────────────────────────────────────
