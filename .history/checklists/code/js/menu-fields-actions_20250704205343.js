/**
 * Menu Fields Actions
 * 
 * This module contains all field-related actions for managing data fields from fields.json:
 * - Fields dialog and grid management
 * - Field analysis and configuration
 * - Field metadata operations
 * - Field definitions and types
 */

import { sharedState } from './shared-state.js';
import { showNotification } from './menu-dialogs.js';
import { markSaveDirty } from './checklist-core.js';
import { renderChecklist } from './checklist-ui.js';
import { applyLayoutToChecklist, populateLayoutSubmenu } from './menu-layouts.js';

/**
 * Show the fields selection dialog to add/remove fields
 */
export function showFieldsDialog() {
  console.log('[Fields Dialog] Opening Choose Fields dialog');
  
  try {
    // Create or get existing modal
    let dialog = document.getElementById('fields-dialog');
    if (!dialog) {
      dialog = document.createElement('div');
      dialog.id = 'fields-dialog';
      dialog.className = 'modal-dialog';
      document.body.appendChild(dialog);
    }
    
    // Import the data-fields module to get field definitions
    import('./data-fields.js').then(fieldsModule => {
      const fieldDefs = fieldsModule.fieldDefs || {};
      
      // Build the new grid-based dialog
      buildFieldsGrid(dialog, fieldDefs);
      
    }).catch(err => {
      console.error('Error loading field definitions:', err);
      showNotification('error', 'Failed to load field definitions');
    });
    
  } catch (error) {
    console.error('Error showing fields dialog:', error);
    showNotification('error', 'Failed to show fields dialog');
  }
}

/**
 * Build the new grid-based fields dialog
 */
function buildFieldsGrid(dialog, fieldDefs) {
  console.log('[Fields Dialog] Building fields grid');
  
  // Ensure we have the required data structures
  if (!sharedState.checklistData) {
    showNotification('error', 'No checklist data available');
    return;
  }
  
  // Ensure layout exists
  if (!sharedState.checklistData.layout) {
    sharedState.checklistData.layout = { columns: {} };
  }
  
  // Get current layout columns
  const currentLayout = sharedState.checklistData.layout.columns || {};
  
  console.log('[Fields Dialog] Current layout columns:', currentLayout);
  console.log('[Fields Dialog] Current fields:', sharedState.checklistData.fields);
  console.log('[Fields Dialog] Field definitions:', fieldDefs);
  
  // Analyze which fields are used in the checklist items
  const usedFields = analyzeUsedFields();
  
  // Build the grid data
  const gridData = Object.entries(fieldDefs).map(([id, def]) => {
    const fieldKey = def.key || id;
    const isUsed = usedFields.has(fieldKey);
    const isFixed = def.fixed || false;
    
    // Check if field is active - either in fields config OR in layout columns OR is a core field
    const isInFields = sharedState.checklistData.fields && sharedState.checklistData.fields[fieldKey] !== undefined;
    const isInLayout = currentLayout[fieldKey] !== undefined;
    const isCoreField = ['done', 'label', 'no'].includes(fieldKey);
    const isActive = isInFields || isInLayout || isCoreField || isFixed;
    
    const isVisible = currentLayout[fieldKey] && currentLayout[fieldKey].visible;
    
    console.log(`[Fields Dialog] Field ${fieldKey}:`, {
      isUsed, isFixed, isInFields, isInLayout, isCoreField, isActive, isVisible
    });
    
    return {
      id,
      fieldKey,
      fieldName: def.label || fieldKey,
      fieldType: def.type || 'text',
      isUsed,
      isActive,
      isVisible,
      isFixed
    };
  });
  
  // Build the dialog HTML
  const content = `
    <div class="modal-header">
      <h3>Choose Fields</h3>
      <button class="close-btn" onclick="document.getElementById('fields-dialog').style.display='none'">&times;</button>
    </div>
    <div class="modal-body">
      <div class="fields-grid-container">
        <table class="fields-grid">
          <thead>
            <tr>
              <th>Field Name</th>
              <th>Field Type</th>
              <th>Active</th>
              <th>Visible</th>
            </tr>
          </thead>
          <tbody>
            ${gridData.map(field => {
              // Active checkbox logic
              const activeChecked = field.isActive ? 'checked' : '';
              const activeDisabled = (field.isUsed || field.isFixed) ? 'disabled' : '';
              const activeClass = (field.isUsed || field.isFixed) ? 'grey-checkbox' : '';
              
              // Visible checkbox logic  
              const visibleChecked = field.isVisible ? 'checked' : '';
              const visibleDisabled = !field.isActive ? 'disabled' : '';
              const visibleClass = !field.isActive ? 'grey-checkbox' : '';
              
              return `
              <tr data-field-id="${field.id}">
                <td>${field.fieldName}</td>
                <td>${field.fieldType}</td>
                <td>
                  <input type="checkbox" 
                         id="active-${field.id}" 
                         ${activeChecked} 
                         ${activeDisabled}
                         class="${activeClass}"
                         data-field-key="${field.fieldKey}">
                </td>
                <td>
                  <input type="checkbox" 
                         id="visible-${field.id}" 
                         ${visibleChecked} 
                         ${visibleDisabled}
                         class="${visibleClass}"
                         data-field-key="${field.fieldKey}">
                </td>
              </tr>
              `;
            }).join('')}
          </tbody>
        </table>
      </div>
    </div>
    <div class="modal-footer">
      <button id="apply-current-layout-btn" class="primary-btn">Apply to Current Layout</button>
      <button id="save-new-layout-btn" class="secondary-btn">Save as New Layout</button>
      <button onclick="document.getElementById('fields-dialog').style.display='none'" class="cancel-btn">Cancel</button>
    </div>
  `;
  
  dialog.innerHTML = content;
  dialog.style.display = 'block';
  
  // Add event listeners
  setupFieldsGridEventHandlers(dialog, gridData);
}

/**
 * Analyze which fields are actually used in checklist items
 */
function analyzeUsedFields() {
  const usedFields = new Set();
  
  if (!sharedState.checklistData || !sharedState.checklistData.items) {
    return usedFields;
  }
  
  // Recursive function to check all items
  function checkItem(item) {
    if (!item) return;
    
    // Check all properties of the item
    Object.keys(item).forEach(key => {
      // Skip internal properties
      if (['children', 'collapsed', 'path'].includes(key)) return;
      
      // If the field has a meaningful value, it's used
      const value = item[key];
      if (value !== undefined && value !== null && value !== '' && value !== 0 && value !== false) {
        usedFields.add(key);
      }
      
      // Special case: done field is always considered used if it exists
      if (key === 'done') {
        usedFields.add(key);
      }
      
      // Special case: label field is always considered used if it exists
      if (key === 'label' && value) {
        usedFields.add(key);
      }
    });
    
    // Check children recursively
    if (item.children && Array.isArray(item.children)) {
      item.children.forEach(child => checkItem(child));
    }
  }
  
  // Check all top-level items
  sharedState.checklistData.items.forEach(item => checkItem(item));
  
  console.log('[Fields Dialog] Used fields:', Array.from(usedFields));
  return usedFields;
}

/**
 * Setup event handlers for the fields grid
 */
function setupFieldsGridEventHandlers(dialog, gridData) {
  // Apply to current layout button
  const applyBtn = document.getElementById('apply-current-layout-btn');
  if (applyBtn) {
    applyBtn.addEventListener('click', () => {
      applyFieldsToCurrentLayout(gridData);
      dialog.style.display = 'none';
    });
  }
  
  // Save as new layout button
  const saveBtn = document.getElementById('save-new-layout-btn');
  if (saveBtn) {
    saveBtn.addEventListener('click', () => {
      saveFieldsAsNewLayout(gridData);
      dialog.style.display = 'none';
    });
  }
  
  // Handle Active checkbox changes (enable/disable Visible)
  gridData.forEach(field => {
    const activeCheckbox = document.getElementById(`active-${field.id}`);
    const visibleCheckbox = document.getElementById(`visible-${field.id}`);
    
    if (activeCheckbox && visibleCheckbox) {
      activeCheckbox.addEventListener('change', () => {
        if (activeCheckbox.checked) {
          visibleCheckbox.disabled = false;
        } else {
          visibleCheckbox.disabled = true;
          visibleCheckbox.checked = false;
        }
      });
    }
  });
}

/**
 * Apply field changes to the current layout
 */
function applyFieldsToCurrentLayout(gridData) {
  console.log('[Fields Dialog] Applying changes to current layout');
  
  // Update checklistData.fields based on Active checkboxes
  if (!sharedState.checklistData.fields) {
    sharedState.checklistData.fields = {};
  }
  
  // Update layout columns based on Visible checkboxes
  if (!sharedState.checklistData.layout.columns) {
    sharedState.checklistData.layout.columns = {};
  }
  
  gridData.forEach(field => {
    const activeCheckbox = document.getElementById(`active-${field.id}`);
    const visibleCheckbox = document.getElementById(`visible-${field.id}`);
    
    if (activeCheckbox && visibleCheckbox) {
      const isActive = activeCheckbox.checked;
      const isVisible = visibleCheckbox.checked;
      
      // Update fields
      if (isActive) {
        // Add field to fields if not exists
        if (!sharedState.checklistData.fields[field.fieldKey]) {
          sharedState.checklistData.fields[field.fieldKey] = {
            type: field.fieldType,
            label: field.fieldName
          };
        }
        
        // Update layout columns
        if (!sharedState.checklistData.layout.columns[field.fieldKey]) {
          sharedState.checklistData.layout.columns[field.fieldKey] = {
            width: '100px',
            visible: isVisible
          };
        } else {
          sharedState.checklistData.layout.columns[field.fieldKey].visible = isVisible;
        }
      } else {
        // Remove field from fields and layout
        delete sharedState.checklistData.fields[field.fieldKey];
        delete sharedState.checklistData.layout.columns[field.fieldKey];
      }
    }
  });
  
  // Mark as dirty and re-render
  markSaveDirty(true, sharedState.DIRTY_EVENTS.FIELD_METADATA);
  renderChecklist();
  showNotification('success', 'Fields updated in current layout');
}

/**
 * Save field changes as a new layout
 */
function saveFieldsAsNewLayout(gridData) {
  const layoutName = prompt('Enter name for new layout:');
  if (!layoutName || layoutName.trim() === '') return;
  
  console.log('[Fields Dialog] Saving as new layout:', layoutName);
  
  // Build the new layout from current field selections
  const newLayout = {
    layoutName: layoutName.trim(),
    columns: {},
    rows: { height: sharedState.checklistData.layout.rowHeight || 30 },
    columnOrder: []
  };
  
  // Process each field to build the layout
  gridData.forEach(field => {
    const activeCheckbox = document.getElementById(`active-${field.id}`);
    const visibleCheckbox = document.getElementById(`visible-${field.id}`);
    
    if (activeCheckbox && activeCheckbox.checked) {
      const isVisible = visibleCheckbox && visibleCheckbox.checked;
      
      // Add to columns configuration
      newLayout.columns[field.fieldKey] = {
        width: getDefaultFieldWidth(field.fieldType),
        visible: isVisible
      };
      
      // Add to column order ONLY if visible
      if (isVisible) {
        newLayout.columnOrder.push(field.fieldKey);
      }
    }
  });
  
  // Add the layout to the checklist's layouts array
  let layoutsArray = null;
  
  // First try root level layouts array
  if (sharedState.checklistData.layouts && Array.isArray(sharedState.checklistData.layouts)) {
    layoutsArray = sharedState.checklistData.layouts;
  }
  // Then try nested layouts within current layout
  else if (sharedState.checklistData.layout) {
    if (!sharedState.checklistData.layout.layouts) {
      sharedState.checklistData.layout.layouts = [];
    }
    layoutsArray = sharedState.checklistData.layout.layouts;
  }
  
  if (!layoutsArray) {
    console.error('[Layout] Could not find layouts array to save new layout');
    showNotification('error', 'Could not save layout - no layouts array found');
    return;
  }
  
  // Check if layout name already exists and update or add
  const existingIndex = layoutsArray.findIndex(l => l.layoutName === layoutName.trim());
  if (existingIndex >= 0) {
    if (confirm(`Layout "${layoutName}" already exists. Overwrite?`)) {
      layoutsArray[existingIndex] = newLayout;
    } else {
      return;
    }
  } else {
    layoutsArray.push(newLayout);
  }
  
  // Apply the new layout immediately
  applyLayoutToChecklist(newLayout);
  
  // Mark dirty and save
  markSaveDirty(true, sharedState.DIRTY_EVENTS.SAVE_LAYOUT);
  
  // Update the submenu
  populateLayoutSubmenu();
  
  showNotification('success', `Layout "${layoutName}" saved and applied!`);
}

/**
 * Get default width for a field type (return number, not string)
 */
function getDefaultFieldWidth(fieldType) {
  const widthMap = {
    'checkbox': 50,
    'number': 80,
    'text': 120,
    'select': 120,
    'date': 120,
    'tree': 250,
    'computed': 100
  };
  return widthMap[fieldType] || 100;
}
