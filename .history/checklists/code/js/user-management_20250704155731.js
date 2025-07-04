/**
 * User Management Dialog
 * Provides CRUD operations for user accounts with 2FA support
 */

import { showToast, showSuccess, showError, showWarning, showInfo } from './ui-notifications.js';
import { WORKER_URL, USER_CONFIG_PATH, sharedState } from './constants.js';

let usersData = null;
let currentUserIndex = 0;
let isEditing = false;
let eventListenersAttached = false;

/**
 * Show notification wrapper
 */
function showNotification(type, message) {
  switch (type) {
    case 'success':
      showSuccess(message);
      break;
    case 'error':
      showError(message);
      break;
    case 'warning':
      showWarning(message);
      break;
    case 'info':
      showInfo(message);
      break;
    default:
      showToast(message, type);
  }
}

/**
 * Initialize and show the user management dialog
 */
export function showUserManagementDialog() {
  console.log('[User Management] Opening Edit Users dialog');
  
  try {
    // Load users data
    loadUsersData().then(() => {
      console.log('[User Management] Users data loaded successfully, creating dialog');
      createUserManagementDialog();
    }).catch(error => {
      console.error('[User Management] Error loading users data:', error);
      
      // Use fallback data if loading fails
      console.log('[User Management] Using fallback data due to loading error');
      usersData = {
        users: [
          {
            id: "uuid-1234-5678",
            username: "testuser",
            fullName: "Test User", 
            email: "test@example.com",
            phoneNumber: "+1234567890",
            company: "Test Company",
            companyAddress: {
              street: "123 Test St",
              postalCode: "12345", 
              city: "Test City",
              country: "Test Country"
            },
            role: "admin",
            jobFunction: "Tester",
            defaultAccessLevel: 5,
            twoFactorMethod: "email",
            passwordHash: "testhash",
            token: "testtoken",
            checklists: []
          }
        ]
      };
      currentUserIndex = 0;
      createUserManagementDialog();
    });
    
  } catch (error) {
    console.error('[User Management] Error showing user management dialog:', error);
    showNotification('error', 'Failed to show user management dialog: ' + error.message);
  }
}

/**
 * Show user management in the main checklistContainer
 */
export function showUserManagementInContainer() {
  console.log('[User Management] Opening Edit Users in container');
  
  try {
    // Load users data
    loadUsersData().then(() => {
      console.log('[User Management] Users data loaded successfully, creating container view');
      createUserManagementInContainer();
    }).catch(error => {
      console.error('[User Management] Error loading users data:', error);
      
      // Use fallback data if loading fails
      console.log('[User Management] Using fallback data due to loading error');
      usersData = {
        users: [
          {
            id: "uuid-1234-5678",
            username: "Johan",
            fullName: "Johan Degraeve", 
            email: "johan@aanscharius.com",
            phoneNumber: "+32 489 947 935",
            company: "AAVDS",
            companyAddress: {
              street: "Veenstraat 28",
              postalCode: "8470", 
              city: "Gistel",
              country: "Belgium"
            },
            role: "admin",
            jobFunction: "Specialist",
            defaultAccessLevel: 0,
            twoFactorMethod: "email",
            passwordHash: "testhash",
            token: "testtoken",
            checklists: [
              {
                name: "Cosucra1",
                accessLevel: 0,
                lastAccessed: "2025_07_03_@_21-49-50"
              },
              {
                name: "2025_04_27_@_16-13-33_DDV.data",
                accessLevel: 0,
                lastAccessed: "2025_07_02_@_16-12-49"
              }
            ]
          }
        ]
      };
      currentUserIndex = 0;
      createUserManagementInContainer();
    });
    
  } catch (error) {
    console.error('[User Management] Error showing user management in container:', error);
    showNotification('error', 'Failed to show user management: ' + error.message);
  }
}

/**
 * Load users data from config using worker
 */
async function loadUsersData() {
  console.log('[User Management] Loading users data...');
  
  try {
    // Try to use shared state first (if already loaded)
    if (sharedState.usersData) {
      usersData = sharedState.usersData;
      currentUserIndex = 0;
      console.log('[User Management] Using cached users data:', usersData);
      return;
    }
    
    console.log('[User Management] Loading from worker, URL:', `${WORKER_URL}/?file=${encodeURIComponent(USER_CONFIG_PATH)}`);
    
    // Load from worker if not cached
    const response = await fetch(`${WORKER_URL}/?file=${encodeURIComponent(USER_CONFIG_PATH)}`);
    
    console.log('[User Management] Fetch response status:', response.status);
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    console.log('[User Management] Received data:', data);
    
    usersData = data;
    sharedState.usersData = data; // Cache in shared state
    currentUserIndex = 0;
    console.log('[User Management] Loaded users data from worker:', usersData);
  } catch (error) {
    console.error('[User Management] Error loading users data:', error);
    
    // Fallback to test data if worker fails
    console.log('[User Management] Using fallback test data');
    usersData = {
      users: [
        {
          id: "uuid-1234-5678",
          username: "testuser",
          fullName: "Test User",
          email: "test@example.com",
          phoneNumber: "+1234567890",
          company: "Test Company",
          companyAddress: {
            street: "123 Test St",
            postalCode: "12345",
            city: "Test City",
            country: "Test Country"
          },
          role: "admin",
          jobFunction: "Tester",
          defaultAccessLevel: 5,
          twoFactorMethod: "email",
          passwordHash: "testhash",
          token: "testtoken",
          checklists: []
        }
      ]
    };
    currentUserIndex = 0;
    console.log('[User Management] Using fallback data:', usersData);
  }
}

/**
 * Create and display the user management dialog
 */
function createUserManagementDialog() {
  console.log('[User Management] Creating dialog, users data:', usersData);
  
  // Create or get existing modal
  let dialog = document.getElementById('user-management-dialog');
  if (!dialog) {
    console.log('[User Management] Creating new dialog element');
    dialog = document.createElement('div');
    dialog.id = 'user-management-dialog';
    dialog.className = 'modal-dialog';
    document.body.appendChild(dialog);
  } else {
    console.log('[User Management] Using existing dialog element');
  }
  
  // Build the dialog content
  buildUserManagementDialog(dialog);
  
  // Show the dialog
  dialog.style.display = 'block';
  console.log('[User Management] Dialog should now be visible');
  
  // Focus on first input
  const firstInput = dialog.querySelector('input:not([readonly])');
  if (firstInput) {
    firstInput.focus();
  }
}

/**
 * Build the user management dialog content
 */
function buildUserManagementDialog(dialog) {
  console.log('[User Management] Building dialog content');
  const startTime = performance.now();
  
  const currentUser = usersData.users[currentUserIndex];
  const userCount = usersData.users.length;
  
  dialog.innerHTML = `
    <div class="modal-header">
      <h3>Edit Users (${currentUserIndex + 1} of ${userCount})</h3>
      <button class="close-button" onclick="closeUserManagementDialog()">×</button>
    </div>
    
    <div class="modal-body" style="margin-bottom: 0px; padding: 0px; background: #e9ecef; border-radius: 4px; border: 1px solid #dee2e6;">
      <form id="user-form">
        <!-- User Navigation -->
        <div class="user-navigation" style="margin-bottom: 0px; padding: 0px; background: #e9ecef; border-radius: 4px; border: 1px solid #dee2e6;">
          <div style="display: flex; justify-content: space-between; align-items: center;">
            <span style="font-weight: bold; font-size: 1.1em;">${currentUser.fullName} (${currentUser.username})</span>
            <div>
              <button type="button" id="prev-user" ${currentUserIndex === 0 ? 'disabled' : ''}>← Previous</button>
              <button type="button" id="next-user" ${currentUserIndex === userCount - 1 ? 'disabled' : ''}>Next →</button>
            </div>
          </div>
        </div>
        
        <!-- Single Table for All Data -->
        <table class="form-table">
          <!-- PERSONAL DATA Section -->
          <tr>
            <td colspan="5" class="section-header">PERSONAL DATA</td>
          </tr>
          <tr>
            <td class="label">User ID: *</td>
            <td class="input"><input type="text" id="user-id" value="${currentUser.id}" readonly></td>
            <td class="spacer">&nbsp;</td>
            <td class="label">Username: *</td>
            <td class="input"><input type="text" id="user-username" value="${currentUser.username}" required></td>
          </tr>
          <tr>
            <td class="label">Full Name: *</td>
            <td class="input"><input type="text" id="user-fullname" value="${currentUser.fullName}" required></td>
            <td class="spacer">&nbsp;</td>
            <td class="label">Email: *</td>
            <td class="input"><input type="email" id="user-email" value="${currentUser.email}" required></td>
          </tr>
          <tr>
            <td class="label">Phone Number: *</td>
            <td class="input"><input type="tel" id="user-phone" value="${currentUser.phoneNumber}" required></td>
            <td class="spacer">&nbsp;</td>
            <td class="label">Role: *</td>
            <td class="input">
              <select id="user-role" required>
                <option value="user" ${currentUser.role === 'user' ? 'selected' : ''}>User</option>
                <option value="admin" ${currentUser.role === 'admin' ? 'selected' : ''}>Admin</option>
              </select>
            </td>
          </tr>
          
          <!-- COMPANY INFORMATION Section -->
          <tr>
            <td colspan="5" class="section-header">COMPANY INFORMATION</td>
          </tr>
          <tr>
            <td class="label">Job Function: *</td>
            <td class="input"><input type="text" id="user-jobfunction" value="${currentUser.jobFunction}" required></td>
            <td class="spacer">&nbsp;</td>
            <td class="label">Company: *</td>
            <td class="input"><input type="text" id="user-company" value="${currentUser.company}" required></td>
          </tr>
          
          <!-- ACCESS & SECURITY Section -->
          <tr>
            <td colspan="5" class="section-header">ACCESS & SECURITY</td>
          </tr>
          <tr>
            <td class="label">Access Level: *</td>
            <td class="input">
              <select id="user-access-level" required>
                <option value="0" ${currentUser.defaultAccessLevel === 0 ? 'selected' : ''}>0 - Full Admin/Developer</option>
                <option value="1" ${currentUser.defaultAccessLevel === 1 ? 'selected' : ''}>1 - Full Admin/User Management</option>
                <option value="2" ${currentUser.defaultAccessLevel === 2 ? 'selected' : ''}>2 - Admin (no field/user mgmt)</option>
                <option value="3" ${currentUser.defaultAccessLevel === 3 ? 'selected' : ''}>3 - Layout Editor (high access)</option>
                <option value="4" ${currentUser.defaultAccessLevel === 4 ? 'selected' : ''}>4 - Layout Editor (no structure)</option>
                <option value="5" ${currentUser.defaultAccessLevel === 5 ? 'selected' : ''}>5 - Limited Field Editor</option>
                <option value="6" ${currentUser.defaultAccessLevel === 6 ? 'selected' : ''}>6 - Layout Reader</option>
                <option value="7" ${currentUser.defaultAccessLevel === 7 ? 'selected' : ''}>7 - List Editor Only</option>
                <option value="8" ${currentUser.defaultAccessLevel === 8 ? 'selected' : ''}>8 - Read Only</option>
                <option value="9" ${currentUser.defaultAccessLevel === 9 ? 'selected' : ''}>9 - Personal Items Only</option>
              </select>
            </td>
            <td class="spacer">&nbsp;</td>
            <td class="label">2FA Method: *</td>
            <td class="input">
              <select id="user-2fa-method" required>
                <option value="email" ${currentUser.twoFactorMethod === 'email' ? 'selected' : ''}>Email</option>
                <option value="totp" ${currentUser.twoFactorMethod === 'totp' ? 'selected' : ''}>TOTP (Authenticator App)</option>
                <option value="none" ${currentUser.twoFactorMethod === 'none' ? 'selected' : ''}>None</option>
              </select>
            </td>
          </tr>
          
          <!-- COMPANY ADDRESS Section -->
          <tr>
            <td colspan="5" class="section-header">COMPANY ADDRESS</td>
          </tr>
          <tr>
            <td class="label">Street: *</td>
            <td class="input"><input type="text" id="user-street" value="${currentUser.companyAddress?.street || ''}" required></td>
            <td class="spacer">&nbsp;</td>
            <td class="label">Postal Code: *</td>
            <td class="input"><input type="text" id="user-postal" value="${currentUser.companyAddress?.postalCode || ''}" required></td>
          </tr>
          <tr>
            <td class="label">City: *</td>
            <td class="input"><input type="text" id="user-city" value="${currentUser.companyAddress?.city || ''}" required></td>
            <td class="spacer">&nbsp;</td>
            <td class="label">Country: *</td>
            <td class="input"><input type="text" id="user-country" value="${currentUser.companyAddress?.country || ''}" required></td>
          </tr>
          
          <!-- ASSIGNED CHECKLISTS Section -->
          <tr>
            <td colspan="5" class="section-header">ASSIGNED CHECKLISTS (${currentUser.checklists?.length || 0})</td>
          </tr>
          <tr>
            <td colspan="5" class="checklist-cell">
              <div id="user-checklists" style="max-height: 100px; overflow-y: auto; border: 1pt solid #ccc; padding: 8px; background: #f8f9fa; font-family: Consolas, monospace; font-size: 9pt;">
                ${buildChecklistsDisplay(currentUser.checklists || [])}
              </div>
            </td>
          </tr>
          
          <!-- TWO FACTOR AUTHENTICATION Section -->
          <tr>
            <td colspan="5" class="section-header">TWO FACTOR AUTHENTICATION</td>
          </tr>
          <tr>
            <td class="label">Current Method:</td>
            <td class="input-readonly">${currentUser.twoFactorMethod || 'email'}</td>
            <td class="spacer">&nbsp;</td>
            <td class="label">Status:</td>
            <td class="input-readonly">
              <span class="status-badge ${currentUser.twoFactorMethod === 'totp' ? 'active' : 'inactive'}">
                ${currentUser.twoFactorMethod === 'totp' ? '✓ TOTP Configured' : '⚠ Email Only'}
              </span>
            </td>
          </tr>
          <tr>
            <td colspan="5" style="text-align: center; padding: 12px; border: 1px solid #dee2e6;">
              <button type="button" id="setup-2fa" class="btn-secondary">
                ${currentUser.twoFactorMethod === 'totp' ? 'Reconfigure TOTP' : 'Setup TOTP'}
              </button>
            </td>
          </tr>
        </table>
        
      </form>
    </div>
    
    <div class="modal-footer" style="padding: 20px; border-top: 1px solid #dee2e6; display: flex; justify-content: space-between; background: #f8f9fa;">
      <div>
        <button type="button" id="new-user" class="btn-success" style="margin-right: 10px;">+ New User</button>
        <button type="button" id="delete-user" class="btn-danger" style="margin-right: 10px;">Delete User</button>
        <button type="button" id="add-collaborator" class="btn-secondary">Add to Checklist as Collaborator</button>
      </div>
      <div>
        <button type="button" id="save-and-email" class="btn-primary">Save User & Send Email</button>
        <button type="button" id="save-user" class="btn-success">Save & Exit</button>
        <button type="button" id="cancel-user" class="btn-secondary">Cancel</button>
      </div>
    </div>
  `;
  
  // Attach event listeners
  attachUserManagementEventListeners();
  
  const endTime = performance.now();
  console.log(`[User Management] Dialog built in ${endTime - startTime}ms`);
}

/**
 * Build the checklists display for current user
 */
function buildChecklistsDisplay(checklists) {
  if (!checklists || checklists.length === 0) {
    return '<p style="color: #6c757d; font-style: italic;">No checklists assigned</p>';
  }
  
  return checklists.map(checklist => `
    <div class="checklist-item" style="margin-bottom: 8px; padding: 8px; background: white; border: 1px solid #dee2e6; border-radius: 4px;">
      <div style="display: flex; justify-content: space-between; align-items: center;">
        <div>
          <strong>${checklist.displayName}</strong>
          <span style="font-size: 0.9em; color: #6c757d;">(Access Level: ${checklist.accessLevel})</span>
        </div>
        <div style="font-size: 0.8em; color: #6c757d;">
          Last accessed: ${checklist.lastAccessed || 'Never'}
        </div>
      </div>
    </div>
  `).join('');
}

/**
 * Attach event listeners to the user management dialog
 */
function attachUserManagementEventListeners() {
  // Prevent multiple attachments
  if (eventListenersAttached) {
    return;
  }
  
  console.log('[User Management] Attaching event listeners');
  eventListenersAttached = true;
  
  // Navigation
  document.getElementById('prev-user')?.addEventListener('click', () => {
    console.log('[User Management] Previous button clicked, current index:', currentUserIndex);
    if (currentUserIndex > 0) {
      currentUserIndex--;
      refreshUserDialog();
    }
  });
  
  document.getElementById('next-user')?.addEventListener('click', () => {
    console.log('[User Management] Next button clicked, current index:', currentUserIndex);
    if (currentUserIndex < usersData.users.length - 1) {
      currentUserIndex++;
      refreshUserDialog();
    }
  });
  
  // User management
  document.getElementById('new-user')?.addEventListener('click', () => {
    console.log('[User Management] New User button clicked');
    createNewUser();
  });
  document.getElementById('delete-user')?.addEventListener('click', () => {
    console.log('[User Management] Delete User button clicked');
    deleteCurrentUser();
  });
  
  // Form change detection
  const form = document.getElementById('user-form');
  if (form) {
    form.addEventListener('change', () => {
      isEditing = true;
      updateFormState();
    });
  }
  
  // Action buttons
  document.getElementById('save-user')?.addEventListener('click', () => {
    console.log('[User Management] Save User button clicked');
    saveAndExit();
  });
  document.getElementById('save-and-email')?.addEventListener('click', () => {
    console.log('[User Management] Save and Email button clicked');
    saveAndSendEmail();
  });
  document.getElementById('cancel-user')?.addEventListener('click', () => {
    console.log('[User Management] Cancel button clicked');
    cancelUserManagement();
  });
  document.getElementById('add-collaborator')?.addEventListener('click', () => {
    console.log('[User Management] Add Collaborator button clicked');
    addToCollaborators();
  });
  document.getElementById('setup-2fa')?.addEventListener('click', () => {
    console.log('[User Management] Setup 2FA button clicked');
    setup2FA();
  });
}

/**
 * Refresh the user dialog with current user data (optimized)
 */
function refreshUserDialog() {
  const dialog = document.getElementById('user-management-dialog');
  if (!dialog) return;
  
  // Only update the user-specific content, not the entire dialog
  updateUserContent();
}

/**
 * Update user content without rebuilding the entire dialog (performance optimization)
 */
function updateUserContent() {
  console.log('[User Management] Updating user content for index:', currentUserIndex);
  const startTime = performance.now();
  
  const currentUser = usersData.users[currentUserIndex];
  const userCount = usersData.users.length;
  
  // Update header
  const headerTitle = document.querySelector('.modal-header h3');
  if (headerTitle) {
    headerTitle.textContent = `Edit Users (${currentUserIndex + 1} of ${userCount})`;
  }
  
  // Update navigation section
  const navigationSpan = document.querySelector('.user-navigation span');
  if (navigationSpan) {
    navigationSpan.textContent = `${currentUser.fullName} (${currentUser.username})`;
  }
  
  // Update navigation buttons
  const prevBtn = document.getElementById('prev-user');
  const nextBtn = document.getElementById('next-user');
  if (prevBtn) {
    prevBtn.disabled = currentUserIndex === 0;
  }
  if (nextBtn) {
    nextBtn.disabled = currentUserIndex === userCount - 1;
  }
  
  // Update form fields
  const formFields = {
    'user-id': currentUser.id,
    'user-username': currentUser.username,
    'user-fullname': currentUser.fullName,
    'user-email': currentUser.email,
    'user-phone': currentUser.phoneNumber,
    'user-role': currentUser.role,
    'user-jobfunction': currentUser.jobFunction,
    'user-company': currentUser.company,
    'user-access-level': currentUser.defaultAccessLevel,
    'user-2fa-method': currentUser.twoFactorMethod,
    'user-street': currentUser.companyAddress?.street || '',
    'user-postal': currentUser.companyAddress?.postalCode || '',
    'user-city': currentUser.companyAddress?.city || '',
    'user-country': currentUser.companyAddress?.country || ''
  };
  
  // Update all form fields
  Object.entries(formFields).forEach(([fieldId, value]) => {
    const field = document.getElementById(fieldId);
    if (field) {
      field.value = value;
    }
  });
  
  // Update checklists display
  const checklistsContainer = document.getElementById('user-checklists');
  if (checklistsContainer) {
    checklistsContainer.innerHTML = buildChecklistsDisplay(currentUser.checklists || []);
  }
  
  // Update 2FA status in table
  const twoFactorMethodCell = document.querySelector('.form-section:last-child .form-table td.input');
  if (twoFactorMethodCell) {
    twoFactorMethodCell.innerHTML = currentUser.twoFactorMethod || 'email';
  }
  
  const twoFactorStatusCell = document.querySelector('.form-section:last-child .form-table tr:first-child td.input:last-child');
  if (twoFactorStatusCell) {
    twoFactorStatusCell.innerHTML = `<span class="status-badge ${currentUser.twoFactorMethod === 'totp' ? 'active' : 'inactive'}">
      ${currentUser.twoFactorMethod === 'totp' ? '✓ TOTP Configured' : '⚠ Email Only'}
    </span>`;
  }
  
  const setup2FABtn = document.getElementById('setup-2fa');
  if (setup2FABtn) {
    setup2FABtn.textContent = currentUser.twoFactorMethod === 'totp' ? 'Reconfigure TOTP' : 'Setup TOTP';
  }
  
  // Update section headers with counts
  const checklistsHeader = document.querySelector('.form-section h4');
  if (checklistsHeader && checklistsHeader.textContent.includes('ASSIGNED CHECKLISTS')) {
    checklistsHeader.textContent = `ASSIGNED CHECKLISTS (${currentUser.checklists?.length || 0})`;
  }
  
  // Reset editing state
  isEditing = false;
  updateFormState();
  
  const endTime = performance.now();
  console.log(`[User Management] User content updated in ${endTime - startTime}ms`);
}

/**
 * Update form state based on editing status
 */
function updateFormState() {
  const saveButton = document.getElementById('save-user');
  const saveEmailButton = document.getElementById('save-and-email');
  
  if (saveButton) {
    saveButton.textContent = isEditing ? 'Save Changes & Exit' : 'Save & Exit';
    saveButton.className = isEditing ? 'btn-warning' : 'btn-success';
  }
  
  if (saveEmailButton) {
    saveEmailButton.textContent = isEditing ? 'Save Changes & Send Email' : 'Save User & Send Email';
  }
}

/**
 * Save user data and exit dialog
 */
async function saveAndExit() {
  try {
    await saveCurrentUser();
    closeUserManagementDialog();
    showNotification('success', 'User saved successfully');
  } catch (error) {
    console.error('Error saving user:', error);
    showNotification('error', 'Failed to save user');
  }
}

/**
 * Save user data and send authentication email
 */
async function saveAndSendEmail() {
  try {
    await saveCurrentUser();
    await sendAuthenticationEmail();
    showNotification('success', 'User saved and authentication email sent');
  } catch (error) {
    console.error('Error saving user and sending email:', error);
    showNotification('error', 'Failed to save user or send email');
  }
}

/**
 * Save current user data using worker
 */
async function saveCurrentUser() {
  const currentUser = usersData.users[currentUserIndex];
  
  // Collect form data
  const formData = {
    id: currentUser.id, // Keep original ID
    username: document.getElementById('user-username').value,
    fullName: document.getElementById('user-fullname').value,
    email: document.getElementById('user-email').value,
    phoneNumber: document.getElementById('user-phone').value,
    company: document.getElementById('user-company').value,
    companyAddress: {
      street: document.getElementById('user-street').value,
      postalCode: document.getElementById('user-postal').value,
      city: document.getElementById('user-city').value,
      country: document.getElementById('user-country').value
    },
    role: document.getElementById('user-role').value,
    jobFunction: document.getElementById('user-jobfunction').value,
    defaultAccessLevel: parseInt(document.getElementById('user-access-level').value),
    twoFactorMethod: document.getElementById('user-2fa-method').value,
    // Keep existing data
    passwordHash: currentUser.passwordHash,
    token: currentUser.token,
    checklists: currentUser.checklists
  };
  
  // Update the user data
  usersData.users[currentUserIndex] = formData;
  usersData.updatedAt = new Date().toISOString();
  usersData.updatedBy = getCurrentUsername();
  
  // Save to server using worker
  console.log('[User Management] Saving user data via worker:', formData);
  
  try {
    const response = await fetch(`${WORKER_URL}/save`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        file: USER_CONFIG_PATH, 
        json: usersData, 
        message: `Update user: ${formData.username} - ${new Date().toISOString()}` 
      })
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Save failed: ${response.status} - ${errorText}`);
    }
    
    // Update shared state
    sharedState.usersData = usersData;
    
    console.log('[User Management] User data saved successfully');
    isEditing = false;
    
  } catch (error) {
    console.error('Error saving user data:', error);
    throw error;
  }
}

/**
 * Send authentication setup email
 */
async function sendAuthenticationEmail() {
  const currentUser = usersData.users[currentUserIndex];
  
  console.log('[User Management] Sending authentication email to:', currentUser.email);
  
  // TODO: Implement email sending
  // This would typically involve a server-side API call
  
  // For now, just log the action
  console.log('[User Management] Email sent (placeholder)');
}

/**
 * Add current user to checklist as collaborator
 */
function addToCollaborators() {
  const currentUser = usersData.users[currentUserIndex];
  
  console.log('[User Management] Adding user to collaborators:', currentUser.username);
  
  // TODO: Integrate with existing collaborator system
  // This would call the existing collaborator management functions
  
  showNotification('info', `Adding ${currentUser.fullName} as collaborator (feature coming soon)`);
}

/**
 * Setup 2FA for current user
 */
function setup2FA() {
  const currentUser = usersData.users[currentUserIndex];
  
  console.log('[User Management] Setting up 2FA for user:', currentUser.username);
  
  // TODO: Implement 2FA setup dialog
  // This would open a separate dialog for QR code generation and verification
  
  showNotification('info', `Setting up 2FA for ${currentUser.fullName} (feature coming soon)`);
}

/**
 * Cancel user management and close dialog
 */
function cancelUserManagement() {
  if (isEditing) {
    // Show confirmation dialog
    const confirmCancel = confirm('You have unsaved changes. Are you sure you want to cancel?');
    if (!confirmCancel) {
      return;
    }
  }
  
  closeUserManagementDialog();
}

/**
 * Close the user management dialog
 */
function closeUserManagementDialog() {
  const dialog = document.getElementById('user-management-dialog');
  if (dialog) {
    dialog.style.display = 'none';
  }
  
  // Reset state
  isEditing = false;
  currentUserIndex = 0;
  eventListenersAttached = false; // Reset for next time dialog is opened
}

/**
 * Get current username from shared state
 */
function getCurrentUsername() {
  return sharedState.currentUser || 'System';
}

/**
 * Create a new user
 */
function createNewUser() {
  const newUser = {
    id: `uuid-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    username: '',
    fullName: '',
    email: '',
    phoneNumber: '',
    company: '',
    companyAddress: {
      street: '',
      postalCode: '',
      city: '',
      country: ''
    },
    role: 'user',
    jobFunction: '',
    defaultAccessLevel: 8, // Default to read-only
    passwordHash: '',
    token: Math.random().toString(36).substr(2, 32),
    twoFactorMethod: 'email',
    checklists: []
  };
  
  // Add the new user to the array
  usersData.users.push(newUser);
  
  // Navigate to the new user
  currentUserIndex = usersData.users.length - 1;
  isEditing = true;
  
  // Refresh the dialog
  refreshUserDialog();
  
  // Focus on the username field
  setTimeout(() => {
    const usernameField = document.getElementById('user-username');
    if (usernameField) {
      usernameField.focus();
    }
  }, 100);
  
  showNotification('info', 'New user created. Please fill in the required fields.');
}

/**
 * Delete the current user
 */
function deleteCurrentUser() {
  const currentUser = usersData.users[currentUserIndex];
  
  // Confirm deletion
  const confirmDelete = confirm(
    `Are you sure you want to delete user "${currentUser.fullName}" (${currentUser.username})?\n\n` +
    `This action cannot be undone.`
  );
  
  if (!confirmDelete) {
    return;
  }
  
  // Don't allow deletion of the last user
  if (usersData.users.length <= 1) {
    showNotification('error', 'Cannot delete the last user in the system.');
    return;
  }
  
  // Remove the user from the array
  usersData.users.splice(currentUserIndex, 1);
  
  // Adjust current index if necessary
  if (currentUserIndex >= usersData.users.length) {
    currentUserIndex = usersData.users.length - 1;
  }
  
  // Mark as edited and refresh
  isEditing = true;
  refreshUserDialog();
  
  showNotification('success', `User "${currentUser.fullName}" has been deleted.`);
}

/**
 * Create and display the user management interface in checklistContainer
 */
function createUserManagementInContainer() {
  console.log('[User Management] Creating container view, users data:', usersData);
  
  const container = document.getElementById('checklistContainer');
  if (!container) {
    console.error('[User Management] checklistContainer not found');
    showNotification('error', 'Container not found');
    return;
  }
  
  const currentUser = usersData.users[currentUserIndex];
  const userCount = usersData.users.length;
  
  // Create user management HTML based on the demo
  const userManagementHTML = `
    <div class="user-management-container" style="height: 100%; display: flex; flex-direction: column; background: white; overflow: hidden; margin: 0; padding: 0;">
      <div class="modal-header" style="padding: 15px; border-bottom: 1px solid #dee2e6; display: flex; justify-content: space-between; align-items: center; background-color: #f8f9fa; flex-shrink: 0;">
        <h3 style="margin: 0; color: #495057;">Edit Users (${currentUserIndex + 1} of ${userCount})</h3>
        <button class="close-button" data-action="close" style="background: none; border: none; font-size: 1.5rem; cursor: pointer; color: #6c757d; padding: 0; width: 30px; height: 30px; display: flex; align-items: center; justify-content: center;">×</button>
      </div>
      
      <div class="modal-body" style="background: #f5f5f5; padding: 15px; flex: 1; display: flex; flex-direction: column;">
        <div class="user-navigation" style="margin-bottom: 20px; padding: 15px; background: #e9ecef; border-radius: 4px; border: 1px solid #dee2e6; display: flex; justify-content: space-between; align-items: center;">
          <div>
            <span style="font-weight: bold; font-size: 1.1em;">${currentUser.fullName} (${currentUser.username})</span>
            <button class="btn btn-secondary" data-action="setup-totp" style="padding: 6px 12px; margin-left: 15px; font-size: 0.8rem; color: white; background-color: #6c757d; border: none; border-radius: 4px; cursor: pointer;">Setup TOTP</button>
          </div>
          <div>
            <button data-action="prev-user" ${currentUserIndex === 0 ? 'disabled' : ''} style="padding: 4px 6px; margin: 0 5px; border: 1px solid #ced4da; border-radius: 4px; background: white; cursor: pointer; font-size: 0.9rem;">← Previous</button>
            <button data-action="next-user" ${currentUserIndex === userCount - 1 ? 'disabled' : ''} style="padding: 4px 6px; margin: 0 5px; border: 1px solid #ced4da; border-radius: 4px; background: white; cursor: pointer; font-size: 0.9rem;">Next →</button>
          </div>
        </div>
        
        <!-- Action buttons moved to top -->
        <div style="margin-bottom: 20px; padding: 15px; background: #e9ecef; border-radius: 4px; border: 1px solid #dee2e6; display: flex; justify-content: space-between; align-items: center; flex-shrink: 0;">
          <div>
            <button class="btn btn-success" data-action="new-user" style="padding: 10px 16px; border: none; border-radius: 4px; cursor: pointer; font-size: 0.9rem; margin: 0 5px; background-color: #28a745; color: white;">+ New User</button>
            <button class="btn btn-danger" data-action="delete-user" style="padding: 10px 16px; border: none; border-radius: 4px; cursor: pointer; font-size: 0.9rem; margin: 0 5px; background-color: #dc3545; color: white;">Delete User</button>
            <button class="btn btn-secondary" data-action="add-collaborator" style="padding: 10px 16px; border: none; border-radius: 4px; cursor: pointer; font-size: 0.9rem; margin: 0 5px; background-color: #6c757d; color: white;">Add to Checklist as Collaborator</button>
          </div>
          <div>
            <button class="btn btn-primary" data-action="save-send-email" style="padding: 10px 16px; border: none; border-radius: 4px; cursor: pointer; font-size: 0.9rem; margin: 0 5px; background-color: #007bff; color: white;">Save User & Send Email</button>
            <button class="btn btn-success" data-action="save-exit" style="padding: 10px 16px; border: none; border-radius: 4px; cursor: pointer; font-size: 0.9rem; margin: 0 5px; background-color: #28a745; color: white;">Save & Exit</button>
            <button class="btn btn-secondary" data-action="cancel" style="padding: 10px 16px; border: none; border-radius: 4px; cursor: pointer; font-size: 0.9rem; margin: 0 5px; background-color: #6c757d; color: white;">Cancel</button>
          </div>
        </div>
        
        <table class="form-table" style="width: 100%; border-collapse: collapse; font-family: Consolas, monospace; font-size: 10pt; flex-shrink: 0;">
          <!-- PERSONAL DATA Section -->
          <tr>
            <td colspan="5" class="section-header" style="font-weight: bold; font-size: 10pt; background: #e9ecef; text-align: left; padding: 10px 12px; color: #495057; border: 1px solid #dee2e6; border-bottom: 2px solid #adb5bd;">PERSONAL DATA</td>
          </tr>
          <tr>
            <td class="label" style="width: 150px; font-weight: bold; background: #f8f9fa; text-align: right; padding: 6px 12px 6px 8px; white-space: nowrap; vertical-align: middle; border: 2px solid #dee2e6;">User ID: *</td>
            <td class="input" style="width: 200px; padding: 8px; vertical-align: middle; border: 2px solid #dee2e6;"><input type="text" value="${currentUser.id}" readonly style="width: 100%; padding: 2px 2px; border: 2px solid #75b9fe; border-radius: 3px; background: transparent; font-family: Consolas, monospace; font-size: 10pt; box-sizing: border-box; color: #6c757d; cursor: not-allowed;"></td>
            <td class="spacer" style="width: 30px; background: white; border: 1px solid #dee2e6; vertical-align: middle; padding: 6px 8px;">&nbsp;</td>
            <td class="label" style="width: 150px; font-weight: bold; background: #f8f9fa; text-align: right; padding: 6px 12px 6px 8px; white-space: nowrap; vertical-align: middle; border: 2px solid #dee2e6;">Username: *</td>
            <td class="input" style="width: 200px; padding: 8px; vertical-align: middle; border: 2px solid #dee2e6;"><input type="text" value="${currentUser.username}" style="width: 100%; padding: 2px 2px; border: 2px solid #75b9fe; border-radius: 3px; background: #FFFACD; font-family: Consolas, monospace; font-size: 10pt; box-sizing: border-box;"></td>
          </tr>
          <tr>
            <td class="label" style="width: 150px; font-weight: bold; background: #f8f9fa; text-align: right; padding: 6px 12px 6px 8px; white-space: nowrap; vertical-align: middle; border: 2px solid #dee2e6;">Full Name: *</td>
            <td class="input" style="width: 200px; padding: 8px; vertical-align: middle; border: 2px solid #dee2e6;"><input type="text" value="${currentUser.fullName}" style="width: 100%; padding: 2px 2px; border: 2px solid #75b9fe; border-radius: 3px; background: #FFFACD; font-family: Consolas, monospace; font-size: 10pt; box-sizing: border-box;"></td>
            <td class="spacer" style="width: 30px; background: white; border: 1px solid #dee2e6; vertical-align: middle; padding: 6px 8px;">&nbsp;</td>
            <td class="label" style="width: 150px; font-weight: bold; background: #f8f9fa; text-align: right; padding: 6px 12px 6px 8px; white-space: nowrap; vertical-align: middle; border: 2px solid #dee2e6;">Email: *</td>
            <td class="input" style="width: 200px; padding: 8px; vertical-align: middle; border: 2px solid #dee2e6;"><input type="email" value="${currentUser.email}" style="width: 100%; padding: 2px 2px; border: 2px solid #75b9fe; border-radius: 3px; background: #FFFACD; font-family: Consolas, monospace; font-size: 10pt; box-sizing: border-box;"></td>
          </tr>
          <tr>
            <td class="label" style="width: 150px; font-weight: bold; background: #f8f9fa; text-align: right; padding: 6px 12px 6px 8px; white-space: nowrap; vertical-align: middle; border: 2px solid #dee2e6;">Phone Number: *</td>
            <td class="input" style="width: 200px; padding: 8px; vertical-align: middle; border: 2px solid #dee2e6;"><input type="tel" value="${currentUser.phoneNumber}" style="width: 100%; padding: 2px 2px; border: 2px solid #75b9fe; border-radius: 3px; background: #FFFACD; font-family: Consolas, monospace; font-size: 10pt; box-sizing: border-box;"></td>
            <td class="spacer" style="width: 30px; background: white; border: 1px solid #dee2e6; vertical-align: middle; padding: 6px 8px;">&nbsp;</td>
            <td class="label" style="width: 150px; font-weight: bold; background: #f8f9fa; text-align: right; padding: 6px 12px 6px 8px; white-space: nowrap; vertical-align: middle; border: 2px solid #dee2e6;">Role: *</td>
            <td class="input" style="width: 200px; padding: 8px; vertical-align: middle; border: 2px solid #dee2e6;">
              <select style="width: 100%; padding: 2px 2px; border: 2px solid #75b9fe; border-radius: 3px; background: #FFFACD; font-family: Consolas, monospace; font-size: 10pt; box-sizing: border-box;">
                <option value="user" ${currentUser.role === 'user' ? 'selected' : ''}>User</option>
                <option value="admin" ${currentUser.role === 'admin' ? 'selected' : ''}>Admin</option>
              </select>
            </td>
          </tr>
          
          <!-- COMPANY INFORMATION & ADDRESS Section -->
          <tr>
            <td colspan="5" class="section-header" style="font-weight: bold; font-size: 10pt; background: #e9ecef; text-align: left; padding: 10px 12px; color: #495057; border: 1px solid #dee2e6; border-bottom: 2px solid #adb5bd;">COMPANY INFORMATION & ADDRESS</td>
          </tr>
          <tr>
            <td class="label" style="width: 150px; font-weight: bold; background: #f8f9fa; text-align: right; padding: 6px 12px 6px 8px; white-space: nowrap; vertical-align: middle; border: 2px solid #dee2e6;">Job Function: *</td>
            <td class="input" style="width: 200px; padding: 8px; vertical-align: middle; border: 2px solid #dee2e6;"><input type="text" value="${currentUser.jobFunction}" style="width: 100%; padding: 2px 2px; border: 2px solid #75b9fe; border-radius: 3px; background: #FFFACD; font-family: Consolas, monospace; font-size: 10pt; box-sizing: border-box;"></td>
            <td class="spacer" style="width: 30px; background: white; border: 1px solid #dee2e6; vertical-align: middle; padding: 6px 8px;">&nbsp;</td>
            <td class="label" style="width: 150px; font-weight: bold; background: #f8f9fa; text-align: right; padding: 6px 12px 6px 8px; white-space: nowrap; vertical-align: middle; border: 2px solid #dee2e6;">Company: *</td>
            <td class="input" style="width: 200px; padding: 8px; vertical-align: middle; border: 2px solid #dee2e6;"><input type="text" value="${currentUser.company}" style="width: 100%; padding: 2px 2px; border: 2px solid #75b9fe; border-radius: 3px; background: #FFFACD; font-family: Consolas, monospace; font-size: 10pt; box-sizing: border-box;"></td>
          </tr>
          <tr>
            <td class="label" style="width: 150px; font-weight: bold; background: #f8f9fa; text-align: right; padding: 6px 12px 6px 8px; white-space: nowrap; vertical-align: middle; border: 2px solid #dee2e6;">Street: *</td>
            <td class="input" style="width: 200px; padding: 8px; vertical-align: middle; border: 2px solid #dee2e6;"><input type="text" value="${currentUser.companyAddress.street}" style="width: 100%; padding: 2px 2px; border: 2px solid #75b9fe; border-radius: 3px; background: #FFFACD; font-family: Consolas, monospace; font-size: 10pt; box-sizing: border-box;"></td>
            <td class="spacer" style="width: 30px; background: white; border: 1px solid #dee2e6; vertical-align: middle; padding: 6px 8px;">&nbsp;</td>
            <td class="label" style="width: 150px; font-weight: bold; background: #f8f9fa; text-align: right; padding: 6px 12px 6px 8px; white-space: nowrap; vertical-align: middle; border: 2px solid #dee2e6;">Postal Code: *</td>
            <td class="input" style="width: 200px; padding: 8px; vertical-align: middle; border: 2px solid #dee2e6;"><input type="text" value="${currentUser.companyAddress.postalCode}" style="width: 100%; padding: 2px 2px; border: 2px solid #75b9fe; border-radius: 3px; background: #FFFACD; font-family: Consolas, monospace; font-size: 10pt; box-sizing: border-box;"></td>
          </tr>
          <tr>
            <td class="label" style="width: 150px; font-weight: bold; background: #f8f9fa; text-align: right; padding: 6px 12px 6px 8px; white-space: nowrap; vertical-align: middle; border: 2px solid #dee2e6;">City: *</td>
            <td class="input" style="width: 200px; padding: 8px; vertical-align: middle; border: 2px solid #dee2e6;"><input type="text" value="${currentUser.companyAddress.city}" style="width: 100%; padding: 2px 2px; border: 2px solid #75b9fe; border-radius: 3px; background: #FFFACD; font-family: Consolas, monospace; font-size: 10pt; box-sizing: border-box;"></td>
            <td class="spacer" style="width: 30px; background: white; border: 1px solid #dee2e6; vertical-align: middle; padding: 6px 8px;">&nbsp;</td>
            <td class="label" style="width: 150px; font-weight: bold; background: #f8f9fa; text-align: right; padding: 6px 12px 6px 8px; white-space: nowrap; vertical-align: middle; border: 2px solid #dee2e6;">Country: *</td>
            <td class="input" style="width: 200px; padding: 8px; vertical-align: middle; border: 2px solid #dee2e6;"><input type="text" value="${currentUser.companyAddress.country}" style="width: 100%; padding: 2px 2px; border: 2px solid #75b9fe; border-radius: 3px; background: #FFFACD; font-family: Consolas, monospace; font-size: 10pt; box-sizing: border-box;"></td>
          </tr>
          
          <!-- ACCESS & SECURITY (with 2FA) Section -->
          <tr>
            <td colspan="5" class="section-header" style="font-weight: bold; font-size: 10pt; background: #e9ecef; text-align: left; padding: 10px 12px; color: #495057; border: 1px solid #dee2e6; border-bottom: 2px solid #adb5bd;">ACCESS & SECURITY</td>
          </tr>
          <tr>
            <td class="label" style="width: 150px; font-weight: bold; background: #f8f9fa; text-align: right; padding: 6px 12px 6px 8px; white-space: nowrap; vertical-align: middle; border: 2px solid #dee2e6;">Access Level: *</td>
            <td class="input" style="width: 200px; padding: 8px; vertical-align: middle; border: 2px solid #dee2e6;">
              <select style="width: 100%; padding: 2px 2px; border: 2px solid #75b9fe; border-radius: 3px; background: #FFFACD; font-family: Consolas, monospace; font-size: 10pt; box-sizing: border-box;">
                <option value="0" ${currentUser.defaultAccessLevel === 0 ? 'selected' : ''}>0 - Full Admin/Developer</option>
                <option value="1" ${currentUser.defaultAccessLevel === 1 ? 'selected' : ''}>1 - Full Admin/User Management</option>
                <option value="2" ${currentUser.defaultAccessLevel === 2 ? 'selected' : ''}>2 - Admin (no field/user mgmt)</option>
              </select>
            </td>
            <td class="spacer" style="width: 30px; background: white; border: 1px solid #dee2e6; vertical-align: middle; padding: 6px 8px;">&nbsp;</td>
            <td class="label" style="width: 150px; font-weight: bold; background: #f8f9fa; text-align: right; padding: 6px 12px 6px 8px; white-space: nowrap; vertical-align: middle; border: 2px solid #dee2e6;">2FA Method: *</td>
            <td class="input" style="width: 200px; padding: 8px; vertical-align: middle; border: 2px solid #dee2e6;">
              <select style="width: 100%; padding: 2px 2px; border: 2px solid #75b9fe; border-radius: 3px; background: #FFFACD; font-family: Consolas, monospace; font-size: 10pt; box-sizing: border-box;">
                <option value="email" ${currentUser.twoFactorMethod === 'email' ? 'selected' : ''}>Email</option>
                <option value="totp" ${currentUser.twoFactorMethod === 'totp' ? 'selected' : ''}>TOTP (Authenticator App)</option>
                <option value="none" ${currentUser.twoFactorMethod === 'none' ? 'selected' : ''}>None</option>
              </select>
            </td>
          </tr>
          <tr>
            <td class="label" style="width: 150px; font-weight: bold; background: #f8f9fa; text-align: right; padding: 6px 12px 6px 8px; white-space: nowrap; vertical-align: middle; border: 2px solid #dee2e6;">Current Method:</td>
            <td class="input-readonly" style="width: 200px; padding: 4px 6px; background: #f8f9fa; color: #6c757d; font-family: Consolas, monospace; font-size: 9pt; vertical-align: middle; border: 2px solid #dee2e6;">${currentUser.twoFactorMethod}</td>
            <td class="spacer" style="width: 30px; background: white; border: 1px solid #dee2e6; vertical-align: middle; padding: 6px 8px;">&nbsp;</td>
            <td class="label" style="width: 150px; font-weight: bold; background: #f8f9fa; text-align: right; padding: 6px 12px 6px 8px; white-space: nowrap; vertical-align: middle; border: 2px solid #dee2e6;">Status:</td>
            <td class="input-readonly" style="width: 200px; padding: 4px 6px; background: #f8f9fa; color: #6c757d; font-family: Consolas, monospace; font-size: 9pt; vertical-align: middle; border: 2px solid #dee2e6;">
              <span class="status-badge ${currentUser.twoFactorMethod === 'email' ? 'inactive' : 'active'}" style="padding: 4px 8px; border-radius: 4px; font-size: 8pt; font-weight: 600; display: inline-block; ${currentUser.twoFactorMethod === 'email' ? 'background: #f8d7da; color: #721c24; border: 1px solid #f5c6cb;' : 'background: #d4edda; color: #155724; border: 1px solid #c3e6cb;'}">${currentUser.twoFactorMethod === 'email' ? '⚠ Email Only' : '✓ Secure'}</span>
            </td>
          </tr>
          
          <!-- ASSIGNED CHECKLISTS Section -->
          <tr>
            <td colspan="5" class="section-header" style="font-weight: bold; font-size: 10pt; background: #e9ecef; text-align: left; padding: 10px 12px; color: #495057; border: 1px solid #dee2e6; border-bottom: 2px solid #adb5bd;">ASSIGNED CHECKLISTS (${currentUser.checklists ? currentUser.checklists.length : 0})</td>
          </tr>
          <tr>
            <td colspan="5" class="checklist-cell" style="padding: 8px; background: #f8f9fa; vertical-align: middle; border: 2px solid #dee2e6;">
              <div class="checklist-display" style="max-height: 100px; overflow-y: auto; border: 1px solid #ccc; padding: 8px; background: #f8f9fa; font-family: Consolas, monospace; font-size: 9pt;">
                ${currentUser.checklists && currentUser.checklists.length > 0 ? 
                  currentUser.checklists.map(checklist => 
                    `<div><strong>${checklist.name}</strong> (Access Level: ${checklist.accessLevel}) - Last accessed: ${checklist.lastAccessed}</div>`
                  ).join('') : 
                  '<div style="color: #6c757d; font-style: italic;">No checklists assigned</div>'
                }
              </div>
            </td>
          </tr>
        </table>
      </div> <!-- End modal-body -->
    </div> <!-- End user-management-container -->
  `;
  
  // Clear container and add user management interface
  container.innerHTML = userManagementHTML;
  
  // Ensure the container uses the full height by setting specific styles
  container.style.height = '100%';
  container.style.overflow = 'hidden';
  container.style.padding = '0';
  container.style.margin = '0';
  
  // Setup event listeners for the new interface
  setupUserManagementContainerEventListeners();
  
  console.log('[User Management] Container view created successfully');
}

/**
 * Setup event listeners for user management in container
 */
function setupUserManagementContainerEventListeners() {
  const container = document.getElementById('checklistContainer');
  if (!container) return;
  
  // Use event delegation for all buttons
  container.addEventListener('click', (e) => {
    const action = e.target.getAttribute('data-action');
    if (!action) return;
    
    console.log('[User Management] Button clicked:', action);
    
    switch (action) {
      case 'close':
      case 'cancel':
        // Return to main checklist view
        container.innerHTML = '<div style="padding: 20px; text-align: center; color: #6c757d;">Select a checklist to view</div>';
        break;
        
      case 'prev-user':
        if (currentUserIndex > 0) {
          currentUserIndex--;
          createUserManagementInContainer();
        }
        break;
        
      case 'next-user':
        if (currentUserIndex < usersData.users.length - 1) {
          currentUserIndex++;
          createUserManagementInContainer();
        }
        break;
        
      case 'setup-totp':
        showNotification('info', 'TOTP setup functionality will be implemented');
        break;
        
      case 'new-user':
        showNotification('info', 'New user functionality will be implemented');
        break;
        
      case 'delete-user':
        showNotification('warning', 'Delete user functionality will be implemented');
        break;
        
      case 'add-collaborator':
        showNotification('info', 'Add collaborator functionality will be implemented - this will update checklist data');
        break;
        
      case 'save-send-email':
        showNotification('info', 'Save and send email functionality will be implemented');
        break;
        
      case 'save-exit':
        showNotification('success', 'User data saved (simulated)');
        // Return to main checklist view
        container.innerHTML = '<div style="padding: 20px; text-align: center; color: #6c757d;">Select a checklist to view</div>';
        break;
        
      default:
        console.log('[User Management] Unknown action:', action);
    }
  });
}

// Make closeUserManagementDialog available globally for the close button
window.closeUserManagementDialog = closeUserManagementDialog;
