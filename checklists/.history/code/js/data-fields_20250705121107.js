import { WORKER_URL, sharedState } from './constants.js';
import { saveFields, loadFields } from './data-persistence.js';

// Holds the loaded field definitions
export let fieldDefs = {};

/**
 * Load field definitions (label, key, type, default, options)
 */
export async function loadFieldDefinitions() {
  try {
    const json = await loadFields();
    
    // Store in both places for backward compatibility
    Object.assign(fieldDefs, json.fields || {});
    // sharedState.fieldsData is already updated by loadFields
    
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

/**
 * Save field definitions back to fields.json
 */
export async function saveFieldDefinitions(fieldsData) {
  try {
    console.log('[Data Fields] Saving field definitions...');
    
    // Use centralized save function
    await saveFields(fieldsData);
    
    // Update backward compatibility fieldDefs
    Object.assign(fieldDefs, fieldsData.fields || {});
    
    console.log('[Data Fields] Field definitions saved successfully');
    return true;
  } catch (err) {
    console.error('Error saving fields.json:', err);
    throw err;
  }
}

/**
 * Add a new field definition
 */
export async function addNewField(fieldName, fieldType, fieldLabel, options = {}) {
  try {
    // Generate next available ID
    const existingIds = Object.keys(sharedState.fieldsData.fields || {}).map(id => parseInt(id)).filter(id => !isNaN(id));
    const nextId = existingIds.length > 0 ? Math.max(...existingIds) + 1 : 1;
    
    // Create field definition matching fields.json structure
    const newFieldDef = {
      key: fieldName,
      label: fieldLabel,
      type: fieldType,
      default_value: getDefaultValueForType(fieldType),
      ...options
    };
    
    // Add to fieldsData
    if (!sharedState.fieldsData.fields) {
      sharedState.fieldsData.fields = {};
    }
    sharedState.fieldsData.fields[nextId.toString()] = newFieldDef;
    
    // Update fieldDefs for backward compatibility
    fieldDefs[nextId.toString()] = newFieldDef;
    
    // Save the updated data
    await saveFieldDefinitions(sharedState.fieldsData);
    
    console.log('[Data Fields] Added new field:', fieldName, 'with ID:', nextId);
    return nextId;
  } catch (err) {
    console.error('Error adding new field:', err);
    throw err;
  }
}

/**
 * Get default value based on field type
 */
function getDefaultValueForType(fieldType) {
  const defaults = {
    'checkbox': false,
    'number': 0,
    'text': '',
    'select': '',
    'date': 'now',
    'tree': 'please fill in value',
    'formula': 0
  };
  return defaults[fieldType] || '';
}

/**
 * Validate that all fields follow the mutual exclusivity rule
 * (select fields should have either source OR options, not both)
 */
export function validateFieldDefinitions() {
  const issues = [];
  
  if (!sharedState.fieldsData?.fields) {
    return issues;
  }
  
  Object.entries(sharedState.fieldsData.fields).forEach(([id, field]) => {
    if (field.type === 'select') {
      const hasSource = field.source && field.source.trim();
      const hasOptions = field.options && Array.isArray(field.options) && field.options.length > 0;
      
      if (hasSource && hasOptions) {
        issues.push({
          id,
          field: field.key,
          issue: 'Select field has both source and options - should only have one'
        });
      }
      
      if (!hasSource && !hasOptions) {
        issues.push({
          id,
          field: field.key,
          issue: 'Select field has neither source nor options - should have one'
        });
      }
    }
  });
  
  return issues;
}

// Automatically load definitions on startup
document.addEventListener('DOMContentLoaded', () => {
  loadFieldDefinitions().then(() => {
    document.dispatchEvent(new Event('fieldsLoaded'));
  });
});