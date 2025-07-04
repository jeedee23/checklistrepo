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
