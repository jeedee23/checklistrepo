const OWNER = 'jeedee23';
const REPO = 'checklistrepo';
const BRANCH = 'main';

const urlParams = new URLSearchParams(window.location.search);
 FILE_PATH = urlParams.get("file") || "checklists/placeholder.json";

let originalChecklistData = null;
let inactivityTimer       = null;
const INACTIVITY_LIMIT    = 15 * 60 * 1000; // 15 min

// track the time‐stamp this file was last saved on the server
let loadedFileTimestamp = null;
// handle to our 5-minute timeout
let loadedFileTimestampTimer = null;

const container = document.getElementById('checklistContainer');
// count how many edits the user has made since load or last save
let changeCount = 0;

let checklistData = { collaborators: [], items: [], layout: {} };
let usersData = { users: [], version: null, updatedAt: null, updatedBy: null };
let isDirty = false;
let layoutDirty = false;
let readyForEdits = false;
let selectedItem = null;
let currentUser = null;
let currentNoteFile = null;
let currentNoteTargetItem = null;
let userRole = null;
let allowedFiles = [];
let filterActive = false;
let filterState = 'all'; // 'all' | 'done' | 'notdone'
let showOnlyMine = false;
let fieldDefs = {};
const WORKER_URL = "https://fields-proxy.johan-351.workers.dev";
// ——— Hidden file input for generic file uploads ———
const fileInput = document.createElement('input');
fileInput.type     = 'file';
fileInput.accept   = '*/*';        // allow any file type
fileInput.multiple = false;
fileInput.style.display = 'none';
fileInput.id      = 'fileInput';
fileInput.addEventListener('change', handleFileInputChange);
document.body.appendChild(fileInput);

const ColumnVisibilityMenu = {
  visible: false,
  x: 0,
  y: 0
};
let currentNoteFileSha = null;
let   isDragging = false;

let quillEditor;

let offsetX    = 0;
let offsetY    = 0;
//load usersdata
async function loadUsersData() {
  try {
    const res = await fetch(`${WORKER_URL}/load?file=checklists/config/users.json`);
    if (!res.ok) throw new Error(`Failed to fetch users.json: ${res.status}`);
    usersData = await res.json();
  } catch (err) {
    console.error("Could not load users.json:", err);
    // Fallback stays with the empty default we declared
  }
}
// Called once on startup to populate fieldDefs from config/fields.json
async function loadFieldDefinitions() {
  const res = await fetch(`${WORKER_URL}?file=checklists/config/fields.json`);
  if (!res.ok) return console.error("Failed to load fields.json");
  const json = await res.json();
  fieldDefs = json.fields || {};
}

// In your DOMContentLoaded handler:
document.addEventListener("DOMContentLoaded", () => {
  loadFieldDefinitions().then(() => {
    // everything else that needs fields…
  });
  // …
});
function triggerFileUpload() {
  fileInput.value = null;  // reset in case same file is re-picked
  fileInput.click();
}
async function handleFileInputChange(event) {
  const file = event.target.files[0];
  if (!file) return;

  // 1) Read & Base64-encode
  const dataUrl = await new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = reject;
    reader.onload  = () => resolve(reader.result);
    reader.readAsDataURL(file);
  });
  const base64 = dataUrl.split(',')[1];

  // 2) POST to /save with encoding=base64
  const uploadPath = `checklists/files/${file.name}`;
  const payload = {
    file:     uploadPath,
    content:  base64,
    encoding: 'base64',
    message:  `Upload file: ${file.name}`
  };
  const res = await fetch(`${WORKER_URL}/save`, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify(payload)
  });
  if (!res.ok) {
    const errText = await res.text();
    return alert(`❌ Upload failed: ${errText || res.statusText}`);
  }

  // 3) Attach to the selected item
  if (!selectedItem) {
    alert("⚠️ No row selected—file saved to global list only.");
    checklistData.files = checklistData.files || [];
    checklistData.files.push({
      name:       file.name,
      path:       uploadPath,
      uploadedBy: currentUser,
      uploadedAt: new Date().toISOString()
    });
  } else {
    selectedItem.files = selectedItem.files || [];
    selectedItem.files.push({
      name:       file.name,
      path:       uploadPath,
      uploadedBy: currentUser,
      uploadedAt: new Date().toISOString()
    });
  }

  // 4) Persist and redraw
  markSaveDirty(true);
  try {
    await saveChecklist();
  } catch (err) {
    console.error("Failed saving checklist after upload:", err);
    alert("⚠️ Couldn’t save checklist—see console for details.");
    return;
  }
  renderChecklist();
  alert(`✅ Uploaded and saved ${file.name}`);
}


// And adjust your viewFile to use the '?file=' loader:
function viewFile(path) {
  // Opens the file via the Worker’s ?file=… loader
  const url = `${WORKER_URL}?file=${encodeURIComponent(path)}`;
  window.open(url, '_blank');
}

function viewFile(path) {
  // open in new tab; browser will render if possible
  const url = `${WORKER_URL}/files/${encodeURIComponent(path)}`;
  window.open(url, '_blank');
}

function downloadFile(path) {
  const url  = `${WORKER_URL}/files/${encodeURIComponent(path)}`;
  const link = document.createElement('a');
  link.href    = url;
  link.download = path.split('/').pop();
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

function getQueryParam(key) {
  const urlParams = new URLSearchParams(window.location.search);
  return urlParams.get(key);
}
const PopupListState = {
  visible: false,
  anchor: null
};

const MENU_DEF = {
   'Toggle Important': () => {
        if (!selectedItem) return;
        selectedItem.important = !selectedItem.important;
        renderChecklist();
        markSaveDirty();
      },
  'Collapse All': collapseAll,
  'Expand All': expandAll,
  'New': {
    'Checklist': newChecklist,
    'Chapter': () => {
      checklistData.items.push({
        label: "New Chapter",
        done: false,
        children: [],
        unit: "", qty_est: 0, qty_real: 0, price_unit: 0,
        date: new Date().toISOString().split('T')[0],
        who: ""
      });
      markSaveDirty();
      renderChecklist();
    },
    'Item': () => {
      if (!selectedItem) return alert("⚠ No item selected.");
      selectedItem.children = selectedItem.children || [];
      selectedItem.children.push({
        label: "New Item",
        done: false,
        unit: "", qty_est: 0, qty_real: 0, price_unit: 0,
        date: new Date().toISOString().split('T')[0],
        who: "",
        children: []
      });
      markSaveDirty();
      renderChecklist();
    }
  },
  'Add': {
    'Same level': addSameLevel,
   'Sub level': () => {
  if (!selectedItem) return alert("⚠ No item selected.");
  selectedItem.children = selectedItem.children || [];
  const newItem = {
    label: "Type content here (ctrl-del to delete row)",
    done: false,
    unit: "", qty_est: 0, qty_real: 0, price_unit: 0,
    date: new Date().toISOString().split('T')[0],
    who: currentUser,
    children: []
  };
  selectedItem.children.push(newItem);

  // Save the new path
  const parentPath = selectedPath || [];
  const newPath = [...parentPath, selectedItem.children.length];
  selectedPath = newPath;
  selectedItem = newItem;

  markSaveDirty(true); changeCount++;
  renderChecklist();

  // ⌨️ Focus and select the new label input
  setTimeout(() => {
    const selector = `tr[data-path='${JSON.stringify(newPath)}'] input[type="text"]`;
    const input = document.querySelector(selector);
    if (input) {
      input.focus();
      input.select();
    }
  }, 0);
},

'Note': () => {
  if (!selectedItem) return alert("⚠ No item selected.");
  addNote();
},
   'File': triggerFileUpload
  },
  'Style': {
    'Color red': () => applyColor('rgba(255,0,0,1)'),
    'Color blue': () => applyColor('rgba(0,0,255,1)'),
    'Bold': toggleBold,
    'Reset style': resetStyle,
  },
  'Move': {
    'Up one level': moveUpLevel,
    'Down one level': moveDownLevel,
  },
  'Tools': {
    'Printable list': openPrintView,
    'Rename checklist': () => {
      const newName = prompt("Enter new checklist name:");
      if (!newName) return;
      const timestamp = FILE_PATH.split('/').pop().split('_')[0];
      const newFilename = `${timestamp}_${newName}.json`;
      sharedState.sharedState.sharedState.sharedState.sharedState.FILE_PATH = `checklists/${newFilename}`;
      updatemainstatustext(`✅ Renamed to: ${newFilename}`);
      markSaveDirty(true); changeCount++;
    },
    'Copy checklist': () => {
  const name = prompt("Name for copied checklist:");
  if (!name) return;
  const timestamp = timestampNow();
  const filename = `${timestamp}_${name}.json`;
  const path = `checklists/${filename}`;

  const content = JSON.stringify(checklistData, null, 2);

  fetch("https://fields-proxy.johan-351.workers.dev/save", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      file: path,
      json: content,
      message: `Copy checklist to ${filename}`
    })
  }).then(res => {
    if (!res.ok) throw new Error("Failed to copy checklist");
    alert("✅ Checklist copied.");
    fetchChecklists();
  }).catch(err => {
    alert("❌ " + err.message);
  });
}

  }
};
function resetFilters() {
  filterActive = false;
  showOnlyMine = false;
  selectedItem = null;
  selectedPath = null;

  const filterBtn = document.getElementById('filterBtn');
  const mineBtn = document.getElementById('onlymineBtn');

  filterBtn.textContent = '🔍 Not done';
  mineBtn.textContent = '🔍 Show Mine';

  renderChecklist();
}


function selectmine() {
  showOnlyMine = !showOnlyMine;
  selectedItem = null;
  selectedPath = null;

  const btn = document.getElementById('onlymineBtn');
  btn.textContent = showOnlyMine ? '🔍 Show All' : '🔍 Show Mine';

  renderChecklist();
}

function timestampNow() {
  const now = new Date();
  const pad = n => String(n).padStart(2, '0');
  return `${now.getFullYear()}_${pad(now.getMonth()+1)}_${pad(now.getDate())}_@_${pad(now.getHours())}-${pad(now.getMinutes())}-${pad(now.getSeconds())}`;
}

async function secureLogin() {
  const userInput = (document.getElementById("loginUser")?.value || "").trim();
  const passInput = (document.getElementById("loginPass")?.value || "").trim();
  if (!userInput || !passInput) 
    return showLoginError("Please enter both username and password");

  const users = await fetchUserList();
  const user = users.find(u =>
    u.username.toLowerCase() === userInput.toLowerCase()
  );
  if (!user) return showLoginError("User not found");

  const match = bcrypt.compareSync(passInput, user.passwordHash);
  if (!match) return showLoginError("Incorrect password");

  finishLogin(user);
}
// 3) tryAutoLoginFromURL
async function tryAutoLoginFromURL() {
  const userParam  = getQueryParam("user");
  const tokenParam = getQueryParam("token");
  if (!userParam || !tokenParam) return;

  const users = await fetchUserList();
  const user = users.find(u =>
    u.username.toLowerCase() === userParam.toLowerCase() &&
    u.token === tokenParam
  );
  if (user) finishLogin(user);
}

// 4) finishLogin
async function finishLogin(user) {
  currentUser = user.username;
  const userEl = document.getElementById('loggedInUser');
  if (userEl) userEl.textContent = `👤 ${currentUser}`;
  document.getElementById("identityOverlay").style.display = "none";

  // Use the already-loaded usersData
  const loggedUser = usersData.users.find(u =>
    u.username.toLowerCase() === currentUser.toLowerCase()
  );
  if (loggedUser && loggedUser.checklists.length) {
    const recent = loggedUser.checklists
      .filter(c => c.lastAccessed)
      .sort((a,b) => new Date(b.lastAccessed) - new Date(a.lastAccessed))[0];
    if (recent) {
      FILE_PATH = `checklists/${recent.id}`;
      await loadChecklist(FILE_PATH);
      updatemainstatustext(`📂 Auto-loaded: ${recent.displayName}`);
    } else {
      FILE_PATH = "checklists/placeholder.json";
      await loadChecklist(FILE_PATH);
    }
  } else {
    FILE_PATH = "checklists/placeholder.json";
    await loadChecklist(sharedState.FILE_PATH);
  }

  // Finally populate the sidebar
  await fetchChecklists();
}



async function checkStaleVersion() {
  try {
    const res = await fetch(`${WORKER_URL}?file=checklists/config/users.json`, { cache: 'no-cache' });
    if (!res.ok) throw new Error(res.statusText);

    const config = await res.json();
    const user = config.users.find(u => u.username.toLowerCase() === currentUser.toLowerCase());
    if (!user) throw new Error("User not found in users.json");

    const checklistEntry = user.checklists.find(c => c.id === FILE_PATH.split('/').pop());
    const serverTs = checklistEntry?.lastAccessed || null;

    if (loadedFileTimestamp && serverTs && serverTs !== loadedFileTimestamp) {
      alert("🔒 Your session has been logged out: someone else updated this checklist.");
      currentUser = null;
      readyForEdits = false;
      isDirty = false;
      document.getElementById("identityOverlay").style.display = "flex";
    }
  } catch (e) {
    console.error("Version-check failed", e);
  }
}


 async function fetchRemoteChecklist() {
   const res = await fetch(`${WORKER_URL}?file=${FILE_PATH}`,{cache:'no-cache'});
   if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
   return await res.json();
 }
 
 function mergeChecklistData(local, remote) {
   const merged = {...remote, ...local};
   if (Array.isArray(local.items) && Array.isArray(remote.items)) {
     merged.items = mergeItems(local.items, remote.items);
   }
   return merged;
 }
 
 function mergeItems(localItems, remoteItems) {
   const map = new Map();
   // start with remote
   remoteItems.forEach(item=>{
     const key = item.hns||item.label;
     map.set(key, item);
   });
   // overlay local
   localItems.forEach(item=>{
     const key = item.hns||item.label;
     if (map.has(key)) {
       map.set(key, mergeChecklistData(item, map.get(key)));
     } else {
       map.set(key, item);
     }
   });
   return Array.from(map.values());
 }
 
 async function promptMergeOnConflict() {
   try {
     const remote = await fetchRemoteChecklist();
     const merged = mergeChecklistData(checklistData, remote);
     checklistData = merged;
     renderChecklist();
     markSaveDirty(true); changeCount++;
     alert("✔️ Remote changes merged with your edits—please review and save.");
   } catch(e) {
     console.error("Merge failed",e);
     alert("❌ Could not merge remote changes automatically.");
   }
 }
function setupInactivityMonitor() {
   ['mousemove','keydown','click','scroll'].forEach(evt=>
     document.addEventListener(evt, resetInactivityTimer)
   );
   resetInactivityTimer();
 }
 
 function resetInactivityTimer() {
   if (inactivityTimer) clearTimeout(inactivityTimer);
   inactivityTimer = setTimeout(showInactivityPopup, INACTIVITY_LIMIT);
 }
 
 function showInactivityPopup() {
   let overlay = document.getElementById('inactivityOverlay');
   if (!overlay) {
     overlay = document.createElement('div');
     overlay.id = 'inactivityOverlay';
     Object.assign(overlay.style,{
       position:'fixed', top:0,left:0,right:0,bottom:0,
       background:'rgba(0,0,0,0.5)', display:'flex',
       alignItems:'center',justifyContent:'center',zIndex:9999
     });
     overlay.innerHTML=`
       <div style="background:#fff;padding:2em;border-radius:8px;text-align:center;">
         <p>You have been inactive for over 15 minutes.</p>
         <button id="inactReload">Reload</button>
         <button id="inactLogout">Logout</button>
       </div>`;
     document.body.appendChild(overlay);
     document.getElementById('inactReload')
       .addEventListener('click',()=>location.reload());
     document.getElementById('inactLogout')
       .addEventListener('click',()=>{
         currentUser = null; readyForEdits=false; isDirty=false;
         document.getElementById("identityOverlay").style.display="flex";
         overlay.remove();
       });
   }
 }

async function fetchUserList() {
  const url = `https://fields-proxy.johan-351.workers.dev?file=checklists/config/users.json`;

  const res = await fetch(url, {
    method: 'GET'
  });

  if (!res.ok) {
    console.error("Failed to fetch users.json", res.status);
    return [];
  }

  const data = await res.json();
  return data.users || [];
}


function handleImageUpload(e, callback) {
  const file = e.target.files[0];
  if (!file) return;
  markSaveDirty();
  const reader = new FileReader();
  reader.onload = function (event) {
    const dataUrl = event.target.result;
    if (!selectedItem) return alert("⚠ No item selected.");
    selectedItem.image = dataUrl;
    renderChecklist();
  };
  reader.readAsDataURL(file);
}

async function openPrintView() {
  // Build a printable HTML from checklistData
  function listHTML(items, prefix = []) {
    let html = '<ul style="margin:0; padding:0; list-style:none;">';
    items.forEach((it, idx) => {
      const number = [...prefix, idx + 1].join('.');
      const isChapter = prefix.length === 0;
      const color = it.color ? `color:${it.color};` : '';
      const style = [
        isChapter ? 'font-weight:bold; font-size:14pt;' : '',
        (!isChapter && it.bold) ? 'font-weight:bold;' : '',
        color
      ].join(' ').trim();

      const rightMeta = isChapter && (it.who || it.date)
        ? `${it.who || ''} | ${it.date || ''}`.trim().replace(/^ \| | \| $/g, '')
        : '';

      html += `
        <li style="padding:0.2rem 0; line-height:1.25;">
          <div style="display:flex; justify-content:space-between; align-items:flex-start; border-bottom:0.5px solid #ccc; width:18cm; ${style}">
            <div style="display:flex; gap:0.4rem; flex-wrap:wrap; flex-grow:1;">
              <span style="flex-shrink:0;">░</span>
              <span style="display:inline-block;">${number}</span>
              <span>${it.label}</span>
            </div>
            ${rightMeta ? `<div style="text-align:right; font-size:10pt; color:#555; white-space:nowrap; margin-left:1rem;">${rightMeta}</div>` : ''}
          </div>
        </li>`;

      if (it.children && it.children.length) {
        html += listHTML(it.children, [...prefix, idx + 1]);
      }

      if (isChapter && it.children?.length) {
        html += `<div style="margin:0 0 1rem 0;">${'<div style="border-bottom:0.5px solid #ccc; width:18cm; height:0.6cm;"></div>'.repeat(5)}</div>`;
      }
    });
    html += '</ul>';
    return html;
  }

  // Derive a clean title from the filename
  const title = sharedState.FILE_PATH
    .split('/').pop()
    .replace(/\.json$/, '')
    .replace(/^(\d{4}_\d{2}_\d{2})_@_\d{2}-\d{2}-\d{2}_?/, '')
    .replace(/_/g, ' ')
    .trim();

  const printable = `
    <html>
      <head>
        <title>Printable Checklist</title>
        <style>
          @media print {
            body { margin:1.5cm; font-family:Consolas,monospace; font-size:11pt; line-height:1.3; }
            h1 { font-size:18pt; margin:0 0 1rem 0; }
          }
          body { margin:1.5cm; font-family:Consolas,monospace; font-size:11pt; line-height:1.3; }
        </style>
      </head>
      <body>
        <h1>${title}</h1>
        ${listHTML(checklistData.items)}
        <hr style="margin:1.5rem 0; width:18cm;">
        <p>Notes:</p>
        <div style="height:4cm; border:1px solid #999; width:18cm;"></div>
      </body>
    </html>`;

  const w = window.open('');
  w.document.write(printable);
  w.document.close();
}

async function copyChecklist() {
  const name = prompt("Name for copied checklist:");
  if (!name) return;

  const timestamp = timestampNow();
  const filename = `${timestamp}_${name}.json`;
  const path = `checklists/${filename}`;
  const content = JSON.stringify(checklistData, null, 2);

  try {
    const res = await fetch(`${WORKER_URL}/save`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        file: path,
        json: content,
        message: `Copy checklist to ${filename}`
      })
    });
    if (!res.ok) throw new Error(await res.text());

    alert("✅ Checklist copied.");
    await fetchChecklists();
  } catch (err) {
    alert("❌ " + err.message);
  }
}

async function renameChecklist() {
  const newName = prompt("Enter new checklist name:");
  if (!newName) return;

  // Preserve the original timestamp prefix
  const timestamp = sharedState.FILE_PATH.split('/').pop().split('_')[0];
  const newFilename = `${timestamp}_${newName}.json`;
  sharedState.sharedState.FILE_PATH = `checklists/${newFilename}`;

  updatemainstatustext(`✅ Renamed to: ${newFilename}`);
  markSaveDirty(true); changeCount++;
}


function markSaveDirty(flag = true) {
  if (!readyForEdits) return;
  isDirty = flag;
  const btn = document.getElementById('saveChecklistButton');
  if (btn) btn.classList.toggle('dirty', isDirty);
}
async function openPrintView(){}
async function copyChecklist(){}
async function renameChecklist(){}
async function loadChecklist(path = sharedState.FILE_PATH) {
  const url = `${WORKER_URL}?file=${path}`;
  sharedState.FILE_PATH = path;

  try {
    const res = await fetch(url, { method: 'GET', cache: 'no-cache' });
    if (!res.ok) throw new Error(`Proxy error: ${res.status} ${res.statusText}`);
    checklistData = await res.json();

    // Clear existing timer
    if (loadedFileTimestampTimer) clearTimeout(loadedFileTimestampTimer);

    // Fetch the last saved timestamp from users.json
    try {
      const userRes = await fetch(`${WORKER_URL}?file=checklists/config/users.json`, { cache: 'no-cache' });
      if (userRes.ok) {
        const usersConfig = await userRes.json();
        const user = usersConfig.users.find(u => u.username.toLowerCase() === currentUser.toLowerCase());
        const entry = user.checklists.find(c => c.id === path.split('/').pop());
        loadedFileTimestamp = entry?.lastAccessed || null;
      } else {
        loadedFileTimestamp = null;
      }
    } catch (verErr) {
      console.error("Could not load users.json for version check", verErr);
      loadedFileTimestamp = null;
    }

    // Set a timeout to prompt to save changes
    loadedFileTimestampTimer = setTimeout(async () => {
      if (isDirty) {
        const edits = changeCount;
        const msg = `You have not saved your work. You have made ${edits} change${edits === 1 ? '' : 's'}. Save now?`;
        if (confirm(msg)) {
          await saveChecklist();
          changeCount = 0;
        }
      }
      await checkStaleVersion();
    }, 5 * 60 * 1000);

    if (!Array.isArray(checklistData.collaborators)) {
      checklistData.collaborators = [];
    }

    renderChecklist();
    markSaveDirty(false);
    readyForEdits = true;

    const displayName = sharedState.FILE_PATH.split('/').pop().replace(/^(\d{4}_\d{2}_\d{2})_@_\d{2}-\d{2}-\d{2}_?/, '').replace(/\.json$/, '').replace(/_/g, ' ').trim();
    document.getElementById('loadedList').textContent = displayName;

    if (typeof setupInactivityMonitor === 'function') setupInactivityMonitor();

  } catch (err) {
    const msg = `❌ Error loading checklist from ${path}: ${err.message}`;
    document.getElementById('checklistContainer').textContent = msg;
    console.error(msg, err);
  }
}



async function newChecklist() {
  const name = prompt("Enter name for the new checklist (e.g. MEAM_Intel_SSR):");
  if (!name) return;

  const timestamp = timestampNow();
  const filename  = `${timestamp}_${name}.json`;
  const path      = `checklists/${filename}`;
  sharedState.FILE_PATH       = path;  // make sure FILE_PATH is declared with let at top

  // stamp today once
  const today = new Date().toISOString().split('T')[0];

  // 1) Title & collaborators carry over
  // 2) Layout only those five fields, with sensible defaults
  checklistData = {
    title: name,
    collaborators: checklistData.collaborators || [],

    layout: {
      columns: {
        done:  { width:  40, visible: true },
        hns:   { width:  40, visible: true },
        label: { width: 697, visible: true },
        date:  { width: 100, visible: true },
        who:   { width: 100, visible: true }
      },
      rows: { height: 30 }
    },

    // 3) One starter item, only your five keys
    items: [
      {
        hns:   "1",
        label: "",         // user to fill
        done:  false,
        date:  today,      // “now”
        who:   currentUser // “currentuser”
      }
    ]
  };

  markSaveDirty(true); changeCount++;
  renderChecklist();
  updatemainstatustext(`🆕 Created new checklist: ${filename}`);

  await saveChecklist();    // upload (create fallback)
  await fetchChecklists();  // refresh list on left
}

// unchanged helper
function timestampNow() {
  const now = new Date();
  const pad = n => String(n).padStart(2, '0');
  return `${now.getFullYear()}_${pad(now.getMonth()+1)}_${pad(now.getDate())}_@_${pad(now.getHours())}-${pad(now.getMinutes())}-${pad(now.getSeconds())}`;
}


// unchanged helper
function timestampNow() {
  const now = new Date();
  const pad = n => String(n).padStart(2, '0');
  return `${now.getFullYear()}_${pad(now.getMonth()+1)}_${pad(now.getDate())}_@_${pad(now.getHours())}-${pad(now.getMinutes())}-${pad(now.getSeconds())}`;
}

// 8) saveChecklist (includes notes, checklist, and users.json updates)
async function saveChecklist() {
  if (!isDirty || saveChecklist.isSaving) return;
  saveChecklist.isSaving = true;

  const nowIso = new Date().toISOString();
  updatemainstatustext(`Saving ${sharedState.FILE_PATH}…`, { fontWeight: 'bold' });

  // 1) Flush pending notes
  const noteSaves = [];
  traverse(checklistData.items, item => {
    if (
      typeof item._pendingNoteContent === 'string' &&
      item.noteFile?.startsWith('checklists/notes/') &&
      item.noteFile.endsWith('.html')
    ) {
      const payload = {
        file:    item.noteFile,
        sha:     item._pendingNoteSha,
        json:    item._pendingNoteContent,
        message: `Save note: ${item.noteFile}`
      };
      noteSaves.push(
        fetch(`${WORKER_URL}/save`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        }).then(res => {
          if (!res.ok) throw new Error(`❌ Failed to save ${item.noteFile}`);
          delete item._pendingNoteContent;
          delete item._pendingNoteSha;
        })
      );
    }
  });

  try {
    await Promise.all(noteSaves);

    // 2) Save main checklist JSON
    const checklistPayload = {
      file:    sharedState.FILE_PATH,
      json:    JSON.stringify(checklistData, null, 2),
      message: `Save checklist: ${sharedState.FILE_PATH}`
    };
    let res = await fetch(`${WORKER_URL}/save`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify(checklistPayload)
    });
    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`❌ Checklist save failed: ${errText}`);
    }

    // 3) Update usersData in-memory
    //    - Set this checklist’s lastAccessed
    //    - Bump global updatedAt and updatedBy
    const filename = sharedState.FILE_PATH.split('/').pop();
    usersData.updatedAt = nowIso;
    usersData.updatedBy = currentUser;
    const userObj = usersData.users.find(u =>
      u.username.toLowerCase() === currentUser.toLowerCase()
    );
    if (userObj) {
      const entry = userObj.checklists.find(c => c.id === filename);
      if (entry) {
        entry.lastAccessed = nowIso;
      }
    }

    // 4) Persist users.json
    const usersPayload = {
      file:    'checklists/config/users.json',
      json:    JSON.stringify(usersData, null, 2),
      message: `Update access for ${filename}`
    };
    res = await fetch(`${WORKER_URL}/save`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify(usersPayload)
    });
    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`❌ users.json save failed: ${errText}`);
    }

    // 5) All done
    isDirty = false;
    saveChecklist.isSaving = false;
    updatemainstatustext(`Saved ${sharedState.FILE_PATH} ✔`, { fontWeight: 'normal' });

  } catch (err) {
    saveChecklist.isSaving = false;
    console.error('Error in saveChecklist:', err);
    updatemainstatustext(`Error saving: ${err.message}`, { color: 'red' });
  }
}



async function updateUsersJson(filename, username, timestamp) {
  const path = "checklists/config/users.json";

  try {
    // 1) Fetch users.json
    const res = await fetch(`${WORKER_URL}?file=${path}`);
    if (!res.ok) throw new Error(`Could not fetch users.json`);
    const config = await res.json();

    // 2) Locate the user
    const user = config.users.find(u => u.username.toLowerCase() === username.toLowerCase());
    if (!user) throw new Error(`User "${username}" not found in users.json`);

    // 3) Locate or create the checklist entry
    let entry = user.checklists.find(c => c.id === filename);
    if (!entry) {
      // Admin should normally have pre-assigned, but just in case:
      entry = {
        id: filename,
        displayName: filename.replace(/\.json$/, ""),
        accessLevel: user.defaultAccessLevel ?? 10,
        lastAccessed: null,
        assignedBy: null,
        assignedAt: null
      };
      user.checklists.push(entry);
    }

    // 4) Update its lastAccessed
    entry.lastAccessed = timestamp;

    // 5) Save the updated users.json back
    const saveRes = await fetch(`${WORKER_URL}/save`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        file: path,
        json: config,
        message: `Update users.json ⏱ ${username}/${filename}`
      })
    });
    if (!saveRes.ok) {
      const err = await saveRes.text();
      throw new Error(`Worker save failed: ${err}`);
    }

  } catch (err) {
    console.error("⚠️ Failed to update users.json:", err);
  }
}



// ─── renderChecklist (with global file list) ─────────────────────────────────
function renderChecklist() {
  const container = document.getElementById('checklistContainer');
  container.innerHTML = '';

  // Outer scroll wrapper
  const scrollWrapper = document.createElement('div');
  scrollWrapper.style.overflowX = 'auto';
  scrollWrapper.style.width = '100%';

  const table = document.createElement('table');
  const thead = document.createElement('thead');
  const headerRow = document.createElement('tr');

  // 1. Build headers dynamically with drag-and-drop
  const columnDefs = checklistData.layout.columns;
  const orderedKeys = Object.keys(columnDefs);
  orderedKeys.forEach(key => {
    const col = columnDefs[key];
    if (!col.visible) return;
    const th = document.createElement('th');
    th.textContent = (fieldDefs[key] || {}).label || key;
    th.title = (fieldDefs[key] || {}).tooltip || '';
    th.style.width = col.width + 'px';
    th.style.position = 'relative';
    th.style.fontSize = '0.75rem';
    th.draggable = true;
    th.dataset.colKey = key;
    th.addEventListener('dragstart', e => {
      e.dataTransfer.setData('text/plain', key);
    });
    th.addEventListener('dragover', e => {
      e.preventDefault();
    });
    th.addEventListener('drop', e => {
      e.preventDefault();
      const srcKey = e.dataTransfer.getData('text/plain');
      reorderColumns(srcKey, key);
    });
    headerRow.appendChild(th);
  });

  thead.appendChild(headerRow);
  table.appendChild(thead);

  // 2. Build body
  const tbody = document.createElement('tbody');
  const rowHeight = checklistData.layout.rows?.height || 30;
  checklistData.items.forEach((item, idx) => {
    renderItem(item, tbody, [idx + 1], columnDefs, rowHeight);
  });
  table.appendChild(tbody);

  // 3. Assemble
  scrollWrapper.appendChild(table);
  container.appendChild(scrollWrapper);

  // 4. Global file list
  if (Array.isArray(checklistData.files) && checklistData.files.length) {
    const filesContainer = document.createElement('div');
    filesContainer.id = 'filesList';
    filesContainer.innerHTML = checklistData.files.map(f => `
      <div class="file-row">
        <span>${f.name}</span>
        <button onclick="viewFile('${f.path}')">View</button>
        <button onclick="downloadFile('${f.path}')">Download</button>
      </div>
    `).join('');
    container.appendChild(filesContainer);
  }

  if (ColumnVisibilityMenu.visible) {
    showColumnVisibilityMenu(ColumnVisibilityMenu.x, ColumnVisibilityMenu.y);
  }
}

// ─── renderItem (with per-item file icons) ──────────────────────────────────
function renderItem(item, tbody, path, columnDefs, rowHeight) {
  // 1. Visibility & filtering
  const isVisible = (
    filterState === 'all' ||
    (filterState === 'done' && item.done === true) ||
    (filterState === 'notdone' && item.done !== true)
  );
  const matchesWho = !showOnlyMine || item.who === currentUser;
  if (!isVisible || !matchesWho) {
    if (item.children && !item.collapsed) {
      item.children.forEach((child, i) => {
        renderItem(child, tbody, path.concat(i + 1), columnDefs, rowHeight);
      });
    }
    return;
  }

  // 2. Row setup
  const row = document.createElement('tr');
  row.classList.add('tr-item');
  row.style.height = (item.rowHeight || rowHeight) + 'px';
  row.style.verticalAlign = 'middle';
  row.style.lineHeight = '1';
  row.style.fontFamily = 'Consolas, monospace';
  row.dataset.path = JSON.stringify(path);
  if (item.important) row.classList.add('important');
  item.hns = path.join('.');

  // Events
  row.addEventListener('click', () => {
    selectedPath = path.slice();
    selectedItem = item;
    highlightSelectedRow(row);
  });
  row.addEventListener('contextmenu', e => {
    e.preventDefault();
    selectedPath = path.slice();
    selectedItem = item;
    showContextMenu(e.pageX, e.pageY);
  });

  // Helpers
  const resolveDefault = dv => {
    if (dv === 'now') return new Date().toISOString().split('T')[0];
    if (dv === 'currentuser') return currentUser;
    return dv;
  };
  const computeFormula = (formula, ctx) => {
    try {
      const fn = new Function(...Object.keys(ctx), `return ${formula}`);
      return fn(...Object.values(ctx));
    } catch {
      return '';
    }
  };

  // 3. Render each cell dynamically by field ID or key
  Object.entries(columnDefs).forEach(([colId, col]) => {
    if (!col.visible) return;
    let def = fieldDefs[colId] || {};
    if (!def.key) {
      def = Object.values(fieldDefs).find(d => d.key === colId) || {};
    }
    const key = def.key || colId;
    let val = item[key];
    if (def.type === 'computed' && def.formula) {
      val = computeFormula(def.formula, item);
    }
    if (val === undefined || val === '') {
      val = resolveDefault(def.default_value);
    }

    const td = document.createElement('td');
    td.style.fontFamily = 'Consolas, monospace';

    switch (def.type) {
      case 'checkbox': {
        const cb = document.createElement('input');
        cb.type = 'checkbox';
        cb.checked = !!val;
        cb.onchange = () => { item[key] = cb.checked; markSaveDirty(true); changeCount++; renderChecklist(); };
        td.appendChild(cb);
        break;
      }
      case 'select': {
        const span = document.createElement('span');
        span.textContent = val;
        span.style.cursor = 'pointer';
        const rawOptions = def.options ? def.options.slice() : (Array.isArray(checklistData[def.source]) ? checklistData[def.source].slice() : []);
        const options = rawOptions.filter(opt => opt !== def.default_value);
        span.addEventListener('click', e => {
          e.stopPropagation();
          showPopupList(span, options, sel => { item[key] = sel; markSaveDirty(true); changeCount++; renderChecklist(); });
        });
        td.appendChild(span);
        break;
      }
      case 'date': {
        const input = document.createElement('input');
        input.type = 'date';
        input.value = val;
        input.onchange = () => { item[key] = input.value; markSaveDirty(true); changeCount++; };
        td.appendChild(input);
        break;
      }
      case 'number': {
        const input = document.createElement('input');
        input.type = 'text';
        input.value = val;
        Object.assign(input.style, { width:'90%', textAlign:'left', fontFamily:'Consolas' });
        input.onblur = () => {
          const v = input.value.trim();
          item[key] = (v === ''||isNaN(v)) ? '' : parseFloat(v);
          markSaveDirty(true); changeCount++; renderChecklist();
        };
        td.appendChild(input);
        break;
      }
      default: {
        if (key==='label' || def.type==='tree') {
          const wrapper = document.createElement('div');
          Object.assign(wrapper.style, { display:'flex', alignItems:'center', gap:'0.4rem', marginLeft:`${(path.length-1)*20}px` });
          if(item.color) wrapper.style.color=item.color;
          if(item.bold) wrapper.style.fontWeight='bold';

          // Arrow
          if(item.children?.length) {
            const arrow=document.createElement('span');
            arrow.textContent=item.collapsed?'▶':'▼';
            arrow.style.cursor='pointer';
            arrow.onclick=e=>{e.stopPropagation();item.collapsed=!item.collapsed;renderChecklist();};
            wrapper.appendChild(arrow);
          }
          // Note icon
          if(item.noteFile) {
            const noteIcon=document.createElement('span');
            noteIcon.textContent='📝';
            noteIcon.style.cursor='pointer';
            noteIcon.title='Open note';
            noteIcon.onclick=e=>{e.stopPropagation();selectedPath=path.slice();selectedItem=item;highlightSelectedRow(row);editNote(item.noteFile,item);};
            wrapper.appendChild(noteIcon);
          }
          // Image icon
          if(item.imageFile) {
            const ext=item.imageFile.split('.').pop().toLowerCase();
            const imgIcon=document.createElement('span');
            imgIcon.textContent=ext==='pdf'?'📄':'📷';
            imgIcon.style.cursor='pointer';
            imgIcon.title='View image';
            const imgURL=`${WORKER_URL}?file=checklists/images/${item.imageFile}`;
            imgIcon.onmouseenter=()=>{const tooltip=document.getElementById('noteTooltip');tooltip.innerHTML=ext==='pdf'?`<div style="font-size:0.9rem;padding:0.5rem;">PDF: ${item.imageFile}</div>`:`<img src="${imgURL}" style="max-width:300px;">`;tooltip.style.left=`${imgIcon.getBoundingClientRect().right+5}px`;tooltip.style.top=`${imgIcon.getBoundingClientRect().top}px`;tooltip.style.display='block';};
            imgIcon.onmouseleave=()=>document.getElementById('noteTooltip').style.display='none';
            imgIcon.onclick=e=>{e.stopPropagation();window.open(imgURL,'_blank');};
            wrapper.appendChild(imgIcon);
          }
          // Per-item file icons
       // Per-item file icons
if (Array.isArray(item.files)) {
  item.files.forEach(f => {
    const fileIcon = document.createElement('span');
    fileIcon.textContent = '📎';
    fileIcon.style.cursor = 'pointer';
    fileIcon.title = f.name;
    fileIcon.onclick = e => { e.stopPropagation(); viewFile(f.path); };
    wrapper.appendChild(fileIcon);
  });
}
          // Link icon & input
          if(item.link) {
            const linkIcon=document.createElement('span');
            linkIcon.textContent='🔗';
            linkIcon.style.cursor='pointer';
            linkIcon.title=item.link;
            linkIcon.onclick=e=>{e.stopPropagation();window.open(item.link,'_blank');};
            wrapper.appendChild(linkIcon);
          }
          const input=document.createElement('input');
          input.type='text';
          input.value=val;
          Object.assign(input.style,{width:'100%',fontFamily:'Consolas, monospace',background:'transparent'});
          if(item.bold) input.style.fontWeight='bold';
          if(item.color) input.style.color=item.color;
          input.onblur=e=>{const v=input.value.trim();if(v.startsWith('http://')||v.startsWith('https://')){item.link=v;item[key]='';}else{item[key]=v;}markSaveDirty(true);changeCount++;renderChecklist();};
          wrapper.appendChild(input);
          td.appendChild(wrapper);
        } else {
          td.textContent=val;
        }
      }
    }
    row.appendChild(td);
  });

  // 4. Append and recurse
  tbody.appendChild(row);
  if(item.children && !item.collapsed) {
    item.children.forEach((child,i)=>renderItem(child,tbody,path.concat(i+1),columnDefs,rowHeight));
  }
}

// Utility: reorder layout.columns by key
function reorderColumns(srcKey, dstKey) {
  const cols = checklistData.layout.columns;
  const entries = Object.entries(cols);
  // remove source
  const i = entries.findIndex(([k]) => k === srcKey);
  if (i < 0) return;
  const [moved] = entries.splice(i, 1);
  // find destination
  const j = entries.findIndex(([k]) => k === dstKey);
  if (j < 0) return;
  // insert before dst
  entries.splice(j, 0, moved);
  // rebuild object in new order
  checklistData.layout.columns = Object.fromEntries(entries);
  markSaveDirty(true); changeCount++;
  renderChecklist();
}


function renderCollaborators() {
  const listEl = document.getElementById('collaboratorList');
  listEl.innerHTML = '';
  
  checklistData.collaborators.forEach(name => {
    const li = document.createElement('li');

    // find the matching user from users.json
    const user = userList.find(u => u.name.toLowerCase() === name.toLowerCase());
    if (user && user.token) {
      const a = document.createElement('a');
      a.textContent = name;
      a.href = `${location.origin}/?user=${encodeURIComponent(user.name)}&token=${user.token}#`;
      a.target = "_blank";
      a.title = `Login as ${user.name}`;
      li.appendChild(a);
    } else {
      // fallback: just plain text
      li.textContent = name;
    }

    listEl.appendChild(li);
  });
}


// 👉 Add this function after renderChecklist()
function showColumnVisibilityMenu(x, y) {
  ColumnVisibilityMenu.visible = true;
  ColumnVisibilityMenu.x = x;
  ColumnVisibilityMenu.y = y;

  const menu = document.getElementById('contextMenu');
  menu.innerHTML = '';
  menu.style.display = 'block';
  menu.style.left = x + 'px';
  menu.style.top = y + 'px';
  menu.style.zIndex = '10000';
  menu.style.background = '#fff';
  menu.style.border = '1px solid #ccc';
  menu.style.padding = '0.5rem';
  menu.style.boxShadow = '0 4px 10px rgba(0,0,0,0.15)';

  const columns = checklistData.layout.columns;

  for (const key in columns) {
    const item = document.createElement('div');
    item.style.marginBottom = '0.25rem';
    const cb = document.createElement('input');
    cb.type = 'checkbox';
    cb.checked = columns[key].visible;
    cb.onchange = () => {
      columns[key].visible = cb.checked;
      markSaveDirty(true); changeCount++;
      renderChecklist();
    };
    const label = document.createElement('label');
    label.style.marginLeft = '0.4rem';
    label.textContent = key;
    item.appendChild(cb);
    item.appendChild(label);
    menu.appendChild(item);
  }

const onClickOutside = (e) => {
  if (!menu.contains(e.target)) {
    menu.style.display = 'none';
    ColumnVisibilityMenu.visible = false;
    ColumnVisibilityMenu.x = 0;
    ColumnVisibilityMenu.y = 0;

    const popup = document.getElementById('popupList');
    if (popup) popup.remove();
    PopupListState.visible = false;
    PopupListState.anchor = null;

    document.removeEventListener('mousedown', onClickOutside);
  }
};
setTimeout(() => {
  document.addEventListener('mousedown', onClickOutside);
}, 100);

}

// Function to highlight the selected row
function highlightSelectedRow(row) {
  // Remove the highlight from any previously selected row
  const rows = document.querySelectorAll('.tr-item');
  rows.forEach(r => r.classList.remove('selected'));  // Remove 'selected' class from all rows

  // Add 'selected' class to the clicked row
  row.classList.add('selected');
}









function getParentArray(path) {
  if (path.length === 1) return checklistData.items;

  let arr = checklistData.items;
  for (let i = 0; i < path.length - 1; i++) {
    const idx = path[i] - 1; // because path is 1-based
    if (!arr[idx]) return checklistData.items;
    arr = arr[idx].children = arr[idx].children || [];
  }
  return arr;
}


function moveUpLevel() {
  alert("⚠ Move Up Level: Not implemented. Needs path-tracking to manipulate hierarchy.");
}

function moveDownLevel() {
  alert("⚠ Move Down Level: Not implemented. Requires logic to reparent an item.");
}

function makeEditableLabel(item) {
  const span = document.createElement('span');
  span.textContent = item.label || '';
  span.style.cursor = 'pointer';
  span.onclick = () => {
    const input = document.createElement('input');
    input.type = 'text';
    input.value = item.label;
    input.onblur = () => {
      item.label = input.value.trim();
      span.textContent = item.label;
      span.onclick = () => span.replaceWith(makeEditableLabel(item));
      input.replaceWith(span);
      markSaveDirty();
    };
    input.onkeydown = e => { if (e.key === 'Enter') input.blur(); };
    span.replaceWith(input);
    input.focus();
  };
  return span;
}





async function fetchChecklists() {
  const list = document.getElementById('checklistList');
  list.innerHTML = '🔄 Loading...';

  try {
    const listRes = await fetch(`${WORKER_URL}?list=checklists`);
    if (!listRes.ok) throw new Error("Failed to fetch checklist list");
    const files = await listRes.json();

    const jsonFiles = files
      .filter(f =>
        f.name.endsWith('.json') &&
        /^\d{4}_\d{2}_\d{2}_@_\d{2}-\d{2}-\d{2}/.test(f.name) &&
        !f.path.startsWith("checklists/config/")
      );

    const usersRes = await fetch(`${WORKER_URL}?file=checklists/config/users.json`);
    const usersConfig = usersRes.ok ? await usersRes.json() : { users: [] };

    const currentUserEntry = usersConfig.users.find(u => u.username.toLowerCase() === currentUser.toLowerCase());

    const userEntries = currentUserEntry ? currentUserEntry.checklists : [];

    const sortedFiles = jsonFiles.sort((a, b) => {
      const aUserEntry = userEntries.find(i => i.id === a.name);
      const bUserEntry = userEntries.find(i => i.id === b.name);

      if (aUserEntry && bUserEntry) {
        return new Date(bUserEntry.lastAccessed) - new Date(aUserEntry.lastAccessed);
      } else if (aUserEntry) {
        return -1;
      } else if (bUserEntry) {
        return 1;
      } else {
        return b.name.localeCompare(a.name);
      }
    });

    list.innerHTML = '';

    sortedFiles.forEach(file => {
      const li = document.createElement('li');
      li.style.listStyle = 'none';

      const btn = document.createElement('button');
      const label = file.name
        .replace(/^(\d{4}_\d{2}_\d{2})_@_(\d{2}-\d{2}-\d{2})[_\s-]*/, '')
        .replace(/\.json$/, '')
        .replace(/_/g, ' ')
        .trim();

      btn.textContent = label;
      btn.style.display = 'block';
      btn.style.width = '100%';
      btn.style.whiteSpace = 'nowrap';
      btn.style.overflow = 'hidden';
      btn.style.textOverflow = 'ellipsis';
      btn.style.textAlign = 'left';
      btn.style.padding = '0.4rem 0.6rem';
      btn.style.fontFamily = 'monospace';

      const info = userEntries.find(i => i.id === file.name);
      const lastTime = info?.lastAccessed || 'Never';

      btn.onmouseenter = (e) => {
        const tooltip = document.getElementById('noteTooltip');
        const desc = `📄 ${file.name}<br>🕒 You last opened it: ${lastTime}`;
        tooltip.innerHTML = `<div style="background:yellow; color:black; padding:0.5rem; border-radius:1px; font-size:0.85rem;">${desc}</div>`;
        tooltip.style.display = 'block';
        tooltip.style.left = `${e.pageX + 10}px`;
        tooltip.style.top = `${e.pageY + 10}px`;
      };

      btn.onmousemove = (e) => {
        const tooltip = document.getElementById('noteTooltip');
        tooltip.style.left = `${e.pageX + 10}px`;
        tooltip.style.top = `${e.pageY + 10}px`;
      };

      btn.onmouseleave = () => {
        const tooltip = document.getElementById('noteTooltip');
        tooltip.style.display = 'none';
      };

      btn.onclick = () => {
        sharedState.FILE_PATH = file.path;
        loadChecklist(FILE_PATH);
        updatemainstatustext(`📂 Loaded: ${file.name}`);
      };

      li.appendChild(btn);
      list.appendChild(li);
    });

  } catch (err) {
    list.innerHTML = '❌ Failed to load list';
    console.error(err);
  }
}





// --- Context Menu ---
function buildMenu(obj, parent) {
  const ul = document.createElement('ul');
  ul.style.background = '#fff';
  ul.style.border = '1px solid #ccc';

  for (const key in obj) {
    const li = document.createElement('li');
    li.textContent = key;

    if (typeof obj[key] === 'function') {
      li.onclick = () => {
        hideContextMenu();
        obj[key]();
      };
    } else {
      li.classList.add('has-sub');
      const submenu = buildMenu(obj[key], li);
      li.appendChild(submenu);
      li.onmouseenter = () => submenu.style.display = 'block';
      li.onmouseleave = () => submenu.style.display = 'none';
    }

    ul.appendChild(li);
  }

  if (parent) {
    ul.style.position = 'absolute';
    ul.style.top = '0';
    ul.style.left = '100%';
    ul.style.display = 'none';
  }

  return ul;
}

function showContextMenu(x, y) {
  hideContextMenu();
  if (filterActive || showOnlyMine) {
  const menuContainer = document.getElementById('contextMenu');
  menuContainer.innerHTML = '<div style="padding:1rem; font-size:0.9rem;">⚠️ Use "Show All" to make changes.</div>';
  menuContainer.style.left = `${x}px`;
  menuContainer.style.top = `${y}px`;
  menuContainer.style.display = 'block';
  return;
}

  const menuContainer = document.getElementById('contextMenu');
  menuContainer.innerHTML = '';
  menuContainer.appendChild(buildMenu(MENU_DEF));
  menuContainer.style.left = `${x}px`;
  menuContainer.style.top = `${y}px`;
  menuContainer.style.display = 'block';
}

function hideContextMenu() {
  const menu = document.getElementById('contextMenu');
  if (menu) menu.style.display = 'none';
}



document.addEventListener('click', hideContextMenu);

// --- Notes Modal (draggable & resized) ---


function initNoteModal() {
  const modal = document.getElementById('noteModal');

  if (!modal) return console.error('⚠️ #noteModal not found');

  // Instantiate Quill once
  if (!quillEditor) {
    quillEditor = new Quill('#editor', { theme: 'snow' });
  }

  // Make modal draggable via its header
  const header = modal.querySelector('.note-header');
  if (!header) {
    console.warn('⚠️ .note-header not found; dragging disabled');
    return;
  }
  header.style.cursor = 'move';

  header.addEventListener('mousedown', e => {
    isDragging = true;
    const rect = modal.getBoundingClientRect();
    offsetX    = e.clientX - rect.left;
    offsetY    = e.clientY - rect.top;
    document.body.style.userSelect = 'none';
  });

  document.addEventListener('mousemove', e => {
    if (!isDragging) return;
    modal.style.left = `${e.clientX - offsetX}px`;
    modal.style.top  = `${e.clientY - offsetY}px`;
  });

  document.addEventListener('mouseup', () => {
    isDragging = false;
    document.body.style.userSelect = '';
  });
}

async function openNoteModal(path) {
  // Fetch the note HTML + SHA
  const res = await fetch(`${WORKER_URL}/load?file=${encodeURIComponent(path)}`);
  if (!res.ok) {
    return alert("⚠️ Failed to load note.");
  }
  const json = await res.json();

  // Store for later save
  currentNoteFile                = path;
  currentNoteTargetItem._pendingNoteSha     = json.sha;
  currentNoteTargetItem._pendingNoteContent = json.html;

  // Load into Quill
  if (!quillEditor) {
    console.error("⚠️ Quill editor not initialized");
    return;
  }
  quillEditor.setContents(
    quillEditor.clipboard.convert(json.html)
  );

  // **Manual positioning & show**
  const modal = document.getElementById('noteModal');
  if (!modal) {
    console.error("⚠️ #noteModal not found");
    return;
  }
  modal.style.top     = '10%';
  modal.style.left    = '10%';
  modal.style.display = 'block';
}


function closeNoteModal() {
  const modal = document.getElementById('noteModal');
  if (!modal) return console.error('⚠️ #noteModal not found');
  modal.style.display = 'none';
}


function openViewerModal(content = '') {
  const modal = document.getElementById('viewerModal');
  modal.innerHTML = `<div style="padding:1rem;">${content}</div>`;
  modal.style.display = 'block';
  markSaveDirty();
}

document.getElementById('viewerModal').onclick = closeViewerModal;

function closeViewerModal() {
  document.getElementById('viewerModal').style.display = 'none';
}
// in your DOMContentLoaded callback, replace the existing listener:
document.getElementById('addCollaboratorBtn').addEventListener('click', async () => {
  const name = prompt('Enter new collaborator name:')?.trim();
  if (!name) return;
  if (checklistData.collaborators.includes(name)) {
    return alert('⚠️ Collaborator already exists in this checklist.');
  }

  // 1) Always add to this checklist's collaborators
  checklistData.collaborators.push(name);
  markSaveDirty();
  renderCollaborators();

  // 2) Fetch current users.json
  try {
    const res = await fetch(`${WORKER_URL}?file=checklists/config/users.json`);
    if (!res.ok) throw new Error(`Fetch users.json failed (${res.status})`);
    const config = await res.json(); // { users: [...] }

    // 3) Check if user already exists
    const exists = config.users.some(u => u.name.toLowerCase() === name.toLowerCase());
    if (exists) {
      alert(`✅ "${name}" already exists in users.json. No duplicate created.`);
      return;
    }

    // 4) Otherwise, generate a 32-char hex token
    const buf = new Uint8Array(16);
    crypto.getRandomValues(buf);
    const token = Array.from(buf).map(b => b.toString(16).padStart(2,'0')).join('');

    // 5) Append new user entry
    config.users.push({
      name,
      passwordHash: "",  // leave blank if no password login
      token,
      created: new Date().toISOString()
    });

    // 6) Save updated users.json back via Worker
    const saveRes = await fetch(`${WORKER_URL}/save`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        file: 'checklists/config/users.json',
        json: config,
        message: `Add user ${name}`
      })
    });
    if (!saveRes.ok) throw new Error(await saveRes.text());

    alert(`✅ "${name}" added to users.json with token:\n\n${token}`);
    // 7) Refresh in‐memory userList so renderCollaborators picks up the link
    userList = await fetchUserList();
    renderCollaborators();

  } catch (err) {
    console.error(err);
    alert('❌ Failed to update users.json: ' + err.message);
  }
});


// --- Image Upload ---
function handleImageUpload(e, callback) {
  const file = e.target.files[0];
  if (!file || !selectedItem) return alert("⚠ No item selected.");

  const ext = file.name.split('.').pop().toLowerCase();
  if (!['png', 'jpg', 'jpeg', 'pdf'].includes(ext)) {
    return alert("❌ Only PNG, JPG, or PDF files are supported.");
  }

  const reader = new FileReader();
  reader.onload = async function (event) {
    const base64 = event.target.result.split(',')[1];
    const filename = `${timestampNow()}_${file.name.replace(/\s+/g, '_')}`;
    const path = `checklists/images/${filename}`;

    const payload = {
      file: path,
      content: base64,
      message: `Add image: ${filename}`
    };

    try {
      const res = await fetch("https://fields-proxy.johan-351.workers.dev/save", {
        method: 'POST',
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      if (!res.ok) throw new Error(`Upload failed (${res.status})`);

      selectedItem.imageFile = filename;
      markSaveDirty();
      renderChecklist();

      if (typeof callback === "function") callback(filename);
    } catch (err) {
      alert("❌ Upload failed: " + err.message);
      console.error(err);
    }
  };

  reader.readAsDataURL(file);
}

function showFieldsPopup() {
  // 1) Ensure layout.columns exists
  checklistData.layout = checklistData.layout || { columns: {}, rows: { height: 30 } };
  const cols = checklistData.layout.columns;

  // 2) Determine which defs are missing, by comparing
  //    the *actual field key* against existing cols
  const existingKeys = new Set(Object.keys(cols));
  const missingDefs = Object.keys(fieldDefs).filter(defId => {
    const def = fieldDefs[defId];
    return !existingKeys.has(def.key);
  });

  if (missingDefs.length === 0) {
    alert("All fields are already added.");
    return;
  }

  // 3) Remove any prior popup
  const old = document.getElementById('fieldsPopup');
  if (old) old.remove();

  // 4) Build the popup container
  const popup = document.createElement('div');
  popup.id = 'fieldsPopup';
  popup.innerHTML = `
    <h4>Add Fields</h4>
    <div id="fieldList"></div>
    <div class="field-buttons">
      <button id="cancelFieldsBtn">Cancel</button>
      <button id="addFieldsBtn">Add Selected</button>
    </div>
  `;

  // 5) Populate checkboxes using the defs’ labels
  const listDiv = popup.querySelector('#fieldList');
  missingDefs.forEach(defId => {
    const def = fieldDefs[defId];
    const item = document.createElement('div');
    item.className = 'field-item';
    item.innerHTML = `
      <input type="checkbox" id="f_${defId}">
      <label for="f_${defId}">${def.label || def.key}</label>
    `;
    listDiv.appendChild(item);
  });

  // 6) Wire buttons
  popup.querySelector('#cancelFieldsBtn').onclick = () => popup.remove();
  popup.querySelector('#addFieldsBtn').onclick = () => {
    // For each checked box, add its def.key into cols
    popup.querySelectorAll('.field-item input:checked').forEach(cb => {
      const defId = cb.id.slice(2);
      const def   = fieldDefs[defId];
      cols[def.key] = {
        width:   def.defaultWidth || 100,
        visible: true
      };
    });
    markSaveDirty(true); changeCount++;
    renderChecklist();
    popup.remove();
  };

  // 7) Append it to body so it floats on top
  document.body.appendChild(popup);
}


// 2) Wire up the “Fields” button
document.getElementById('fieldsButton').addEventListener('click', showFieldsPopup);

function addImageUploadListener() {
  const input = document.getElementById('imageFileInput');
  if (!input) {
    console.warn("⚠️ imageFileInput not found in DOM.");
    return;
  }

  input.addEventListener('change', (e) => handleImageUpload(e, (dataUrl) => {
    if (!selectedItem) {
      alert("⚠ No item selected.");
      return;
    }

    selectedItem.image = dataUrl;  // ✅ Embed image as base64
    markSaveDirty();
    renderChecklist();
  }));
}
function updateFilterButtonStyle(btn) {
  if (!btn) return;

  if (filterState === 'all') {
    btn.innerHTML = '🔲 Filter (all)';
    btn.style.background = '#ccc';
    btn.style.color = '#000';
  } else if (filterState === 'notdone') {
    btn.innerHTML = '☐ Not done';
    btn.style.background = '#fdd';
    btn.style.color = '#a00';
  } else if (filterState === 'done') {
    btn.innerHTML = '☑ Done';
    btn.style.background = '#dfd';
    btn.style.color = '#080';
  }
}
function resetFilters() {
  filterState = 'all';
  showOnlyMine = false;
  selectedItem = null;
  selectedPath = null;

  updateFilterButtonStyle(document.getElementById('filterBtn'));
  document.getElementById('onlymineBtn').textContent = '🔍 Show Mine';

  renderChecklist();
}


function updatemainstatustext(text, cssStyle = {}) {
  const status = document.getElementById('mainstatusText');
  if (status) {
    status.textContent = text;
    Object.assign(status.style, cssStyle);
  }
}


function traverse(items, fn) {
  items.forEach(item => {
    fn(item);
    if (Array.isArray(item.children)) {
      traverse(item.children, fn);
    }
  });
}
function filterNotDone() {
  if (filterState === 'all') filterState = 'notdone';
  else if (filterState === 'notdone') filterState = 'done';
  else filterState = 'all';

  selectedItem = null;
  selectedPath = null;

  const btn = document.getElementById('filterBtn');
  updateFilterButtonStyle(btn);

  renderChecklist();
}


function collapseAll() {
  traverse(checklistData.items, item => { item.collapsed = true; });
  renderChecklist();
  markSaveDirty();
}

function expandAll() {
  traverse(checklistData.items, item => { item.collapsed = false; });
  renderChecklist();
  markSaveDirty();
}
function applyColor(color) {
  if (!selectedItem) return;
  selectedItem.color = color;
  renderChecklist();
  markSaveDirty();
}

function toggleBold() {
  if (!selectedItem) return;
  selectedItem.bold = !selectedItem.bold;
  renderChecklist();
  markSaveDirty();
}

function resetStyle() {
  if (!selectedItem) return;
  delete selectedItem.color;
  delete selectedItem.bold;
  renderChecklist();
  markSaveDirty();
}
function showPopupList(anchor, options, onSelect, refocusEl = null) {
  // Remove existing popup if present
  const existing = document.getElementById('popupList');
  if (existing) existing.remove();

  const list = document.createElement('div');
  list.id = 'popupList';
  list.style.position = 'absolute';
  list.style.background = '#fff';
  list.style.border = '1px solid #ccc';
  list.style.padding = '0.25rem';
  list.style.zIndex = 1000;
  list.style.fontFamily = 'Consolas, monospace';
  list.style.boxShadow = '2px 2px 4px rgba(0,0,0,0.1)';
  list.style.maxHeight = '200px';
  list.style.overflowY = 'auto';

  options.forEach(opt => {
    const item = document.createElement('div');
    item.textContent = opt;
    item.style.padding = '0.2rem 0.5rem';
    item.style.cursor = 'pointer';

    item.onmouseenter = () => item.style.background = '#eee';
    item.onmouseleave = () => item.style.background = 'transparent';

    item.onclick = () => {
      onSelect(opt);
      list.remove();
      if (refocusEl) {
        refocusEl.focus();
        refocusEl.select?.();
      }
    };

    list.appendChild(item);
  });

  document.body.appendChild(list);
  const rect = anchor.getBoundingClientRect();
  list.style.left = `${rect.left + window.scrollX}px`;
  list.style.top = `${rect.bottom + window.scrollY}px`;

  list.onmouseleave = () => list.remove();
  anchor.onmouseleave = () => {
    setTimeout(() => {
      if (!list.matches(':hover')) list.remove();
    }, 150);
  };
}


 /* ───────── CRUD helpers ───────── */
/* ───────── CRUD helpers ───────── */
function addSameLevel(path = selectedPath) {
  const arr = getParentArray(path);
  const idx = path[path.length - 1];
  const newItem = {
    label: "Type content here (ctrl-del to delete row)",
    done: false,
    unit: "",
    qty_est: "",
    qty_real: "",
    price_unit: "",
    total_price: 0,
    date: new Date().toISOString().split("T")[0],
    who: currentUser,
    children: [],
    collapsed: false
  };

  // insert and update selection
  arr.splice(idx, 0, newItem);
  selectedPath = [...path.slice(0, -1), idx + 1];
  selectedItem = newItem;

  markSaveDirty(true); changeCount++;
  renderChecklist();

  // small timeout to let the DOM update, then focus + highlight
  setTimeout(() => {
    const selector = `tr.tr-item[data-path='${JSON.stringify(selectedPath)}']`;
    const row = document.querySelector(selector);
    if (row) {
      highlightSelectedRow(row);
      const input = row.querySelector("input[type='text']");
      if (input) {
        input.focus();
        input.select();
      }
    }
  }, 0);
}

function addSubLevel(path = selectedPath) {
  const it = getItemByPath(path);
  it.children = it.children || [];
  const newItem = {
    label: "Type content here (ctrl-del to delete row)",
    done: false,
    unit: "",
    qty_est: "",
    qty_real: "",
    price_unit: "",
    total_price: 0,
    date: new Date().toISOString().split("T")[0],
    who: currentUser,
    children: [],
    collapsed: false
  };

  // append and update selection
  it.children.push(newItem);
  selectedPath = [...path, it.children.length];
  selectedItem = newItem;

  markSaveDirty(true); changeCount++;
  renderChecklist();

  setTimeout(() => {
    const selector = `tr.tr-item[data-path='${JSON.stringify(selectedPath)}']`;
    const row = document.querySelector(selector);
    if (row) {
      highlightSelectedRow(row);
      const input = row.querySelector("input[type='text']");
      if (input) {
        input.focus();
        input.select();
      }
    }
  }, 0);
}

function moveUpLevel() {
  if (selectedPath.length < 2) {
    alert("Already top level");
    return;
  }
  const arr = getParentArray(selectedPath);
  const idx = selectedPath[selectedPath.length - 1] - 1;
  const it = arr.splice(idx, 1)[0];

  const grandArr = selectedPath.length === 2
    ? checklistData.items
    : getItemByPath(selectedPath.slice(0, -2)).children;
  const pidx = selectedPath[selectedPath.length - 2] - 1;
  grandArr.splice(pidx + 1, 0, it);

  selectedPath = [...selectedPath.slice(0, -2), pidx + 2];
  selectedItem = it;

  markSaveDirty(true); changeCount++;
  renderChecklist();

  // re-highlight the moved row
  const row = document.querySelector(
    `tr.tr-item[data-path='${JSON.stringify(selectedPath)}']`
  );
  if (row) highlightSelectedRow(row);
}

function moveDownLevel() {
  const arr = getParentArray(selectedPath);
  const idx = selectedPath[selectedPath.length - 1] - 1;
  if (idx <= 0) {
    alert("No previous sibling");
    return;
  }
  const it = arr.splice(idx, 1)[0];
  const prev = arr[idx - 1];
  prev.children = prev.children || [];
  prev.children.push(it);

  selectedPath = [...selectedPath.slice(0, -1), idx];
  selectedItem = it;

  markSaveDirty(true); changeCount++;
  renderChecklist();

  // re-highlight the moved row
  const row = document.querySelector(
    `tr.tr-item[data-path='${JSON.stringify(selectedPath)}']`
  );
  if (row) highlightSelectedRow(row);
}

 function collapseAll(){ traverse(checklistData.items,it=>{if(it.children) it.collapsed=true;}); renderChecklist(); }
 function expandAll(){ traverse(checklistData.items,it=>{if(it.children) it.collapsed=false;}); renderChecklist(); }

 /* ───────── Notes (Quill) ───────── */
async function addNote() {
  if (!selectedItem) {
    alert("⚠ No item selected.");
    console.warn("addNote: No selectedItem");
    return;
  }

  console.log("📝 addNote() called for item:", selectedItem);

  const WORKER_URL = "https://fields-proxy.johan-351.workers.dev";
  let content = '';

  if (selectedItem.noteFile) {
    const url = `${WORKER_URL}?file=${selectedItem.noteFile}`;
    console.log("🔍 Fetching existing note from:", url);

    try {
      const res = await fetch(url);
      if (res.ok) {
        content = await res.text();
        console.log("✅ Loaded note content");
      } else if (res.status === 404) {
        alert(`⚠ Note file not found: ${selectedItem.noteFile}\nIt will be removed.`);
        delete selectedItem.noteFile;
        return; // exit cleanly
      } else {
        console.warn("⚠ Failed to load note file:", res.status);
      }
    } catch (err) {
      console.error("❌ Error fetching note:", err);
      return;
    }
  }

  if (!selectedItem.noteFile) {
    const newFile = `checklists/notes/${timestampNow()}.html`;
    selectedItem.noteFile = newFile;
    console.log("📄 New noteFile created:", selectedItem.noteFile);
  }

  currentNoteFile = selectedItem.noteFile;
  currentNoteTargetItem = selectedItem;

  // Final step: open the modal and show editor
  if (!quillEditor) {
    console.error("❌ Quill editor not initialized");
    return;
  }

  console.log("🖋 Setting content into editor");
  quillEditor.setContents(quillEditor.clipboard.convert(content));
  document.getElementById('noteModal').style.display = 'block';
  document.getElementById('saveNoteBtn').textContent = '💾 Save Note';
}


// 6) editNote (also captures SHA)
async function editNote(noteFile, item) {
  const url = `${WORKER_URL}/load?file=${encodeURIComponent(noteFile)}`;
  let content = "";
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error();
    const json = await res.json();
    content = json.html;
    item._pendingNoteSha = json.sha;
  } catch {
    return alert("⚠ Failed to load note.");
  }

  currentNoteTargetItem = item;
  quillEditor.root.innerHTML = content;
  showNoteModal();
}


// 7) saveNote (forces dirty + appends footer)
function saveNote() {
  if (!currentNoteFile || !currentNoteTargetItem) {
    alert("⚠ No note is currently open.");
    return;
  }
  alert("Note is being saved.");

  const timestamp = timestampNow();
  const footer = `<p style="font-size:0.8em; color:#888;">update by ${currentUser || 'unknown'} @ ${timestamp}</p>`;
  const html   = `<html><body>${quillEditor.root.innerHTML}${footer}</body></html>`;

  currentNoteTargetItem._pendingNoteContent = html;
  markSaveDirty(true);

  const path = selectedPath;
  closeNoteModal();

  saveChecklist().then(() => {
    setTimeout(() => {
      const selector = `tr[data-path='${JSON.stringify(path)}']`;
      const row = document.querySelector(selector);
      if (row) {
        row.classList.add('selected');
        row.scrollIntoView({ behavior: 'smooth', block: 'center' });
        setTimeout(() => row.classList.remove('selected'), 1500);
      }
    }, 100);
  });

  currentNoteFile = null;
  currentNoteTargetItem = null;
}


function duplicate_Structure(path = selectedPath) {
  if (!path || !Array.isArray(path)) return;

  const original = getItemByPath(path);
  if (!original) return;

  const clone = JSON.parse(JSON.stringify(original));
  clone.done = false;
  clone.date = new Date().toISOString().split("T")[0];
  clone.who = currentUser;

  // Append to parent
  const parentArray = getParentArray(path);
  parentArray.push(clone);

  // Determine new path
  const newPath = [...path.slice(0, -1), parentArray.length];

  // ✅ Renumber recursively
  function applyNumbers(item, path) {
    item.hns = path.join(".");
    if (Array.isArray(item.children)) {
      item.children.forEach((child, i) => applyNumbers(child, [...path, i + 1]));
    }
  }
  applyNumbers(clone, newPath);

  selectedItem = clone;
  selectedPath = newPath;
  markSaveDirty(true); changeCount++;
  renderChecklist();

  setTimeout(() => {
    const selector = `tr[data-path='${JSON.stringify(selectedPath)}'] input[type="text"]`;
    const input = document.querySelector(selector);
    if (input) {
      input.focus();
      input.select();
    }
  }, 0);
}

async function viewNote() {
  const it = getItemByPath(selectedPath);
  if (!it.link) return alert('No note');

  const res = await fetch(it.link); // ✅ no headers needed
  if (!res.ok) return alert('Load failed');

  const html = await res.text(); // ✅ get HTML text directly
  document.getElementById('viewerContent').innerHTML = html;
  document.getElementById('viewerModal').style.display = 'block';
}

async function uploadPendingNotes() {
  const WORKER_URL = "https://fields-proxy.johan-351.workers.dev";
  const tasks = [];

  traverse(checklistData.items, (item) => {
    if (item._pendingNoteContent && item.noteFile) {
      const payload = {
        file: item.noteFile,
        json: item._pendingNoteContent,
        message: `Save note: ${item.noteFile}`
      };

      const task = fetch(`${WORKER_URL}/save`, {
        method: 'POST',
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      }).then((res) => {
        if (!res.ok) {
          console.warn(`❌ Failed to upload note: ${item.noteFile}`);
        } else {
          console.log(`✅ Uploaded note: ${item.noteFile}`);
          delete item._pendingNoteContent;
        }
      });

      tasks.push(task);
    }
  });

  await Promise.all(tasks);
}

function deleteItem() {
  if (!confirm("❗ Are you sure you want to delete this item?")) return;
  const parentArr = getParentArray(selectedPath);
  const idx = selectedPath[selectedPath.length - 1] - 1;
  parentArr.splice(idx, 1);
  selectedItem = null;
  selectedPath = null;
  markSaveDirty();
  renderChecklist();
}

function getItemByPath(path) {
  let item = { children: checklistData.items };
  for (let i = 0; i < path.length; i++) {
    item = item.children[path[i] - 1];
    if (!item) break;
  }
  return item;
}

function addSubItem() {
  selectedItem.children = selectedItem.children || [];
  selectedItem.children.push({
    label: "New Sub-item",
    done: false,
    unit: "",
    qty_est: 0,
    qty_real: 0,
    price_unit: 0,
    date: new Date().toISOString().split('T')[0],
    who: "",
    children: []
  });
  markSaveDirty();
  renderChecklist();
}
function renumberChecklist(items = checklistData.items, prefix = []) {
  items.forEach((item, idx) => {
    const number = [...prefix, idx + 1];
    item.hns = number.join('.');

    // Recurse into children (if any)
    if (Array.isArray(item.children) && item.children.length > 0) {
      renumberChecklist(item.children, number);
    }
  });
}
// CSS-driven flicker helper (needs the .move-blocked keyframes from before)
function blockFlicker(row) {
  row.classList.add('move-blocked');
  row.addEventListener('animationend', () => {
    row.classList.remove('move-blocked');
  }, { once: true });
}

function moveAltUp() {
  if (!selectedPath || selectedPath.length === 0) return;

  const siblings = getParentArray(selectedPath);
  const idx      = selectedPath[selectedPath.length - 1] - 1;

  //  ── Block if already first in this level
  if (idx === 0) {
    const row = document.querySelector(
      `tr.tr-item[data-path='${JSON.stringify(selectedPath)}']`
    );
    if (row) blockFlicker(row);
    return;
  }

  //  ── Swap with previous sibling
  [siblings[idx - 1], siblings[idx]] = [siblings[idx], siblings[idx - 1]];
  // adjust path to point at the same moved item
  selectedPath[selectedPath.length - 1] = idx;
  selectedItem = siblings[idx - 1];

  renumberChecklist();
  markSaveDirty(true); changeCount++;
  renderChecklist();

  //  ── Re-highlight
  const newRow = document.querySelector(
    `tr.tr-item[data-path='${JSON.stringify(selectedPath)}']`
  );
  if (newRow) highlightSelectedRow(newRow);
}

function moveAltDown() {
  if (!selectedPath || selectedPath.length === 0) return;

  const siblings = getParentArray(selectedPath);
  const idx      = selectedPath[selectedPath.length - 1] - 1;

  //  ── Block if already last in this level
  if (idx === siblings.length - 1) {
    const row = document.querySelector(
      `tr.tr-item[data-path='${JSON.stringify(selectedPath)}']`
    );
    if (row) blockFlicker(row);
    return;
  }

  //  ── Swap with next sibling
  [siblings[idx], siblings[idx + 1]] = [siblings[idx + 1], siblings[idx]];
  selectedPath[selectedPath.length - 1] = idx + 2;
  selectedItem = siblings[idx + 1];

  renumberChecklist();
  markSaveDirty(true); changeCount++;
  renderChecklist();

  //  ── Re-highlight
  const newRow = document.querySelector(
    `tr.tr-item[data-path='${JSON.stringify(selectedPath)}']`
  );
  if (newRow) highlightSelectedRow(newRow);
}

document.addEventListener("DOMContentLoaded", async () => {
  // 1) bootstrap your app
  await loadUsersData();
  await loadFieldDefinitions();
  await tryAutoLoginFromURL();
  initNoteModal();
  addImageUploadListener();
  updateFilterButtonStyle(document.getElementById("filterBtn"));

  // 2) initial version check on load
  console.log("🔍 Initial version check on load");
  await checkStaleVersion();

  // 3) re-check whenever the window regains focus
  window.addEventListener("focus", async () => {
    console.log("🔍 Window regained focus — re-checking version");
    await checkStaleVersion();
  });

  // ─── Checklist Live-Search (Full-List + AND-Filter) ────────────────────────────
  const input = document.getElementById("searchInput");
  const results = document.getElementById("searchResults");

  function flattenChecklistData(items, parentPath = []) {
    return items.reduce((acc, item, idx) => {
      const path = parentPath.concat(idx);
      acc.push({ item, path });
      if (item.children?.length) {
        acc.push(...flattenChecklistData(item.children, path));
      }
      return acc;
    }, []);
  }

  function getItemDisplay(item) {
    const parts = [];
    if (item.hns != null) parts.push(item.hns);
    for (const [key, val] of Object.entries(item)) {
      if (key === "hns" || key === "children") continue;
      if (typeof val === "string" || typeof val === "number") {
        parts.push(val);
      } else if (Array.isArray(val)) {
        parts.push(val.join(", "));
      }
    }
    return parts.join(" – ");
  }

  let allEntries = [];
function populateResultsList() {
  results.innerHTML = "";
  allEntries = flattenChecklistData(checklistData.items).map(({ item, path }) => {
    const display      = getItemDisplay(item);
    const oneBasedPath = path.map(idx => idx + 1);
    const pathKey      = JSON.stringify(oneBasedPath);

    const li = document.createElement("li");
    li.textContent  = display;
    li.dataset.path = pathKey;
    li.style.cursor = "pointer";

    li.addEventListener("click", e => {
      e.stopPropagation();
      e.preventDefault();

      // 1) Expand the tree so the target <tr> exists
      if (typeof expandAncestors === "function") expandAncestors(path);
      else if (typeof expandAll === "function")    expandAll();

      // 2) Find the matching row by its one-based data-path
      const selector = `#checklistContainer tr[data-path='${pathKey}']`;
      const tr = document.querySelector(selector);

      if (tr) {
        // 3a) Visually highlight via your helper
        highlightSelectedRow(tr);                                           // :contentReference[oaicite:0]{index=0}

        // 3b) Update the global selection variables
        selectedPath = JSON.parse(tr.dataset.path);
        selectedItem = getItemByPath(selectedPath);                         // :contentReference[oaicite:1]{index=1}

        // 3c) Scroll and focus just like a click
        tr.tabIndex = -1;
        tr.focus();
        tr.scrollIntoView({ behavior: "smooth", block: "center" });

        // 3d) Brief flash so users see the match
        tr.classList.add("search-highlight");
        setTimeout(() => tr.classList.remove("search-highlight"), 2000);
      } else {
        console.warn("⚠️ No <tr> matched selector", selector);
      }

      // 4) Hide dropdown and clear input
      results.style.display = "none";
      input.value = "";
    });

    results.appendChild(li);
    return { li, hay: display.toLowerCase() };
  });
}


  input.addEventListener("focus", () => {
    console.log("🔍 Input focused, populating full list");
    populateResultsList();
    results.style.display = "block";
  });
  input.addEventListener("mousedown", () => {
    console.log("🔍 Input mousedown, populating full list");
    populateResultsList();
    results.style.display = "block";
  });

  input.addEventListener("input", () => {
    const terms = input.value.trim().toLowerCase().split(/\s+/).filter(Boolean);
    let anyVisible = false;
    allEntries.forEach(({ li, hay }) => {
      const matches = terms.every(t => hay.includes(t));
      li.style.display = matches ? "" : "none";
      if (matches) anyVisible = true;
    });
    results.style.display = anyVisible ? "block" : "none";
    console.log("🔍 Filtered with terms", terms, "anyVisible =", anyVisible);
  });

  document.addEventListener("click", e => {
    if (!document.getElementById("searchContainer").contains(e.target)) {
      console.log("🚪 Click outside, hiding dropdown");
      results.style.display = "none";
    }
  });

  console.log("✅ Full-list + AND-filter live-search ready");
});
// ─── Global Handlers ───────────────────────────────────────────────────────────
// (beforeunload, dblclick, keydown handlers follow unchanged)




// ─── Global Handlers ───────────────────────────────────────────────────────────
window.addEventListener("beforeunload", (e) => {
  if (isDirty) {
    saveChecklist();
    e.preventDefault();
    e.returnValue = "";
  }
});

document.addEventListener("dblclick", (e) => {
  const row = e.target.closest("tr[data-path]");
  if (!row) return;
  const path = JSON.parse(row.dataset.path);
  const arr  = getParentArray(path);
  const idx  = path[path.length - 1];
  const item = getItemByPath(path);
  const isLast     = idx === arr.length;
  const hasChildren = item.children && item.children.length > 0;
  if (isLast && !hasChildren) {
    selectedItem = item;
    selectedPath = path;
    addSameLevel();
  }
});

document.addEventListener("keydown", (e) => {
  if (!selectedItem) return;
  const key = e.key.toLowerCase();

  if (e.ctrlKey && key === "b")             { e.preventDefault(); toggleBold(); }
  if (e.ctrlKey && key === "arrowup")       { e.preventDefault(); moveUpLevel(); }
  if (e.ctrlKey && key === "arrowdown")     { e.preventDefault(); moveDownLevel(); }
  if (e.altKey  && key === "arrowup")       { e.preventDefault(); moveAltUp(); }
  if (e.altKey  && key === "arrowdown")     { e.preventDefault(); moveAltDown(); }
  if (e.ctrlKey && key === "e") {
    e.preventDefault();
    if (e.shiftKey) collapseAll();
    else           expandAll();
  }
  if (e.ctrlKey && key === "d") {
    e.preventDefault();
    const clone = JSON.parse(JSON.stringify(selectedItem));
    const arr   = getParentArray(selectedPath);
    arr.splice(selectedPath[selectedPath.length - 1], 0, clone);
    markSaveDirty(true); changeCount++;
    renderChecklist();
  }
  if (e.ctrlKey && key === "enter") { e.preventDefault(); addSubLevel(); }
  if (e.ctrlKey && key === "tab")   {
    e.preventDefault();
    if (e.shiftKey) moveUpLevel();
    else            moveDownLevel();
  }
  if (e.ctrlKey && key === "delete") {
    e.preventDefault();
    const arr  = getParentArray(selectedPath);
    const idx  = selectedPath[selectedPath.length - 1] - 1;
    const skip = e.shiftKey;
    if (skip || confirm("Delete this item?")) {
      arr.splice(idx, 1);
      selectedPath = null;
      selectedItem = null;
      markSaveDirty(true); changeCount++;
      renderChecklist();
    }
  }
});




// ─── Global Handlers ───────────────────────────────────────────────────────────
window.addEventListener('beforeunload', (e) => {
  if (isDirty) {
    saveChecklist(); // silent save
    e.preventDefault();
    e.returnValue = ''; // native prompt
  }
});

document.addEventListener('dblclick', (e) => {
  const row = e.target.closest('tr[data-path]');
  if (!row) return;
  const path = JSON.parse(row.dataset.path);
  const arr  = getParentArray(path);
  const idx  = path[path.length - 1];
  const item = getItemByPath(path);
  const isLast     = idx === arr.length;
  const hasChildren = item.children && item.children.length > 0;
  if (isLast && !hasChildren) {
    selectedItem = item;
    selectedPath = path;
    addSameLevel();
  }
});

document.addEventListener('keydown', (e) => {
  if (!selectedItem) return;
  const key = e.key.toLowerCase();

  // Toggle bold
  if (e.ctrlKey && key === 'b') { e.preventDefault(); toggleBold(); }

  // Move up/down level
  if (e.ctrlKey && key === 'arrowup')   { e.preventDefault(); moveUpLevel(); }
  if (e.ctrlKey && key === 'arrowdown') { e.preventDefault(); moveDownLevel(); }

  // Move visual position
  if (e.altKey  && key === 'arrowup')   { e.preventDefault(); moveAltUp(); }
  if (e.altKey  && key === 'arrowdown') { e.preventDefault(); moveAltDown(); }

  // Expand/collapse
  if (e.ctrlKey && key === 'e') {
    e.preventDefault();
    if (e.shiftKey) collapseAll();
    else           expandAll();
  }

  // Duplicate item
  if (e.ctrlKey && key === 'd') {
    e.preventDefault();
    const clone = JSON.parse(JSON.stringify(selectedItem));
    const arr   = getParentArray(selectedPath);
    arr.splice(selectedPath[selectedPath.length - 1], 0, clone);
    markSaveDirty(true); changeCount++;
    renderChecklist();
  }

  // Sub-level (Ctrl+Enter)
  if (e.ctrlKey && key === 'enter') {
    e.preventDefault();
    addSubLevel();
  }

  // Promote/demote (Tab)
  if (e.ctrlKey && key === 'tab') {
    e.preventDefault();
    if (e.shiftKey) moveUpLevel();
    else            moveDownLevel();
  }

  // Delete (Ctrl+Delete or Shift+Ctrl+Delete)
  if (e.ctrlKey && key === 'delete') {
    e.preventDefault();
    const arr  = getParentArray(selectedPath);
    const idx  = selectedPath[selectedPath.length - 1] - 1;
    const skip = e.shiftKey;
    if (skip || confirm('Delete this item?')) {
      arr.splice(idx, 1);
      selectedPath = null;
      selectedItem = null;
      markSaveDirty(true); changeCount++;
      renderChecklist();
    }
  }
});

