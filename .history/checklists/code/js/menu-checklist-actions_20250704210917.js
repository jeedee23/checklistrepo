/**
 * Menu Checklist Actions
 * 
 * This module contains all checklist-related actions including:
 * - Opening/listing checklists
 * - Copy/paste/delete item operations
 * - Search and focus operations
 * - Item manipulation (add same level, sub level, notes)
 */

import { sharedState, WORKER_URL } from './shared-state.js';
import { showNotification } from './menu-dialogs.js';
import { markSaveDirty, getParentArray } from './checklist-core.js';
import { renderChecklist } from './checklist-ui.js';
import { uiAddSameLevel, uiAddSubLevel } from './ui-mainrender.js';
import { openNoteEditor } from './data-notes.js';
import { applyColor } from './styles-manage.js';

/**
 * Display a dropdown list of available checklists
 * Called when clicking on File | Open in the menu
 */
export async function showChecklistsList() {
  try {
    // Show loading indicator in a dropdown
    const openMenuItem = document.getElementById('menu-file-open');
    if (!openMenuItem) {
      console.error('Cannot find menu-file-open element');
      return;
    }
    
    // Get position for dropdown
    const rect = openMenuItem.getBoundingClientRect();
    const menuLeft = rect.right;
    const menuTop = rect.bottom;
    
    // Create or get existing dropdown
    let dropdown = document.getElementById('checklists-dropdown');
    if (!dropdown) {
      dropdown = document.createElement('div');
      dropdown.id = 'checklists-dropdown';
      dropdown.className = 'checklists-dropdown';
      document.body.appendChild(dropdown);
    }
    
    // Position the dropdown
    dropdown.style.position = 'absolute';
    dropdown.style.left = `${menuLeft}px`;
    dropdown.style.top = `${menuTop}px`;
    dropdown.style.display = 'block';
    dropdown.style.zIndex = '1000';
    dropdown.style.background = '#fff';
    dropdown.style.boxShadow = '0 2px 10px rgba(0,0,0,0.2)';
    dropdown.style.border = '1px solid #ccc';
    dropdown.style.maxHeight = '400px';
    dropdown.style.overflowY = 'auto';
    dropdown.style.minWidth = '300px';
    
    // Show loading indicator
    dropdown.innerHTML = '<div style="padding:10px; text-align:center;">Loading checklists...</div>';
    
    // Import the data module and directly fetch the checklist files
    const dataModule = await import('./data.js');
    
    // Fetch the checklist files
    let jsonFiles = [];
    try {
      const res = await fetch(`${WORKER_URL}?list=checklists`);
      if (!res.ok) throw new Error('Failed to fetch checklist list');
      const files = await res.json();
      
      // Keep only timestamped JSONs
      jsonFiles = files.filter(f =>
        f.name.endsWith('.json') &&
        /^\d{4}_\d{2}_\d{2}_@_\d{2}-\d{2}-\d{2}/.test(f.name) &&
        !f.path.startsWith('checklists/config/')
      );
      
      console.log('Found checklists:', jsonFiles.length);
    } catch (err) {
      console.error('Failed to fetch checklist list:', err);
      showNotification('error', 'Failed to load checklists');
    }
    
    // Try to get user data for sorting
    let userEntries = [];
    try {
      const usersRes = await fetch(`${WORKER_URL}?file=checklists/config/users.json`);
      if (usersRes.ok) {
        const usersConfig = await usersRes.json();
        const currentUserEntry = usersConfig.users.find(
          u => u.username?.toLowerCase() === sharedState.currentUser?.toLowerCase()
        );
        userEntries = currentUserEntry?.checklists || [];
      }
    } catch (err) {
      console.warn('Could not fetch user data for sorting checklists:', err);
    }
    
    // Sort files: recently accessed first
    jsonFiles.sort((a, b) => {
      const aEntry = userEntries.find(e => e.id === a.name);
      const bEntry = userEntries.find(e => e.id === b.name);
      
      if (aEntry && bEntry) {
        return new Date(bEntry.lastAccessed) - new Date(aEntry.lastAccessed);
      }
      if (aEntry) return -1;
      if (bEntry) return 1;
      return a.name.localeCompare(b.name);
    });
    
    // Build the dropdown content
    let content = `
      <div class="dropdown-header" style="padding:8px; background:#f5f5f5; border-bottom:1px solid #ddd; font-weight:bold;">
        Available Checklists
      </div>
      <div class="dropdown-search" style="padding:8px; border-bottom:1px solid #eee;">
        <input type="text" id="checklist-search" placeholder="Filter checklists..." 
               style="width:100%; padding:5px; border:1px solid #ccc; border-radius:3px;">
      </div>
      <ul class="dropdown-list" style="list-style:none; margin:0; padding:0;">
    `;
    
    if (jsonFiles.length === 0) {
      content += '<li style="padding:10px; text-align:center; color:#888;">No checklists found</li>';
    } else {
      jsonFiles.forEach(file => {
        // Format the checklist name for display
        let displayName = file.name
          .replace(/^\d{4}_\d{2}_\d{2}_@_\d{2}-\d{2}-\d{2}[_\s-]*/, '')
          .replace(/\.json$/, '')
          .replace(/_/g, ' ');
          
        // Show timestamp in a readable format  
        const timestamp = file.name.match(/^(\d{4}_\d{2}_\d{2})_@_(\d{2}-\d{2}-\d{2})/);
        let dateStr = '';
        if (timestamp) {
          const [_, date, time] = timestamp;
          dateStr = date.replace(/_/g, '-') + ' ' + time.replace(/-/g, ':');
        }
        
        // Show last accessed info if available
        const userInfo = userEntries.find(e => e.id === file.name);
        if (userInfo && userInfo.lastAccessed) {
          const lastOpened = new Date(userInfo.lastAccessed);
          const now = new Date();
          const diffDays = Math.floor((now - lastOpened) / (1000 * 60 * 60 * 24));
          
          if (diffDays === 0) {
            dateStr += ' (Today)';
          } else if (diffDays === 1) {
            dateStr += ' (Yesterday)';
          } else {
            dateStr += ` (${diffDays} days ago)`;
          }
        }
          
        content += `
          <li class="checklist-item" data-path="${file.path}" style="padding:8px; border-bottom:1px solid #eee; cursor:pointer;">
            <div style="font-weight:bold;">${displayName}</div>
            <div style="font-size:0.8em; color:#888;">${dateStr}</div>
          </li>
        `;
      });
    }
    
    content += '</ul>';
    dropdown.innerHTML = content;
    
    // Add event listener for search filtering
    const searchInput = dropdown.querySelector('#checklist-search');
    if (searchInput) {
      searchInput.focus();
      searchInput.addEventListener('input', (e) => {
        const filter = e.target.value.toLowerCase();
        const items = dropdown.querySelectorAll('.checklist-item');
        items.forEach(item => {
          const text = item.textContent.toLowerCase();
          if (text.includes(filter)) {
            item.style.display = 'block';
          } else {
            item.style.display = 'none';
          }
        });
      });
    }
    
    // Add event listeners for clicking on checklist items
    const items = dropdown.querySelectorAll('.checklist-item');
    items.forEach(item => {
      item.addEventListener('click', async () => {
        const path = item.getAttribute('data-path');
        if (path) {
          // Close the dropdown
          dropdown.style.display = 'none';
          
          // Check if there are unsaved changes
          if (sharedState.isDirty) {
            const confirmed = confirm('You have unsaved changes. Load this checklist anyway?');
            if (!confirmed) return;
          }
          
          // Load the selected checklist
          try {
            await dataModule.loadChecklist(path);
            
            // Show a success notification
            showNotification('success', `Loaded checklist: ${path.split('/').pop()}`);
          } catch (err) {
            console.error('Failed to load checklist:', err);
            showNotification('error', `Failed to load checklist: ${err.message}`);
          }
        }
      });
    });
    
    // Close when clicking outside
    document.addEventListener('click', function closeDropdown(e) {
      if (!dropdown.contains(e.target) && e.target !== openMenuItem) {
        dropdown.style.display = 'none';
        document.removeEventListener('click', closeDropdown);
      }
    });
    
  } catch (error) {
    console.error('Error showing checklists dropdown:', error);
    showNotification('error', 'Failed to load checklists list');
  }
}

/**
 * Focus the search box for finding items
 */
export function focusSearchBox() {
  const searchBox = document.getElementById('searchInput');
  if (searchBox) {
    searchBox.focus();
    searchBox.select();
  }
}

/**
 * Copy the currently selected item
 */
export function copySelectedItem() {
  if (!sharedState.selectedItem) {
    showNotification('error', 'No item selected');
    return;
  }
  
  try {
    // Store the item in localStorage for simplicity
    localStorage.setItem('clipboard_item', JSON.stringify(sharedState.selectedItem));
    showNotification('success', 'Item copied to clipboard');
  } catch (err) {
    console.error('Failed to copy item:', err);
    showNotification('error', 'Failed to copy item');
  }
}

/**
 * Paste the previously copied item
 */
export function pasteItem() {
  try {
    const clipboardData = localStorage.getItem('clipboard_item');
    if (!clipboardData) {
      showNotification('error', 'Nothing to paste');
      return;
    }
    
    const item = JSON.parse(clipboardData);
    
    if (!sharedState.selectedItem || !sharedState.selectedPath) {
      // If no selection, add to root
      sharedState.checklistData.items.push(JSON.parse(JSON.stringify(item)));
    } else {
      // Add after the selected item
      const parentArray = getParentArray(sharedState.selectedPath);
      const idx = sharedState.selectedPath[sharedState.selectedPath.length - 1] - 1;
      parentArray.splice(idx + 1, 0, JSON.parse(JSON.stringify(item)));
    }
    
    markSaveDirty(true, sharedState.DIRTY_EVENTS.PASTE_ITEM);
    renderChecklist();
    showNotification('success', 'Item pasted');
  } catch (err) {
    console.error('Failed to paste item:', err);
    showNotification('error', 'Failed to paste item');
  }
}

/**
 * Delete the currently selected item
 */
export function deleteSelectedItem() {
  if (!sharedState.selectedItem || !sharedState.selectedPath) {
    showNotification('error', 'No item selected');
    return;
  }
  
  if (!confirm('Are you sure you want to delete this item?')) {
    return;
  }
  
  try {
    const parentArray = getParentArray(sharedState.selectedPath);
    const idx = sharedState.selectedPath[sharedState.selectedPath.length - 1] - 1;
    parentArray.splice(idx, 1);
    sharedState.selectedItem = null;
    sharedState.selectedPath = null;
    markSaveDirty(true, sharedState.DIRTY_EVENTS.DELETE_ITEM);
    renderChecklist();
    showNotification('success', 'Item deleted');
  } catch (err) {
    console.error('Failed to delete item:', err);
    showNotification('error', 'Failed to delete item');
  }
}

/**
 * Add a new item at the same level as the currently selected item
 */
export function addSameLevel() {
  if (!sharedState.selectedItem) {
    showNotification('error', 'No item selected');
    return;
  }
  uiAddSameLevel();
}

/**
 * Add a new item as a sub-item of the currently selected item
 */
export function addSubLevel() {
  if (!sharedState.selectedItem) {
    showNotification('error', 'No item selected');
    return;
  }
  uiAddSubLevel();
}

/**
 * Add a note to the currently selected item
 */
export function addNote() {
  if (!sharedState.selectedItem) {
    showNotification('error', 'No item selected');
    return;
  }
  openNoteEditor();
}

/**
 * Open a color picker dialog
 */
export function openColorPicker() {
  const color = prompt('Enter a color value (hex, rgb, or name):', '#ff0000');
  if (color) {
    applyColor(color);
  }
}

/**
 * Convert color name to RGBA values
 */
export function getColorValues(colorName) {
  const colorMap = {
    'red': '255,0,0,1',
    'green': '0,128,0,1',
    'blue': '0,0,255,1',
    'black': '0,0,0,1',
    'gray': '128,128,128,1',
    'orange': '255,165,0,1',
    'purple': '128,0,128,1',
    'custom': '0,0,0,1' // Default for custom
  };
  return colorMap[colorName] || '0,0,0,1';
}

/**
 * Add a file to the currently selected item
 */
export function addFile() {
  if (!sharedState.selectedItem) {
    showNotification('error', 'No item selected');
    return;
  }
  /** Here needs to come an implementation which let's select the user a file. 
   * In the previous version, the file was mentioned at the bottom of the checklist
   * However this must be done with an icon. Accepted files are ALL files which can be viewed in a standard browser
   * images png,jpg,gif (icon camera). pdf's (icon pdf)
   * just like the addNote, the icon will be added to the item, and the file will be stored on github 
   * in the /files directory. */
}

/**
 * Add a link to the currently selected item
 */
export function addLink() {
  if (!sharedState.selectedItem) {
    showNotification('error', 'No item selected');
    return;
  }
  //** If a user pastes a link, the icon will become a link icon, 
  // and the pop-up will ask for the text and the item will be shown as a blue underlined link. 
  // the text should normally contain the 'no' field. the input box should by default have the checklist ID (to implement in the json)
  // Then a "-" and then the 'no' field and then a'-' after which the user should fill in. Should he change the complete text, that is no problem
  // we simply give a hint  */
}

/**
 * Adjust zoom level
 */
export function adjustZoom(delta) {
  const currentZoom = parseFloat(document.documentElement.style.zoom || 1);
  const newZoom = Math.max(0.5, Math.min(2.0, currentZoom + delta));
  document.documentElement.style.zoom = newZoom;
  showNotification('info', `Zoom: ${Math.round(newZoom * 100)}%`);
}

/**
 * Reset zoom to 100%
 */
export function resetZoom() {
  document.documentElement.style.zoom = 1;
  showNotification('info', 'Zoom reset to 100%');
}
