// utils.js — Pure helper functions for checklist app
import { sharedState } from './constants.js';
/**
 * Returns a timestamp string in the format YYYY_MM_DD_@_HH-MM-SS
 * Example: "2025_06_27_@_12-34-56"
 */
export function timestampNow() {
  const pad = n => String(n).padStart(2, '0');
  const d = new Date();
  const datePart = [d.getFullYear(), pad(d.getMonth() + 1), pad(d.getDate())].join('_');
  const timePart = [pad(d.getHours()), pad(d.getMinutes()), pad(d.getSeconds())].join('-');
  return `${datePart}_@_${timePart}`;
}

/**
 * Retrieves the given query parameter from the current page URL.
 * @param {string} name - The name of the URL parameter to retrieve
 * @returns {string|null} The parameter value or null if not present
 */
export function getQueryParam(name) {
  const params = new URLSearchParams(sharedState.location.search);
  return params.get(name);
}
/**
 * Deep-traverses an array of checklist items, invoking fn(item) on each.
 * @param {Array} items - The checklist items (may have nested children)
 * @param {Function} fn - Function to call for each item
 */
export function traverse(items, fn) {
  items.forEach(item => {
    fn(item);
    if (Array.isArray(item.children)) {
      traverse(item.children, fn);
    }
  });
}
export function getParentArray(path) {
  if (path.length === 1) return sharedState.checklistData.items;

  let arr = sharedState.checklistData.items;
  for (let i = 0; i < path.length - 1; i++) {
    const idx = path[i] - 1; // because path is 1-based
    if (!arr[idx]) return sharedState.checklistData.items;
    arr = arr[idx].children = arr[idx].children || [];
  }
  return arr;
}

export function renumberChecklist(items = sharedState.checklistData.items, prefix = []) {
  items.forEach((item, idx) => {
    const number = [...prefix, idx + 1];
    itemhns = number.join('.');

    // Recurse into children (if any)
    if (Array.isArray(item.children) && item.children.length > 0) {
      renumberChecklist(item.children, number);
    }
  });
}

export // CSS-driven flicker helper (needs the .move-blocked keyframes from before)
function blockFlicker(row) {
  row.classList.add('move-blocked');
  row.addEventListener('animationend', () => {
    row.classList.remove('move-blocked');
  }, { once: true });
}

/**
 * Safely computes a JavaScript expression against a context object.
 * @param {string} formula - The JS expression (e.g. "qty_est * price_unit")
 * @param {Object} ctx - Context object whose keys become local variables
 * @returns {*} The result of the formula, or empty string on error
 */
export function computeFormula(formula, ctx) {
  try {
    const fn = new Function(...Object.keys(ctx), `return ${formula}`);
    return fn(...Object.values(ctx));
  } catch {
    return '';
  }
}

/**
 * Resolves a default value specifier into a concrete value.
 * Supported specifiers:
 *  - 'now': current date (YYYY-MM-DD)
 *  - 'currentuser': the global currentUser (must be set elsewhere)
 *  - any other literal is returned unchanged
 * @param {*} dv - Default value specifier
 * @returns {*} Resolved default value
 */
export function resolveDefault(dv) {
  if (dv === 'now') {
    return new Date().toISOString().split('T')[0];
  }
  if (dv === 'currentuser') {
    return sharedState.currentUser || '';
  }
  return dv;
}
