// --auth-login.js--
import { sharedState, WORKER_URL, USER_CONFIG_PATH, CHECKLISTS_DIR } from './constants.js';
import { getQueryParam } from './utils.js';
import { loadChecklist } from './data.js';



export async function loadUsersData() {
  try {
    const res = await fetch(`${WORKER_URL}/?file=${encodeURIComponent(USER_CONFIG_PATH)}`);
    if (!res.ok) throw new Error(`Failed to fetch users.json: ${res.status}`);
    sharedState.usersData = await res.json();
  } catch (err) {
    console.error('Could not load users.json:', err);
  }
}

export async function fetchUserList() {
  await loadUsersData();
  return sharedState.usersData.users;
}

export async function secureLogin() {
  const userInput = (document.getElementById('loginUser')?.value || '').trim();
  const passInput = (document.getElementById('loginPass')?.value || '').trim();
  if (!userInput || !passInput) return showLoginError('Please enter both username and password');

  const users = await fetchUserList();
  const user = users.find(u => u.username.toLowerCase() === userInput.toLowerCase());
  if (!user) return showLoginError('User not found');

  const match = bcrypt.compareSync(passInput, user.passwordHash);
  if (!match) return showLoginError('Incorrect password');

  await finishLogin(user);
}

export async function tryAutoLoginFromURL() {
  const userParam = getQueryParam('user');
  const tokenParam = getQueryParam('token');
  if (!userParam || !tokenParam) return;
  const users = await fetchUserList();
  const user = users.find(u =>
    u.username.toLowerCase() === userParam.toLowerCase() && u.token === tokenParam
  );
  if (user) await finishLogin(user);
}

export async function finishLogin(user) {
  // Prevent multiple login-triggered loads
  if (sharedState._loginDone) {
    console.log('finishLogin already executed; skipping.');
    return;
  }
  sharedState.currentUser = user.username;

  const userEl = document.getElementById('loggedInUser');
  if (userEl) userEl.textContent = `👤 ${user.username}`;
  document.getElementById('identityOverlay').style.display = 'none';

  const loggedUser = sharedState.usersData.users.find(u => u.username.toLowerCase() === user.username.toLowerCase());
  // Default path if user has no recent checklists
  let path = 'checklists/placeholder.json';
  
  // Find the most recent checklist the user accessed
  if (loggedUser && Array.isArray(loggedUser.checklists) && loggedUser.checklists.length) {
    // Filter checklists with lastAccessed timestamp and sort by most recent
    const recentChecklists = loggedUser.checklists
      .filter(c => c.lastAccessed)
      .sort((a, b) => new Date(b.lastAccessed) - new Date(a.lastAccessed));
    
    // Only use the most recent one
    if (recentChecklists.length > 0) {
      path = `${CHECKLISTS_DIR}/${recentChecklists[0].id}`;
      console.log(`Loading most recent checklist for ${user.username}: ${path}`);
    }
  }
  
  // Set the file path and load only this checklist
  sharedState.FILE_PATH = path;
  await loadChecklist(path);
  // Mark that the initial login load is complete
  sharedState._loadedByLogin = true;
  // Populate the sidebar after login
  try {
    await fetchChecklists();
  } catch {}
  // Mark login initialization complete
  sharedState._loginDone = true;
}

export async function updateUsersJson(filename, username, timestamp) {
  try {
    await loadUsersData();
    const user = sharedState.usersData.users.find(u => u.username.toLowerCase() === username.toLowerCase());
    if (!user) throw new Error(`User "${username}" not found in users.json`);

    let entry = user.checklists.find(c => c.id === filename);
    if (!entry) {
      entry = {
        id: filename,
        displayName: filename.replace(/\.json$/, ''),
        accessLevel: user.defaultAccessLevel || 0,
        lastAccessed: null
      };
      user.checklists.push(entry);
    }
    entry.lastAccessed = timestamp;

    const res = await fetch(`${WORKER_URL}/save`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ file: USER_CONFIG_PATH, json: sharedState.usersData, message: `Update users.json ⏱ ${username}/${filename}` })
    });
    if (!res.ok) throw new Error(await res.text());
  } catch (err) {
    console.error('⚠️ Failed to update users.json:', err);
  }
}
