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
 * Helper functions for menu actions
 */
/* function showChecklistsList() {
  const checklistsPanel = document.getElementById('checklistsPanel');
  if (checklistsPanel) {
    checklistsPanel.classList.toggle('visible');
  }
} */


/**