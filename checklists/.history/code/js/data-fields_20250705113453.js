import { WORKER_URL, sharedState } from './constants.js';

// Holds the loaded field definitions
export let fieldDefs = {};

/**
 * Load field definitions (label, key, type, default, options)
 */
export async function loadFieldDefinitions() {
  try {
    const res = await fetch(`${WORKER_URL}?file=checklists/config/fields.json`);
    if (!res.ok) {
      console.error('Failed to load fields.json');
      return;
    }
    const json = await res.json();
    
    // Store in both places for backward compatibility
    Object.assign(fieldDefs, json.fields || {});
    sharedState.fieldsData = json;
    
    console.log('[Data Fields] Loaded field definitions:', Object.keys(json.fields || {}).length, 'fields');
  } catch (err) {
    console.error('Error loading fields.json:', err);
  }
}

/**
 * Register a new field type
 * @param {Object} fieldDef
 */
export function addField(fieldDef) {
  if (!fieldDef.key) {
    throw new Error('Field definition must include a key');
  }
  fieldDefs[fieldDef.key] = fieldDef;
  // TODO: save back to fields.json via WORKER_URL
}

/**
 * Remove an existing field
 * @param {string} fieldKey
 */
export function removeField(fieldKey) {
  delete fieldDefs[fieldKey];
  // TODO: save back to fields.json via WORKER_URL
}

/**
 * Determine if a field should be shown based on currentUser's access
 * @param {string} fieldKey
 * @returns {boolean}
 */
export function canViewField(fieldKey) {
  const def = fieldDefs[fieldKey];
  if (!def) return false;
  if (typeof def.accessLevel === 'number' && sharedState.currentUser?.accessLevel != null) {
    return sharedState.currentUser.accessLevel >= def.accessLevel;
  }
  return true;
}

// Automatically load definitions on startup
document.addEventListener('DOMContentLoaded', () => {
  loadFieldDefinitions().then(() => {
    document.dispatchEvent(new Event('fieldsLoaded'));
  });
});