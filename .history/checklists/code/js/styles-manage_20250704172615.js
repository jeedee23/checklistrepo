// style-manager.js — On-screen & print style definitions
import { sharedState } from './constants.js';
import { renderChecklist } from './renderchecklist.js'; // Add this import
import { markSaveDirty } from './data2.js';
/**
 * Apply a CSS color to the currently selected checklist item.
 * @param {string} color - CSS color string, e.g. 'rgba(255,0,0,1)'
 */
export function applyColor(color) {
  if (!sharedState.selectedItem) return;
  sharedState.selectedItem.color = color;
  renderChecklist();
  markSaveDirty(true);
}

/**
 * Toggle bold styling on the currently selected checklist item.
 */
export function toggleBold() {
  if (!sharedState.selectedItem) return;
  sharedState.selectedItem.bold = !sharedState.selectedItem.bold;
  renderChecklist();
 markSaveDirty(true);
}

/**
 * Reset any color or bold styling on the currently selected item.
 */
export function resetStyle() {
  if (!sharedState.selectedItem) return;
  delete sharedState.selectedItem.color;
  delete sharedState.selectedItem.bold;
  renderChecklist();
  markSaveDirty(true);
}

// === Future placeholders for theme/style management ===

/**
 * Load available themes/styles from an external source (e.g., styles.html or JSON).
 */
export async function loadStyles() {
  // TODO: fetch '/styles.html' or '/styles.json', parse and store available styles
}

/**
 * Apply a named style/theme to the page (e.g., toggle CSS classes for print vs screen).
 * @param {string} styleName
 */
export function applyStyle(styleName) {
  // TODO: implement applying a stored CSS theme by name
}

/**
 * Get list of available style/theme names (for UI dropdown).
 * @returns {string[]}
 */
export function listStyles() {
  // TODO: return array of loaded style names
  return [];
}
export function loadDynamicStyles() {
  // TODO: return array of dynamic styles to be applied
  return [];
}