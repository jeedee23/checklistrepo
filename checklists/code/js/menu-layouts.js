/**
 * Menu Layouts
 * 
 * This module contains all layout-related functionality:
 * - Layout selection and management
 * - Layout application to checklists
 * - Layout submenu population
 * - Column visibility management
 */

import { sharedState } from './constants.js';
import { showNotification } from './menu-dialogs.js';
import { markSaveDirty } from './data2.js';
import { renderChecklist } from './renderchecklist.js';

/**
 * Apply a layout to the current checklist
 */
export function applyLayoutToChecklist(layout) {
  console.log('[Layout] Applying layout:', layout.layoutName);
  
  // Update current layout with the selected layout
  sharedState.checklistData.layout.columns = { ...layout.columns };
  sharedState.checklistData.layout.rowHeight = layout.rows?.height || 30;
  
  // Handle column order - make sure it exists and is an array
  if (layout.columnOrder && Array.isArray(layout.columnOrder)) {
    sharedState.checklistData.layout.columnOrder = [...layout.columnOrder];
  } else {
    // If no columnOrder, create one based on visible columns
    sharedState.checklistData.layout.columnOrder = Object.keys(layout.columns || {});
  }
  
  // Update the lastlayout property to remember which layout was applied
  sharedState.checklistData.lastlayout = layout.layoutName;
  console.log(`[Layout] Set lastlayout to: ${layout.layoutName}`);
  
  // Update the submenu to reflect any changes
  populateLayoutSubmenu();
  
  // Re-render the checklist with new layout
  renderChecklist();
}

/**
 * Update the last used layout by storing just the layout name
 */
function updateLastUsedLayout(layout) {
  // Simply store the layout name as the last used layout
  if (layout && layout.layoutName) {
    sharedState.checklistData.lastlayout = layout.layoutName;
    console.log('[Layout] Updated lastlayout to:', layout.layoutName);
  } else {
    console.warn('[Layout] Cannot update lastlayout - no layout name provided');
  }
}

/**
 * Show layout selector dialog
 */
export async function showLayoutSelector() {
  try {
    console.log('[Layout Selector] Opening layout selector');
    
    if (!sharedState.checklistData || !sharedState.checklistData.layout) {
      showNotification('error', 'No checklist loaded');
      return;
    }
    
    // Create or get existing modal
    let dialog = document.getElementById('layout-selector-dialog');
    if (!dialog) {
      dialog = document.createElement('div');
      dialog.id = 'layout-selector-dialog';
      dialog.className = 'modal-dialog';
      document.body.appendChild(dialog);
    }
    
    // Get available layouts from current checklist
    const layouts = sharedState.checklistData.layout.layouts || [];
    
    if (layouts.length === 0) {
      showNotification('info', 'No saved layouts found. Create one using "Choose Fields" → "Save as New Layout"');
      return;
    }
    
    // Build the dialog content
    let content = `
      <div class="modal-header">
        <h3>Select Layout</h3>
        <button class="close-btn" onclick="document.getElementById('layout-selector-dialog').style.display='none'">&times;</button>
      </div>
      <div class="modal-body">
        <div class="layout-list">
    `;
    
    // Add each layout as a selectable option
    layouts.forEach((layout, index) => {
      const isFirst = index === 0;
      const visibleFields = Object.keys(layout.columns || {}).filter(key => layout.columns[key].visible);
      
      content += `
        <div class="layout-option ${isFirst ? 'active' : ''}" data-layout-index="${index}">
          <div class="layout-header">
            <input type="radio" name="layout" value="${index}" ${isFirst ? 'checked' : ''} id="layout-${index}">
            <label for="layout-${index}">
              <strong>${layout.layoutName}</strong>
              ${layout.layoutName === sharedState.checklistData.lastlayout ? '<span class="current-badge">Current</span>' : ''}
            </label>
          </div>
          <div class="layout-fields">
            <small>Fields: ${visibleFields.join(', ')}</small>
          </div>
        </div>
      `;
    });
    
    content += `
        </div>
      </div>
      <div class="modal-footer">
        <button id="switch-layout-btn" class="primary-btn">Apply Selected Layout</button>
        <button onclick="document.getElementById('layout-selector-dialog').style.display='none'" class="cancel-btn">Cancel</button>
      </div>
    `;
    
    dialog.innerHTML = content;
    dialog.style.display = 'block';
    
    // Add event listeners
    const switchBtn = document.getElementById('switch-layout-btn');
    if (switchBtn) {
      switchBtn.addEventListener('click', () => {
        const selectedRadio = document.querySelector('input[name="layout"]:checked');
        if (selectedRadio) {
          const selectedIndex = parseInt(selectedRadio.value);
          const selectedLayout = layouts[selectedIndex];
          
          // Apply the layout (this will also update lastused and mark dirty)
          applyLayoutToChecklist(selectedLayout);
          
          // Mark dirty to trigger save
          markSaveDirty(true, sharedState.DIRTY_EVENTS.SELECT_LAYOUT);
          
          showNotification('success', `Applied layout: ${selectedLayout.layoutName}`);
          dialog.style.display = 'none';
        }
      });
    }
    
    // Add click handlers for layout options
    document.querySelectorAll('.layout-option').forEach(option => {
      option.addEventListener('click', (e) => {
        if (e.target.type !== 'radio') {
          const radio = option.querySelector('input[type="radio"]');
          if (radio) {
            radio.checked = true;
          }
        }
      });
    });
    
  } catch (error) {
    console.error('Error showing layout selector:', error);
    showNotification('error', 'Failed to show layout selector');
  }
}

/**
 * Populate the layout submenu with available layouts from current checklist
 */
export function populateLayoutSubmenu() {
  const submenu = document.getElementById('submenu-select-columns');
  if (!submenu) return;
  
  // Clear existing items
  submenu.innerHTML = '';
  
  // Check if we have checklist data
  if (!sharedState.checklistData) {
    submenu.innerHTML = '<li><a href="#" class="disabled">No checklist loaded</a></li>';
    return;
  }
  
  // Try to get layouts from different possible locations
  let layouts = [];
  
  // First try root level layouts array
  if (sharedState.checklistData.layouts && Array.isArray(sharedState.checklistData.layouts)) {
    layouts = sharedState.checklistData.layouts;
    console.log('[Layout Submenu] Found root level layouts:', layouts.length);
  }
  // Then try nested layouts within current layout
  else if (sharedState.checklistData.layout && 
           sharedState.checklistData.layout.layouts && 
           Array.isArray(sharedState.checklistData.layout.layouts)) {
    layouts = sharedState.checklistData.layout.layouts;
    console.log('[Layout Submenu] Found nested layouts:', layouts.length);
  }
  else {
    console.log('[Layout Submenu] No layouts found in checklist data');
  }
  
  if (layouts.length === 0) {
    submenu.innerHTML = '<li><a href="#" class="disabled">No saved layouts</a></li>';
    return;
  }
  
  // Add each layout as a menu item
  layouts.forEach((layout, index) => {
    const li = document.createElement('li');
    const a = document.createElement('a');
    a.href = '#';
    a.textContent = layout.layoutName;
    a.dataset.layoutIndex = index;
    
    // Add current indicator for the lastlayout
    if (layout.layoutName === sharedState.checklistData.lastlayout) {
      a.innerHTML = `${layout.layoutName} <span style="color: #28a745; font-size: 0.8em;">●</span>`;
    }
    
    // Add click handler to apply the layout
    a.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      
      const layoutIndex = parseInt(a.dataset.layoutIndex);
      const selectedLayout = layouts[layoutIndex];
      
      // Apply the layout
      applyLayoutToChecklist(selectedLayout);
      
      // Mark dirty to trigger save
      markSaveDirty(true, sharedState.DIRTY_EVENTS.SELECT_LAYOUT);
      
      showNotification('success', `Applied layout: ${selectedLayout.layoutName}`);
      
      // Close the menu
      document.querySelectorAll('.menu-item').forEach(item => {
        item.classList.remove('active');
      });
    });
    
    li.appendChild(a);
    submenu.appendChild(li);
  });
  
  // Add separator and "Manage Layouts" option
  if (layouts.length > 0) {
    const separator = document.createElement('li');
    separator.className = 'menu-separator';
    submenu.appendChild(separator);
    
    const manageLi = document.createElement('li');
    const manageA = document.createElement('a');
    manageA.href = '#';
    manageA.textContent = 'Manage Layouts...';
    manageA.style.fontStyle = 'italic';
    
    manageA.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      showLayoutSelector();
      
      // Close the menu
      document.querySelectorAll('.menu-item').forEach(item => {
        item.classList.remove('active');
      });
    });
    
    manageLi.appendChild(manageA);
    submenu.appendChild(manageLi);
  }
}

/**
 * Show column visibility menu
 */
export function showColumnVisibilityMenu() {
  try {
    // Import the UI module to show the column visibility menu
    import('./ui-subrender.js').then(uiModule => {
      if (uiModule.showColumnVisibilityMenu) {
        // Center the menu in the window
        const x = window.innerWidth / 2;
        const y = window.innerHeight / 3;
        uiModule.showColumnVisibilityMenu(x, y);
      } else {
        console.error('showColumnVisibilityMenu function not found in ui-subrender.js');
        showNotification('error', 'Column visibility menu not available');
      }
    }).catch(err => {
      console.error('Error importing ui-subrender.js:', err);
      showNotification('error', 'Failed to show column visibility menu');
    });
  } catch (error) {
    console.error('Error showing column visibility menu:', error);
    showNotification('error', 'Failed to show column visibility menu');
  }
}
