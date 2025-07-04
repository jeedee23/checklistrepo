// menu-core.js - Core menu system and event handling for MeamTreelistApp

import { sharedState, WORKER_URL } from './constants.js';
import { showNotification, showAboutDialog, showShortcutsDialog, showHowToDialog, showReportIssueDialog, showListTypesDebug, setListTypesData } from './menu-dialogs.js';
import { newChecklist, copyChecklist, saveChecklist, markSaveDirty } from './data2.js';
import { expandAll, collapseAll, openPrintView } from './ui-mainrender.js';
import { filterNotDone, resetFilters, selectmine } from './events-global.js';
import { logout } from './security.js';
import { showUserManagementDialog } from './user-management.js';
import { triggerFileUpload } from './data-files.js';
import { toggleBold, applyColor } from './styles-manage.js';

// Import checklist action functions from menu-checklist-actions.js
import { 
  copySelectedItem, 
  pasteItem, 
  deleteSelectedItem, 
  addSameLevel, 
  addSubLevel, 
  addNote, 
  focusSearchBox,
  openColorPicker,
  getColorValues,
  showChecklistsList,
  adjustZoom,
  resetZoom
} from './menu-checklist-actions.js';

// Import field action functions from menu-fields-actions.js
import { 
  showFieldsDialog 
} from './menu-fields-actions.js';

// Import layout functions from menu-layouts.js
import { 
  showLayoutSelector, 
  populateLayoutSubmenu,
  showColumnVisibilityMenu
} from './menu-layouts.js';

// Keep track of list types data
let listTypesData = null;

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
    
    // Pass the loaded data to the dialogs module
    setListTypesData(listTypesData);
  } catch (err) {
    console.error('Error loading listtypes.json, using fallback data:', err);
    listTypesData = fallbackListTypes;
    setListTypesData(listTypesData);
  }
}

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
 * Set up right-click on header for column visibility
 */
function initHeaderRightClick() {
  // Find the header element and add right-click handler
  const header = document.querySelector('.checklist-header');
  if (header) {
    header.addEventListener('contextmenu', (e) => {
      e.preventDefault();
      showColumnVisibilityMenu();
    });
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


