# Checklist Application - User Guide

## 🎯 **CURRENT VERSION: Enhanced Field Management System**

*Last Updated: July 5, 2025*

---

## 🚀 **NEW FEATURES AVAILABLE:**

### **✅ Enhanced Field Manager**
Create and manage custom fields with powerful validation and persistence.

#### **How to Access:**
1. Go to **Tools > Field Management** in the menu
2. Click **"Choose Fields"** to open the field selector
3. Click **"+ New Field"** to create custom fields

#### **Creating New Fields:**
1. **Field Name**: Enter unique field identifier (e.g., "ProjectCode")
2. **Field Type**: Choose from available types:
   - `text` - Free text input
   - `number` - Numeric values
   - `checkbox` - True/false selections
   - `select` - Dropdown selections
   - `date` - Date picker
   - `tree` - Hierarchical data
3. **Display Label**: User-friendly name (e.g., "Project Code")
4. **For Select Fields** - Choose ONE option:
   - **Source**: Use `"collaborators"` for dynamic user lists
   - **Options**: Enter static choices (one per line)
5. **Default Value**: Optional default when creating new items

#### **Field Validation:**
- ✅ **Unique Names**: Field names must be unique
- ✅ **Format Validation**: Names must start with letter, contain only letters/numbers/underscores
- ✅ **Select Field Rules**: Must have either Source OR Options (never both)
- ✅ **Real-time Feedback**: Immediate validation with helpful error messages

#### **Automatic Features:**
- ✅ **Instant Persistence**: New fields saved to GitHub immediately
- ✅ **UI Refresh**: Field chooser updates automatically after creation
- ✅ **Immediate Availability**: New fields appear in checklist right away

---

## 🏗️ **SYSTEM ARCHITECTURE UPDATES:**

### **Centralized Save System**
All data operations now go through a unified, validated save system:
- **Consistent Error Handling**: All save operations use the same error management
- **Progress Indicators**: Visual feedback during save operations
- **Automatic Validation**: Data validated before saving
- **Event-Driven UI**: Interface updates automatically when data changes

### **Field Structure Changes**
Important changes to field configuration:
- ❌ **Removed `accesslevel`**: No longer used in field definitions
- ✅ **Source/Options Validation**: Select fields properly validated
- ✅ **Enhanced Field Types**: Support for all standard field types from config

---

## 📋 **CONFIGURATION REFERENCE:**

### **Current Field Structure** (`fields.json`)
```json
{
  "fields": {
    "1": {
      "key": "done",
      "label": "✔ Done",
      "type": "checkbox",
      "fixed": true,
      "default_value": false
    },
    "10": {
      "key": "who",
      "label": "Who",
      "type": "select",
      "source": "collaborators",
      "default_value": "currentuser"
    },
    "11": {
      "key": "status", 
      "label": "Status",
      "type": "select",
      "options": ["Planned", "In Progress", "Completed", "Blocked"],
      "default_value": ""
    }
  }
}
```

### **Available Field Types** (from `config.json`)
- `checkbox` - True/false toggle
- `tree` - Hierarchical text structure  
- `select` - Dropdown selection
- `text` - Free text input
- `number` - Numeric input
- `formula` - Calculated fields

---

## 🔄 **MIGRATION NOTES:**

### **"no" → "hns" Migration**
The application has been updated to use "hns" instead of "no" throughout:
- **Field References**: All field keys updated
- **Code References**: All JavaScript code updated
- **Configuration**: All config files updated
- **No Action Required**: Migration is complete and transparent to users

---

## 🎯 **UPCOMING FEATURES:**

### **Layout Manager** (Coming Soon)
- Create custom field layouts for different user roles
- Control field visibility and edit permissions per layout
- Assign layouts to specific users or access levels

### **Filter Manager** (Planned)
- Advanced filtering with multiple conditions
- Save and share custom filters
- Filter access controls based on user permissions

---

## 🔧 **TROUBLESHOOTING:**

### **Field Creation Issues**
**Problem**: Source/Options fields not appearing in new field dialog
**Solution**: This was resolved in the latest update. Clear browser cache and refresh.

**Problem**: New fields not appearing in checklist
**Solution**: Ensure fields are saved properly. Check browser console for errors.

**Problem**: "Field already exists" error
**Solution**: Field names must be unique. Choose a different name or modify existing field.

### **Save Operation Issues**
**Problem**: Changes not persisting
**Solution**: All saves now go through centralized system. Check for error notifications.

**Problem**: Slow save operations
**Solution**: Large data sets may take time. Progress indicators show save status.

---

## 📞 **SUPPORT:**

For technical issues or questions about new features:
1. Check browser console for error messages
2. Verify internet connection for GitHub synchronization
3. Contact system administrator for access-related issues
4. Report bugs with specific error messages and steps to reproduce

---

*This user guide reflects the current state of the enhanced field management system.*  
*Additional features will be documented as they become available.*

---

## 📚 **ORIGINAL USER GUIDE (Historical Reference)**

# Checklist Application - Complete User Guide

## 📋 Table of Contents

1. [Introduction](#introduction)
2. [Getting Started](#getting-started)
3. [Basic Operations](#basic-operations)
4. [Advanced Features](#advanced-features)
5. [User Management](#user-management)
6. [Rich Text Notes](#rich-text-notes)
7. [File Management](#file-management)
8. [Collaboration](#collaboration)
9. [Keyboard Shortcuts](#keyboard-shortcuts)
10. [Troubleshooting](#troubleshooting)

## 🎯 Introduction

The Checklist Application is a professional-grade tool for managing hierarchical checklists with advanced collaboration features. It combines the simplicity of traditional checklists with powerful features like rich text notes, file attachments, user management, and real-time collaboration.

### Key Features Overview
- **Hierarchical Organization**: Nested checklists with tree structure
- **Rich Text Notes**: Professional note-taking with Quill.js editor
- **File Management**: Upload, preview, and organize attachments
- **User Management**: Excel-style user administration with role-based permissions
- **Collaboration Tools**: Multi-user access and team coordination
- **Professional UI**: Desktop-style interface with comprehensive menu system
- **Advanced Customization**: Custom fields, layouts, and styling options

## 🚀 Getting Started

### System Requirements
- Modern web browser (Chrome, Firefox, Safari, Edge)
- JavaScript enabled
- Internet connection for data synchronization
- Valid user account with appropriate permissions

### Logging In

#### Standard Login
1. Access the application through your web browser
2. Enter your **username** and **password** in the login screen
3. Click **"Login"** or press **Enter**
4. Wait for authentication and data loading

#### Auto-Login via URL
You can access the application directly using a URL with your user token:
```
https://your-app-url/?user=username&token=your-token
```

#### First-Time Setup
If you're a new user:
1. Contact your administrator for account creation
2. Receive your initial login credentials via email
3. Login and change your password if required
4. Set up two-factor authentication (recommended)

### Main Interface Overview

The main interface consists of several key areas:

#### 🔝 Menu Bar
Located at the top, contains six main menus:
- **File**: New, Open, Save, Print, Export operations
- **Edit**: Add items, Copy/Paste, Delete, Notes, Search
- **View**: Expand/Collapse, Filters, Zoom, Layouts
- **Tools**: Field management, User management, Settings
- **Account**: User profile, Login/Logout options
- **Help**: Documentation, Shortcuts, About information

#### 📊 Main Workspace
- **Checklist Table**: Primary work area displaying your checklist items
- **Column Headers**: Clickable headers for sorting and configuration
- **Row Items**: Individual checklist items with expandable hierarchy
- **Action Icons**: Quick access buttons for notes, files, and other actions

#### 🔧 Toolbar
- **Add Buttons**: Quick item addition
- **Filter Controls**: Show/hide completed items
- **Search Box**: Find specific items
- **Zoom Controls**: Adjust display size

#### 📱 Status Bar
- **Save Status**: Shows current save state
- **User Information**: Current user and permissions
- **Notifications**: Toast messages for feedback

## 📝 Basic Operations

### Creating a New Checklist

1. **From Menu**: Click **File > New Checklist** or press **Ctrl+N**
2. **Enter Details**:
   - **Name**: Enter a descriptive name for your checklist
   - **Type**: Select from available templates:
     - Project Management
     - Task List
     - Quality Assurance
     - Custom (blank template)
3. **Create**: Click "Create" to generate your new checklist
4. **Auto-Naming**: A timestamp will be automatically added to the filename

### Opening an Existing Checklist

#### Method 1: Menu System
1. Click **File > Open Checklist** or press **Ctrl+O**
2. Browse the dropdown list of available checklists
3. Click on the desired checklist to open it
4. Wait for the checklist to load

#### Method 2: Quick Access
- Recent checklists appear in the File menu for quick access
- Click on any recent checklist name to open it immediately

### Saving Your Work

#### Auto-Save
- The application automatically saves changes as you work
- Look for the save indicator in the status bar
- Green indicates saved, yellow indicates pending changes

#### Manual Save
- Click **File > Save** or press **Ctrl+S**
- For new checklists, choose **File > Save As** to specify a name

#### Save Status
- **Saved**: All changes are stored
- **Dirty**: Unsaved changes exist
- **Saving**: Save operation in progress
- **Error**: Save failed (check connection)

### Working with Items

#### Adding Items

**Add Same Level Item**:
1. Select an existing item
2. Click the **"Add"** button or press **Ctrl+Enter**
3. A new item appears at the same hierarchical level
4. Start typing to enter the item text

**Add Sub-Level Item**:
1. Select a parent item
2. Press **Ctrl+Shift+Enter**
3. A new sub-item appears indented under the parent
4. Enter the sub-item text

**Quick Addition**:
- Click the **"+"** button in the toolbar
- Use the **Add** menu in the Edit menu
- Right-click and select **"Add Item"**

#### Editing Items

**Text Editing**:
1. Click on any text field to edit
2. Type your changes
3. Press **Enter** or click outside to save
4. Press **Escape** to cancel changes

**Checkbox Operations**:
- Click any checkbox to toggle between checked/unchecked
- Checked items may be filtered from view
- Parent items show progress when children are completed

**Field Types**:
- **Text**: Free-form text entry
- **Checkbox**: Boolean true/false values
- **Dropdown**: Select from predefined options
- **Date**: Date picker for scheduling
- **User**: Assignment to team members
- **Number**: Numeric values with validation

#### Deleting Items

**Single Item Deletion**:
1. Select the item to delete
2. Press **Ctrl+Delete** or right-click and select **"Delete"**
3. Confirm the deletion in the dialog
4. The item and all sub-items will be removed

**Bulk Deletion**:
1. Select multiple items (Ctrl+Click)
2. Right-click and choose **"Delete Selected"**
3. Confirm the bulk deletion

#### Moving and Reorganizing Items

**Hierarchical Movement**:
- **Ctrl+Up**: Move item up in hierarchy (promote)
- **Ctrl+Down**: Move item down in hierarchy (demote)
- **Alt+Up**: Move item up in order (same level)
- **Alt+Down**: Move item down in order (same level)

**Drag and Drop**:
1. Click and hold on an item
2. Drag to the desired position
3. Drop to place the item
4. Use visual indicators to guide placement

### Copy and Paste Operations

#### Copying Items
1. Select one or more items
2. Press **Ctrl+C** or use **Edit > Copy**
3. Items are copied to the clipboard with full structure

#### Pasting Items
1. Select the destination location
2. Press **Ctrl+V** or use **Edit > Paste**
3. Items appear at the selected location
4. All properties and sub-items are preserved

#### Advanced Copy/Paste
- **Copy Structure Only**: Copy hierarchy without content
- **Copy with Notes**: Include attached notes and files
- **Cross-Checklist Paste**: Copy between different checklists

## 🔧 Working with Columns

### Column Visibility

#### Show/Hide Columns
1. Right-click on any column header
2. Check/uncheck columns in the context menu
3. Hidden columns disappear immediately
4. Settings are saved automatically

#### Column Manager
1. Access via **View > Manage Columns**
2. Use the comprehensive column editor
3. Set visibility, width, and order
4. Apply changes or save as new layout

### Column Customization

#### Resizing Columns
1. Hover over column border until cursor changes
2. Drag left or right to resize
3. Double-click border to auto-size
4. Minimum and maximum widths are enforced

#### Reordering Columns
1. Drag column headers to new positions
2. Visual indicators show drop zones
3. Release to place column
4. Order is saved automatically

#### Column Sorting
1. Click column header to sort ascending
2. Click again for descending sort
3. Shift+Click for multi-column sorting
4. Clear sorting via **View > Clear Sort**

### Layout Management

#### Predefined Layouts
- **Default**: Standard column configuration
- **Compact**: Minimal columns for overview
- **Detailed**: All available columns
- **Project**: Project management focused
- **Custom**: User-defined layouts

#### Creating Custom Layouts
1. Configure columns as desired
2. Go to **View > Save Layout**
3. Enter a layout name
4. Layout becomes available in the menu

#### Applying Layouts
1. Go to **View > Layouts**
2. Select desired layout
3. Columns adjust automatically
4. Current data is preserved

## 🎨 Advanced Features

### Filtering and Search

#### Filter Controls

**Basic Filters**:
- **All Items**: Show everything
- **Not Done**: Show incomplete items only
- **Done**: Show completed items only
- **Mine Only**: Show items assigned to you

**Advanced Filtering**:
1. Click **View > Advanced Filter**
2. Set multiple filter criteria
3. Combine filters with AND/OR logic
4. Save filter combinations

#### Search Functionality

**Quick Search**:
1. Click in the search box (top right)
2. Type search terms
3. Results highlight automatically
4. Use **Ctrl+F** to focus search box

**Advanced Search**:
- Search specific fields
- Use wildcards and operators
- Regular expression support
- Search within notes and files

### Expand and Collapse

#### Tree Navigation
- **Click Triangle Icons**: Expand/collapse individual items
- **Ctrl+E**: Toggle current item
- **Ctrl+Shift+E**: Expand/collapse all items
- **Double-Click**: Quick expand/collapse

#### Bulk Operations
1. **View > Expand All**: Open entire tree
2. **View > Collapse All**: Close entire tree
3. **Expand to Level**: Open to specific depth
4. **Smart Expand**: Open items with incomplete children

### Printing and Export

#### Print Options
1. **File > Print** or **Ctrl+P**
2. Choose print layout:
   - **Full Details**: All columns and data
   - **Compact**: Essential information only
   - **Summary**: High-level overview
3. Select items to print or print all
4. Preview before printing

#### Export Formats
- **PDF**: Professional reports
- **Excel**: Spreadsheet format
- **CSV**: Data exchange
- **JSON**: Technical backup
- **HTML**: Web-friendly format

### Zoom and Display

#### Zoom Controls
- **Ctrl++**: Zoom in (larger text)
- **Ctrl+-**: Zoom out (smaller text)
- **Ctrl+0**: Reset to default zoom
- **View > Zoom**: Menu access

#### Display Options
- **Compact Mode**: Smaller rows, more items visible
- **Comfortable Mode**: Standard spacing
- **Spacious Mode**: Larger rows, easier reading
- **High Contrast**: Accessibility mode

## 👥 User Management

### Accessing User Management

#### Opening the Dialog
1. Click **Account > Edit Users** in the menu bar
2. The User Management dialog opens with Excel-style interface
3. Navigate between users using **Previous/Next** buttons
4. Current user information displays prominently

### User Interface

#### Professional Excel-Style Design
- **Consolas 9pt Font**: Consistent data-entry appearance
- **Light Yellow Input Fields**: (#FFFACD) for better visual distinction
- **Proper Modal Dialog**: Flexbox layout eliminates scroll issues
- **Organized Sections**: Logical grouping of user information

#### Navigation Controls
- **Previous/Next Buttons**: Efficient user browsing
- **User Counter**: Shows position (e.g., "User 3 of 15")
- **User Search**: Quick user lookup
- **Alphabetical Sort**: Organized user listing

### Managing User Accounts

#### User Information Sections

**Personal Data**:
- User ID (auto-generated)
- Username (unique identifier)
- Full Name
- Email Address
- Phone Number
- Role/Job Title

**Company Information**:
- Company Name
- Department
- Job Function
- Manager
- Employee ID

**Access & Security**:
- Access Level (0-9 scale)
- Permission Groups
- Account Status (Active/Inactive)
- Last Login Date
- Account Creation Date

**Company Address**:
- Street Address
- City, State, ZIP
- Country
- Office Location

**Two-Factor Authentication**:
- Current 2FA Status
- Authentication Method (Email/TOTP)
- Setup Options
- Recovery Codes

#### Creating New Users

1. Click **"New User"** button
2. Fill in required fields (marked with *)
3. Set appropriate access level:
   - **0**: Full Admin/Developer
   - **1**: Full Admin/User Management
   - **2**: Admin (hns field/user mgmt)
   - **3**: Layout Editor (high access)
   - **4**: Layout Editor (no structure)
   - **5**: Limited Field Editor
   - **6**: Layout Reader
   - **7**: List Editor Only
   - **8**: Read Only
   - **9**: Personal Items Only
4. Choose 2FA method (Email, TOTP, or None)
5. Click **"Save User & Send Email"**

#### Editing Existing Users

1. Navigate to desired user with **Previous/Next**
2. Modify any field as needed
3. Changes are tracked automatically
4. Click **"Save & Exit"** to save changes
5. Email notifications sent if configured

#### User Access Levels

**Administrative Levels (0-2)**:
- Complete system access
- User management capabilities
- Field and layout configuration
- All checklist operations

**Editor Levels (3-5)**:
- Layout and field editing
- Content modification
- Limited administrative functions
- Checklist creation and editing

**User Levels (6-8)**:
- Content viewing and editing
- Limited customization
- Collaboration features
- No administrative access

**Personal Level (9)**:
- Access only to assigned items
- Cannot view others' work
- Limited collaboration
- Basic checklist operations

#### Two-Factor Authentication Setup

**Email-Based 2FA**:
1. Select user and verify email address
2. Click **"Setup 2FA"** button
3. Choose **"Email"** method
4. User receives setup email
5. Follow email instructions

**TOTP-Based 2FA**:
1. Click **"Setup 2FA"** button
2. Choose **"TOTP"** method
3. Display QR code for scanning
4. User scans with authenticator app
5. Verify setup with test code

### User Dialog Actions

#### Primary Actions
- **Save User & Send Email**: Save changes and notify user
- **Save & Exit**: Save changes and close dialog
- **Cancel**: Close without saving (warns if unsaved changes)
- **Delete User**: Remove user account (with confirmation)

#### Secondary Actions
- **Add to Checklist as Collaborator**: Quick collaboration setup
- **Setup 2FA**: Configure two-factor authentication
- **Reset Password**: Send password reset email
- **View Activity**: Show user activity log

#### Collaboration Features
- **Assign to Current Checklist**: Add user as collaborator
- **View User's Checklists**: Browse user's work
- **Share Checklist**: Send checklist access invitation
- **Team Management**: Organize users into teams

## 📝 Rich Text Notes

### Note System Overview

The application features a comprehensive rich text notes system powered by Quill.js, providing professional-grade note editing capabilities integrated with checklist items.

### Creating Notes

#### Adding New Notes
1. **From Menu**: Select item, then **Edit > Add Note**
2. **From Context Menu**: Right-click item, select **"Add Note"**
3. **Quick Access**: Use **Ctrl+N** with item selected
4. Note editor opens with empty content

#### Note Editor Interface
- **Draggable Modal**: Move editor anywhere on screen
- **Rich Text Toolbar**: Formatting options
- **Save/Cancel Buttons**: Action controls
- **Resize Handles**: Adjust editor size

### Editing Existing Notes

#### Opening Notes for Editing
1. **Click Note Icon**: Click 📝 icon next to any item
2. **From Context Menu**: Right-click item with note, select **"Edit Note"**
3. Existing content loads automatically
4. Edit and save as needed

### Rich Text Features

#### Text Formatting
- **Bold**: Ctrl+B or toolbar button
- **Italic**: Ctrl+I or toolbar button
- **Underline**: Ctrl+U or toolbar button
- **Strikethrough**: Available in toolbar
- **Font Size**: Multiple size options
- **Colors**: Text and background colors

#### Structure Elements
- **Headers**: H1, H2, H3 for organization
- **Lists**: Ordered and unordered lists
- **Quotes**: Block quotes for emphasis
- **Code**: Inline and block code formatting
- **Links**: Hyperlink creation and editing

#### Advanced Features
- **Tables**: Insert and format tables
- **Images**: Embed images directly
- **Videos**: Embed video content
- **Formulas**: Mathematical expressions
- **Custom Styles**: Apply custom formatting

### Note Management

#### Saving Notes
- **Auto-Save**: Saves automatically as you type
- **Manual Save**: Click **"Save"** or use **Ctrl+S**
- **Save and Close**: Save and exit editor
- **Discard Changes**: Exit without saving

#### Note Organization
- **Item Association**: Notes linked to specific items
- **Timestamp Tracking**: Creation and modification dates
- **Version History**: Track note changes
- **Search Integration**: Notes included in search results

#### Note Sharing
- **Collaborator Access**: Shared with checklist collaborators
- **Permission Control**: Based on user access levels
- **Export Options**: Export notes separately
- **Print Support**: Include notes in printed reports

## 📎 File Management

### File Upload System

#### Upload Methods

**Drag and Drop**:
1. Select checklist item
2. Drag file from computer
3. Drop onto item or upload area
4. File uploads automatically

**Click to Upload**:
1. Select checklist item
2. Right-click and select **"Add File"**
3. Browse for file on computer
4. Click **"Open"** to upload

**Multiple Files**:
- Select multiple files at once
- Drag entire folders (where supported)
- Batch upload with progress indication
- Automatic file organization

#### File Types Supported

**Documents**:
- PDF, DOC, DOCX, TXT
- PPT, PPTX presentations
- XLS, XLSX spreadsheets
- RTF rich text files

**Images**:
- JPG, JPEG, PNG, GIF
- SVG vector graphics
- BMP, TIFF formats
- WebP modern format

**Archives**:
- ZIP, RAR, 7Z
- TAR, GZ compressed files
- View-only support
- Extraction not supported

**Data Files**:
- CSV, JSON, XML
- LOG files
- Configuration files
- Database exports

### File Organization

#### Automatic Organization
- **Timestamp Naming**: Files renamed with timestamps
- **Category Folders**: Organized by file type
- **Item Association**: Linked to specific checklist items
- **Duplicate Handling**: Automatic duplicate detection

#### File Metadata
- **Original Name**: Preserved in metadata
- **Upload Date**: When file was added
- **File Size**: Storage size information
- **Upload User**: Who added the file
- **File Type**: Detected automatically

### File Viewing and Access

#### Preview Capabilities

**Image Preview**:
- Thumbnail generation
- Full-size viewer
- Zoom and pan controls
- Slideshow mode for multiple images

**PDF Viewing**:
- Embedded PDF viewer
- Page navigation
- Zoom controls
- Search within PDF

**Document Preview**:
- Text file preview
- Basic formatting display
- Quick content overview
- Full download option

#### Download Options
- **Direct Download**: Click to download immediately
- **Batch Download**: Select multiple files
- **Zip Archive**: Download multiple as archive
- **Version History**: Download previous versions

### File Permissions

#### Access Control
- **Item-Level**: Permissions based on item access
- **User-Level**: Based on user permission level
- **Collaborator**: Shared with checklist collaborators
- **Public**: Accessible to all users (admin only)

#### Security Features
- **Virus Scanning**: Automated security checks
- **File Validation**: Type and content verification
- **Size Limits**: Maximum file size enforcement
- **Access Logging**: Track file access

## 🤝 Collaboration

### Multi-User Features

#### User Assignment
- **Assign Items**: Assign specific items to users
- **Team Assignment**: Assign to user groups
- **Due Dates**: Set deadlines for assignments
- **Progress Tracking**: Monitor assignment completion

#### Collaborator Management
- **Add Collaborators**: Invite users to checklists
- **Remove Access**: Revoke collaboration permissions
- **Role Assignment**: Set collaboration roles
- **Permission Levels**: Control what collaborators can do

### Real-Time Features

#### Live Updates
- **Auto-Refresh**: Changes appear automatically
- **Conflict Detection**: Identify simultaneous edits
- **Merge Capabilities**: Automatic conflict resolution
- **Change Notifications**: Alert users to updates

#### User Presence
- **Active Users**: See who's currently working
- **Edit Indicators**: Show what others are editing
- **User Colors**: Color-coded user identification
- **Activity Feed**: Recent user actions

### Sharing and Access

#### Direct Sharing
- **Share Links**: Generate direct access URLs
- **Token Sharing**: Secure token-based access
- **Time-Limited**: Set expiration dates
- **Permission Control**: Specify access levels

#### Team Collaboration
- **Team Checklists**: Shared team workspaces
- **Department Access**: Organization-based sharing
- **Project Teams**: Temporary collaboration groups
- **Cross-Team Sharing**: Inter-departmental access

### Communication

#### Built-in Communication
- **Comments**: Add comments to items
- **Mentions**: @mention users for attention
- **Notifications**: Email and in-app notifications
- **Activity Log**: Complete change history

#### External Integration
- **Email Notifications**: Automated email updates
- **Slack Integration**: (Future feature)
- **Teams Integration**: (Future feature)
- **Calendar Sync**: (Future feature)

## ⌨️ Keyboard Shortcuts

### Essential Navigation

#### File Operations
- **Ctrl+N**: New checklist
- **Ctrl+O**: Open checklist
- **Ctrl+S**: Save checklist
- **Ctrl+P**: Print
- **Ctrl+Shift+S**: Save As

#### Item Management
- **Ctrl+Enter**: Add item (same level)
- **Ctrl+Shift+Enter**: Add sub-item
- **Ctrl+Delete**: Delete item
- **Delete**: Delete selected
- **Ctrl+D**: Duplicate item

#### Editing Operations
- **Ctrl+C**: Copy
- **Ctrl+V**: Paste
- **Ctrl+X**: Cut
- **Ctrl+Z**: Undo
- **Ctrl+Y**: Redo

### Navigation Shortcuts

#### Tree Navigation
- **Ctrl+E**: Toggle expand/collapse current item
- **Ctrl+Shift+E**: Expand/collapse all items
- **Right Arrow**: Expand item
- **Left Arrow**: Collapse item
- **Up/Down Arrows**: Navigate items

#### Hierarchy Movement
- **Ctrl+Up**: Move item up in hierarchy
- **Ctrl+Down**: Move item down in hierarchy
- **Alt+Up**: Move item up in order
- **Alt+Down**: Move item down in order
- **Tab**: Indent item (make sub-item)
- **Shift+Tab**: Outdent item (promote level)

### View and Display

#### Zoom Controls
- **Ctrl++**: Zoom in
- **Ctrl+-**: Zoom out
- **Ctrl+0**: Reset zoom
- **Ctrl+1**: 100% zoom
- **Ctrl+2**: 200% zoom

#### Filter and Search
- **Ctrl+F**: Focus search box
- **Ctrl+Shift+F**: Advanced search
- **F3**: Find next
- **Shift+F3**: Find previous
- **Ctrl+H**: Find and replace

#### View Modes
- **F11**: Full screen mode
- **Ctrl+1**: Compact view
- **Ctrl+2**: Comfortable view
- **Ctrl+3**: Spacious view
- **Ctrl+Shift+H**: Hide/show sidebar

### Text Formatting

#### Rich Text (in notes)
- **Ctrl+B**: Bold
- **Ctrl+I**: Italic
- **Ctrl+U**: Underline
- **Ctrl+Shift+S**: Strikethrough
- **Ctrl+K**: Insert link
- **Ctrl+Shift+L**: Bullet list

#### Quick Formatting
- **Ctrl+Shift+C**: Copy formatting
- **Ctrl+Shift+V**: Paste formatting
- **Ctrl+\**: Clear formatting
- **Ctrl+Shift+>**: Increase font size
- **Ctrl+Shift+<**: Decrease font size

### Advanced Operations

#### Selection
- **Ctrl+A**: Select all items
- **Shift+Click**: Extend selection
- **Ctrl+Click**: Add to selection
- **Ctrl+Shift+A**: Select all at current level
- **Esc**: Clear selection

#### Batch Operations
- **Ctrl+Shift+D**: Duplicate selected items
- **Ctrl+Shift+Delete**: Delete selected items
- **Ctrl+Shift+C**: Copy selected items
- **Ctrl+Shift+V**: Paste to selected location
- **Ctrl+Shift+M**: Move selected items

#### System Shortcuts
- **F1**: Help documentation
- **F5**: Refresh/reload
- **Ctrl+R**: Refresh data
- **Ctrl+Shift+R**: Hard refresh
- **Alt+F4**: Close application

### Custom Shortcuts

#### User-Defined Shortcuts
- Configure custom shortcuts in **Tools > Settings**
- Assign shortcuts to frequently used actions
- Override default shortcuts if needed
- Export/import shortcut configurations

#### Context-Sensitive Shortcuts
- Shortcuts change based on current context
- Different shortcuts in note editor vs. checklist
- Modal-specific shortcuts
- Field-specific shortcuts

## 🔧 Troubleshooting

### Common Issues

#### Login Problems

**Cannot Login**:
1. Verify username and password are correct
2. Check if Caps Lock is enabled
3. Ensure internet connection is stable
4. Clear browser cache and cookies
5. Try incognito/private browsing mode
6. Contact administrator for account status

**Auto-Login Fails**:
1. Check URL parameters are complete
2. Verify token hasn't expired
3. Ensure correct username in URL
4. Try manual login instead
5. Contact administrator for new token

#### Loading Issues

**Checklist Won't Load**:
1. Check internet connection
2. Refresh the page (F5)
3. Clear browser cache
4. Try different browser
5. Check if file exists on server
6. Verify permissions to access file

**Slow Performance**:
1. Close unused browser tabs
2. Check internet speed
3. Clear browser cache
4. Disable browser extensions
5. Try incognito mode
6. Contact administrator about server load

#### Saving Problems

**Cannot Save Changes**:
1. Check internet connection
2. Verify you have edit permissions
3. Check if file is locked by another user
4. Try refreshing and saving again
5. Check browser console for errors
6. Contact administrator if persistent

**Changes Not Appearing**:
1. Refresh the page
2. Check if auto-save is enabled
3. Verify your permissions level
4. Check for conflicting changes
5. Try manual save (Ctrl+S)

### Error Messages

#### Common Error Messages

**"Permission Denied"**:
- Your access level doesn't allow this action
- Contact administrator for permission upgrade
- Verify you're logged in correctly

**"File Not Found"**:
- Checklist may have been moved or deleted
- Check with the file owner
- Try accessing from file menu

**"Network Error"**:
- Check internet connection
- Server may be temporarily unavailable
- Try again in a few minutes

**"Invalid Token"**:
- Your login session has expired
- Login again with username/password
- Contact administrator for new token

#### Browser-Specific Issues

**Chrome Issues**:
- Clear browsing data
- Disable extensions
- Check Chrome version (update if needed)
- Reset Chrome settings if necessary

**Firefox Issues**:
- Clear cache and cookies
- Disable add-ons
- Check Firefox version
- Try safe mode

**Safari Issues**:
- Clear website data
- Check privacy settings
- Disable content blockers
- Update Safari

**Edge Issues**:
- Clear browsing data
- Reset Edge settings
- Check Windows updates
- Try InPrivate browsing

### Getting Help

#### Self-Help Resources

**Documentation**:
- User Guide (this document)
- Architecture Guide (for technical details)
- Video tutorials (if available)
- FAQ section

**Built-in Help**:
- Help menu in application
- Keyboard shortcuts guide
- About dialog with version info
- Contact information

#### Contacting Support

**Before Contacting Support**:
1. Note exact error messages
2. Document steps to reproduce issue
3. Check browser and version
4. Try basic troubleshooting steps
5. Note your user permission level

**What to Include**:
- Your username (not password)
- Browser type and version
- Operating system
- Exact error message
- Steps that led to the problem
- Screenshots if helpful

#### Reporting Bugs

**Bug Report Information**:
- Detailed description of issue
- Steps to reproduce
- Expected vs. actual behavior
- Browser and system information
- Screenshots or screen recordings
- Console error messages (F12 to open)

### Performance Optimization

#### Browser Optimization

**Memory Management**:
- Close unused tabs
- Restart browser periodically
- Clear cache regularly
- Disable unnecessary extensions
- Use latest browser version

**Connection Optimization**:
- Use wired connection when possible
- Close bandwidth-heavy applications
- Check for background downloads
- Optimize WiFi signal strength

#### Application Optimization

**Large Checklists**:
- Use filtering to show fewer items
- Collapse unused sections
- Archive completed items
- Split large checklists into smaller ones

**File Management**:
- Compress large files before upload
- Remove unnecessary attachments
- Use appropriate file formats
- Regular cleanup of old files

### Data Recovery

#### Backup and Recovery

**Automatic Backups**:
- Application automatically backs up to GitHub
- Version history preserved
- Recovery possible from any point
- Contact administrator for assistance

**Manual Backup**:
- Export checklists regularly
- Save local copies of important data
- Document critical information
- Keep backup of user settings

#### Version Recovery

**Recovering Previous Versions**:
1. Contact administrator
2. Provide date/time of desired version
3. Specify which checklist needs recovery
4. Administrator can restore from backup

**Conflict Resolution**:
- Application handles most conflicts automatically
- Manual intervention may be needed for complex conflicts
- Contact administrator for conflict resolution
- Keep local backups of critical changes

---

*This comprehensive user guide covers all aspects of the Checklist Application. For additional support or advanced features, contact your system administrator or refer to the technical documentation.*

### Filtering

1. Click the "Filter" button in the toolbar
2. Choose from available filters (Done, Not Done, All)
3. To show only your items, click the "Only Mine" button

### Expanding/Collapsing

1. Click the triangle icon next to any parent item to expand/collapse
2. Use **Ctrl+E** to toggle expand/collapse for the selected item
3. Use **Ctrl+Shift+E** to expand/collapse all items

## User Management

### Accessing User Management

1. Click **Account > Edit Users** in the menu bar
2. The User Management dialog will open with Excel-style interface
3. Navigate between users using Previous/Next buttons

### Managing User Accounts

#### Viewing User Information
- User data is displayed in a professional table format with light yellow input fields
- Data is organized in sections: Personal Data, Company Information, Access & Security, Company Address
- All fields use Consolas 9pt font for consistent data-entry appearance

#### Creating New Users
1. Click the "New User" button in the dialog
2. Fill in all required fields (marked with *)
3. Set appropriate access level (0-9, where 0 is full admin, 9 is personal items only)
4. Choose 2FA method (Email, TOTP, or None)
5. Click "Save User & Send Email" to create and notify the user

#### Editing Existing Users
1. Navigate to the user using Previous/Next buttons
2. Modify any field as needed
3. The dialog will track changes automatically
4. Click "Save & Exit" to save changes

#### User Access Levels
- **0 - Full Admin/Developer**: Complete system access
- **1 - Full Admin/User Management**: Admin access including user management
- **2 - Admin (hns field/user mgmt)**: Admin without field or user management
- **3 - Layout Editor (high access)**: Can edit layouts with high permissions
- **4 - Layout Editor (no structure)**: Layout editing without structural changes
- **5 - Limited Field Editor**: Basic field editing capabilities
- **6 - Layout Reader**: Can view but not edit layouts
- **7 - List Editor Only**: Can only edit list items
- **8 - Read Only**: View-only access
- **9 - Personal Items Only**: Can only access own items

#### Two-Factor Authentication Setup
1. Select user and click "Setup 2FA" button
2. Choose between Email or TOTP (Time-based One-Time Password)
3. For TOTP, follow the QR code setup process (when implemented)
4. Email method uses existing email for verification codes

### User Dialog Features

#### Navigation
- **Previous/Next buttons**: Navigate between users efficiently
- **User counter**: Shows current user position (e.g., "1 of 5")
- **User identification**: Current user's name and username displayed prominently

#### Data Sections
- **Personal Data**: Basic user information (ID, username, full name, email, phone, role)
- **Company Information**: Job function and company details
- **Access & Security**: Access level and 2FA method configuration
- **Company Address**: Complete address information
- **Assigned Checklists**: View user's checklist assignments
- **Two Factor Authentication**: Current 2FA status and setup options

#### Action Buttons
- **Save User & Send Email**: Save changes and send authentication setup email
- **Save & Exit**: Save changes and close dialog
- **Cancel**: Close without saving (warns if unsaved changes)
- **Delete User**: Remove user account (with confirmation)
- **Add to Checklist as Collaborator**: Add user to current checklist
- **New User**: Create a new user account

## Collaboration

### Adding Collaborators

1. Click the "Collaborators" button
2. Enter the username of the person to add
3. Click "Add"
4. The person will now be able to access and edit the checklist

### Tracking Changes

1. Changes are tracked with the user who made them
2. The "Last Modified" column shows when an item was last changed
3. The "Who" column shows who is responsible for each item

### Resolving Conflicts

If multiple users edit the same checklist:

1. When saving, conflicts are detected automatically
2. A dialog shows the conflicting changes
3. Choose which version to keep or merge them manually

## Keyboard Shortcuts

| Action               | Shortcut         |
|----------------------|------------------|
| Save                 | Ctrl+S           |
| New Checklist        | Ctrl+N           |
| Add Item (same level)| Enter            |
| Add Sub-item         | Ctrl+Enter       |
| Delete Item          | Ctrl+Delete      |
| Toggle Bold          | Ctrl+B           |
| Move Up Level        | Ctrl+Up          |
| Move Down Level      | Ctrl+Down        |
| Reorder Up           | Alt+Up           |
| Reorder Down         | Alt+Down         |
| Expand/Collapse      | Ctrl+E           |
| Expand/Collapse All  | Ctrl+Shift+E     |
| Duplicate Item       | Ctrl+D           |
| Add Note             | Ctrl+N           |
| Find                 | Ctrl+F           |

## Customization

### Changing List Type

1. Click **Tools > List Type**
2. Select the type of list you want to use
3. The available columns and tools will update based on the list type

### Styling Items

1. Select an item
2. Right-click and choose from the Style menu
3. Options include colors, bold text, and more

### Customizing Layout

1. Click **View > Layout**
2. Choose from available layout options
3. Your preferences will be saved for future sessions

## Troubleshooting

### Unsaved Changes

If you see "Unsaved Changes" in the status bar:
1. Save your work with **Ctrl+S**
2. If the indicator persists, try saving again or check for errors

### Login Issues

If you can't log in:
1. Verify your username and password
2. Check your internet connection
3. Contact your administrator for help

### Conflicts on Save

If you see a conflict dialog:
1. Review the differences carefully
2. Choose which version to keep or merge manually
3. Save the resolved version

## Getting Help

For additional assistance:
1. Click **Help > User Guide** to access this documentation
2. Click **Help > About** for version information
3. Contact your administrator for account issues
