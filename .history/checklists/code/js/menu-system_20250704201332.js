// menu-system.js - Dynamic menu handling for MeamTreelistApp

import { sharedState, WORKER_URL } from './constants.js';
import { fetchChecklists, fetchRemoteChecklist, loadChecklist } from './data.js';
import { saveChecklist, newChecklist, copyChecklist, renameChecklist, markSaveDirty, getParentArray } from './data2.js';

import { expandAll, collapseAll, openPrintView, addSameLevel as uiAddSameLevel, addSubLevel as uiAddSubLevel } from './ui-mainrender.js';
import { applyColor, toggleBold } from './styles-manage.js';
import { filterNotDone, resetFilters, selectmine } from './events-global.js';
import { logout } from './security.js';
import { addNote as openNoteEditor } from './data-notes.js';
import { triggerFileUpload } from './data-files.js';
import { renderChecklist } from './renderchecklist.js';
import { showVersionHistory } from './data-versions.js';
import { showUserManagementDialog } from './user-management.js';
// Keep track of list types data
let listTypesData = null;

/**
 * Update the list type icon based on the current checklist type
 */
export function updateListTypeIcon() {
  // Check if we have loaded list types and checklist data
  if (!listTypesData || !sharedState.checklistData) {
    console.log('Cannot update list type icon: missing data');
    return;
  }
  
  // Get the current checklist type from the checklistData
  const currentType = sharedState.checklistData.type || 'Custom';
  
  // Find the icon element in the DOM
  const iconContainer = document.querySelector('.list-type-icon');
  if (!iconContainer) {
    console.log('List type icon container not found in DOM');
    return;
  }
  
  // Get the type definition from listTypesData
  const typeConfig = listTypesData.types[currentType] || listTypesData.types['Custom'];
  if (!typeConfig) {
    console.warn(`Unknown list type: ${currentType}, using Custom instead`);
    return;
  }
  
  // Set the icon and tooltip
  let iconHtml = '';
  
  // Define icon mappings
  const iconMap = {
    'project': '<svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor"><path d="M3 2h10a1 1 0 011 1v10a1 1 0 01-1 1H3a1 1 0 01-1-1V3a1 1 0 011-1zm0 1v10h10V3H3zm2 2h6v1H5V5zm0 2h6v1H5V7zm0 2h6v1H5V9zm0 2h4v1H5v-1z"/></svg>',
    'task': '<svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor"><path d="M13 1H3a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2V3a2 2 0 00-2-2zm-1.5 10.5L8 8l-1.5 1.5-2-2L3 9l3.5 3.5 7-7-1.5-1.5z"/></svg>',
    'custom': '<svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor"><path d="M8 1a7 7 0 100 14A7 7 0 008 1zm0 13a6 6 0 110-12 6 6 0 010 12zm-1-5.5V4h2v4.5l-1 1-1-1zm0 3v-1.5l1 1 1-1V11H7z"/></svg>'
  };
  
  // Get the icon HTML or use the default
  iconHtml = iconMap[typeConfig.icon] || iconMap['custom'];
  
  // Update the icon
  iconContainer.innerHTML = iconHtml;
  iconContainer.title = `${currentType} Checklist`;
  
  // Add appropriate CSS classes
  iconContainer.className = `list-type-icon type-${typeConfig.icon || 'custom'}`;
  
  console.log(`Updated list type icon to: ${currentType} (${typeConfig.icon || 'custom'})`);
}
// Fallback list types data in case the remote file can't be loaded
const fallbackListTypes = {
  "types": {
    "Project Management": {
      "icon": "project",
      "defaultColumns": ["label", "owner", "status", "dueDate", "priority"],
      "recommendedFields": ["owner", "status", "dueDate", "priority", "progress", "notes"],
      "tools": [
        {
          "id": "rasci-matrix",
          "name": "RASCI Matrix",
          "description": "View and edit the RASCI responsibility matrix",
          "requiredFields": ["owner"]
        },
        {
          "id": "timeline-view",
          "name": "Timeline View",
          "description": "Visualize project timeline",
          "requiredFields": ["dueDate"]
        },
        {
          "id": "calculate-progress",
          "name": "Calculate Progress",
          "description": "Calculate overall progress based on task completion",
          "requiredFields": ["progress"]
        }
      ]
    },
    "Task List": {
      "icon": "task",
      "defaultColumns": ["label", "status", "dueDate", "assignee"],
      "recommendedFields": ["status", "dueDate", "assignee", "priority", "notes"],
      "tools": [
        {
          "id": "calculate-totals",
          "name": "Calculate Totals",
          "description": "Calculate totals for tasks with numerical values",
          "requiredFields": []
        }
      ]
    },
    "Custom": {
      "icon": "custom",
      "defaultColumns": ["label"],
      "recommendedFields": ["notes"],
      "tools": []
    }
  }
};

/**
 * Initialize the menu system.
 * Should be called after DOM is loaded.
 */
export async function initMenuSystem() {
  // Load list types configuration
  await loadListTypes();
  
  // Attach event listeners to all menu items
  attachMenuHandlers();
  
  // Initial update of Tools menu based on current checklist type
  updateToolsMenu();
  
  // Set up menu item enable/disable logic based on state
  setupMenuStateObserver();
  
  // Set up right-click on header for column visibility
  initHeaderRightClick();
}

/**
 * Load list types data from config file
 */
async function loadListTypes() {
  try {
    console.log('Fetching list types from:', `${WORKER_URL}?file=checklists/config/listtypes.json`);
    const res = await fetch(`${WORKER_URL}?file=checklists/config/listtypes.json`);
    if (!res.ok) {
      console.error('Failed to load listtypes.json, using fallback data');
      listTypesData = fallbackListTypes;
      return;
    }
    listTypesData = await res.json();
    console.log('Loaded list types:', listTypesData);
  } catch (err) {
    console.error('Error loading listtypes.json, using fallback data:', err);
    listTypesData = fallbackListTypes;
  }
}

/**
 * Attach click handlers to all menu items
 */
function attachMenuHandlers() {
  // Helper function to safely add event listeners
  const attachHandler = (id, eventType, handler) => {
    const element = document.getElementById(id);
    if (element) {
      element.addEventListener(eventType, (e) => {
        e.preventDefault();
        safeExecuteMenuAction(handler, id);
      });
    } else {
      console.warn(`Menu element not found: ${id}`);
    }
  };
  
  // File menu
  attachHandler('menu-file-new', 'click', newChecklist);
  attachHandler('menu-file-open', 'click', showChecklistsList);
  attachHandler('menu-file-save', 'click', () => saveChecklist());
  attachHandler('menu-file-save-as', 'click', copyChecklist);
  attachHandler('menu-file-print', 'click', openPrintView);
  
  // Edit menu
  attachHandler('menu-edit-copy', 'click', copySelectedItem);
  attachHandler('menu-edit-paste', 'click', pasteItem);
  attachHandler('menu-edit-delete', 'click', deleteSelectedItem);
  attachHandler('menu-edit-add-same-level', 'click', addSameLevel);
  attachHandler('menu-edit-add-sub-level', 'click', addSubLevel);
  attachHandler('menu-edit-add-note', 'click', addNote);
  attachHandler('menu-edit-add-file', 'click', triggerFileUpload);
  attachHandler('menu-edit-toggle-bold', 'click', toggleBold);
  attachHandler('menu-edit-find', 'click', focusSearchBox);
  
  // Color submenu - delegate to parent
  const colorMenu = document.querySelector('.submenu[data-parent="color"]');
  if (colorMenu) {
    colorMenu.addEventListener('click', (e) => {
      if (e.target.tagName === 'A' && e.target.dataset.color) {
        e.preventDefault();
        if (e.target.dataset.color === 'custom') {
          safeExecuteMenuAction(openColorPicker, 'color-picker');
        } else {
          safeExecuteMenuAction(() => applyColor(`rgba(${getColorValues(e.target.dataset.color)})`), 'apply-color');
        }
      }
    });
  }
  
  // View menu
  attachHandler('menu-view-select-columns', 'mouseenter', populateLayoutSubmenu);
  attachHandler('menu-view-select-layout', 'click', showLayoutSelector);
  attachHandler('menu-view-choose-fields', 'click', showFieldsDialog);
  attachHandler('menu-view-zoom-in', 'click', () => adjustZoom(0.1));
  attachHandler('menu-view-zoom-out', 'click', () => adjustZoom(-0.1));
  attachHandler('menu-view-zoom-reset', 'click', () => resetZoom());
  attachHandler('menu-view-filter-not-done', 'click', filterNotDone);
  attachHandler('menu-view-filter-show-mine', 'click', selectmine);
  attachHandler('menu-view-filter-reset', 'click', resetFilters);
  attachHandler('menu-view-expand-all', 'click', expandAll);
  attachHandler('menu-view-collapse-all', 'click', collapseAll);
  
  // Account menu
  attachHandler('menu-account-edit', 'click', () => window.open('config/edit-user.html', '_blank'));
  attachHandler('menu-account-edit-users', 'click', showUserManagementDialog);
  // Note: Collaborators are managed via checklist.json and admin selection from users list
  // attachHandler('menu-account-collaborators', 'click', showCollaboratorsDialog); // Removed - obsolete
  attachHandler('menu-account-logout', 'click', logout);
  
  // Help menu
  attachHandler('menu-help-howto', 'click', showHowToDialog);
  attachHandler('menu-help-shortcuts', 'click', showShortcutsDialog);
  attachHandler('menu-help-report', 'click', showReportIssueDialog);
  attachHandler('menu-help-about', 'click', showAboutDialog);
  attachHandler('menu-help-debug-listtypes', 'click', showListTypesDebug);
}

/**
 * Update the Tools menu based on the current checklist type
 */
export function updateToolsMenu() {
  if (!listTypesData || !sharedState.checklistData || !sharedState.checklistData.listType) {
    return;
  }
  
  const toolsMenu = document.getElementById('tools-menu');
  if (!toolsMenu) return;
  
  // Clear current tools
  toolsMenu.innerHTML = '';
  
  // Get list type from shared state
  const currentType = sharedState.checklistData.listType;
  const typeData = listTypesData.types[currentType] || listTypesData.types["Custom"];
  
  // No type found
  if (!typeData || !typeData.tools || !typeData.tools.length) {
    const li = document.createElement('li');
    li.innerHTML = '<a class="disabled">No tools available</a>';
    toolsMenu.appendChild(li);
    return;
  }
  
  // Set up right-click on header for column visibility after checklist updates
  // Use a slight delay to ensure the DOM is updated
  setTimeout(() => initHeaderRightClick(), 200);
  
  // Add tools based on list type
  typeData.tools.forEach(tool => {
    const canUse = checkToolAvailability(tool);
    
    const li = document.createElement('li');
    const a = document.createElement('a');
    a.href = '#';
    a.id = `tool-${tool.id}`;
    a.textContent = tool.name;
    a.title = tool.description;
    
    if (!canUse) {
      a.classList.add('disabled');
      a.title += ' (Required fields missing)';
    } else {
      a.addEventListener('click', () => activateTool(tool.id));
    }
    
    li.appendChild(a);
    toolsMenu.appendChild(li);
  });
  
  // Add separator
  const separator = document.createElement('li');
  separator.classList.add('menu-separator');
  toolsMenu.appendChild(separator);
  
  // Add version history (always available)
  const versionLi = document.createElement('li');
  const versionA = document.createElement('a');
  versionA.href = '#';
  versionA.id = 'tool-version-history';
  versionA.textContent = 'Version History';
  versionA.addEventListener('click', () => activateTool('version-history'));
  versionLi.appendChild(versionA);
  toolsMenu.appendChild(versionLi);
}

/**
 * Check if a tool is available based on required fields
 */
function checkToolAvailability(tool) {
  // If no required fields, tool is always available
  if (!tool.requiredFields || tool.requiredFields.length === 0) {
    return true;
  }
  
  // Check if all required fields are present in the layout
  const layout = sharedState.checklistData.layout;
  if (!layout || !layout.columns) {
    return false;
  }
  
  return tool.requiredFields.every(field => 
    layout.columns.hasOwnProperty(field) && layout.columns[field].visible !== false
  );
}

/**
 * Activate a tool by ID
 */
function activateTool(toolId) {
  console.log(`Activating tool: ${toolId}`);
  
  switch (toolId) {
    case 'rasci-matrix':
      showRasciMatrix();
      break;
    case 'timeline-view':
      showTimelineView();
      break;
    case 'calculate-totals':
      exportToPdf();
      break;
    case 'calculate-progress':
      calculateProgress();
      break;
    case 'export-pdf':
      exportToPdf();
      break;
    case 'version-history':
      showVersionHistory();
      break;
    case 'process-flow':
      showProcessFlow();
      break;
    default:
      console.warn(`Tool not implemented: ${toolId}`);
  }
}

/**
 * Set up an observer to enable/disable menu items based on application state
 */
function setupMenuStateObserver() {
  // Update menu items when selection changes
  document.addEventListener('selectionChange', updateMenuItemStates);
  
  // Initial update
  updateMenuItemStates();
}

/**
 * Update enabled/disabled state of menu items based on current state
 */
function updateMenuItemStates() {
  const hasSelection = !!sharedState.selectedItem;
  const isDirty = sharedState.isDirty;
  const isAdmin = checkIfUserIsAdmin();
  
  // Selection-dependent items
  const selectionDependentIds = [
    'menu-edit-copy', 
    'menu-edit-delete', 
    'menu-edit-add-note',
    'menu-edit-add-file',
    'menu-edit-toggle-bold'
  ];
  
  selectionDependentIds.forEach(id => {
    const el = document.getElementById(id);
    if (el) {
      if (hasSelection) {
        el.classList.remove('disabled');
      } else {
        el.classList.add('disabled');
      }
    }
  });
  
  // Save button
  const saveBtn = document.getElementById('menu-file-save');
  if (saveBtn) {
    if (isDirty) {
      saveBtn.classList.remove('disabled');
    } else {
      saveBtn.classList.add('disabled');
    }
  }
  
  // Admin-only items
  const adminOnlyItems = document.querySelectorAll('.admin-only');
  adminOnlyItems.forEach(item => {
    if (isAdmin) {
      item.style.display = '';
    } else {
      item.style.display = 'none';
    }
  });
}

/**
 * Check if current user has admin role
 */
function checkIfUserIsAdmin() {
  const username = sharedState.currentUser;
  if (!username) return false;
  
  if (sharedState.usersData && sharedState.usersData.users) {
    const user = sharedState.usersData.users.find(u => u.username === username);
    return user && user.role === 'admin';
  }
  
  return false;
}

/**
 * Helper functions for menu actions
 */
/* function showChecklistsList() {
  const checklistsPanel = document.getElementById('checklistsPanel');
  if (checklistsPanel) {
    checklistsPanel.classList.toggle('visible');
  }
} */

/**
 * Display a dropdown list of available checklists
 * Called when clicking on File | Open in the menu
 */
async function showChecklistsList() {
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
    
    // Import the data module and directly fetch the checklist files without using fetchChecklists
    const dataModule = await import('./data.js');
    
    // Fetch the checklist files directly without relying on the sidebar element
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
 * Show a notification toast message
 * @param {string} type - 'success' or 'error'
 * @param {string} message - The message to display
 * @param {number} [duration=5000] - How long to show the message in milliseconds
 */
export function showNotification(type, message, duration = 5000) {
  // Remove any existing notifications first
  const existingNotifications = document.querySelectorAll('.error-toast, .success-toast');
  existingNotifications.forEach(note => note.remove());
  
  // Create the notification element
  const notification = document.createElement('div');
  notification.className = type === 'error' ? 'error-toast' : 'success-toast';
  notification.textContent = message;
  
  // Add it to the DOM
  document.body.appendChild(notification);
  
  // Remove it after the duration
  setTimeout(() => {
    notification.style.opacity = '0';
    setTimeout(() => notification.remove(), 300);
  }, duration);
}

/**
 * Safely execute a menu action with error handling
 * @param {Function} action - The action function to execute
 * @param {string} actionName - Name of the action for logging
 */
function safeExecuteMenuAction(action, actionName) {
  try {
    const result = action();
    // If the result is a Promise, handle any errors
    if (result instanceof Promise) {
      result.catch(err => {
        console.error(`Error in menu action ${actionName}:`, err);
        showNotification('error', `Operation failed: ${err.message}`);
      });
    }
  } catch (err) {
    console.error(`Error in menu action ${actionName}:`, err);
    showNotification('error', `Operation failed: ${err.message}`);
  }
}

/**
 * Focus the search box for finding items
 */
function focusSearchBox() {
  const searchBox = document.getElementById('searchInput');
  if (searchBox) {
    searchBox.focus();
    searchBox.select();
  }
}

/**
 * Add a new item at the same level as the currently selected item
 */
function addSameLevel() {
  if (!sharedState.selectedItem) {
    showNotification('error', 'No item selected');
    return;
  }
  uiAddSameLevel();
}

/**
 * Add a new item as a sub-item of the currently selected item
 */
function addSubLevel() {
  if (!sharedState.selectedItem) {
    showNotification('error', 'No item selected');
    return;
  }
  uiAddSubLevel();
}

/**
 * Add a note to the currently selected item
 */
function addNote() {
  if (!sharedState.selectedItem) {
    showNotification('error', 'No item selected');
    return;
  }
  openNoteEditor();
}

/**
 * Copy the currently selected item
 */
function copySelectedItem() {
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
function pasteItem() {
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
function deleteSelectedItem() {
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
 * Open a color picker dialog
 */
function openColorPicker() {
  const color = prompt('Enter a color value (hex, rgb, or name):', '#ff0000');
  if (color) {
    applyColor(color);
  }
}

/**
 * Convert color name to RGBA values
 */
function getColorValues(colorName) {
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
 * Show the column visibility menu to toggle columns on/off
 */
function showColumnVisibilityMenu() {
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

/**
 * Show the fields selection dialog to add/remove fields
 */
function showFieldsDialog() {
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

/**
 * Apply a layout to the current checklist
 */
function applyLayoutToChecklist(layout) {
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
  
  // Copy this layout to "lastused" 
  updateLastUsedLayout(layout);
  
  // Update the submenu to reflect any changes
  populateLayoutSubmenu();
  
  // Re-render the checklist with new layout
  renderChecklist();
}

/**
 * Update the "lastused" layout with the current layout
 */
function updateLastUsedLayout(layout) {
  // Try to get the correct layouts array
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
    console.warn('[Layout] Could not find layouts array to update lastused');
    return;
  }
  
  // Find existing "lastused" layout or create new one
  let lastUsedIndex = layoutsArray.findIndex(l => l.layoutName === 'lastused');
  
  const lastUsedLayout = {
    layoutName: 'lastused',
    columns: { ...layout.columns },
    rows: { height: layout.rows?.height || 30 },
    columnOrder: [...(layout.columnOrder || [])]
  };
  
  if (lastUsedIndex >= 0) {
    // Update existing lastused
    layoutsArray[lastUsedIndex] = lastUsedLayout;
  } else {
    // Add new lastused at the beginning
    layoutsArray.unshift(lastUsedLayout);
  }
  
  console.log('[Layout] Updated lastused layout');
}

/**
 * Show layout selector dialog
 */
async function showLayoutSelector() {
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
              ${layout.layoutName === 'lastused' ? '<span class="current-badge">Current</span>' : ''}
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
    
    // Add current indicator for lastused or active layout
    if (layout.layoutName === 'lastused') {
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
 * Show about dialog - displays application information
 */
function showAboutDialog() {
  // Create modal backdrop
  const backdrop = document.createElement('div');
  backdrop.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0, 0, 0, 0.5);
    z-index: 10000;
    display: flex;
    align-items: center;
    justify-content: center;
  `;
  
  // Create modal dialog
  const modal = document.createElement('div');
  modal.style.cssText = `
    background: white;
    border-radius: 8px;
    box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
    width: 500px;
    max-width: 90vw;
    padding: 0;
    font-family: Arial, sans-serif;
  `;
  
  modal.innerHTML = `
    <div style="padding: 20px; border-bottom: 1px solid #dee2e6; background: #f8f9fa; border-radius: 8px 8px 0 0;">
      <h2 style="margin: 0; color: #495057; font-size: 1.5rem;">About MeamTreelistApp</h2>
    </div>
    <div style="padding: 30px; line-height: 1.6;">
      <div style="text-align: center; margin-bottom: 20px;">
        <div style="font-size: 2rem; margin-bottom: 10px;">📋</div>
        <h3 style="margin: 0; color: #007bff;">MeamTreelistApp</h3>
        <p style="margin: 5px 0; color: #6c757d;">Collaborative Checklist Management System</p>
      </div>
      
      <div style="margin-bottom: 20px;">
        <p><strong>Version:</strong> 1.0</p>
        <p><strong>Author:</strong> Johan Degraeve</p>
        <p><strong>License:</strong> Perpetual license to Meam BV</p>
      </div>
      
      <div style="border-top: 1px solid #dee2e6; padding-top: 15px; font-size: 0.9rem; color: #6c757d;">
        <p>A powerful and intuitive checklist application designed for teams and individuals to organize, track, and collaborate on tasks and projects.</p>
      </div>
    </div>
    <div style="padding: 15px 20px; border-top: 1px solid #dee2e6; text-align: center; background: #f8f9fa; border-radius: 0 0 8px 8px;">
      <button id="about-close-btn" style="background: #007bff; color: white; border: none; padding: 8px 20px; border-radius: 4px; cursor: pointer; font-size: 0.9rem;">Close</button>
    </div>
  `;
  
  // Add to page
  backdrop.appendChild(modal);
  document.body.appendChild(backdrop);
  
  // Close handlers
  const closeBtn = modal.querySelector('#about-close-btn');
  const closeDialog = () => document.body.removeChild(backdrop);
  
  closeBtn.addEventListener('click', closeDialog);
  backdrop.addEventListener('click', (e) => {
    if (e.target === backdrop) closeDialog();
  });
  
  // ESC key handler
  const escHandler = (e) => {
    if (e.key === 'Escape') {
      closeDialog();
      document.removeEventListener('keydown', escHandler);
    }
  };
  document.addEventListener('keydown', escHandler);
}

/**
 * Show keyboard shortcuts dialog - displays all available shortcuts
 */
function showShortcutsDialog() {
  // Create modal backdrop
  const backdrop = document.createElement('div');
  backdrop.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0, 0, 0, 0.5);
    z-index: 10000;
    display: flex;
    align-items: center;
    justify-content: center;
  `;
  
  // Create modal dialog
  const modal = document.createElement('div');
  modal.style.cssText = `
    background: white;
    border-radius: 8px;
    box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
    width: 600px;
    max-width: 90vw;
    max-height: 80vh;
    padding: 0;
    font-family: Arial, sans-serif;
    overflow: hidden;
    display: flex;
    flex-direction: column;
  `;
  
  modal.innerHTML = `
    <div style="padding: 20px; border-bottom: 1px solid #dee2e6; background: #f8f9fa; border-radius: 8px 8px 0 0; flex-shrink: 0;">
      <h2 style="margin: 0; color: #495057; font-size: 1.5rem;">⌨️ Keyboard Shortcuts</h2>
    </div>
    <div style="padding: 20px; overflow-y: auto; flex: 1;">
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px;">
        <div>
          <h4 style="margin: 0 0 10px 0; color: #007bff; border-bottom: 1px solid #dee2e6; padding-bottom: 5px;">File Operations</h4>
          <div style="font-family: monospace; font-size: 0.85rem; line-height: 1.8;">
            <div><kbd style="background: #f8f9fa; padding: 2px 6px; border-radius: 3px; border: 1px solid #dee2e6;">Ctrl+S</kbd> Save checklist</div>
            <div><kbd style="background: #f8f9fa; padding: 2px 6px; border-radius: 3px; border: 1px solid #dee2e6;">Ctrl+N</kbd> New checklist</div>
            <div><kbd style="background: #f8f9fa; padding: 2px 6px; border-radius: 3px; border: 1px solid #dee2e6;">Ctrl+O</kbd> Open checklist</div>
            <div><kbd style="background: #f8f9fa; padding: 2px 6px; border-radius: 3px; border: 1px solid #dee2e6;">Ctrl+P</kbd> Print view</div>
          </div>
          
          <h4 style="margin: 20px 0 10px 0; color: #007bff; border-bottom: 1px solid #dee2e6; padding-bottom: 5px;">Navigation & View</h4>
          <div style="font-family: monospace; font-size: 0.85rem; line-height: 1.8;">
            <div><kbd style="background: #f8f9fa; padding: 2px 6px; border-radius: 3px; border: 1px solid #dee2e6;">Ctrl+E</kbd> Expand all items</div>
            <div><kbd style="background: #f8f9fa; padding: 2px 6px; border-radius: 3px; border: 1px solid #dee2e6;">Shift+Ctrl+E</kbd> Collapse all items</div>
            <div><kbd style="background: #f8f9fa; padding: 2px 6px; border-radius: 3px; border: 1px solid #dee2e6;">Ctrl+F</kbd> Filter items</div>
          </div>
          
          <h4 style="margin: 20px 0 10px 0; color: #007bff; border-bottom: 1px solid #dee2e6; padding-bottom: 5px;">Item Structure</h4>
          <div style="font-family: monospace; font-size: 0.85rem; line-height: 1.8;">
            <div><kbd style="background: #f8f9fa; padding: 2px 6px; border-radius: 3px; border: 1px solid #dee2e6;">Ctrl+Enter</kbd> Add sub-item</div>
            <div><kbd style="background: #f8f9fa; padding: 2px 6px; border-radius: 3px; border: 1px solid #dee2e6;">Ctrl+Tab</kbd> Demote item (move right)</div>
            <div><kbd style="background: #f8f9fa; padding: 2px 6px; border-radius: 3px; border: 1px solid #dee2e6;">Shift+Ctrl+Tab</kbd> Promote item (move left)</div>
            <div><kbd style="background: #f8f9fa; padding: 2px 6px; border-radius: 3px; border: 1px solid #dee2e6;">Ctrl+↑</kbd> Move item up level</div>
            <div><kbd style="background: #f8f9fa; padding: 2px 6px; border-radius: 3px; border: 1px solid #dee2e6;">Ctrl+↓</kbd> Move item down level</div>
          </div>
        </div>
        
        <div>
          <h4 style="margin: 0 0 10px 0; color: #007bff; border-bottom: 1px solid #dee2e6; padding-bottom: 5px;">Item Management</h4>
          <div style="font-family: monospace; font-size: 0.85rem; line-height: 1.8;">
            <div><kbd style="background: #f8f9fa; padding: 2px 6px; border-radius: 3px; border: 1px solid #dee2e6;">Ctrl+D</kbd> Duplicate item</div>
            <div><kbd style="background: #f8f9fa; padding: 2px 6px; border-radius: 3px; border: 1px solid #dee2e6;">Ctrl+Delete</kbd> Delete item (with confirmation)</div>
            <div><kbd style="background: #f8f9fa; padding: 2px 6px; border-radius: 3px; border: 1px solid #dee2e6;">Shift+Ctrl+Delete</kbd> Delete item (skip confirmation)</div>
            <div><kbd style="background: #f8f9fa; padding: 2px 6px; border-radius: 3px; border: 1px solid #dee2e6;">Alt+↑</kbd> Move item up visually</div>
            <div><kbd style="background: #f8f9fa; padding: 2px 6px; border-radius: 3px; border: 1px solid #dee2e6;">Alt+↓</kbd> Move item down visually</div>
          </div>
          
          <h4 style="margin: 20px 0 10px 0; color: #007bff; border-bottom: 1px solid #dee2e6; padding-bottom: 5px;">Formatting</h4>
          <div style="font-family: monospace; font-size: 0.85rem; line-height: 1.8;">
            <div><kbd style="background: #f8f9fa; padding: 2px 6px; border-radius: 3px; border: 1px solid #dee2e6;">Ctrl+B</kbd> Toggle bold</div>
            <div><kbd style="background: #f8f9fa; padding: 2px 6px; border-radius: 3px; border: 1px solid #dee2e6;">Ctrl+I</kbd> Toggle italic</div>
            <div><kbd style="background: #f8f9fa; padding: 2px 6px; border-radius: 3px; border: 1px solid #dee2e6;">Ctrl+U</kbd> Toggle underline</div>
          </div>
          
          <h4 style="margin: 20px 0 10px 0; color: #007bff; border-bottom: 1px solid #dee2e6; padding-bottom: 5px;">General</h4>
          <div style="font-family: monospace; font-size: 0.85rem; line-height: 1.8;">
            <div><kbd style="background: #f8f9fa; padding: 2px 6px; border-radius: 3px; border: 1px solid #dee2e6;">Ctrl+Z</kbd> Undo</div>
            <div><kbd style="background: #f8f9fa; padding: 2px 6px; border-radius: 3px; border: 1px solid #dee2e6;">Ctrl+Y</kbd> Redo</div>
            <div><kbd style="background: #f8f9fa; padding: 2px 6px; border-radius: 3px; border: 1px solid #dee2e6;">Esc</kbd> Close dialog</div>
          </div>
        </div>
      </div>
    </div>
    <div style="padding: 15px 20px; border-top: 1px solid #dee2e6; text-align: center; background: #f8f9fa; border-radius: 0 0 8px 8px; flex-shrink: 0;">
      <button id="shortcuts-close-btn" style="background: #007bff; color: white; border: none; padding: 8px 20px; border-radius: 4px; cursor: pointer; font-size: 0.9rem;">Close</button>
    </div>
  `;
  
  // Add to page
  backdrop.appendChild(modal);
  document.body.appendChild(backdrop);
  
  // Close handlers
  const closeBtn = modal.querySelector('#shortcuts-close-btn');
  const closeDialog = () => document.body.removeChild(backdrop);
  
  closeBtn.addEventListener('click', closeDialog);
  backdrop.addEventListener('click', (e) => {
    if (e.target === backdrop) closeDialog();
  });
  
  // ESC key handler
  const escHandler = (e) => {
    if (e.key === 'Escape') {
      closeDialog();
      document.removeEventListener('keydown', escHandler);
    }
  };
  document.addEventListener('keydown', escHandler);
}

/**
 * Show list types debug information
 */
function showListTypesDebug() {
  if (listTypesData) {
    console.log('List Types Debug Info:', listTypesData);
    alert(`List Types Debug:\n\nLoaded: ${listTypesData ? 'Yes' : 'No'}\nTypes: ${Object.keys(listTypesData.types || {}).join(', ')}\nDefault: ${listTypesData.defaultType || 'None'}\n\nSee console for full details.`);
  } else {
    alert('List types data not loaded yet.');
  }
}

