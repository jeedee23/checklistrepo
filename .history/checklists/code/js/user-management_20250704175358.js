/**
 * User Management Dialog
 * Provides CRUD operations for user accounts with 2FA support
 */

import { showToast, showSuccess, showError, showWarning, showInfo } from './ui-notifications.js';
import { WORKER_URL, USER_CONFIG_PATH, sharedState } from './constants.js';
import{ createUserManagementDialog} from './UserManagementDialog.js';
let usersData = null;
let currentUserIndex = 0;
let isEditing = false;
let eventListenersAttached = false;

// Export getter functions for variables needed by UserManagementDialog.js
export function getUsersData() { return usersData; }
export function getCurrentUserIndex() { return currentUserIndex; }
export function setCurrentUserIndex(index) { currentUserIndex = index; }

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


/**
 * Build the checklists display for current user
 */
function buildChecklistsDisplay(checklists) {
  if (!checklists || checklists.length === 0) {
    return '<div style="color: #6c757d; font-style: italic; text-align: center; padding: 20px;">No checklists assigned</div>';
  }
  
  return checklists.map(checklist => `
    <div class="checklist-item" onclick="openAccessManager('${checklist.name}')">
      <div><strong>${checklist.name}</strong></div>
      <div style="font-size: 8pt; color: #6c757d;">
        Access Level: ${checklist.accessLevel} | Last accessed: ${checklist.lastAccessed || 'Never'}
      </div>
    </div>
  `).join('');
}

/**
 * Navigation functions
 */
function previousUser() {
  if (currentUserIndex > 0) {
    currentUserIndex--;
    createUserManagementDialog();
  }
}

export function nextUser() {
  if (currentUserIndex < usersData.users.length - 1) {
    currentUserIndex++;
    createUserManagementDialog();
  }
}

/**
 * Close the user management dialog
 */
/**
 * Open access manager for a specific checklist
 */
function openAccessManager(checklistName) {
  console.log('[User Management] Opening access manager for:', checklistName);
  
  // Create access manager dialog
  let accessDialog = document.getElementById('access-manager-dialog');
  if (!accessDialog) {
    accessDialog = document.createElement('div');
    accessDialog.id = 'access-manager-dialog';
    accessDialog.style.cssText = `
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      background: white;
      border-radius: 8px;
      box-shadow: 0 10px 30px rgba(0,0,0,0.3);
      width: 800px;
      max-width: 90vw;
      height: 600px;
      max-height: 90vh;
      overflow: hidden;
      z-index: 10001;
      display: flex;
      flex-direction: column;
      border: 2px solid #007bff;
    `;
    document.body.appendChild(accessDialog);
  }
  
  accessDialog.innerHTML = `
    <div style="padding: 20px; text-align: center; background: #f8f9fa; border-bottom: 1px solid #dee2e6;">
      <h3 style="margin: 0; color: #495057;">Access Manager</h3>
      <p style="margin: 10px 0 0 0; color: #6c757d;">Checklist: ${checklistName}</p>
      <button onclick="closeAccessManager()" style="position: absolute; top: 15px; right: 15px; background: none; border: none; font-size: 1.5rem; cursor: pointer; color: #6c757d;">×</button>
    </div>
    <div style="flex: 1; padding: 20px; display: flex; align-items: center; justify-content: center; font-size: 24px; color: #007bff;">
      Access Manager
    </div>
  `;
  
  accessDialog.style.display = 'flex';
}

/**
 * Close access manager dialog
 */
function closeAccessManager() {
  const accessDialog = document.getElementById('access-manager-dialog');
  if (accessDialog) {
    accessDialog.style.display = 'none';
  }
}

/**
 * Placeholder functions for buttons
 */
export function setupTOTP() {
  console.log('[User Management] Setup TOTP clicked');
  alert('TOTP setup not implemented yet');
}

export function newUser() {
  console.log('[User Management] New user clicked');
  alert('New user functionality not implemented yet');
}

export function deleteUser() {
  console.log('[User Management] Delete user clicked');
  alert('Delete user functionality not implemented yet');
}

export function addCollaborator() {
  console.log('[User Management] Add collaborator clicked');
  alert('Add collaborator functionality not implemented yet');
}

export function saveUserAndSendEmail() {
  console.log('[User Management] Save user and send email clicked');
  alert('Save user and send email functionality not implemented yet');
}

// Make functions available globally for onclick handlers
window.previousUser = previousUser;
window.nextUser = nextUser;
window.closeUserManagementDialog = closeUserManagementDialog;
window.openAccessManager = openAccessManager;
window.closeAccessManager = closeAccessManager;
window.setupTOTP = setupTOTP;
window.newUser = newUser;
window.deleteUser = deleteUser;
window.addCollaborator = addCollaborator;
window.saveUserAndSendEmail = saveUserAndSendEmail;
window.saveAndExit = saveAndExit;

/**
 * Build the user management dialog content
 */
function buildUserManagementDialog(dialog) {
  console.log('[User Management] Building dialog content');
  const startTime = performance.now();
  
  const currentUser = usersData.users[currentUserIndex];
  const userCount = usersData.users.length;
  
  dialog.innerHTML = ``;
  
  // Attach event listeners
  attachUserManagementEventListeners();
  
  const endTime = performance.now();
  console.log(`[User Management] Dialog built in ${endTime - startTime}ms`);
}

/**
 * Build the checklists display for current user
 */
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
export async function saveAndExit() {
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
export function closeUserManagementDialog() {
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



// Make closeUserManagementDialog available globally for the close button
window.closeUserManagementDialog = closeUserManagementDialog;
