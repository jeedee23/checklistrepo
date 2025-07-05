# Checklist Application Architecture

## Current State (July 2025)

The checklist application is a modern, feature-rich web application for managing hierarchical checklists with collaboration features, built with vanilla JavaScript and a modular ES6+ architecture.

## System Overview

### Technology Stack
- **Frontend**: Vanilla JavaScript (ES6+), HTML5, CSS3
- **Editor**: Quill.js for rich text notes
- **Backend**: GitHub repository with Cloudflare Worker proxy
- **Storage**: JSON files in GitHub repository structure
- **Authentication**: Token-based user authentication
- **Deployment**: Static web application with external API integration

## Core Architecture

### Application Entry Point
- **`index.html`** - Main application structure and UI layout
- **`index.js`** - Main entry point, exposes global functions
- **`app-init.js`** - Complete application initialization sequence

### Core Systems

#### Menu System (Modularized)
- **`menu-core.js`** - Central menu system controller and event handling
- **`menu-dialogs.js`** - Dialog functionality (About, Shortcuts, Debug, etc.)
- **`menu-checklist-actions.js`** - Checklist operations (copy/paste, add items, search)
- **`menu-fields-actions.js`** - Field management and column operations
- **`menu-layouts.js`** - Layout management and templates
- **`menu-context.js`** - Right-click context menu handling
- **`menu-build.js`** - Dynamic menu structure generation
- **`menu-integrations.js`** - External service integrations

#### Data Management Layer
- **`data.js`** - Core data operations and GitHub API communication
- **`data2.js`** - Extended data operations (save/load, dirty tracking, item manipulation)
- **`data-notes.js`** - Rich text note management with Quill.js editor
- **`data-files.js`** - File upload, download, and attachment management
- **`data-users.js`** - User management and collaborator operations
- **`data-versions.js`** - Version history and conflict resolution
- **`data-fields.js`** - Dynamic field definitions and type management

#### User Interface Layer
- **`ui-mainrender.js`** - Main UI rendering, filtering, and view controls
- **`ui-subrender.js`** - Component rendering (items, icons, column headers)
- **`renderchecklist.js`** - Checklist-specific rendering logic and item display
- **`ui-notifications.js`** - Toast notification system
- **`user-management.js`** - User management dialog (Excel-style interface)
- **`UserManagementDialog.js`** - User management dialog registration

#### Event Handling System
- **`events-global.js`** - Global event handlers and filters
- **`events-keyboard.js`** - Keyboard shortcuts and hotkeys
- **`events-timers.js`** - Timed events (auto-save, inactivity monitoring)
- **`events-ui.js`** - UI-specific event handlers

#### Core Utilities
- **`constants.js`** - Shared state, configuration, and application constants
- **`security.js`** - Authentication, authorization, and security functions
- **`styles-manage.js`** - Dynamic styling and theme management
- **`utils.js`** - Utility functions and helpers
- **`debug-helpers.js`** - Development and debugging tools
- **`auth-login.js`** - User authentication and login system

## Key Features Implemented

### Hierarchical Checklist Management
✅ **Tree Structure**: Nested items with expand/collapse functionality
✅ **Item Operations**: Add same level, add sub-level, copy/paste, delete
✅ **Rich Content**: Multiple field types (text, checkbox, date, user assignment)
✅ **Flexible Layout**: Customizable columns, visibility, and ordering
✅ **Mass Operations**: Bulk editing, filtering, and management

### Rich Text Notes System
✅ **Quill.js Integration**: Full-featured rich text editor
✅ **Draggable Modal**: User-friendly note editing interface
✅ **Note Attachment**: Link notes to specific checklist items
✅ **Note Management**: Create, edit, and organize notes
✅ **Proper Function Logic**: 
- `addNote()` - Creates new notes
- `editNote(noteFile, item)` - Edits existing notes with SHA
- `handleAddNote()` - Menu wrapper with safety checks

### File Management System
✅ **File Upload**: Drag-and-drop and click-to-upload functionality
✅ **File Preview**: Image preview and PDF viewer integration
✅ **File Organization**: Timestamped storage with proper categorization
✅ **File Security**: Access control and permission validation

### User Management & Collaboration
✅ **Excel-Style Dialog**: Professional user management interface
✅ **User Navigation**: Previous/Next user browsing
✅ **Access Control**: 10-level permission system (0-9)
✅ **2FA Support**: Email and TOTP authentication methods
✅ **Collaborator System**: Multi-user checklist collaboration
✅ **Token-Based Auth**: Secure user authentication

### Advanced UI Features
✅ **Dynamic Menus**: Context-sensitive menu system
✅ **Keyboard Shortcuts**: Comprehensive hotkey support
✅ **Toast Notifications**: User feedback and status messages
✅ **Responsive Design**: Works on various screen sizes
✅ **Column Management**: Drag-and-drop column reordering
✅ **Filter System**: Multiple filter modes (all, not done, mine only)

## Application Architecture Patterns

### Modular Design
```
┌─────────────────────────────────────────────────────────────┐
│                    Application Layer                        │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐  │
│  │   Menu      │  │     UI      │  │     Events         │  │
│  │   System    │  │  Rendering  │  │    Handling        │  │
│  └─────────────┘  └─────────────┘  └─────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
┌─────────────────────────────────────────────────────────────┐
│                     Data Layer                              │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐  │
│  │    Core     │  │    User     │  │      Files &       │  │
│  │    Data     │  │ Management  │  │      Notes         │  │
│  └─────────────┘  └─────────────┘  └─────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
┌─────────────────────────────────────────────────────────────┐
│                   Storage Layer                             │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐  │
│  │   GitHub    │  │  Cloudflare │  │   Configuration    │  │
│  │ Repository  │  │   Worker    │  │     Files          │  │
│  └─────────────┘  └─────────────┘  └─────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

### Data Flow Architecture
```
User Interaction
       │
       ▼
┌─────────────┐      ┌─────────────────┐      ┌─────────────────┐
│   Events    │────▶ │  Shared State   │────▶ │  Data Layer     │
│   Layer     │      │  (constants.js) │      │  Operations     │
└─────────────┘      └─────────────────┘      └─────────────────┘
       │                       │                       │
       ▼                       ▼                       ▼
┌─────────────┐      ┌─────────────────┐      ┌─────────────────┐
│     UI      │      │   Validation    │      │  External API   │
│  Re-render  │      │  & Business     │      │  Communication  │
│             │      │     Logic       │      │ (GitHub/Worker) │
└─────────────┘      └─────────────────┘      └─────────────────┘
```

## File Structure and Organization

### Core Application Files
```
checklists/
├── index.html                    # Main application HTML
├── styles.html                   # CSS imports and coordination
├── code/
│   ├── css/
│   │   ├── style.css            # Main application styles
│   │   └── menu.css             # Menu system styles
│   └── js/
│       ├── Core Application
│       │   ├── app-init.js      # Application initialization
│       │   ├── constants.js     # Shared state and constants
│       │   ├── index.js         # Main entry point
│       │   └── utils.js         # Utility functions
│       ├── Menu System
│       │   ├── menu-core.js     # Main menu controller
│       │   ├── menu-dialogs.js  # Dialog management
│       │   ├── menu-checklist-actions.js # Checklist operations
│       │   ├── menu-fields-actions.js    # Field operations
│       │   ├── menu-layouts.js           # Layout operations
│       │   ├── menu-context.js           # Context menu
│       │   ├── menu-build.js             # Menu structure
│       │   └── menu-integrations.js      # External integrations
│       ├── Data Management
│       │   ├── data.js          # Core data operations
│       │   ├── data2.js         # Extended data operations
│       │   ├── data-notes.js    # Note management
│       │   ├── data-files.js    # File operations
│       │   ├── data-users.js    # User operations
│       │   ├── data-versions.js # Version control
│       │   └── data-fields.js   # Field management
│       ├── User Interface
│       │   ├── ui-mainrender.js # Main rendering
│       │   ├── ui-subrender.js  # Component rendering
│       │   ├── ui-notifications.js # Toast notifications
│       │   ├── renderchecklist.js # Checklist rendering
│       │   ├── user-management.js # User management dialog
│       │   └── UserManagementDialog.js # Dialog registration
│       ├── Event Handling
│       │   ├── events-global.js # Global event handlers
│       │   ├── events-keyboard.js # Keyboard shortcuts
│       │   ├── events-timers.js   # Timed events
│       │   └── events-ui.js       # UI-specific events
│       └── Core Systems
│           ├── auth-login.js      # Authentication
│           ├── security.js        # Security functions
│           ├── styles-manage.js   # Style management
│           └── debug-helpers.js   # Development tools
```

# ARCHITECTURE.md - System Architecture Documentation

## 🏗️ Current Architecture: Centralized Data Persistence

### **System Overview**
The checklist application now implements a centralized data persistence architecture that provides unified, validated, and consistent data operations across all components.

### **Core Components**

#### **1. Data Persistence Layer** (`data-persistence.js`)
```javascript
// Unified save/load operations for all data types
export const saveFields = (data, options = {}) => saveData('FIELDS', data, options);
export const loadFields = (options = {}) => loadData('FIELDS', options);
export const saveUsers = (data, options = {}) => saveData('USERS', data, options);
// ... other data types
```

**Features:**
- **Generic Operations**: `saveData()` and `loadData()` handle all data types
- **Built-in Validation**: Data validated before saving using type-specific validators
- **Progress Feedback**: User notifications during operations
- **Event System**: Automatic UI refresh via `dataUpdated` events
- **Error Handling**: Consistent error management with rollback capability

#### **2. Field Management System** (`menu-fields-actions.js`, `data-fields.js`)
```javascript
// Enhanced field creation with validation
const fieldDef = {
  key: fieldName,
  label: fieldLabel,
  type: fieldType,
  default_value: getDefaultValueForType(fieldType),
  // Either source OR options, never both
  source: "collaborators",        // For dynamic data
  options: ["A", "B", "C"]       // For static options
};
```

**Features:**
- **Mutual Exclusivity**: Select fields use either `source` OR `options`
- **Real-time Validation**: Prevents invalid field configurations
- **Immediate Persistence**: New fields saved to GitHub immediately
- **UI Synchronization**: Fields chooser updates automatically

#### **3. State Management** (`constants.js`, `sharedState`)
```javascript
export const sharedState = {
  fieldsData: {},      // Loaded from fields.json
  usersData: {},       // Loaded from users.json
  configData: {},      // Loaded from config.json
  checklistData: {},   // Current checklist
  currentUser: {}      // Authenticated user
};
```

### **Data Flow Architecture**

```
User Action
    ↓
UI Component (Field Manager, User Manager, etc.)
    ↓
Data Operation Request
    ↓
data-persistence.js
    ↓
Validation (type-specific validators)
    ↓
WORKER_URL → GitHub Repository
    ↓
Success Response
    ↓
Update sharedState
    ↓
Dispatch dataUpdated Event
    ↓
UI Components Auto-refresh
```

### **Access Control Architecture (Future)**

#### **Three-Layer Access System:**
1. **Layout Level**: Controls which fields are visible/editable per layout
2. **Filter Level**: Controls which rows/items are accessible
3. **User Level**: Custom per-user filter overrides

#### **Field Access Logic:**
```javascript
// Planned implementation
function canAccessField(fieldKey, user, layout, filter) {
  // 1. Check layout-level permissions
  if (!layout.allowsField(fieldKey, user.accessLevel)) return false;
  
  // 2. Check filter-level permissions  
  if (!filter.allowsField(fieldKey, user)) return false;
  
  // 3. Check user-level overrides
  return user.customFilter?.allowsField(fieldKey) ?? true;
}
```

### **File Structure & Dependencies**

```
code/js/
├── data-persistence.js     # Central save/load system
│   ├── saveData()          # Generic save function
│   ├── loadData()          # Generic load function
│   ├── validateFieldsData() # Field validation
│   └── performSave()       # WORKER_URL integration
│
├── data-fields.js          # Field-specific operations
│   ├── loadFieldDefinitions() # Uses loadData('FIELDS')
│   ├── saveFieldDefinitions() # Uses saveData('FIELDS')
│   └── addNewField()       # Field creation logic
│
├── menu-fields-actions.js  # Field manager UI
│   ├── showFieldsDialog()  # Fields chooser dialog
│   ├── showNewFieldDialog() # New field creation
│   └── setupNewFieldEventHandlers() # UI event handling
│
└── constants.js            # Shared state & configuration
    ├── sharedState         # Global application state
    ├── WORKER_URL          # GitHub integration endpoint
    └── Field type definitions
```

### **Key Architectural Decisions**

1. **Centralized Persistence**: All save operations go through single module
2. **Event-Driven UI**: Components listen for `dataUpdated` events
3. **Validation-First**: Data validated before any persistence
4. **GitHub Integration**: All file operations via WORKER_URL for consistency
5. **Modular Design**: Clear separation of concerns between components

### **Migration Status**

#### **✅ Completed Migrations:**
- **Field Management**: Now uses centralized save/load
- **Configuration Loading**: Uses centralized config loading
- **State Synchronization**: Automatic state updates after saves
- **"no" → "hns"**: Complete migration of legacy references

#### **🔄 Pending Migrations:**
- **Checklist Save**: Move to centralized system
- **Note Save**: Move to centralized system  
- **User Management**: Partially migrated, needs completion
- **Layout/Filter Systems**: New implementations needed

### **Performance Considerations**

1. **Lazy Loading**: Data loaded only when needed
2. **Event Debouncing**: Prevent excessive UI updates
3. **Validation Caching**: Cache validation results for performance
4. **State Synchronization**: Efficient updates only when data changes

### **Security Architecture**

1. **Input Validation**: All data validated before processing
2. **Error Isolation**: Errors contained within components
3. **State Protection**: Controlled access to shared state
4. **GitHub Integration**: Secure token-based authentication via WORKER_URL

---

*Last Updated: July 5, 2025*  
*Architecture Status: Centralized Data Persistence Implemented*
