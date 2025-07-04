
// Import necessary variables and functions from user-management.js
import { 
  usersData, 
  currentUserIndex, 
  buildChecklistsDisplay,
  closeUserManagementDialog,
  setupTOTP,
  previousUser,
  nextUser,
  newUser,
  deleteUser,
  addCollaborator,
  saveUserAndSendEmail,
  saveAndExit
} from './user-management.js';

// Make functions available globally for onclick handlers
window.closeUserManagementDialog = closeUserManagementDialog;
window.setupTOTP = setupTOTP;
window.previousUser = previousUser;
window.nextUser = nextUser;
window.newUser = newUser;
window.deleteUser = deleteUser;
window.addCollaborator = addCollaborator;
window.saveUserAndSendEmail = saveUserAndSendEmail;
window.saveAndExit = saveAndExit;

export function createUserManagementDialog() {
  console.log('[User Management] Creating dialog, users data:', usersData);
  
  // Create or get existing modal
  let dialog = document.getElementById('user-management-dialog');
  if (!dialog) {
    console.log('[User Management] Creating new dialog element');
    dialog = document.createElement('div');
    dialog.id = 'user-management-dialog';
    dialog.className = 'modal-dialog';
    dialog.style.cssText = `
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      background: white;
      border-radius: 8px;
      box-shadow: 0 10px 30px rgba(0,0,0,0.3);
      width: 1200px;
      max-width: 95vw;
      height: 800px;
      max-height: 95vh;
      overflow: hidden;
      z-index: 10000;
      display: flex;
      flex-direction: column;
    `;
    document.body.appendChild(dialog);
  } else {
    console.log('[User Management] Using existing dialog element');
  }
  
  // Get current user data
  const currentUser = usersData.users[currentUserIndex];
  const userCount = usersData.users.length;
  
  // Complete user management form with dynamic data
  dialog.innerHTML = `
    <style>
      #user-management-dialog .modal-header {
        padding: 3px;
        border-bottom: 1px solid #dee2e6;
        display: flex;
        justify-content: space-between;
        align-items: center;
        background-color: #f8f9fa;
        flex-shrink: 0;
      }
      
      #user-management-dialog .modal-header h3 {
        margin: 0;
        color: #495057;
      }
      
      #user-management-dialog .close-button {
        background: none;
        border: none;
        font-size: 1.5rem;
        cursor: pointer;
        color: #6c757d;
        padding: 0;
        width: 30px;
        height: 30px;
        display: flex;
        align-items: center;
        justify-content: center;
      }
      
      #user-management-dialog .modal-body {
        padding: 3px;
        background: #f5f5f5;
        flex: 1;
        overflow: hidden;
        display: flex;
        flex-direction: column;
      }
      
      #user-management-dialog .user-navigation {
        margin-bottom: 3px;
        padding: 3px;
        background: #e9ecef;
        border-radius: 4px;
        border: 1px solid #dee2e6;
        display: flex;
        justify-content: space-between;
        align-items: center;
        flex-shrink: 0;
      }
      
      #user-management-dialog .user-navigation span {
        font-weight: bold;
        font-size: 1.1em;
      }
      
      #user-management-dialog .user-navigation button {
        padding: 3px;
        margin: 0 2px;
        border: 1px solid #ced4da;
        border-radius: 4px;
        background: white;
        cursor: pointer;
        font-size: 0.9rem;
      }
      
      #user-management-dialog .user-navigation .btn {
        padding: 3px;
        margin-left: 3px;
        font-size: 0.8rem;
        color: white;
        background-color: #6c757d;
        border: none;
      }
      
      #user-management-dialog .form-table {
        width: 100%;
        border-collapse: collapse;
        font-family: Consolas, monospace;
        font-size: 10pt;
      }
      
      #user-management-dialog .form-table td {
        padding: 3px;
        vertical-align: middle;
        border: 2px solid #dee2e6;
      }
      
      #user-management-dialog .section-header {
        font-weight: bold;
        font-size: 10pt;
        background: #e9ecef;
        text-align: left;
        padding: 3px;
        color: #495057;
        border: 1px solid #dee2e6;
        border-bottom: 2px solid #adb5bd;
      }
      
      #user-management-dialog .label {
        width: 150px;
        font-weight: bold;
        background: #f8f9fa;
        text-align: right;
        padding-right: 3px;
        white-space: nowrap;
      }
      
      #user-management-dialog .input {
        width: 200px;
        padding: 3px;
      }
      
      #user-management-dialog .input input,
      #user-management-dialog .input select {
        width: 100%;
        padding: 2px;
        border: 2px solid #75b9fe;
        border-radius: 3px;
        background: #FFFACD;
        font-family: Consolas, monospace;
        font-size: 10pt;
        box-sizing: border-box;
      }
      
      #user-management-dialog .input input[readonly] {
        background: transparent;
        color: #6c757d;
        cursor: not-allowed;
      }
      
      #user-management-dialog .input-readonly {
        width: 200px;
        padding: 3px;
        background: #f8f9fa;
        color: #6c757d;
        font-family: Consolas, monospace;
        font-size: 9pt;
      }
      
      #user-management-dialog .spacer {
        width: 30px;
        background: white;
        border: 1px solid #dee2e6;
      }
      
      #user-management-dialog .checklist-cell {
        padding: 3px;
        background: #f8f9fa;
        vertical-align: top;
        height: 200px;
      }
      
      #user-management-dialog .checklist-display {
        height: 190px;
        overflow-y: auto;
        border: 1px solid #ccc;
        padding: 3px;
        background: #f8f9fa;
        font-family: Consolas, monospace;
        font-size: 9pt;
      }
      
      #user-management-dialog .checklist-item {
        padding: 3px;
        margin: 1px 0;
        background: white;
        border: 1px solid #dee2e6;
        border-radius: 3px;
        cursor: pointer;
      }
      
      #user-management-dialog .checklist-item:hover {
        background: #e9ecef;
      }
      
      #user-management-dialog .status-badge {
        padding: 2px 3px;
        border-radius: 4px;
        font-size: 8pt;
        font-weight: 600;
        display: inline-block;
      }
      
      #user-management-dialog .status-badge.active {
        background: #d4edda;
        color: #155724;
        border: 1px solid #c3e6cb;
      }
      
      #user-management-dialog .status-badge.inactive {
        background: #f8d7da;
        color: #721c24;
        border: 1px solid #f5c6cb;
      }
      
      #user-management-dialog .btn {
        padding: 3px;
        border: none;
        border-radius: 4px;
        cursor: pointer;
        font-size: 0.9rem;
        margin: 0 2px;
      }
      
      #user-management-dialog .btn-primary { background-color: #007bff; color: white; }
      #user-management-dialog .btn-success { background-color: #28a745; color: white; }
      #user-management-dialog .btn-secondary { background-color: #6c757d; color: white; }
      #user-management-dialog .btn-danger { background-color: #dc3545; color: white; }
    </style>
    
    <div class="modal-header">
      <h3>Edit Users (${currentUserIndex + 1} of ${userCount})</h3>
      <button class="close-button" onclick="closeUserManagementDialog()">×</button>
    </div>
    
    <div class="modal-body">
      <div class="user-navigation">
        <div>
          <span>${currentUser.fullName || 'Unknown'} (${currentUser.username || 'unknown'})</span>
          <button class="btn btn-secondary" onclick="setupTOTP()">Setup TOTP</button>
        </div>
        <div>
          <button onclick="previousUser()" ${currentUserIndex === 0 ? 'disabled' : ''}>← Previous</button>
          <button onclick="nextUser()" ${currentUserIndex === userCount - 1 ? 'disabled' : ''}>Next →</button>
        </div>
      </div>
      
      <!-- Action buttons moved to top -->
      <div style="margin-bottom: 3px; padding: 3px; background: #e9ecef; border-radius: 4px; border: 1px solid #dee2e6; display: flex; justify-content: space-between; align-items: center; flex-shrink: 0;">
        <div>
          <button class="btn btn-success" onclick="newUser()">+ New User</button>
          <button class="btn btn-danger" onclick="deleteUser()">Delete User</button>
          <button class="btn btn-secondary" onclick="addCollaborator()">Add to Checklist as Collaborator</button>
        </div>
        <div>
          <button class="btn btn-primary" onclick="saveUserAndSendEmail()">Save User & Send Email</button>
          <button class="btn btn-success" onclick="saveAndExit()">Save & Exit</button>
          <button class="btn btn-secondary" onclick="closeUserManagementDialog()">Cancel</button>
        </div>
      </div>
      
      <table class="form-table">
        <!-- PERSONAL DATA Section -->
        <tr>
          <td colspan="5" class="section-header">PERSONAL DATA</td>
        </tr>
        <tr>
          <td class="label">User ID: *</td>
          <td class="input"><input type="text" value="${currentUser.id || ''}" readonly></td>
          <td class="spacer">&nbsp;</td>
          <td class="label">Username: *</td>
          <td class="input"><input type="text" value="${currentUser.username || ''}" id="username-input"></td>
        </tr>
        <tr>
          <td class="label">Full Name: *</td>
          <td class="input"><input type="text" value="${currentUser.fullName || ''}" id="fullname-input"></td>
          <td class="spacer">&nbsp;</td>
          <td class="label">Email: *</td>
          <td class="input"><input type="email" value="${currentUser.email || ''}" id="email-input"></td>
        </tr>
        <tr>
          <td class="label">Phone Number: *</td>
          <td class="input"><input type="tel" value="${currentUser.phoneNumber || ''}" id="phone-input"></td>
          <td class="spacer">&nbsp;</td>
          <td class="label">Role: *</td>
          <td class="input">
            <select id="role-select">
              <option value="user" ${currentUser.role === 'user' ? 'selected' : ''}>User</option>
              <option value="admin" ${currentUser.role === 'admin' ? 'selected' : ''}>Admin</option>
            </select>
          </td>
        </tr>
        
        <!-- COMPANY INFORMATION & ADDRESS Section -->
        <tr>
          <td colspan="5" class="section-header">COMPANY INFORMATION & ADDRESS</td>
        </tr>
        <tr>
          <td class="label">Job Function: *</td>
          <td class="input"><input type="text" value="${currentUser.jobFunction || ''}" id="jobfunction-input"></td>
          <td class="spacer">&nbsp;</td>
          <td class="label">Company: *</td>
          <td class="input"><input type="text" value="${currentUser.company || ''}" id="company-input"></td>
        </tr>
        <tr>
          <td class="label">Street: *</td>
          <td class="input"><input type="text" value="${currentUser.companyAddress?.street || ''}" id="street-input"></td>
          <td class="spacer">&nbsp;</td>
          <td class="label">Postal Code: *</td>
          <td class="input"><input type="text" value="${currentUser.companyAddress?.postalCode || ''}" id="postalcode-input"></td>
        </tr>
        <tr>
          <td class="label">City: *</td>
          <td class="input"><input type="text" value="${currentUser.companyAddress?.city || ''}" id="city-input"></td>
          <td class="spacer">&nbsp;</td>
          <td class="label">Country: *</td>
          <td class="input"><input type="text" value="${currentUser.companyAddress?.country || ''}" id="country-input"></td>
        </tr>
        
        <!-- ACCESS & SECURITY Section -->
        <tr>
          <td colspan="5" class="section-header">ACCESS & SECURITY</td>
        </tr>
        <tr>
          <td class="label">Access Level: *</td>
          <td class="input">
            <select id="accesslevel-select">
              <option value="0" ${currentUser.defaultAccessLevel === 0 ? 'selected' : ''}>0 - Full Admin/Developer</option>
              <option value="1" ${currentUser.defaultAccessLevel === 1 ? 'selected' : ''}>1 - Full Admin/User Management</option>
              <option value="2" ${currentUser.defaultAccessLevel === 2 ? 'selected' : ''}>2 - Admin (no field/user mgmt)</option>
              <option value="3" ${currentUser.defaultAccessLevel === 3 ? 'selected' : ''}>3 - User (read/write)</option>
              <option value="4" ${currentUser.defaultAccessLevel === 4 ? 'selected' : ''}>4 - User (read only)</option>
              <option value="5" ${currentUser.defaultAccessLevel === 5 ? 'selected' : ''}>5 - Guest (limited access)</option>
            </select>
          </td>
          <td class="spacer">&nbsp;</td>
          <td class="label">2FA Method: *</td>
          <td class="input">
            <select id="twofa-select">
              <option value="email" ${currentUser.twoFactorMethod === 'email' ? 'selected' : ''}>Email</option>
              <option value="totp" ${currentUser.twoFactorMethod === 'totp' ? 'selected' : ''}>TOTP (Authenticator App)</option>
              <option value="none" ${currentUser.twoFactorMethod === 'none' ? 'selected' : ''}>None</option>
            </select>
          </td>
        </tr>
        <tr>
          <td class="label">Current Method:</td>
          <td class="input-readonly">${currentUser.twoFactorMethod || 'email'}</td>
          <td class="spacer">&nbsp;</td>
          <td class="label">Status:</td>
          <td class="input-readonly">
            <span class="status-badge ${currentUser.twoFactorMethod === 'email' ? 'inactive' : 'active'}">
              ${currentUser.twoFactorMethod === 'email' ? '⚠ Email Only' : '✓ Secure'}
            </span>
          </td>
        </tr>
        
        <!-- ASSIGNED CHECKLISTS Section -->
        <tr>
          <td colspan="5" class="section-header">ASSIGNED CHECKLISTS (${currentUser.checklists ? currentUser.checklists.length : 0})</td>
        </tr>
        <tr>
          <td colspan="5" class="checklist-cell">
            <div class="checklist-display">
              ${buildChecklistsDisplay(currentUser.checklists)}
            </div>
          </td>
        </tr>
      </table>
    </div>
  `;
  
  // Show the dialog
  dialog.style.display = 'flex';
  console.log('[User Management] Dialog should now be visible');
}