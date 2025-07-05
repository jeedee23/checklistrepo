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
      default_value: getDefaultValueForType(fieldType)
    };
    
    // Enforce mutual exclusivity for select fields: either source OR options, never both
    if (fieldType === 'select') {
      const hasSource = options.source && options.source.trim();
      const hasOptions = options.options && Array.isArray(options.options) && options.options.length > 0;
      
      if (hasSource && hasOptions) {
        throw new Error('Select fields cannot have both source and options. Use either source OR options.');
      }
      
      if (!hasSource && !hasOptions) {
        throw new Error('Select fields must have either source OR options specified.');
      }
      
      // Add only the appropriate property
      if (hasSource) {
        // Validate source value - must be a recognized data source
        const validSources = getAvailableSourceNames();
        if (!validSources.includes(options.source)) {
          throw new Error(`Invalid source "${options.source}". Available sources are: ${validSources.join(', ')}`);
        }
        
        // source: References data that will be populated at runtime
        // Can be either:
        // - Internal sources (from current checklist's sources object): "collaborators", "unitChoices", etc.
        // - External sources (from other files): "users.json", "roles.json", etc.
        // External sources are automatically imported into the checklist's sources when used
        newFieldDef.source = options.source;
      } else {
        // options: Static predefined list of choices
        // Example: ["Planned", "In Progress", "Completed", "Blocked"]
        newFieldDef.options = options.options;
      }
    } else {
      // For non-select fields, add all options
      Object.assign(newFieldDef, options);
    }
    
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
 * Validate that all fields follow the mutual exclusivity rule and have valid sources
 * (select fields should have either source OR options, not both)
 */
export function validateFieldDefinitions() {
  const issues = [];
  
  if (!sharedState.fieldsData?.fields) {
    return issues;
  }
  
  const availableSources = getAvailableSourceNames();
  
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
      
      // Validate source exists if specified
      if (hasSource && !availableSources.includes(field.source)) {
        issues.push({
          id,
          field: field.key,
          issue: `Invalid source "${field.source}" - available sources are: ${availableSources.join(', ')}`
        });
      }
    }
  });
  
  return issues;
}

/**
 * Get list of available source names for select field validation
 * Includes both internal sources (from current checklist) and external sources (from files)
 */
function getAvailableSourceNames() {
  const availableSources = [];
  
  // Add internal sources from current checklist
  if (sharedState.checklistData?.sources) {
    availableSources.push(...Object.keys(sharedState.checklistData.sources));
  }
  
  // Add predefined external sources that can be imported
  const externalSources = [
    'users.json',      // Global user database
    'roles.json',      // User roles configuration  
    'categories.json', // Item categories
    'priorities.json', // Priority levels
    'statuses.json'    // Status options
  ];
  
  availableSources.push(...externalSources);
  
  // Remove duplicates and return sorted list
  return [...new Set(availableSources)].sort();
}

/**
 * Import an external source into the current checklist's sources
 * This is called when a field uses an external source like "users.json"
 */
export async function importExternalSource(sourceName) {
  try {
    if (!sourceName.endsWith('.json')) {
      throw new Error('External sources must be JSON files');
    }
    
    // Load the external file
    const response = await fetch(`${WORKER_URL}?file=checklists/config/${sourceName}`);
    if (!response.ok) {
      throw new Error(`Failed to load ${sourceName}: ${response.statusText}`);
    }
    
    const data = await response.json();
    
    // Extract the array data (assume it's in a standard format)
    let sourceArray;
    if (Array.isArray(data)) {
      sourceArray = data;
    } else if (data.users && Array.isArray(data.users)) {
      // For users.json, extract usernames
      sourceArray = data.users.map(user => user.username || user.name);
    } else if (data.items && Array.isArray(data.items)) {
      // For other config files with items array
      sourceArray = data.items;
    } else {
      throw new Error(`Unsupported format in ${sourceName}`);
    }
    
    // Import into current checklist sources
    const sourceKey = sourceName.replace('.json', '');
    if (!sharedState.checklistData.sources) {
      sharedState.checklistData.sources = {};
    }
    
    sharedState.checklistData.sources[sourceKey] = sourceArray;
    
    console.log(`[Data Fields] Imported external source '${sourceName}' as '${sourceKey}' with ${sourceArray.length} items`);
    
    return sourceKey;
  } catch (err) {
    console.error(`[Data Fields] Failed to import external source '${sourceName}':`, err);
    throw err;
  }
}

// Automatically load definitions on startup
document.addEventListener('DOMContentLoaded', () => {
  loadFieldDefinitions().then(() => {
    document.dispatchEvent(new Event('fieldsLoaded'));
  });
});