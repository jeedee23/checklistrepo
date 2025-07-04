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
    
    markSaveDirty(true, 'PASTE_ITEM');
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
    markSaveDirty(true, 'DELETE_ITEM');
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
    markSaveDirty(true, 'ADD_ITEM');
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
  
  // Create a hidden file input element
  const fileInput = document.createElement('input');
  fileInput.type = 'file';
  fileInput.accept = '.png,.jpg,.jpeg,.gif,.pdf,.txt,.html,.css,.js,.json,.xml,.svg,.webp,.bmp,.ico,.doc,.docx,.xls,.xlsx,.ppt,.pptx';
  fileInput.multiple = false;
  fileInput.style.display = 'none';
  
  // Add event listener for file selection
  fileInput.addEventListener('change', async (event) => {
    const file = event.target.files[0];
    if (!file) return;
    
    try {
      // Show loading notification
      showNotification('info', `Uploading ${file.name}...`);
      
      // Read file as base64
      const dataUrl = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
      
      const base64 = dataUrl.split(',')[1];
      
      // Generate timestamped filename to avoid conflicts
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
      const fileName = `${timestamp}_${file.name}`;
      const uploadPath = `checklists/files/${fileName}`;
      
      // Upload to GitHub via worker
      const payload = {
        file: uploadPath,
        content: base64,
        encoding: 'base64',
        message: `Upload file: ${file.name}`
      };
      
      const res = await fetch(`${WORKER_URL}/save`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      
      if (!res.ok) {
        throw new Error(`Upload failed: ${res.status} ${res.statusText}`);
      }
      
      // Determine file type and get custom icon
      const ext = file.name.split('.').pop().toLowerCase();
      let fileType = 'file';
      
      if (['png', 'jpg', 'jpeg', 'gif', 'svg', 'webp', 'bmp', 'ico'].includes(ext)) {
        fileType = 'image';
      } else if (ext === 'pdf') {
        fileType = 'pdf';
      } else if (['txt', 'html', 'css', 'js', 'json', 'xml'].includes(ext)) {
        fileType = 'text';
      } else if (['doc', 'docx'].includes(ext)) {
        fileType = 'document';
      } else if (['xls', 'xlsx'].includes(ext)) {
        fileType = 'spreadsheet';
      } else if (['ppt', 'pptx'].includes(ext)) {
        fileType = 'presentation';
      } else if (['zip', 'rar', '7z', 'tar', 'gz'].includes(ext)) {
        fileType = 'archive';
      } else if (['mp4', 'avi', 'mkv', 'mov', 'wmv', 'flv', 'webm'].includes(ext)) {
        fileType = 'video';
      } else if (['mp3', 'wav', 'flac', 'aac', 'ogg', 'wma'].includes(ext)) {
        fileType = 'audio';
      } else if (['step', 'stp'].includes(ext)) {
        fileType = 'step';
      }
      
      // Generate custom inline icon
      const icon = getFileTypeIcon(fileType, ext);
      
      // Attach file reference to the selected item
      if (!sharedState.selectedItem.attachments) {
        sharedState.selectedItem.attachments = [];
      }
      
      sharedState.selectedItem.attachments.push({
        fileName: file.name,
        filePath: uploadPath,
        fileType: fileType,
        fileSize: file.size,
        uploadDate: new Date().toISOString(),
        icon: icon
      });
      
      // Mark as dirty and re-render
      markSaveDirty(true, sharedState.DIRTY_EVENTS.ADD_FILE);
      renderChecklist();
      
      showNotification('success', `✅ Uploaded and attached ${file.name}`);
      
    } catch (error) {
      console.error('File upload failed:', error);
      showNotification('error', `Failed to upload ${file.name}: ${error.message}`);
    } finally {
      // Clean up the file input
      document.body.removeChild(fileInput);
    }
  });
  
  // Add to DOM and trigger file selection
  document.body.appendChild(fileInput);
  fileInput.click();
}

/**
 * Add a link to the currently selected item
 */
export function addLink() {
  if (!sharedState.selectedItem) {
    showNotification('error', 'No item selected');
    return;
  }
  
  // Create a modal dialog to collect link information
  const modal = document.createElement('div');
  modal.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0, 0, 0, 0.5);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000;
  `;
  
  const dialog = document.createElement('div');
  dialog.style.cssText = `
    background: white;
    padding: 2rem;
    border-radius: 8px;
    max-width: 500px;
    width: 90%;
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
  `;
  
  // Generate default text: checklistID-itemNo-
  const checklistId = sharedState.checklistData?.id || 'checklist';
  const itemNo = sharedState.selectedItem.no || '1';
  const defaultText = `${checklistId}-${itemNo}-`;
  
  dialog.innerHTML = `
    <h3>Add Link to Item</h3>
    <div style="margin-bottom: 1rem;">
      <label style="display: block; margin-bottom: 0.5rem;">Link URL:</label>
      <input type="url" id="linkUrl" placeholder="https://example.com" style="width: 100%; padding: 0.5rem; border: 1px solid #ddd; border-radius: 4px;">
    </div>
    <div style="margin-bottom: 1rem;">
      <label style="display: block; margin-bottom: 0.5rem;">Link Text:</label>
      <input type="text" id="linkText" value="${defaultText}" style="width: 100%; padding: 0.5rem; border: 1px solid #ddd; border-radius: 4px;">
      <small style="color: #666;">Default format: checklistID-itemNo- (you can modify this)</small>
    </div>
    <div style="display: flex; gap: 1rem; justify-content: flex-end;">
      <button id="cancelLink" style="padding: 0.5rem 1rem; background: #f44336; color: white; border: none; border-radius: 4px; cursor: pointer;">Cancel</button>
      <button id="addLinkBtn" style="padding: 0.5rem 1rem; background: #4CAF50; color: white; border: none; border-radius: 4px; cursor: pointer;">Add Link</button>
    </div>
  `;
  
  modal.appendChild(dialog);
  document.body.appendChild(modal);
  
  // Focus on URL input
  setTimeout(() => document.getElementById('linkUrl').focus(), 100);
  
  // Event handlers
  document.getElementById('cancelLink').onclick = () => {
    document.body.removeChild(modal);
  };
  
  document.getElementById('addLinkBtn').onclick = () => {
    const url = document.getElementById('linkUrl').value.trim();
    const text = document.getElementById('linkText').value.trim();
    
    if (!url) {
      showNotification('error', 'Please enter a URL');
      return;
    }
    
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      showNotification('error', 'URL must start with http:// or https://');
      return;
    }
    
    if (!text) {
      showNotification('error', 'Please enter link text');
      return;
    }
    
    // Add link to the selected item
    if (!sharedState.selectedItem.links) {
      sharedState.selectedItem.links = [];
    }
    
    sharedState.selectedItem.links.push({
      url: url,
      text: text,
      addedDate: new Date().toISOString()
    });
    
    // Mark as dirty and re-render
    markSaveDirty(true, sharedState.DIRTY_EVENTS.EDIT_ITEM);
    renderChecklist();
    
    showNotification('success', `✅ Added link: ${text}`);
    document.body.removeChild(modal);
  };
  
  // Handle Enter key
  document.getElementById('linkUrl').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      document.getElementById('linkText').focus();
    }
  });
  
  document.getElementById('linkText').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      document.getElementById('addLinkBtn').click();
    }
  });
  
  // Handle ESC key
  document.addEventListener('keydown', function escHandler(e) {
    if (e.key === 'Escape') {
      document.body.removeChild(modal);
      document.removeEventListener('keydown', escHandler);
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

/**
 * File type icon generation using inline SVG data URLs
 */
function getFileTypeIcon(fileType, extension) {
  // Create SVG icons as data URLs for better customization
  const iconSize = 16; // 16x16 pixels
  
  const createSVGIcon = (content, color = '#666') => {
    const svg = `
      <svg width="${iconSize}" height="${iconSize}" viewBox="0 0 ${iconSize} ${iconSize}" xmlns="http://www.w3.org/2000/svg">
        <rect width="${iconSize}" height="${iconSize}" fill="${color}" rx="2" opacity="0.1"/>
        ${content}
      </svg>
    `.trim();
    return `data:image/svg+xml;base64,${btoa(svg)}`;
  };
  
  switch (fileType) {
    case 'image':
      return createSVGIcon(`
        <rect x="2" y="3" width="12" height="9" fill="#4CAF50" rx="1"/>
        <circle cx="5" cy="6" r="1" fill="#fff"/>
        <polygon points="2,10 6,7 8,9 12,5 14,7 14,12 2,12" fill="#fff"/>
      `, '#4CAF50');
      
    case 'pdf':
      return createSVGIcon(`
        <rect x="3" y="2" width="8" height="12" fill="#F44336" rx="1"/>
        <rect x="4" y="5" width="6" height="1" fill="#fff"/>
        <rect x="4" y="7" width="6" height="1" fill="#fff"/>
        <rect x="4" y="9" width="4" height="1" fill="#fff"/>
        <text x="8" y="12" text-anchor="middle" fill="#fff" font-size="3" font-weight="bold">PDF</text>
      `, '#F44336');
      
    case 'text':
      return createSVGIcon(`
        <rect x="3" y="2" width="8" height="12" fill="#2196F3" rx="1"/>
        <rect x="4" y="4" width="6" height="0.5" fill="#fff"/>
        <rect x="4" y="6" width="6" height="0.5" fill="#fff"/>
        <rect x="4" y="8" width="6" height="0.5" fill="#fff"/>
        <rect x="4" y="10" width="4" height="0.5" fill="#fff"/>
      `, '#2196F3');
      
    case 'document':
      return createSVGIcon(`
        <rect x="3" y="2" width="8" height="12" fill="#1976D2" rx="1"/>
        <rect x="4" y="4" width="6" height="0.5" fill="#fff"/>
        <rect x="4" y="6" width="6" height="0.5" fill="#fff"/>
        <rect x="4" y="8" width="5" height="0.5" fill="#fff"/>
        <text x="8" y="12.5" text-anchor="middle" fill="#fff" font-size="2.5" font-weight="bold">DOC</text>
      `, '#1976D2');
      
    case 'spreadsheet':
      return createSVGIcon(`
        <rect x="2" y="3" width="12" height="10" fill="#4CAF50" rx="1"/>
        <rect x="3" y="4" width="10" height="8" fill="#fff"/>
        <line x1="3" y1="6" x2="13" y2="6" stroke="#4CAF50" stroke-width="0.5"/>
        <line x1="3" y1="8" x2="13" y2="8" stroke="#4CAF50" stroke-width="0.5"/>
        <line x1="3" y1="10" x2="13" y2="10" stroke="#4CAF50" stroke-width="0.5"/>
        <line x1="6" y1="4" x2="6" y2="12" stroke="#4CAF50" stroke-width="0.5"/>
        <line x1="10" y1="4" x2="10" y2="12" stroke="#4CAF50" stroke-width="0.5"/>
      `, '#4CAF50');
      
    case 'presentation':
      return createSVGIcon(`
        <rect x="2" y="3" width="12" height="9" fill="#FF9800" rx="1"/>
        <rect x="3" y="4" width="10" height="7" fill="#fff"/>
        <rect x="4" y="5" width="3" height="2" fill="#FF9800"/>
        <rect x="8" y="5" width="4" height="0.5" fill="#FF9800"/>
        <rect x="8" y="6.5" width="3" height="0.5" fill="#FF9800"/>
        <rect x="4" y="8" width="8" height="0.5" fill="#FF9800"/>
        <rect x="4" y="9.5" width="6" height="0.5" fill="#FF9800"/>
      `, '#FF9800');
      
    case 'archive':
      return createSVGIcon(`
        <rect x="2" y="4" width="12" height="8" fill="#795548" rx="1"/>
        <rect x="3" y="3" width="10" height="2" fill="#8D6E63" rx="1"/>
        <circle cx="8" cy="8" r="2" fill="#fff"/>
        <rect x="7" y="7" width="2" height="2" fill="#795548"/>
      `, '#795548');
      
    case 'video':
      return createSVGIcon(`
        <rect x="2" y="4" width="12" height="8" fill="#9C27B0" rx="1"/>
        <polygon points="6,6 6,10 10,8" fill="#fff"/>
      `, '#9C27B0');
      
    case 'audio':
      return createSVGIcon(`
        <rect x="2" y="4" width="12" height="8" fill="#E91E63" rx="1"/>
        <circle cx="6" cy="8" r="1.5" fill="#fff"/>
        <path d="M8 6 Q10 6 10 8 Q10 10 8 10" stroke="#fff" stroke-width="1" fill="none"/>
        <path d="M10 5 Q13 5 13 8 Q13 11 10 11" stroke="#fff" stroke-width="1" fill="none"/>
      `, '#E91E63');
      
    case 'step':
      return createSVGIcon(`
        <rect x="2" y="3" width="12" height="10" fill="#607D8B" rx="1"/>
        <rect x="3" y="4" width="10" height="8" fill="#fff"/>
        <rect x="4" y="5" width="2" height="2" fill="#607D8B"/>
        <rect x="7" y="5" width="2" height="2" fill="#607D8B"/>
        <rect x="10" y="5" width="2" height="2" fill="#607D8B"/>
        <rect x="4" y="8" width="2" height="2" fill="#607D8B"/>
        <rect x="7" y="8" width="2" height="2" fill="#607D8B"/>
        <rect x="10" y="8" width="2" height="2" fill="#607D8B"/>
        <text x="8" y="12.5" text-anchor="middle" fill="#607D8B" font-size="2" font-weight="bold">STEP</text>
      `, '#607D8B');
      
    default:
      return createSVGIcon(`
        <rect x="3" y="2" width="8" height="12" fill="#666" rx="1"/>
        <rect x="4" y="4" width="6" height="0.5" fill="#fff"/>
        <rect x="4" y="6" width="6" height="0.5" fill="#fff"/>
        <rect x="4" y="8" width="4" height="0.5" fill="#fff"/>
        <circle cx="8" cy="11" r="1" fill="#fff"/>
      `, '#666');
  }
}
