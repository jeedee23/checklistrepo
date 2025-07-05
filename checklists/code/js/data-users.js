// --data-users.js--
import { sharedState } from './constants.js';
import { markSaveDirty } from './data2.js';
import { WORKER_URL, USER_CONFIG_PATH } from './constants.js';
/**
 * Render the checklist's collaborators list in the UI.
 */
export function renderCollaborators() {
  const listEl = document.getElementById('collaboratorList');
  if (!listEl) return;
  listEl.innerHTML = '';
  const collaborators = sharedState.checklistData.sources?.collaborators || [];
  collaborators.forEach(name => {
    const li = document.createElement('li');
    const user = sharedState.usersData.users.find(u => u.username.toLowerCase() === name.toLowerCase());
    if (user && user.token) {
      const a = document.createElement('a');
      a.textContent = name;
      a.href = `${location.origin}/?user=${encodeURIComponent(user.username)}&token=${user.token}`;
      a.target = "_blank";
      a.title = `Login as ${user.username}`;
      li.appendChild(a);
    } else {
      li.textContent = name;
    }
    listEl.appendChild(li);
  });
}

/**
 * Initialize collaborator-adding UI.
 * Should be called after checklistData is loaded.
 */
export function initCollaboratorUI() {
  renderCollaborators();
  const btn = document.getElementById('addCollaboratorBtn');
  if (!btn) return;
  btn.addEventListener('click', async () => {
    const name = prompt('Enter new collaborator name:')?.trim();
    if (!name) return;
    
    // Ensure sources.collaborators exists
    if (!sharedState.checklistData.sources) {
      sharedState.checklistData.sources = {};
    }
    if (!sharedState.checklistData.sources.collaborators) {
      sharedState.checklistData.sources.collaborators = [];
    }
    
    if (sharedState.checklistData.sources.collaborators.includes(name)) {
      return alert('⚠️ Collaborator already exists in this checklist.');
    }
    sharedState.checklistData.sources.collaborators.push(name);
    markSaveDirty(true);
    renderCollaborators();
    try {
      const res = await fetch(`${WORKER_URL}/?file=${encodeURIComponent(USER_CONFIG_PATH)}`);
      if (!res.ok) throw new Error(`Fetch users.json failed (${res.status})`);
      const config = await res.json();
      const exists = config.users.some(u => u.username.toLowerCase() === name.toLowerCase());
      if (exists) {
        alert(`✅ "${name}" already exists in users.json. No duplicate created.`);
        return;
      }
      const buf = new Uint8Array(16);
      crypto.getRandomValues(buf);
      const token = Array.from(buf).map(b => b.toString(16).padStart(2,'0')).join('');
      config.users.push({ username: name, passwordHash: '', token, created: new Date().toISOString() });
      const saveRes = await fetch(`${WORKER_URL}/save`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ file: USER_CONFIG_PATH, json: config, message: `Add user ${name}` })
      });
      if (!saveRes.ok) throw new Error(await saveRes.text());
      alert(`✅ "${name}" added with token:

${token}`);
      sharedState.usersData = config;
      renderCollaborators();
    } catch (err) {
      console.error(err);
      alert('❌ Failed to update users.json: ' + err.message);
    }
  });
}

/**
 * Load users and access-level definitions (if separate from users.json)
 */
export async function loadUserDefinitions() {
  // TODO: fetch access levels, default boundaries
}

/**
 * Create a new user (admin only)
 * @param {Object} newUser - { username, fullName, email, role, accessLevel, ... }
 */
export function addUser(newUser) {
  // TODO: validate, push into sharedState.usersData.users, call saveUsersJson()
}

/**
 * Update an existing user's properties
 * @param {string} userId
 * @param {Object} updates - fields to change
 */
export function editUser(userId, updates) {
  // TODO: find user in sharedState.usersData.users, apply updates, save
}

/**
 * Remove a user (admin only)
 * @param {string} userId
 */
export function removeUser(userId) {
  // TODO: delete from sharedState.usersData.users, save users.json
}

/**
 * Determine visibility of fields/actions based on currentUser accessLevel
 * @param {number} requiredLevel
 * @returns {boolean}
 */
export function hasAccess(requiredLevel) {
  // TODO: lookup currentUser in sharedState.usersData and compare accessLevel
  return true;
}
