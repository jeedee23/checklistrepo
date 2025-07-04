// --app-init.js--
import { fetchChecklists } from './data.js';
import { sharedState, initializeBrowserState } from './constants.js';
import { renderChecklist } from './renderchecklist.js';
import { setupGlobalEvents, initEvents } from './events-global.js';
import { setupInactivityMonitor } from './events-timers.js';
import { setupKeyboardEvents } from './events-keyboard.js';
import { loadFieldDefinitions } from './data-fields.js';
import { initMenuSystem } from './menu-core.js';
import { buildContextMenu } from './menu-context.js';
import { integrateExternalHooks } from './menu-integrations.js';
import { tryAutoLoginFromURL } from './auth-login.js';
import { loadDynamicStyles } from './styles-manage.js';
import { checkPermissions } from './security.js';
import { initUIEvents } from './events-ui.js';
import { initFileUpload } from './data-files.js';
import { initNoteModule } from './data-notes.js';
import { initCollaboratorUI } from './data-users.js';

/**
 * Initialize the entire application
 * Call this once when the DOM is fully loaded
 */
export async function initializeApplication() {
  console.log(`Initializing Checklist App v${sharedState.APP_VERSION}`);
  
  // Step 1: Initialize browser state and environment
  initializeBrowserState();
  
  // Step 2: Load configuration and definitions
  await loadFieldDefinitions();
  
  // Step 3: Set up UI components
  initMenuSystem();
  buildContextMenu();
  initFileUpload();
  initNoteModule();
  loadDynamicStyles();
  
  // Step 4: Attach event handlers
  setupGlobalEvents();
  setupKeyboardEvents();
  setupInactivityMonitor();
  initUIEvents();
  
  // Step 5: Perform authentication, fetch sidebar, and load checklist
  await initEvents();
  
  // Step 6: Initialize remaining components that depend on loaded data
  integrateExternalHooks();
  checkPermissions();
  initCollaboratorUI();
  
  console.log('Application initialization complete');
}

// Auto-initialize when DOM is ready
document.addEventListener('DOMContentLoaded', initializeApplication);