// file-upload.js — Module for handling file attachments and external links
import { WORKER_URL, FILES_DIR } from './constants.js';
import { saveChecklist } from './data.js';
import { markSaveDirty } from './data.js';
import { renderChecklist } from './renderchecklist.js'; // <-- fixed import
// import { timestampNow } from './utils.js'; // <-- remove this line

let fileInput = null;

/**
 * Initialize hidden file input for all file attachments.
 * Call this once on startup.
 */
export function initFileUpload() {
  fileInput = document.createElement('input');
  fileInput.type = 'file';
  fileInput.accept = '*/*';         // allow any file type
  fileInput.multiple = false;
  fileInput.style.display = 'none';
  fileInput.id = 'fileInput';
  fileInput.addEventListener('change', handleFileUpload);
  document.body.appendChild(fileInput);
}

/**
 * Trigger the file picker for generic files.
 * Resets prior selection to allow re-picking same file.
 */
export function triggerFileUpload() {
  fileInput.value = null;
  fileInput.accept = '*/*';
  fileInput.click();
}

/**
 * Read, upload, and attach the selected file to the current checklist item or global list.
 * Base64-encodes content and sends to WORKER_URL/save.
 */
export async function handleFileUpload(event) {
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
  const uploadPath = `${FILES_DIR}/${file.name}`;
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

  // 3) Attach to the selected item or global file list
  if (!sharedState.selectedItem) {
    alert('⚠️ No row selected—file saved to global list only.');
    sharedState.checklistData.files = sharedState.checklistData.files || [];
    sharedState.checklistData.files.push({
      name:       file.name,
      path:       uploadPath,
      uploadedBy: sharedState.currentUser,
      uploadedAt: new Date().toISOString()
    });
  } else {
    sharedState.selectedItem.files = sharedState.selectedItem.files || [];
    sharedState.selectedItem.files.push({
      name:       file.name,
      path:       uploadPath,
      uploadedBy: sharedState.currentUser,
      uploadedAt: new Date().toISOString()
    });
  }

  // 4) Persist and redraw
  markSaveDirty(true);
  try {
    await saveChecklist();
  } catch (err) {
    console.error('Failed saving checklist after upload:', err);
    alert('⚠️ Couldn’t save checklist—see console for details.');
    return;
  }
  renderChecklist();
  alert(`✅ Uploaded and saved ${file.name}`);
}

/**
 * Open a file via the Worker’s ?file= loader.
 * @param {string} path - Path under FILES_DIR
 */
export function viewFile(path) {
  const url = `${WORKER_URL}/?file=${encodeURIComponent(path)}`;
  sharedState.open(url, '_blank');
}

/**
 * Force download of the file served via Worker.
 * @param {string} path - Path under FILES_DIR
 */
export function downloadFile(path) {
  const url = `${WORKER_URL}/?file=${encodeURIComponent(path)}`;
  const a = document.createElement('a');
  a.href = url;
  a.download = path.split('/').pop();
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}
