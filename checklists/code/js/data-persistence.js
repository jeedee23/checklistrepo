/**
 * Centralized Data Persistence Module
 * 
 * This module provides a unified interface for all save/load operations
 * in the checklist application. It handles:
 * - File operations via WORKER_URL
 * - Error handling and validation
 * - Progress indicators
 * - Backup and rollback capabilities
 * - State synchronization
 */

import { WORKER_URL, sharedState } from './constants.js';
import { showNotification } from './menu-dialogs.js';

// Configuration for different data types
const DATA_TYPES = {
  FIELDS: {
    filename: 'checklists/config/fields.json',
    stateKey: 'fieldsData',
    validator: validateFieldsData
  },
  USERS: {
    filename: 'checklists/config/users.json',
    stateKey: 'usersData',
    validator: validateUsersData
  },
  CONFIG: {
    filename: 'checklists/config/config.json',
    stateKey: 'configData',
    validator: validateConfigData
  },
  LAYOUTS: {
    filename: 'checklists/config/layouts.json',
    stateKey: 'layoutsData',
    validator: validateLayoutsData
  },
  FILTERS: {
    filename: 'checklists/config/filters.json',
    stateKey: 'filtersData',
    validator: validateFiltersData
  },
  CHECKLIST: {
    filename: null, // Dynamic based on current checklist
    stateKey: 'checklistData',
    validator: validateChecklistData
  }
};

/**
 * Generic save function for any data type
 * @param {string} dataType - Type from DATA_TYPES
 * @param {Object} data - Data to save
 * @param {Object} options - Additional options
 * @returns {Promise<boolean>} Success status
 */
export async function saveData(dataType, data, options = {}) {
  const config = DATA_TYPES[dataType];
  if (!config) {
    throw new Error(`Unknown data type: ${dataType}`);
  }

  const {
    filename = config.filename,
    showProgress = true,
    validateData = true,
    updateState = true
  } = options;

  try {
    // Show progress indicator
    if (showProgress) {
      showNotification('info', `Saving ${dataType.toLowerCase()}...`);
    }

    // Validate data if requested
    if (validateData && config.validator) {
      const validation = config.validator(data);
      if (!validation.isValid) {
        throw new Error(`Data validation failed: ${validation.errors.join(', ')}`);
      }
    }

    // Perform the save operation
    const success = await performSave(filename, data);

    if (success) {
      // Update shared state if requested
      if (updateState && config.stateKey) {
        sharedState[config.stateKey] = data;
      }

      // Show success notification
      if (showProgress) {
        showNotification('success', `${dataType.toLowerCase()} saved successfully`);
      }

      // Trigger events for UI updates
      document.dispatchEvent(new CustomEvent('dataUpdated', { 
        detail: { type: dataType, data } 
      }));

      return true;
    } else {
      throw new Error('Save operation failed');
    }

  } catch (error) {
    console.error(`Error saving ${dataType}:`, error);
    
    if (showProgress) {
      showNotification('error', `Failed to save ${dataType.toLowerCase()}: ${error.message}`);
    }

    // TODO: Implement rollback if backup was created
    
    throw error;
  }
}

/**
 * Generic load function for any data type
 * @param {string} dataType - Type from DATA_TYPES
 * @param {Object} options - Additional options
 * @returns {Promise<Object>} Loaded data
 */
export async function loadData(dataType, options = {}) {
  const config = DATA_TYPES[dataType];
  if (!config) {
    throw new Error(`Unknown data type: ${dataType}`);
  }

  const {
    filename = config.filename,
    updateState = true,
    showProgress = false
  } = options;

  try {
    if (showProgress) {
      showNotification('info', `Loading ${dataType.toLowerCase()}...`);
    }

    const data = await performLoad(filename);

    // Update shared state if requested
    if (updateState && config.stateKey) {
      sharedState[config.stateKey] = data;
    }

    console.log(`[Data Persistence] Loaded ${dataType}:`, data);
    return data;

  } catch (error) {
    console.error(`Error loading ${dataType}:`, error);
    
    if (showProgress) {
      showNotification('error', `Failed to load ${dataType.toLowerCase()}: ${error.message}`);
    }

    throw error;
  }
}

/**
 * Perform the actual save operation via WORKER_URL
 * @param {string} filename - File path relative to workspace
 * @param {Object} data - Data to save
 * @returns {Promise<boolean>} Success status
 */
async function performSave(filename, data) {
  try {
    console.log(`[Data Persistence] Saving to ${filename}:`, data);
    
    const response = await fetch(`${WORKER_URL}/save`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        file: filename, 
        json: data, 
        message: `Auto-save: ${filename} - ${new Date().toISOString()}` 
      })
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Save failed: ${response.status} ${response.statusText} - ${errorText}`);
    }
    
    // Handle both JSON and text responses
    const contentType = response.headers.get('content-type');
    let result;
    
    if (contentType && contentType.includes('application/json')) {
      result = await response.json();
    } else {
      result = await response.text();
    }
    
    console.log(`[Data Persistence] Save successful:`, result);
    
    return true;
  } catch (error) {
    console.error(`Save operation failed for ${filename}:`, error);
    throw error;
  }
}

/**
 * Perform the actual load operation via WORKER_URL
 * @param {string} filename - File path relative to workspace
 * @returns {Promise<Object>} Loaded data
 */
async function performLoad(filename) {
  try {
    const response = await fetch(`${WORKER_URL}?file=${filename}`);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    return await response.json();
  } catch (error) {
    console.error(`Load operation failed for ${filename}:`, error);
    throw error;
  }
}

// Validation functions for different data types
function validateFieldsData(data) {
  const errors = [];
  
  if (!data || typeof data !== 'object') {
    errors.push('Data must be an object');
  } else if (!data.fields || typeof data.fields !== 'object') {
    errors.push('Data must contain a fields object');
  } else {
    // Validate each field
    Object.entries(data.fields).forEach(([id, field]) => {
      if (!field.key || typeof field.key !== 'string') {
        errors.push(`Field ${id} must have a valid key`);
      }
      if (!field.type || typeof field.type !== 'string') {
        errors.push(`Field ${id} must have a valid type`);
      }
      if (field.type === 'select') {
        const hasSource = field.source && field.source.trim();
        const hasOptions = field.options && Array.isArray(field.options) && field.options.length > 0;
        if (!hasSource && !hasOptions) {
          errors.push(`Select field ${id} must have either source or options`);
        }
        if (hasSource && hasOptions) {
          errors.push(`Select field ${id} cannot have both source and options`);
        }
      }
    });
  }
  
  return { isValid: errors.length === 0, errors };
}

function validateUsersData(data) {
  const errors = [];
  
  if (!data || typeof data !== 'object') {
    errors.push('Users data must be an object');
  }
  
  return { isValid: errors.length === 0, errors };
}

function validateConfigData(data) {
  const errors = [];
  
  if (!data || typeof data !== 'object') {
    errors.push('Config data must be an object');
  }
  
  return { isValid: errors.length === 0, errors };
}

function validateLayoutsData(data) {
  const errors = [];
  
  if (!data || typeof data !== 'object') {
    errors.push('Layouts data must be an object');
  }
  
  return { isValid: errors.length === 0, errors };
}

function validateFiltersData(data) {
  const errors = [];
  
  if (!data || typeof data !== 'object') {
    errors.push('Filters data must be an object');
  }
  
  return { isValid: errors.length === 0, errors };
}

function validateChecklistData(data) {
  const errors = [];
  
  if (!data || typeof data !== 'object') {
    errors.push('Checklist data must be an object');
  }
  
  return { isValid: errors.length === 0, errors };
}

// Convenience functions for specific data types
export const saveFields = (data, options = {}) => saveData('FIELDS', data, options);
export const loadFields = (options = {}) => loadData('FIELDS', options);

export const saveUsers = (data, options = {}) => saveData('USERS', data, options);
export const loadUsers = (options = {}) => loadData('USERS', options);

export const saveConfig = (data, options = {}) => saveData('CONFIG', data, options);
export const loadConfig = (options = {}) => loadData('CONFIG', options);

export const saveLayouts = (data, options = {}) => saveData('LAYOUTS', data, options);
export const loadLayouts = (options = {}) => loadData('LAYOUTS', options);

export const saveFilters = (data, options = {}) => saveData('FILTERS', data, options);
export const loadFilters = (options = {}) => loadData('FILTERS', options);

export const saveChecklist = (data, filename, options = {}) => 
  saveData('CHECKLIST', data, { ...options, filename });
export const loadChecklist = (filename, options = {}) => 
  loadData('CHECKLIST', { ...options, filename });
