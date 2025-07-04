/**
 * Menu Checklist Actions
 * 
 * This module contains all checklist-related actions including:
 * - Opening/listing checklists
 * - Copy/paste/delete item operations
 * - Search and focus operations
 * - Item manipulation (add same level, sub level, notes)
 */

import { sharedState, WORKER_URL } from './constants.js';
import { showNotification } from './menu-dialogs.js';
import { markSaveDirty, getParentArray } from './data2.js';
import { renderChecklist } from './renderchecklist.js';
import { addNote } from './data-notes.js';
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
  
  if (!sharedState.selectedPath || sharedState.selectedPath.length === 0) {
    showNotification('error', 'Invalid selection path');
    return;
  }
  
  try {
    // Create a new item
    const newItem = {
      text: 'New Item',
      checked: false,
      items: []
    };
    
    // Get the parent array and current position
    const parentArray = getParentArray(sharedState.selectedPath);
    const currentIndex = sharedState.selectedPath[sharedState.selectedPath.length - 1] - 1;
    
    // Insert the new item after the current item
    parentArray.splice(currentIndex + 1, 0, newItem);
    
    // Mark as dirty and re-render
    markSaveDirty(true, sharedState.DIRTY_EVENTS.ADD_ITEM);
    renderChecklist();
    
    showNotification('success', 'New item added at same level');
  } catch (err) {
    console.error('Failed to add item at same level:', err);
    showNotification('error', 'Failed to add item at same level');
  }
}

/**
 * Add a new item as a sub-item of the currently selected item
 */
export function addSubLevel() {
  if (!sharedState.selectedItem) {
    showNotification('error', 'No item selected');
    return;
  }
  
  try {
    // Create a new item
    const newItem = {
      text: 'New Sub Item',
      checked: false,
      items: []
    };
    
    // Ensure the selected item has an items array
    if (!sharedState.selectedItem.items) {
      sharedState.selectedItem.items = [];
    }
    
    // Add the new item as a sub-item
    sharedState.selectedItem.items.push(newItem);
    
    // Mark as dirty and re-render
    markSaveDirty(true, sharedState.DIRTY_EVENTS.ADD_ITEM);
    renderChecklist();
    
    showNotification('success', 'New sub-item added');
  } catch (err) {
    console.error('Failed to add sub-item:', err);
    showNotification('error', 'Failed to add sub-item');
  }
}

/**
 * Add a note to the currently selected item
 */
export function handleAddNote() {
  if (!sharedState.selectedItem) {
    showNotification('error', 'No item selected');
    return;
  }
  addNote();
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
  
  // Create a file input element
  const fileInput = document.createElement('input');
  fileInput.type = 'file';
  fileInput.accept = 'image/*,application/pdf,text/*,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.zip,.rar,.mp4,.mp3,.wav,.avi,.mov,.wmv,.rtf,.odt,.ods,.odp,.step,.stp,.dwg,.dxf,.json,.xml,.csv,.html,.htm,.js,.css,.md,.txt';
  fileInput.style.display = 'none';
  
  fileInput.onchange = async function(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    // Check file size (limit to 25MB for GitHub)
    if (file.size > 25 * 1024 * 1024) {
      showNotification('error', 'File size exceeds 25MB limit');
      return;
    }
    
    try {
      // Generate filename with timestamp to avoid conflicts
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const filename = `${timestamp}_${file.name}`;
      
      // Add file to the checklist data immediately (optimistic update)
      if (!sharedState.selectedItem.files) {
        sharedState.selectedItem.files = [];
      }
      
      sharedState.selectedItem.files.push({
        name: file.name,
        path: `checklists/files/${filename}`,
        uploadedBy: sharedState.currentUser || 'Unknown',
        uploadedAt: new Date().toISOString()
      });
      
      // Mark as dirty and re-render immediately
      markSaveDirty(true, sharedState.DIRTY_EVENTS.ADD_FILE);
      renderChecklist();
      
      // Show initial notification
      showNotification('info', `File "${file.name}" added to checklist. Uploading to server...`);
      
      // Convert file to base64 for upload
      const reader = new FileReader();
      reader.onload = async function(e) {
        const base64Data = e.target.result.split(',')[1]; // Remove data:mime;base64, prefix
        
        // Upload to GitHub using worker
        const worker = new Worker('js/github-worker.js');
        
        worker.postMessage({
          action: 'uploadFile',
          path: `checklists/files/${filename}`,
          content: base64Data,
          message: `Add file: ${file.name}`
        });
        
        worker.onmessage = function(e) {
          if (e.data.success) {
            showNotification('success', `File "${file.name}" uploaded successfully`);
          } else {
            showNotification('error', `Failed to upload file: ${e.data.error}`);
            // Optionally remove the file from the checklist if upload failed
            // This is a design decision - keep it for now since user can retry save
          }
          worker.terminate();
        };
        
        worker.onerror = function(error) {
          showNotification('error', `Upload failed: ${error.message}`);
          worker.terminate();
        };
      };
      
      reader.readAsDataURL(file);
      
    } catch (error) {
      showNotification('error', `Failed to process file: ${error.message}`);
    }
  };
  
  // Trigger file selection
  document.body.appendChild(fileInput);
  fileInput.click();
  document.body.removeChild(fileInput);
}

/**
 * Get an appropriate icon for a file type
 * @param {string} mimeType - The MIME type of the file
 * @param {string} fileName - The name of the file
 * @returns {string} - SVG icon or emoji
 */
function getFileTypeIcon(mimeType, fileName) {
  const extension = fileName.split('.').pop().toLowerCase();
  
  // Return inline SVG icons for better consistency
  if (mimeType.startsWith('image/')) {
    return `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
      <circle cx="8.5" cy="8.5" r="1.5"/>
      <polyline points="21,15 16,10 5,21"/>
    </svg>`;
  }
  
  if (mimeType === 'application/pdf') {
    return `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <path d="M14,2H6A2,2 0 0,0 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V8L14,2M18,20H6V4H13V9H18V20Z"/>
    </svg>`;
  }
  
  if (mimeType.startsWith('text/') || ['txt', 'md', 'rtf'].includes(extension)) {
    return `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <path d="M14,2H6A2,2 0 0,0 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V8L14,2M18,20H6V4H13V9H18V20Z"/>
      <path d="M8,12H16M8,16H16M8,8H12"/>
    </svg>`;
  }
  
  if (['doc', 'docx'].includes(extension)) {
    return `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <path d="M14,2H6A2,2 0 0,0 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V8L14,2M18,20H6V4H13V9H18V20Z"/>
      <path d="M8,12H16M8,16H12"/>
    </svg>`;
  }
  
  if (['xls', 'xlsx'].includes(extension)) {
    return `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <path d="M14,2H6A2,2 0 0,0 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V8L14,2M18,20H6V4H13V9H18V20Z"/>
      <path d="M8,10H16M8,14H16M8,18H16"/>
    </svg>`;
  }
  
  if (['ppt', 'pptx'].includes(extension)) {
    return `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <path d="M14,2H6A2,2 0 0,0 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V8L14,2M18,20H6V4H13V9H18V20Z"/>
      <rect x="8" y="12" width="8" height="4"/>
    </svg>`;
  }
  
  if (['zip', 'rar', '7z'].includes(extension)) {
    return `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <path d="M16,10H20A2,2 0 0,1 22,12V20A2,2 0 0,1 20,22H4A2,2 0 0,1 2,20V12A2,2 0 0,1 4,10H8V8A2,2 0 0,1 10,6H14A2,2 0 0,1 16,8V10Z"/>
      <path d="M8,10V8M16,10V8"/>
    </svg>`;
  }
  
  if (mimeType.startsWith('video/')) {
    return `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <polygon points="5,3 19,12 5,21 5,3"/>
    </svg>`;
  }
  
  if (mimeType.startsWith('audio/')) {
    return `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <polygon points="11,5 6,9 2,9 2,15 6,15 11,19 11,5"/>
    </svg>`;
  }
  
  if (['step', 'stp', 'dwg', 'dxf'].includes(extension)) {
    return `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <path d="M12,2L2,7V17L12,22L22,17V7L12,2Z"/>
      <path d="M12,22V12L2,7"/>
      <path d="M22,7L12,12"/>
    </svg>`;
  }
  
  // Default file icon
  return `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
    <path d="M14,2H6A2,2 0 0,0 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V8L14,2M18,20H6V4H13V9H18V20Z"/>
  </svg>`;
}

/**
 * Add a link to the currently selected item
 */
export function addLink() {
  if (!sharedState.selectedItem) {
    showNotification('error', 'No item selected');
    return;
  }
  
  // Create a modal for link input
  const modal = document.createElement('div');
  modal.className = 'modal';
  modal.innerHTML = `
    <div class="modal-content">
      <span class="close">&times;</span>
      <h2>Add Link</h2>
      <div class="form-group">
        <label for="linkUrl">URL:</label>
        <input type="url" id="linkUrl" placeholder="https://example.com" required>
      </div>
      <div class="form-group">
        <label for="linkText">Display Text:</label>
        <input type="text" id="linkText" placeholder="Link description" required>
      </div>
      <div class="form-buttons">
        <button type="button" id="cancelLink">Cancel</button>
        <button type="button" id="addLinkBtn">Add Link</button>
      </div>
    </div>
  `;
  
  document.body.appendChild(modal);
  
  // Set default text based on checklist ID and item number
  const linkTextInput = modal.querySelector('#linkText');
  const checklistId = sharedState.currentChecklist?.id || 'CHK';
  const itemNo = sharedState.selectedItem?.no || '001';
  linkTextInput.value = `${checklistId}-${itemNo}-`;
  
  // Focus on URL input
  const urlInput = modal.querySelector('#linkUrl');
  urlInput.focus();
  
  // Handle close button
  modal.querySelector('.close').onclick = function() {
    document.body.removeChild(modal);
  };
  
  // Handle cancel button
  modal.querySelector('#cancelLink').onclick = function() {
    document.body.removeChild(modal);
  };
  
  // Handle add link button
  modal.querySelector('#addLinkBtn').onclick = function() {
    const url = urlInput.value.trim();
    const text = linkTextInput.value.trim();
    
    if (!url || !text) {
      showNotification('error', 'Both URL and display text are required');
      return;
    }
    
    // Validate URL format
    try {
      new URL(url);
    } catch (e) {
      showNotification('error', 'Please enter a valid URL');
      return;
    }
    
    // Add link attachment to the item
    if (!sharedState.selectedItem.attachments) {
      sharedState.selectedItem.attachments = [];
    }
    
    sharedState.selectedItem.attachments.push({
      type: 'link',
      url: url,
      text: text,
      icon: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/>
        <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>
      </svg>`,
      addDate: new Date().toISOString()
    });
    
    markSaveDirty(true, sharedState.DIRTY_EVENTS.ADD_FILE); // Use same event type as files
    showNotification('success', `Link "${text}" added successfully`);
    
    // Re-render the item to show the new link
    renderChecklist();
    
    // Close modal
    document.body.removeChild(modal);
  };
  
  // Close modal when clicking outside
  modal.onclick = function(event) {
    if (event.target === modal) {
      document.body.removeChild(modal);
    }
  };
  
  // Handle Enter key in inputs
  urlInput.addEventListener('keypress', function(event) {
    if (event.key === 'Enter') {
      linkTextInput.focus();
    }
  });
  
  linkTextInput.addEventListener('keypress', function(event) {
    if (event.key === 'Enter') {
      modal.querySelector('#addLinkBtn').click();
    }
  });
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
