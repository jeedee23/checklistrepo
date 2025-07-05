// debug-helpers.js - Additional debugging tools for the checklist app

/**
 * Create a deep immutable copy of checklist data for comparison
 * Used to detect unwanted modifications during rendering
 */
export function createCheckpoint(data) {
  return JSON.stringify(data);
}

/**
 * Compare current data against checkpoint to detect modifications
 * @param {string} checkpoint - Stringified JSON from createCheckpoint
 * @param {object} currentData - Current data object
 * @returns {boolean} True if data has been modified
 */
export function hasChanged(checkpoint, currentData) {
  const currentJson = JSON.stringify(currentData);
  return checkpoint !== currentJson;
}

/**
 * Find and report differences between two checklist data objects
 * @param {string} checkpoint - Stringified JSON from createCheckpoint  
 * @param {object} currentData - Current data object
 * @returns {object} Object describing the changes found
 */
export function findChanges(checkpoint, currentData) {
  const changes = {
    itemNumberingChanged: false,
    itemPropertiesChanged: false,
    layoutChanged: false,
    metadataChanged: false,
    changedItems: []
  };
  
  // Quick check if anything changed
  if (!hasChanged(checkpoint, currentData)) {
    return changes;
  }
  
  // Parse the checkpoint for comparison
  const originalData = JSON.parse(checkpoint);
  
  // Compare layout
  if (JSON.stringify(originalData.layout) !== JSON.stringify(currentData.layout)) {
    changes.layoutChanged = true;
  }
  
  // Compare metadata (everything except items and layout)
  const originalMetadata = { ...originalData };
  delete originalMetadata.items;
  delete originalMetadata.layout;
  
  const currentMetadata = { ...currentData };
  delete currentMetadata.items;
  delete currentMetadata.layout;
  
  if (JSON.stringify(originalMetadata) !== JSON.stringify(currentMetadata)) {
    changes.metadataChanged = true;
  }
  
  // Compare items
  function compareItems(original, current, path = []) {
    if (!original || !current) return;
    
    for (let i = 0; i < Math.max(original.length || 0, current.length || 0); i++) {
      const origItem = original[i];
      const currItem = current[i];
      
      // Item exists in both
      if (origItem && currItem) {
        // Check if numbering changed
        if (origItem.hns !== currItem.hns) {
          changes.itemNumberingChanged = true;
          changes.changedItems.push({
            path: [...path, i],
            change: 'numbering',
            original: origItem.hns,
            current: currItem.hns
          });
        }
        
        // Check other properties
        Object.keys(origItem).forEach(key => {
          if (key !== 'children' && key !== 'hns' && JSON.stringify(origItem[key]) !== JSON.stringify(currItem[key])) {
            changes.itemPropertiesChanged = true;
            changes.changedItems.push({
              path: [...path, i],
              change: `property:${key}`,
              original: origItem[key],
              current: currItem[key]
            });
          }
        });
        
        // Check for new properties in current
        Object.keys(currItem).forEach(key => {
          if (key !== 'children' && key !== 'hns' && !(key in origItem)) {
            changes.itemPropertiesChanged = true;
            changes.changedItems.push({
              path: [...path, i],
              change: `newProperty:${key}`,
              original: undefined,
              current: currItem[key]
            });
          }
        });
        
        // Recurse into children
        if (origItem.children && currItem.children) {
          compareItems(origItem.children, currItem.children, [...path, i, 'children']);
        }
      }
      // Item only in original
      else if (origItem) {
        changes.itemPropertiesChanged = true;
        changes.changedItems.push({
          path: [...path, i],
          change: 'removed',
          original: origItem,
          current: undefined
        });
      }
      // Item only in current
      else if (currItem) {
        changes.itemPropertiesChanged = true;
        changes.changedItems.push({
          path: [...path, i],
          change: 'added',
          original: undefined,
          current: currItem
        });
      }
    }
  }
  
  compareItems(originalData.items, currentData.items);
  
  return changes;
}

/**
 * Log the detected changes in a readable format
 * @param {object} changes - Changes object from findChanges()
 */
export function logChanges(changes) {
  console.group('Checklist Changes Detected');
  console.log('Layout Changed:', changes.layoutChanged);
  console.log('Metadata Changed:', changes.metadataChanged);
  console.log('Item Numbering Changed:', changes.itemNumberingChanged);
  console.log('Item Properties Changed:', changes.itemPropertiesChanged);
  
  if (changes.changedItems.length > 0) {
    console.group('Changed Items');
    changes.changedItems.forEach(change => {
      console.log(`Path: ${change.path.join('.')}`);
      console.log(`Change Type: ${change.change}`);
      console.log('Original:', change.original);
      console.log('Current:', change.current);
      console.log('---');
    });
    console.groupEnd();
  }
  
  console.groupEnd();
}
