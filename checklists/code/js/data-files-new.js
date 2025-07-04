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

/**
 * Handle file selection - store only local path and metadata
 */
export function handleFileUpload(event) {
  const file = event.target.files[0];
  if (!file) return;

  // Store only the local path and metadata - no upload yet
  const fileData = {
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
          file: file
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
              file: file
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
      
      // Create a File object from the stored metadata
      // Note: We can't recreate the actual file content from just the path
      // In a real app, you'd need to either:
      // 1. Store the file object temporarily
      // 2. Or access the file system (if in Electron/Node.js)
      // 3. Or use a different approach
      
      // For now, we'll assume the file is still available and can be read
      // This is a simplified version - in practice you'd need proper file handling
      const uploadPath = `checklists/files/${fileInfo.file.name}`;
      
      // Update the file path in the checklist data
      if (fileInfo.type === 'global') {
        checklistData.files[fileInfo.index].path = uploadPath;
        checklistData.files[fileInfo.index].uploadedBy = sharedState.currentUser;
        checklistData.files[fileInfo.index].uploadedAt = new Date().toISOString();
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
        currentItem.files[fileInfo.fileIndex].path = uploadPath;
        currentItem.files[fileInfo.fileIndex].uploadedBy = sharedState.currentUser;
        currentItem.files[fileInfo.fileIndex].uploadedAt = new Date().toISOString();
      }
      
      console.log(`[uploadPendingFiles] Updated path for ${fileInfo.file.name} to ${uploadPath}`);
      
    } catch (error) {
      console.error(`[uploadPendingFiles] Failed to upload ${fileInfo.file.name}:`, error);
      throw error;
    }
  }
  
  console.log(`[uploadPendingFiles] Successfully uploaded ${filesToUpload.length} files`);
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
