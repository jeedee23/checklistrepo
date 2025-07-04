// constants.js — Cleaned up for ES module mutability

// --------------------
// Immutable Constants
// --------------------
export const OWNER = 'jeedee23';
export const REPO = 'checklistrepo';
export const BRANCH = 'main';

export const WORKER_URL = "https://fields-proxy.johan-351.workers.dev";
export const USER_CONFIG_PATH = "checklists/config/users.json";
export const CHECKLISTS_DIR = "checklists";
export const FILES_DIR = `${CHECKLISTS_DIR}/files`;
export const NOTES_DIR = `${CHECKLISTS_DIR}/notes`;

export const MAX_UNDO_STACK = 20;
export const DEFAULT_ROW_HEIGHT = 30;
export const APP_VERSION = "1.0-milestone";

// --------------------
// Shared Mutable State
// --------------------
export const sharedState = {
  FILE_PATH: null,
  checklistData: {
    items: [],
    layout: {
      columns: {}
    },
    files: [],
    collaborators: []
  },
  lastSave: "YYYY_MM_DD_@_hh-mm-ss",
  showOnlyMine: false,
  usersData: {
    users: [],
    updatedAt: null,
    updatedBy: null
  },
  currentUser: null,
  isDirty: false,
  isDirtyType: 0,
  renderCount: 0,
  changeCount: 0,
  readyForEdits: false,
  layoutDirty: false,
  saveInProgress: false,

  // Event and renumbering mutual exclusion flags
  eventFlag: false,      // Set during ANY user interaction (editing, menus, structural changes)
  renumberFlag: false,   // Set during renumbering operations

  // Timing and state control
  // Note: isRenumbering is now replaced by renumberFlag

  // Dirty Event IDs for STRUCTURAL changes that require renderChecklist()
  DIRTY_EVENTS: {
    // STRUCTURAL CHANGES - Tree/DOM manipulation (1-20)
    NEW_CHAPTER: 1,
    NEW_ITEM: 2,
    ADD_SAME_LEVEL: 3,
    ADD_SUB_LEVEL: 4,
    DUPLICATE_ITEM: 5,
    DELETE_ITEM: 6,
    MOVE_ALT_UP: 7,
    MOVE_ALT_DOWN: 8,
    MOVE_UP_LEVEL: 9,
    MOVE_DOWN_LEVEL: 10,
    TOGGLE_COLLAPSE: 11,
    
    // STYLE CHANGES - Row-level CSS updates (21-30)
    TOGGLE_IMPORTANT: 21,
    COLOR_RED: 22,
    COLOR_BLUE: 23,
    TOGGLE_BOLD: 24,
    RESET_STYLE: 25,
    
    // LAYOUT CHANGES - Column/table structure (31-40)
    COLUMN_REORDER: 31,
    COLUMN_VISIBILITY: 32,
    SAVE_LAYOUT: 33,
    SELECT_LAYOUT: 34,
    
    // METADATA CHANGES - Header/title updates (41-50)
    RENAME_CHECKLIST: 41,
    COPY_CHECKLIST: 42,
    PASTE_ITEM: 43,
    FIELD_METADATA: 44,
    USER_METADATA: 45,
    MOVE_ITEM: 46,
    CONTENT_CHANGE: 47,
    ADD_FILE: 48,
    
    // SYSTEM EVENTS - Load/migration (51-60)
    LOAD_COMPLETE: 51,
    MIGRATION_APPLIED: 52,
    CHECKLIST_LOADED: 53,
    
    // UI ACTIONS - Manual triggers (61-70)
    SAVE_BUTTON_CLICK: 61,
    REFRESH_VIEW: 62,
    FILTER_CHANGE: 63,
    SEARCH_RESULT_SELECT: 64
  },

  // Helper function to get event name by ID for debugging
  getDirtyEventName(eventId) {
    const entry = Object.entries(this.DIRTY_EVENTS).find(([name, id]) => id === eventId);
    return entry ? entry[0] : `UNKNOWN_EVENT_${eventId}`;
  },

  // Browser state
  location: {
    search: '',
    href: '',
    pathname: ''
  },

  // Optional grouping of nested state:
  filterState: {
    text: '',
    onlyMine: false,
    tags: [],
    columnFilters: {}
  },
  selectedItem: null,
  selectedPath: null,
  ColumnVisibilityMenu: {
    visible: false,
    x: 0,
    y: 0
  },

  // Browser functions wrapper
  openWindow: (url, target) => window.open(url, target),
  
  // Utility function for consistent delays across the codebase
  delay: (ms) => new Promise(resolve => setTimeout(resolve, ms)),

  // Utility functions for flag management
  canStartEvent() {
    return !this.eventFlag && !this.renumberFlag;
  },
  
  canStartRenumber() {
    return !this.eventFlag && !this.renumberFlag;
  },
  
  setEventFlag(action = 'unknown') {
    if (!this.canStartEvent()) {
      console.log(`[setEventFlag] Blocked: ${action} - eventFlag: ${this.eventFlag}, renumberFlag: ${this.renumberFlag}`);
      return false;
    }
    this.eventFlag = action;
    console.log(`[setEventFlag] Started: ${action}`);
    return true;
  },
  
  clearEventFlag(action = 'unknown') {
    if (this.eventFlag === action) {
      this.eventFlag = false;
      console.log(`[clearEventFlag] Ended: ${action}`);
    } else {
      console.log(`[clearEventFlag] Ignored: ${action} (current flag: ${this.eventFlag})`);
    }
  },
  
  setRenumberFlag() {
    if (!this.canStartRenumber()) {
      console.log(`[setRenumberFlag] Blocked - eventFlag: ${this.eventFlag}, renumberFlag: ${this.renumberFlag}`);
      return false;
    }
    this.renumberFlag = true;
    console.log(`[setRenumberFlag] Started renumbering`);
    return true;
  },
  
  clearRenumberFlag() {
    this.renumberFlag = false;
    console.log(`[clearRenumberFlag] Ended renumbering`);
  },

};

/**
 * Initialize browser-dependent state that can't be set at module load time
 */
export function initializeBrowserState() {
  // Initialize location state from current browser location
  sharedState.location.search = window.location.search;
  sharedState.location.href = window.location.href;
  sharedState.location.pathname = window.location.pathname;
  
  // Listen for URL changes and update sharedState
  window.addEventListener('popstate', () => {
    sharedState.location.search = window.location.search;
    sharedState.location.href = window.location.href;
    sharedState.location.pathname = window.location.pathname;
  });
}
