/**
 * Menu Fields Actions
 * 
 * This module contains all field-related actions for managing data fields from fields.json:
 * - Fields dialog and grid management
 * - Field analysis and configuration
 * - Field metadata operations
 * - Field definitions and types
 */

import { sharedState } from './constants.js';
import { showNotification } from './menu-dialogs.js';
import { markSaveDirty } from './data2.js';
import { renderChecklist } from './renderchecklist.js';
import { populateLayoutSubmenu } from './menu-layouts.js';
import { addNewField } from './data-fields.js';

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
export function buildFieldsGrid(dialog, fieldDefs) {
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
    const isCoreField = ['done', 'label', 'hns'].includes(fieldKey);
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
      <button id="new-field-btn" class="success-btn">+ New Field</button>
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
export function analyzeUsedFields() {
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
export function setupFieldsGridEventHandlers(dialog, gridData) {
  // New field button
  const newFieldBtn = document.getElementById('new-field-btn');
  if (newFieldBtn) {
    newFieldBtn.addEventListener('click', () => {
      showNewFieldDialog();
    });
  }
  
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
export function applyFieldsToCurrentLayout(gridData) {
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
export function saveFieldsAsNewLayout(gridData) {
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
  import('./menu-layouts.js').then(layoutsModule => {
    layoutsModule.applyLayoutToChecklist(newLayout);
  });
  
  // Mark dirty and save
  markSaveDirty(true, sharedState.DIRTY_EVENTS.SAVE_LAYOUT);
  
  // Update the submenu
  populateLayoutSubmenu();
  
  showNotification('success', `Layout "${layoutName}" saved and applied!`);
}

/**
 * Get default width for a field type (return number, not string)
 */
export function getDefaultFieldWidth(fieldType) {
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

/**
 * Show the new field creation dialog
 */
export function showNewFieldDialog() {
  console.log('[New Field Dialog] Opening new field dialog');
  
  // Create or get existing modal
  let dialog = document.getElementById('new-field-dialog');
  if (!dialog) {
    dialog = document.createElement('div');
    dialog.id = 'new-field-dialog';
    dialog.className = 'modal-dialog';
    dialog.style.cssText = `
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      background: white;
      border-radius: 8px;
      box-shadow: 0 10px 30px rgba(0,0,0,0.3);
      width: 500px;
      max-width: 90vw;
      z-index: 10001;
      display: none;
    `;
    document.body.appendChild(dialog);
  }
  
  // Load field types from config.json
  loadFieldTypesFromConfig().then(fieldTypes => {
    buildNewFieldDialog(dialog, fieldTypes);
  });
}

/**
 * Load field types from config.json
 */
async function loadFieldTypesFromConfig() {
  try {
    const response = await fetch('config/config.json');
    const config = await response.json();
    return config.fieldTypes || ['text', 'number', 'checkbox', 'select', 'tree', 'formula'];
  } catch (error) {
    console.error('Error loading field types from config:', error);
    return ['text', 'number', 'checkbox', 'select', 'tree', 'formula'];
  }
}

/**
 * Build the new field dialog
 */
function buildNewFieldDialog(dialog, fieldTypes) {
  const content = `
    <div class="modal-header">
      <h3>Create New Field</h3>
      <button class="close-btn" onclick="document.getElementById('new-field-dialog').style.display='none'">&times;</button>
    </div>
    <div class="modal-body">
      <div class="form-group">
        <label for="field-name">Field Name:</label>
        <input type="text" id="field-name" placeholder="Enter field name (e.g., IsPe)" required>
      </div>
      <div class="form-group">
        <label for="field-type">Field Type:</label>
        <select id="field-type" required>
          <option value="">Select field type</option>
          ${fieldTypes.map(type => `<option value="${type}">${type}</option>`).join('')}
        </select>
      </div>
      <div class="form-group">
        <label for="field-label">Display Label:</label>
        <input type="text" id="field-label" placeholder="Enter display label (e.g., PE)">
      </div>
      <div class="form-group" id="source-group" style="display: none;">
        <label for="field-source">Source (for select fields):</label>
        <select id="field-source">
          <option value="">None</option>
          <option value="collaborators">Collaborators</option>
        </select>
      </div>
      <div class="form-group" id="options-group" style="display: none;">
        <label for="field-options">Options (for select fields):</label>
        <textarea id="field-options" placeholder="Enter options, one per line&#10;Example:&#10;Low&#10;Normal&#10;High" rows="4"></textarea>
        <small style="color: #666; font-size: 0.8em;">Leave empty if using Source above</small>
      </div>
      <div class="form-group">
        <label for="field-default">Default Value:</label>
        <input type="text" id="field-default" placeholder="Leave empty for auto-default">
      </div>
    </div>
    <div class="modal-footer">
      <button id="create-field-btn" class="primary-btn">Create Field</button>
      <button onclick="document.getElementById('new-field-dialog').style.display='none'" class="cancel-btn">Cancel</button>
    </div>
  `;
  
  dialog.innerHTML = content;
  dialog.style.display = 'block';
  
  // Add event listeners
  setupNewFieldEventHandlers(dialog);
}

/**
 * Setup event handlers for the new field dialog
 */
function setupNewFieldEventHandlers(dialog) {
  const createBtn = document.getElementById('create-field-btn');
  const fieldNameInput = document.getElementById('field-name');
  const fieldTypeSelect = document.getElementById('field-type');
  const fieldLabelInput = document.getElementById('field-label');
  const fieldSourceSelect = document.getElementById('field-source');
  const fieldDefaultInput = document.getElementById('field-default');
  const fieldOptionsTextarea = document.getElementById('field-options');
  const sourceGroup = document.getElementById('source-group');
  const optionsGroup = document.getElementById('options-group');
  
  // Show/hide source and options fields based on type selection
  if (fieldTypeSelect && sourceGroup && optionsGroup) {
    fieldTypeSelect.addEventListener('change', () => {
      if (fieldTypeSelect.value === 'select') {
        sourceGroup.style.display = 'block';
        optionsGroup.style.display = 'block';
      } else {
        sourceGroup.style.display = 'none';
        optionsGroup.style.display = 'none';
        fieldSourceSelect.value = '';
        fieldOptionsTextarea.value = '';
      }
    });
  }
  
  if (createBtn) {
    createBtn.addEventListener('click', () => {
      const fieldName = fieldNameInput.value.trim();
      const fieldType = fieldTypeSelect.value;
      const fieldLabel = fieldLabelInput.value.trim() || fieldName;
      const fieldSource = fieldSourceSelect.value;
      const fieldDefault = fieldDefaultInput.value.trim();
      const fieldOptions = fieldOptionsTextarea.value.trim();
      
      if (!fieldName || !fieldType) {
        showNotification('error', 'Please fill in both field name and field type');
        return;
      }
      
      // Validate field name (no spaces, alphanumeric + underscore)
      if (!/^[a-zA-Z][a-zA-Z0-9_]*$/.test(fieldName)) {
        showNotification('error', 'Field name must start with a letter and contain only letters, numbers, and underscores');
        return;
      }
      
      // Check if field already exists
      if (fieldAlreadyExists(fieldName)) {
        showNotification('error', 'A field with this name already exists');
        return;
      }
      
      // Build options object
      const options = {};
      if (fieldSource) {
        options.source = fieldSource;
      }
      if (fieldOptions) {
        // Split options by lines and filter empty lines
        options.options = fieldOptions.split('\n').map(opt => opt.trim()).filter(opt => opt.length > 0);
      }
      if (fieldDefault) {
        options.default_value = fieldDefault;
      }
      
      // Create the new field
      createNewField(fieldName, fieldType, fieldLabel, options);
      
      // Close dialog
      dialog.style.display = 'none';
    });
  }
  
  // Enter key support
  if (fieldNameInput) {
    fieldNameInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        createBtn.click();
      }
    });
  }
}

/**
 * Check if a field already exists
 */
function fieldAlreadyExists(fieldName) {
  // Check in sharedState.fieldsData (loaded at init)
  if (!sharedState.fieldsData || !sharedState.fieldsData.fields) {
    console.warn('[Field Check] Fields data not loaded yet');
    return false;
  }
  
  const fields = sharedState.fieldsData.fields;
  return Object.values(fields).some(field => field.key === fieldName);
}

/**
 * Create a new field (now using centralized data-fields functions)
 */
async function createNewField(fieldName, fieldType, fieldLabel, options = {}) {
  console.log('[New Field] Creating new field:', { fieldName, fieldType, fieldLabel, options });
  
  try {
    // Use centralized field creation function (imported at top)
    const fieldId = await addNewField(fieldName, fieldType, fieldLabel, options);
    
    showNotification('success', `Field "${fieldLabel}" created successfully! (ID: ${fieldId})`);
    
    // TODO: Refresh the fields dialog to show the new field
    // refreshFieldsDialog();
    
  } catch (error) {
    console.error('Error creating new field:', error);
    showNotification('error', 'Failed to create new field: ' + error.message);
  }
}

/**
 * Placeholder function to update fields.json
 */
async function updateFieldsJson(fieldName, fieldType, fieldLabel) {
  // TODO: Implement this function to update fields.json
  console.log('[New Field] Placeholder: Update fields.json with:', { fieldName, fieldType, fieldLabel });
  
  // This would involve:
  // 1. Load current fields.json
  // 2. Add new field definition
  // 3. Save updated fields.json
  // 4. Reload field definitions
}

/**
 * Placeholder function to refresh the fields dialog
 */
function refreshFieldsDialog() {
  // TODO: Implement this function to refresh the fields dialog
  console.log('[New Field] Placeholder: Refresh fields dialog');
  
  // This would involve:
  // 1. Close current fields dialog
  // 2. Reload field definitions
  // 3. Reopen fields dialog with updated field list
}
