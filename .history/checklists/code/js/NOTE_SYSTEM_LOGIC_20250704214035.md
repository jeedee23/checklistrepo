# Note System Logic Summary

## Functions Overview

### Core Functions (from data-notes.js)
- `addNote()` - Creates a new note for the currently selected item
- `editNote(noteFile, item)` - Edits an existing note with given SHA/file

### UI Handler Functions (from menu-checklist-actions.js)
- `handleAddNote()` - Wrapper for addNote() with safety checks

## Usage Patterns

### 1. Main Menu "Edit > Add Note"
- **Handler**: `handleAddNote()`
- **Purpose**: Create a new note for selected item
- **Flow**: `handleAddNote()` → checks if item selected → calls `addNote()`

### 2. Context Menu "Note"
- **Handler**: `addNote()` (direct call)
- **Purpose**: Create a new note for selected item
- **Flow**: Direct call to `addNote()`

### 3. Note Icon Click (📝)
- **Handler**: `editNote(item.noteFile, item)`
- **Purpose**: Edit existing note
- **Flow**: Direct call to `editNote()` with note file SHA and item

## File Structure
- `data-notes.js` - Core note functionality
- `menu-checklist-actions.js` - Menu handlers including `handleAddNote`
- `menu-context.js` - Context menu handlers
- `ui-subrender.js` - UI rendering including note icon clicks

## Key Changes Made
1. Fixed function name conflict by renaming `addNote` to `handleAddNote` in menu-checklist-actions.js
2. Updated imports in menu-core.js to use `handleAddNote`
3. Verified context menu and note icon clicks use correct functions
4. Archived unused `menu-actions.js` file containing duplicate functions

## Logic Verification
✅ Main menu "Add Note" → `handleAddNote()` → `addNote()` (new note)
✅ Context menu "Note" → `addNote()` (new note)
✅ Note icon click → `editNote(noteFile, item)` (edit existing note)
