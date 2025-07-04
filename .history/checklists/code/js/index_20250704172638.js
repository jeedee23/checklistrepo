import { setupGlobalEvents } from './events-global.js';
import { setupKeyboardEvents } from './events-keyboard.js';
import { setupInactivityMonitor } from './events-timers.js';
import { initUIEvents } from './events-ui.js';
import { renderChecklist } from './renderchecklist.js';
import { loadDynamicStyles } from './styles-manage.js';
import { checkPermissions } from './security.js';
import { buildContextMenu } from './menu-context.js';
import { integrateExternalHooks } from './menu-integrations.js';
import { filterNotDone, selectmine } from './events-global.js';
import { newChecklist, saveChecklist } from './data2.js';
import { secureLogin } from './auth-login.js';
import { saveNote, closeNoteModal } from './data-notes.js';
import { initializeApplication } from './app-init.js';

// Expose functions to global scope for inline onclick handlers
window.filterNotDone = filterNotDone;
window.selectmine = selectmine;
window.newChecklist = newChecklist;
window.saveChecklist = saveChecklist;
window.secureLogin = secureLogin;
window.saveNote = saveNote;
window.closeNoteModal = closeNoteModal;

// Missing function - implement closeViewerModal
window.closeViewerModal = function() {
  const modal = document.getElementById('viewerModal');
  if (modal) modal.style.display = 'none';
};

// Initialize the application when the DOM is ready
// The initialization is handled by app-init.js's initializeApplication function
window.addEventListener('DOMContentLoaded', () => {
  // Initialize the application
  initializeApplication();
});