
/**
 * Copy the currently selected item
 */
function copySelectedItem() {
  if (!sharedState.selectedItem) {
    showNotification('error', 'No item selected');
    return;
  }
  
  try {
    // Store the item in localStorage for simplicity
    localStorage.setItem('clipboard_item', JSON.stringify(sharedState.selectedItem));
    showNotification('success', 'Item copied to clipboard');
  } catch (err) {
    console.error('Failed to copy item:', err);
    showNotification('error', 'Failed to copy item');
  }
}

/**
 * Paste the previously copied item
 */
function pasteItem() {
  try {
    const clipboardData = localStorage.getItem('clipboard_item');
    if (!clipboardData) {
      showNotification('error', 'Nothing to paste');
      return;
    }
    
    const item = JSON.parse(clipboardData);
    
    if (!sharedState.selectedItem || !sharedState.selectedPath) {
      // If no selection, add to root
      sharedState.checklistData.items.push(JSON.parse(JSON.stringify(item)));
    } else {
      // Add after the selected item
      const parentArray = getParentArray(sharedState.selectedPath);
      const idx = sharedState.selectedPath[sharedState.selectedPath.length - 1] - 1;
      parentArray.splice(idx + 1, 0, JSON.parse(JSON.stringify(item)));
    }
    
    markSaveDirty(true, sharedState.DIRTY_EVENTS.PASTE_ITEM);
    renderChecklist();
    showNotification('success', 'Item pasted');
  } catch (err) {
    console.error('Failed to paste item:', err);
    showNotification('error', 'Failed to paste item');
  }
}

/**
 * Delete the currently selected item
 */
function deleteSelectedItem() {
  if (!sharedState.selectedItem || !sharedState.selectedPath) {
    showNotification('error', 'No item selected');
    return;
  }
  
  if (!confirm('Are you sure you want to delete this item?')) {
    return;
  }
  
  try {
    const parentArray = getParentArray(sharedState.selectedPath);
    const idx = sharedState.selectedPath[sharedState.selectedPath.length - 1] - 1;
    parentArray.splice(idx, 1);
    sharedState.selectedItem = null;
    sharedState.selectedPath = null;
    markSaveDirty(true, sharedState.DIRTY_EVENTS.DELETE_ITEM);
    renderChecklist();
    showNotification('success', 'Item deleted');
  } catch (err) {
    console.error('Failed to delete item:', err);
    showNotification('error', 'Failed to delete item');
  }
}

/**
 * Open a color picker dialog
 */
function openColorPicker() {
  const color = prompt('Enter a color value (hex, rgb, or name):', '#ff0000');
  if (color) {
    applyColor(color);
  }
}

/**
 * Convert color name to RGBA values
 */
function getColorValues(colorName) {
  const colorMap = {
    'red': '255,0,0,1',
    'green': '0,128,0,1',
    'blue': '0,0,255,1',
    'black': '0,0,0,1',
    'gray': '128,128,128,1',
    'orange': '255,165,0,1',
    'purple': '128,0,128,1',
    'custom': '0,0,0,1' // Default for custom
  };
  return colorMap[colorName] || '0,0,0,1';
}

/**
 * Show the column visibility menu to toggle columns on/off
 */
function showColumnVisibilityMenu() {
  try {
    // Import the UI module to show the column visibility menu
    import('./ui-subrender.js').then(uiModule => {
      if (uiModule.showColumnVisibilityMenu) {
        // Center the menu in the window
        const x = window.innerWidth / 2;
        const y = window.innerHeight / 3;
        uiModule.showColumnVisibilityMenu(x, y);
      } else {
        console.error('showColumnVisibilityMenu function not found in ui-subrender.js');
        showNotification('error', 'Column visibility menu not available');
      }
    }).catch(err => {
      console.error('Error importing ui-subrender.js:', err);
      showNotification('error', 'Failed to show column visibility menu');
    });
  } catch (error) {
    console.error('Error showing column visibility menu:', error);
    showNotification('error', 'Failed to show column visibility menu');
  }
}

/**
 * Add a new item at the same level as the currently selected item
 */
export function addSameLevel() {
  if (!sharedState.selectedItem) {
    showNotification('error', 'No item selected');
    return;
  }
  uiAddSameLevel();
}

/**
 * Add a new item as a sub-item of the currently selected item
 */
export function addSubLevel() {
  if (!sharedState.selectedItem) {
    showNotification('error', 'No item selected');
    return;
  }
  uiAddSubLevel();
}

/**
 * Add a note to the currently selected item
 */
export function addNote() {
  if (!sharedState.selectedItem) {
    showNotification('error', 'No item selected');
    return;
  }
  openNoteEditor();
}

/**
 * Add a note to the currently selected item
 */
export function addFile() {
  if (!sharedState.selectedItem) {
    showNotification('error', 'No item selected');
    return;
  }
  /** Here needs to come an implementation which let's select the user a file. 
   * In the previous version, the file was mentioned at the bottom of the checklist
   * However this must be done with an icon. Accepted files are ALL files which can be viewed in a standard browser
   * images png,jpg,gif (icon camera). pdf's (icon pdf)
   * just like the addNote, the icon will be added to the item, and the file will be stored on github 
   * in the /files directory. */
}

/**
 * Add a note to the currently selected item
 */
export function addLink() {
  if (!sharedState.selectedItem) {
    showNotification('error', 'No item selected');
    return;
  }
  //** If a user pastes a link, the icon will become a link icon, 
  // and the pop-up will ask for the text and the item will be shown as a blue underlined link. 
  // the text should normally contain the 'no' field. the input box should by default have the checklist ID (to implement in the json)
  // Then a "-" and then the 'no' field and then a'-' after which the user should fill in. Should he change the complete text, that is no problem
  // we simply give a hint  */
}