// file-upload.js — Module for handling file attachments and external links
import { WORKER_URL, FILES_DIR, sharedState } from './constants.js';
import { saveChecklist, markSaveDirty } from './data2.js';
import { renderChecklist } from './renderchecklist.js';

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

// Store pending files that need to be uploaded
const pendingFiles = new Map();

/**
 * Handle file selection - store local path and File object for upload
 */
export function handleFileUpload(event) {
  const file = event.target.files[0];
  if (!file) return;

  // Generate a unique ID for this file
  const fileId = `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  
  // Store the File object for later upload
  pendingFiles.set(fileId, file);

  // Store only the local path and metadata - no upload yet
  const fileData = {
    id: fileId, // Add ID to link to the stored File object
    name: file.name,
    path: file.path || file.webkitRelativePath || file.name, // Local path
    size: file.size,
    type: file.type,
    lastModified: file.lastModified,
    attachedBy: sharedState.currentUser,
    attachedAt: new Date().toISOString()
  };

  // Attach to the selected item or global file list
  if (!sharedState.selectedItem) {
    alert('⚠️ No row selected—file attached to global list.');
    sharedState.checklistData.files = sharedState.checklistData.files || [];
    sharedState.checklistData.files.push(fileData);
  } else {
    sharedState.selectedItem.files = sharedState.selectedItem.files || [];
    sharedState.selectedItem.files.push(fileData);
  }

  // Mark as dirty and re-render
  markSaveDirty(true);
  renderChecklist();
  alert(`✅ File "${file.name}" attached (will upload when saved)`);
}

/**
 * Upload a single file to the server
 */
export async function uploadFile(file, fileName) {
  // Read & Base64-encode
  const dataUrl = await new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = reject;
    reader.onload  = () => resolve(reader.result);
    reader.readAsDataURL(file);
  });
  const base64 = dataUrl.split(',')[1];

  // POST to /save with encoding=base64
  const uploadPath = `${FILES_DIR}/${fileName}`;
  const payload = {
    file:     uploadPath,
    content:  base64,
    encoding: 'base64',
    message:  `Upload file: ${fileName}`
  };
  
  const res = await fetch(`${WORKER_URL}/save`, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify(payload)
  });
  
  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Upload failed: ${errText || res.statusText}`);
  }
  
  return uploadPath;
}

/**
 * Find all files in the checklist that need to be uploaded
 * (files whose path doesn't start with "checklists/")
 */
export function findFilesToUpload(checklistData) {
  const filesToUpload = [];
  
  // Check global files
  if (checklistData.files) {
    checklistData.files.forEach((file, index) => {
      if (file.path && !file.path.startsWith('checklists/')) {
        filesToUpload.push({
          type: 'global',
          index: index,
          file: file,
          fileObject: file.id ? pendingFiles.get(file.id) : null
        });
      }
    });
  }
  
  // Check item files recursively
  function checkItemFiles(items, parentPath = []) {
    items.forEach((item, itemIndex) => {
      if (item.files) {
        item.files.forEach((file, fileIndex) => {
          if (file.path && !file.path.startsWith('checklists/')) {
            filesToUpload.push({
              type: 'item',
              itemPath: [...parentPath, itemIndex],
              fileIndex: fileIndex,
              file: file,
              fileObject: file.id ? pendingFiles.get(file.id) : null
            });
          }
        });
      }
      
      if (item.children) {
        checkItemFiles(item.children, [...parentPath, itemIndex, 'children']);
      }
    });
  }
  
  if (checklistData.items) {
    checkItemFiles(checklistData.items);
  }
  
  return filesToUpload;
}

/**
 * Upload all pending files before saving
 */
export async function uploadPendingFiles(checklistData) {
  const filesToUpload = findFilesToUpload(checklistData);
  
  if (filesToUpload.length === 0) {
    return; // No files to upload
  }
  
  console.log(`[uploadPendingFiles] Found ${filesToUpload.length} files to upload`);
  
  for (const fileInfo of filesToUpload) {
    try {
      console.log(`[uploadPendingFiles] Uploading ${fileInfo.file.name}...`);
      
      // Get the File object if available
      const fileObject = fileInfo.fileObject;
      if (!fileObject) {
        console.warn(`[uploadPendingFiles] No File object found for ${fileInfo.file.name}, skipping upload`);
        // Update path anyway to avoid repeated attempts
        const uploadPath = `checklists/files/${fileInfo.file.name}`;
        updateFilePath(checklistData, fileInfo, uploadPath);
        continue;
      }
      
      // Actually upload the file
      const uploadPath = await uploadFile(fileObject, fileInfo.file.name);
      
      // Update the file path in the checklist data
      updateFilePath(checklistData, fileInfo, uploadPath);
      
      // Remove from pending files
      if (fileInfo.file.id) {
        pendingFiles.delete(fileInfo.file.id);
      }
      
      console.log(`[uploadPendingFiles] Successfully uploaded ${fileInfo.file.name} to ${uploadPath}`);
      
    } catch (error) {
      console.error(`[uploadPendingFiles] Failed to upload ${fileInfo.file.name}:`, error);
      throw error;
    }
  }
  
  console.log(`[uploadPendingFiles] Successfully uploaded ${filesToUpload.length} files`);
}

/**
 * Helper function to update file path in checklist data
 */
function updateFilePath(checklistData, fileInfo, uploadPath) {
  if (fileInfo.type === 'global') {
    checklistData.files[fileInfo.index].path = uploadPath;
    checklistData.files[fileInfo.index].uploadedBy = sharedState.currentUser;
    checklistData.files[fileInfo.index].uploadedAt = new Date().toISOString();
    delete checklistData.files[fileInfo.index].id; // Remove temporary ID
  } else if (fileInfo.type === 'item') {
    // Navigate to the correct item
    let currentItem = checklistData.items;
    for (let i = 0; i < fileInfo.itemPath.length; i++) {
      const pathPart = fileInfo.itemPath[i];
      if (pathPart === 'children') {
        currentItem = currentItem.children;
      } else {
        currentItem = currentItem[pathPart];
        if (i < fileInfo.itemPath.length - 1) {
          currentItem = currentItem.children || currentItem;
        }
      }
    }
    
    // Update the file path
    if (currentItem && currentItem.files && currentItem.files[fileInfo.fileIndex]) {
      currentItem.files[fileInfo.fileIndex].path = uploadPath;
      currentItem.files[fileInfo.fileIndex].uploadedBy = sharedState.currentUser;
      currentItem.files[fileInfo.fileIndex].uploadedAt = new Date().toISOString();
      delete currentItem.files[fileInfo.fileIndex].id; // Remove temporary ID
    }
  }
}

/**
 * Open a file via the Worker's ?file= loader.
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
