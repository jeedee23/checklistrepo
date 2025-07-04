import { sharedState } from './constants.js';
import { saveChecklist, markSaveDirty, getItemByPath, getParentArray } from './data2.js';
import { collapseAll, expandAll, addSubLevel } from './ui-mainrender.js';
import { toggleBold, moveUpLevel, moveDownLevel, moveAltUp, moveAltDown } from './ui-mainrender.js';
import { selectedItem, selectedPath, setSelectedItem } from './events-ui.js';
import { renderChecklist } from './renderchecklist.js';

/**
 * Setup comprehensive keyboard event listeners (matching oldscript.js)
 */

// Track if keyboard events have been set up and prevent double-firing
let keyboardEventsSetup = false;
let lastKeyEvent = null;
let lastKeyEventTime = 0;

export function setupKeyboardEvents() {
  console.log('[Keyboard] Setting up keyboard events');
  
  // Prevent multiple event listener attachments
  if (keyboardEventsSetup) {
    console.log('[Keyboard] Events already setup, skipping');
    return;
  }
  keyboardEventsSetup = true;
  
  document.addEventListener('keydown', e => {
    // Debounce/prevent double-firing of same event
    const currentTime = Date.now();
    const keySignature = `${e.key}_${e.ctrlKey}_${e.altKey}_${e.shiftKey}_${e.metaKey}`;
    
    if (lastKeyEvent === keySignature && (currentTime - lastKeyEventTime) < 100) {
      console.log('[Keyboard] Duplicate event detected, ignoring:', keySignature);
      return;
    }
    
    lastKeyEvent = keySignature;
    lastKeyEventTime = currentTime;
    // Basic save functionality
    if ((e.ctrlKey || e.metaKey) && e.key === 's') {
      e.preventDefault();
      if (sharedState.isDirty) saveChecklist(sharedState.FILE_PATH);
    }

    // All other shortcuts require selectedItem
    if (!selectedItem) return;
    const key = e.key.toLowerCase();

    // Toggle bold
    if (e.ctrlKey && key === 'b') { 
      e.preventDefault(); 
      toggleBold(); 
    }

    // Move up/down level
    if (e.ctrlKey && key === 'arrowup') { 
      e.preventDefault(); 
      moveUpLevel(); 
    }
    if (e.ctrlKey && key === 'arrowdown') { 
      e.preventDefault(); 
      moveDownLevel(); 
    }

    // Move visual position (alt + arrows)
    if (e.altKey && key === 'arrowup') { 
      e.preventDefault(); 
      console.log('[KEYBOARD] Alt+Up pressed - calling moveAltUp()');
      moveAltUp(); 
    }
    if (e.altKey && key === 'arrowdown') { 
      e.preventDefault(); 
      console.log('[KEYBOARD] Alt+Down pressed - calling moveAltDown()');
      moveAltDown(); 
    }

    // Expand/collapse
    if (e.ctrlKey && key === 'e') {
      e.preventDefault();
      if (e.shiftKey) collapseAll();
      else expandAll();
    }

    // Duplicate item
    if (e.ctrlKey && key === 'd') {
      e.preventDefault();
      if (!sharedState.selectedPath || !sharedState.selectedItem) {
        alert('⚠ No item selected for duplication.');
        return;
      }
      
      // Simple duplication like original code
      const clone = JSON.parse(JSON.stringify(sharedState.selectedItem));
      const arr = getParentArray(sharedState.selectedPath);
      if (!arr) {
        alert('⚠ Cannot find parent array for duplication.');
        return;
      }
      
      // Insert clone right after the original (like original code)
      const idx = sharedState.selectedPath[sharedState.selectedPath.length - 1];
      arr.splice(idx, 0, clone);
      
      // Mark dirty and render (like original code)
      markSaveDirty(true);
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
      else moveDownLevel();
    }

    // Delete (Ctrl+Delete or Shift+Ctrl+Delete)
    if (e.ctrlKey && key === 'delete') {
      e.preventDefault();
      if (!sharedState.selectedPath || !sharedState.selectedItem) {
        alert('⚠ No item selected for deletion.');
        return;
      }
      const arr = getParentArray(sharedState.selectedPath);
      if (!arr) {
        alert('⚠ Cannot find parent array for deletion.');
        return;
      }
      const idx = sharedState.selectedPath[sharedState.selectedPath.length - 1] - 1;
      const skip = e.shiftKey;
      if (skip || confirm('Delete this item?')) {
        arr.splice(idx, 1);
        setSelectedItem(null, null);
        sharedState.selectedItem = null;
        sharedState.selectedPath = null;
        markSaveDirty(true);
        renderChecklist();
      }
    }
  });
}

/**
 * Clear keyboard event debounce cache (useful for testing or forced reset)
 */
export function clearKeyboardEventQueue() {
  console.log('[Keyboard] Clearing event queue/debounce cache');
  lastKeyEvent = null;
  lastKeyEventTime = 0;
}

/**
 * Reset keyboard event system (remove existing listeners and allow re-setup)
 */
export function resetKeyboardEvents() {
  console.log('[Keyboard] Resetting keyboard events');
  keyboardEventsSetup = false;
  clearKeyboardEventQueue();
  // Note: We don't remove the event listener here as it's hard to track
  // the exact reference. Instead, the debounce mechanism will handle duplicates.
}

// ─── events-keyboard.js ─────────────────────────────────────────────
