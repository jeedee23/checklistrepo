// ui-notifications.js — Toast notification system for the checklist app

/**
 * Show a toast notification at the top of the screen
 * @param {string} message - Message to show
 * @param {'success'|'error'|'warning'|'info'} type - Type of notification
 * @param {number} [duration=3000] - Duration in milliseconds
 * @param {Function} [onClose] - Optional callback when toast is closed
 * @returns {HTMLElement} The toast element
 */
export function showToast(message, type = 'info', duration = 3000, onClose = null) {
  // Remove existing toast with the same message to prevent duplication
  const existingToasts = document.querySelectorAll('.toast');
  for (const existing of existingToasts) {
    if (existing.textContent === message) {
      existing.remove();
    }
  }

  // Create and style toast element
  const toast = document.createElement('div');
  toast.className = `toast ${type}-toast`;
  toast.textContent = message;
  toast.style.position = 'fixed';
  toast.style.top = '1rem';
  toast.style.left = '50%';
  toast.style.transform = 'translateX(-50%)';
  toast.style.padding = '0.75rem 1.5rem';
  toast.style.borderRadius = '4px';
  toast.style.boxShadow = '0 2px 10px rgba(0,0,0,0.2)';
  toast.style.zIndex = '9999';
  toast.style.animation = 'fadeInOut 0.3s ease-in-out';
  toast.style.fontWeight = '500';
  toast.style.fontSize = '0.9rem';
  
  // Style based on type
  switch (type) {
    case 'success':
      toast.style.backgroundColor = '#4caf50';
      toast.style.color = 'white';
      break;
    case 'error':
      toast.style.backgroundColor = '#f44336';
      toast.style.color = 'white';
      break;
    case 'warning':
      toast.style.backgroundColor = '#ff9800';
      toast.style.color = 'white';
      break;
    case 'info':
    default:
      toast.style.backgroundColor = '#2196f3';
      toast.style.color = 'white';
      break;
  }

  // Add close button
  const closeBtn = document.createElement('span');
  closeBtn.innerHTML = '&times;';
  closeBtn.style.marginLeft = '1rem';
  closeBtn.style.cursor = 'pointer';
  closeBtn.style.fontWeight = 'bold';
  closeBtn.onclick = () => {
    toast.remove();
    if (onClose) onClose();
  };
  toast.appendChild(closeBtn);

  // Add to DOM
  document.body.appendChild(toast);

  // Set auto-dismiss timer
  if (duration > 0) {
    setTimeout(() => {
      if (document.body.contains(toast)) {
        toast.style.animation = 'fadeInOut 0.3s ease-in-out reverse';
        setTimeout(() => {
          if (document.body.contains(toast)) {
            toast.remove();
            if (onClose) onClose();
          }
        }, 300);
      }
    }, duration);
  }

  return toast;
}

/**
 * Show a success toast notification
 * @param {string} message - Message to show
 * @param {number} [duration=3000] - Duration in milliseconds
 */
export function showSuccess(message, duration = 3000) {
  return showToast(message, 'success', duration);
}

/**
 * Show an error toast notification
 * @param {string} message - Message to show
 * @param {number} [duration=5000] - Duration in milliseconds
 */
export function showError(message, duration = 5000) {
  return showToast(message, 'error', duration);
}

/**
 * Show a warning toast notification
 * @param {string} message - Message to show
 * @param {number} [duration=4000] - Duration in milliseconds
 */
export function showWarning(message, duration = 4000) {
  return showToast(message, 'warning', duration);
}

/**
 * Show an info toast notification
 * @param {string} message - Message to show
 * @param {number} [duration=3000] - Duration in milliseconds
 */
export function showInfo(message, duration = 3000) {
  return showToast(message, 'info', duration);
}

/**
 * Show a confirmation dialog with custom buttons
 * @param {string} message - Message to show
 * @param {Object} options - Dialog options
 * @param {string} [options.title='Confirm'] - Dialog title
 * @param {string} [options.confirmText='OK'] - Confirm button text
 * @param {string} [options.cancelText='Cancel'] - Cancel button text
 * @param {Function} [options.onConfirm] - Callback when confirmed
 * @param {Function} [options.onCancel] - Callback when cancelled
 * @returns {HTMLElement} The dialog element
 */
export function showConfirmDialog(message, options = {}) {
  const {
    title = 'Confirm',
    confirmText = 'OK',
    cancelText = 'Cancel',
    onConfirm = null,
    onCancel = null
  } = options;

  // Create overlay
  const overlay = document.createElement('div');
  overlay.className = 'dialog-overlay';
  overlay.style.position = 'fixed';
  overlay.style.top = '0';
  overlay.style.left = '0';
  overlay.style.width = '100%';
  overlay.style.height = '100%';
  overlay.style.backgroundColor = 'rgba(0,0,0,0.5)';
  overlay.style.zIndex = '10000';
  overlay.style.display = 'flex';
  overlay.style.alignItems = 'center';
  overlay.style.justifyContent = 'center';

  // Create dialog
  const dialog = document.createElement('div');
  dialog.className = 'dialog';
  dialog.style.backgroundColor = 'white';
  dialog.style.borderRadius = '4px';
  dialog.style.boxShadow = '0 4px 12px rgba(0,0,0,0.15)';
  dialog.style.width = '400px';
  dialog.style.maxWidth = '90%';
  dialog.style.padding = '0';
  dialog.style.overflow = 'hidden';

  // Dialog header
  const header = document.createElement('div');
  header.className = 'dialog-header';
  header.style.padding = '1rem';
  header.style.borderBottom = '1px solid #e0e0e0';
  header.style.fontWeight = 'bold';
  header.textContent = title;
  dialog.appendChild(header);

  // Dialog content
  const content = document.createElement('div');
  content.className = 'dialog-content';
  content.style.padding = '1rem';
  content.textContent = message;
  dialog.appendChild(content);

  // Dialog footer
  const footer = document.createElement('div');
  footer.className = 'dialog-footer';
  footer.style.padding = '1rem';
  footer.style.borderTop = '1px solid #e0e0e0';
  footer.style.display = 'flex';
  footer.style.justifyContent = 'flex-end';
  footer.style.gap = '0.5rem';

  // Cancel button
  const cancelBtn = document.createElement('button');
  cancelBtn.textContent = cancelText;
  cancelBtn.style.padding = '0.5rem 1rem';
  cancelBtn.style.border = '1px solid #ccc';
  cancelBtn.style.borderRadius = '4px';
  cancelBtn.style.backgroundColor = '#f5f5f5';
  cancelBtn.style.cursor = 'pointer';
  cancelBtn.onclick = () => {
    overlay.remove();
    if (onCancel) onCancel();
  };
  footer.appendChild(cancelBtn);

  // Confirm button
  const confirmBtn = document.createElement('button');
  confirmBtn.textContent = confirmText;
  confirmBtn.style.padding = '0.5rem 1rem';
  confirmBtn.style.border = '1px solid #2196f3';
  confirmBtn.style.borderRadius = '4px';
  confirmBtn.style.backgroundColor = '#2196f3';
  confirmBtn.style.color = 'white';
  confirmBtn.style.cursor = 'pointer';
  confirmBtn.onclick = () => {
    overlay.remove();
    if (onConfirm) onConfirm();
  };
  footer.appendChild(confirmBtn);

  dialog.appendChild(footer);
  overlay.appendChild(dialog);
  document.body.appendChild(overlay);

  // Focus confirm button by default
  confirmBtn.focus();

  return overlay;
}
