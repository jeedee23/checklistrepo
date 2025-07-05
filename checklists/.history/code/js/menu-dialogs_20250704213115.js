// menu-dialogs.js - Dialog and popup management for MeamTreelistApp

// This will be imported from menu-core.js to access shared listTypesData
let listTypesData = null;

// Function to set listTypesData from menu-core
export function setListTypesData(data) {
  listTypesData = data;
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
 * Show how-to dialog - displays basic usage instructions
 */
function showHowToDialog() {
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
    width: 700px;
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
      <h2 style="margin: 0; color: #495057; font-size: 1.5rem;">📚 How To Use MeamTreelistApp</h2>
    </div>
    <div style="padding: 20px; overflow-y: auto; flex: 1; line-height: 1.6;">
      <div style="margin-bottom: 20px;">
        <h4 style="color: #007bff; margin-bottom: 10px;">Getting Started</h4>
        <ul style="margin: 0; padding-left: 20px;">
          <li>Create a new checklist using <strong>File → New</strong></li>
          <li>Add items by clicking the "+" button or pressing <kbd>Tab</kbd></li>
          <li>Create sub-items by pressing <kbd>Shift+Tab</kbd> or <kbd>Ctrl+Enter</kbd></li>
          <li>Check off completed items by clicking the checkbox</li>
        </ul>
      </div>
      
      <div style="margin-bottom: 20px;">
        <h4 style="color: #007bff; margin-bottom: 10px;">Organization</h4>
        <ul style="margin: 0; padding-left: 20px;">
          <li>Drag and drop items to reorder them</li>
          <li>Use <kbd>Ctrl+↑</kbd> and <kbd>Ctrl+↓</kbd> to move items between levels</li>
          <li>Use <kbd>Alt+↑</kbd> and <kbd>Alt+↓</kbd> to move items up and down</li>
          <li>Collapse/expand sections using the arrow buttons</li>
        </ul>
      </div>
      
      <div style="margin-bottom: 20px;">
        <h4 style="color: #007bff; margin-bottom: 10px;">Customization</h4>
        <ul style="margin: 0; padding-left: 20px;">
          <li>Add custom fields using <strong>View → Choose Fields</strong></li>
          <li>Change layouts using <strong>View → Select Layout</strong></li>
          <li>Apply colors and formatting using the <strong>Edit</strong> menu</li>
          <li>Add notes and files to items using the context menu</li>
        </ul>
      </div>
      
      <div style="margin-bottom: 20px;">
        <h4 style="color: #007bff; margin-bottom: 10px;">Collaboration</h4>
        <ul style="margin: 0; padding-left: 20px;">
          <li>Share checklists by saving them to shared folders</li>
          <li>Manage users and permissions via <strong>Account → Edit Users</strong></li>
          <li>Track changes with automatic version history</li>
          <li>Use filters to show only your assigned items</li>
        </ul>
      </div>
      
      <div style="background: #f8f9fa; padding: 15px; border-radius: 4px; border-left: 4px solid #007bff;">
        <strong>💡 Tip:</strong> Press <kbd>Ctrl+K</kbd> to see all keyboard shortcuts, or visit <strong>Help → Keyboard Shortcuts</strong> for a complete list.
      </div>
    </div>
    <div style="padding: 15px 20px; border-top: 1px solid #dee2e6; text-align: center; background: #f8f9fa; border-radius: 0 0 8px 8px; flex-shrink: 0;">
      <button id="howto-close-btn" style="background: #007bff; color: white; border: none; padding: 8px 20px; border-radius: 4px; cursor: pointer; font-size: 0.9rem;">Close</button>
    </div>
  `;
  
  // Add to page
  backdrop.appendChild(modal);
  document.body.appendChild(backdrop);
  
  // Close handlers
  const closeBtn = modal.querySelector('#howto-close-btn');
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
 * Show report issue dialog - allows users to report bugs or request features
 */
function showReportIssueDialog() {
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
      <h2 style="margin: 0; color: #495057; font-size: 1.5rem;">🐛 Report an Issue</h2>
    </div>
    <div style="padding: 20px; overflow-y: auto; flex: 1;">
      <form id="issue-report-form">
        <div style="margin-bottom: 15px;">
          <label for="issue-type" style="display: block; margin-bottom: 5px; font-weight: bold;">Issue Type:</label>
          <select id="issue-type" style="width: 100%; padding: 8px; border: 1px solid #ccc; border-radius: 4px;">
            <option value="bug">🐛 Bug Report</option>
            <option value="feature">💡 Feature Request</option>
            <option value="question">❓ Question/Support</option>
            <option value="other">📝 Other</option>
          </select>
        </div>
        
        <div style="margin-bottom: 15px;">
          <label for="issue-title" style="display: block; margin-bottom: 5px; font-weight: bold;">Title:</label>
          <input type="text" id="issue-title" placeholder="Brief description of the issue" 
                 style="width: 100%; padding: 8px; border: 1px solid #ccc; border-radius: 4px;">
        </div>
        
        <div style="margin-bottom: 15px;">
          <label for="issue-description" style="display: block; margin-bottom: 5px; font-weight: bold;">Description:</label>
          <textarea id="issue-description" rows="6" placeholder="Detailed description of the issue or feature request..." 
                    style="width: 100%; padding: 8px; border: 1px solid #ccc; border-radius: 4px; resize: vertical;"></textarea>
        </div>
        
        <div style="margin-bottom: 15px;">
          <label for="issue-steps" style="display: block; margin-bottom: 5px; font-weight: bold;">Steps to Reproduce (for bugs):</label>
          <textarea id="issue-steps" rows="3" placeholder="1. Click on...&#10;2. Enter...&#10;3. Expected result vs actual result" 
                    style="width: 100%; padding: 8px; border: 1px solid #ccc; border-radius: 4px; resize: vertical;"></textarea>
        </div>
        
        <div style="background: #e7f3ff; padding: 15px; border-radius: 4px; border-left: 4px solid #007bff; font-size: 0.9rem;">
          <strong>📧 Contact Information:</strong><br>
          For urgent issues, contact: <strong>johan.degraeve@meam.be</strong><br>
          This form creates a local issue report that can be exported and sent via email.
        </div>
      </form>
    </div>
    <div style="padding: 15px 20px; border-top: 1px solid #dee2e6; display: flex; gap: 10px; justify-content: flex-end; background: #f8f9fa; border-radius: 0 0 8px 8px; flex-shrink: 0;">
      <button id="export-issue-btn" style="background: #28a745; color: white; border: none; padding: 8px 16px; border-radius: 4px; cursor: pointer; font-size: 0.9rem;">Export Report</button>
      <button id="issue-close-btn" style="background: #6c757d; color: white; border: none; padding: 8px 16px; border-radius: 4px; cursor: pointer; font-size: 0.9rem;">Close</button>
    </div>
  `;
  
  // Add to page
  backdrop.appendChild(modal);
  document.body.appendChild(backdrop);
  
  // Close handlers
  const closeBtn = modal.querySelector('#issue-close-btn');
  const exportBtn = modal.querySelector('#export-issue-btn');
  const closeDialog = () => document.body.removeChild(backdrop);
  
  closeBtn.addEventListener('click', closeDialog);
  exportBtn.addEventListener('click', () => {
    const type = document.getElementById('issue-type').value;
    const title = document.getElementById('issue-title').value;
    const description = document.getElementById('issue-description').value;
    const steps = document.getElementById('issue-steps').value;
    
    if (!title.trim()) {
      alert('Please enter a title for the issue.');
      return;
    }
    
    // Create issue report text
    const report = `MeamTreelistApp Issue Report
Generated: ${new Date().toISOString()}

Type: ${type}
Title: ${title}
Description: ${description}
Steps to Reproduce: ${steps}

System Information:
- User Agent: ${navigator.userAgent}
- URL: ${window.location.href}
- Timestamp: ${new Date().toLocaleString()}
`;
    
    // Create and download the report
    const blob = new Blob([report], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `issue-report-${Date.now()}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    showNotification('success', 'Issue report exported successfully!');
    closeDialog();
  });
  
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
  
  // Focus the title field
  setTimeout(() => {
    const titleField = document.getElementById('issue-title');
    if (titleField) titleField.focus();
  }, 100);
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

/**
 * Show a notification toast message
 * @param {string} type - 'success' or 'error'
 * @param {string} message - The message to display
 * @param {number} [duration=5000] - How long to show the message in milliseconds
 */
function showNotification(type, message, duration = 5000) {
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

// Export all dialog functions
export { 
  showAboutDialog,
  showShortcutsDialog, 
  showHowToDialog,
  showReportIssueDialog,
  showListTypesDebug,
  showNotification
};

