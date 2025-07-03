// menu-context.js — Complete right-click context menu implementation matching oldscript.js

import { sharedState } from './constants.js';
import { triggerFileUpload } from './data-files.js';
import { addNote } from './data-notes.js';
import { newChecklist, markSaveDirty, getItemByPath, getParentArray } from './data.js';
import { addSameLevel,  moveUpLevel,  moveDownLevel,  collapseAll,  expandAll, openPrintView,toggleBold } from './ui-mainrender.js';
import { selectedItem, selectedPath, setSelectedItem } from './events-ui.js';
import { renderChecklist } from './renderchecklist.js';
// Utility functions
function timestampNow() {
  const now = new Date();
  const pad = n => String(n).padStart(2, '0');
  return `${now.getFullYear()}_${pad(now.getMonth()+1)}_${pad(now.getDate())}_@_${pad(now.getHours())}-${pad(now.getMinutes())}-${pad(now.getSeconds())}`;
}

function applyColor(color) {
  if (!selectedItem) return;
  selectedItem.color = color;
  markSaveDirty(true);
  renderChecklist();
}

function resetStyle() {
  if (!selectedItem) return;
  delete selectedItem.color;
  delete selectedItem.bold;
  markSaveDirty(true);
  renderChecklist();
}

// Complete menu definition matching oldscript.js
const MENU_DEF = {
  'Toggle Important': () => {
    if (!selectedItem) return;
    selectedItem.important = !selectedItem.important;
    markSaveDirty(true);
    renderChecklist();
  },
  'Collapse All': collapseAll,
  'Expand All': expandAll,
  'New': {
    'Checklist': newChecklist,
    'Chapter': () => {
      sharedState.checklistData.items.push({
        label: "New Chapter",
        done: false,
        children: [],
        unit: "", qty_est: 0, qty_real: 0, price_unit: 0,
        date: new Date().toISOString().split('T')[0],
        who: ""
      });
      markSaveDirty(true);
      renderChecklist();
    },
    'Item': () => {
      if (!selectedItem) return alert("⚠ No item selected.");
      selectedItem.children = selectedItem.children || [];
      selectedItem.children.push({
        label: "New Item",
        done: false,
        unit: "", qty_est: 0, qty_real: 0, price_unit: 0,
        date: new Date().toISOString().split('T')[0],
        who: "",
        children: []
      });
      markSaveDirty(true);
      renderChecklist();
    }
  },
  'Add': {
    'Same level': addSameLevel,
    'Sub level': () => {
      if (!selectedItem) return alert("⚠ No item selected.");
      selectedItem.children = selectedItem.children || [];
      const newItem = {
        label: "Type content here (ctrl-del to delete row)",
        done: false,
        unit: "", qty_est: 0, qty_real: 0, price_unit: 0,
        date: new Date().toISOString().split('T')[0],
        who: sharedState.currentUser,
        children: []
      };
      selectedItem.children.push(newItem);

      // Save the new path
      const parentPath = selectedPath || [];
      const newPath = [...parentPath, selectedItem.children.length];
      setSelectedItem(newItem, newPath);

      markSaveDirty(true);
      sharedState.changeCount++;
      renderChecklist();

      // Focus and select the new label input
      setTimeout(() => {
        const selector = `tr[data-path='${JSON.stringify(newPath)}'] input[type="text"]`;
        const input = document.querySelector(selector);
        if (input) {
          input.focus();
          input.select();
        }
      }, 0);
    },
    'Note': () => {
      if (!selectedItem) return alert("⚠ No item selected.");
      addNote();
    },
    'File': triggerFileUpload
  },
  'Style': {
    'Color red': () => applyColor('rgba(255,0,0,1)'),
    'Color blue': () => applyColor('rgba(0,0,255,1)'),
    'Bold': toggleBold,
    'Reset style': resetStyle,
  },
  'Move': {
    'Up one level': moveUpLevel,
    'Down one level': moveDownLevel,
  },
  'Tools': {
    'Printable list': openPrintView,
    'Rename checklist': () => {
      const newName = prompt("Enter new checklist name:");
      if (!newName) return;
      const timestamp = sharedState.FILE_PATH.split('/').pop().split('_')[0];
      const newFilename = `${timestamp}_${newName}.json`;
      sharedState.FILE_PATH = `checklists/${newFilename}`;
      markSaveDirty(true);
      sharedState.changeCount++;
    },
    'Copy checklist': () => {
      const name = prompt("Name for copied checklist:");
      if (!name) return;
      const timestamp = timestampNow();
      const filename = `${timestamp}_${name}.json`;
      const path = `checklists/${filename}`;

      const content = JSON.stringify(sharedState.checklistData, null, 2);

      fetch("https://fields-proxy.johan-351.workers.dev/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          file: path,
          json: content,
          message: `Copy checklist to ${filename}`
        })
      }).then(res => {
        if (!res.ok) throw new Error("Failed to copy checklist");
        alert("✅ Checklist copied.");
        // Would need to call fetchChecklists() here
      }).catch(err => {
        alert("❌ " + err.message);
      });
    }
  }
};

// Build menu DOM structure exactly like oldscript.js
function buildMenu(obj, parent) {
  const ul = document.createElement('ul');
  ul.style.background = '#fff';
  ul.style.border = '1px solid #ccc';
  ul.style.margin = '0';
  ul.style.padding = '0.25rem 0';
  ul.style.listStyle = 'none';
  ul.style.boxShadow = '2px 2px 8px rgba(0,0,0,0.2)';
  ul.style.fontSize = '0.9rem';
  ul.style.minWidth = '150px';

  for (const key in obj) {
    const li = document.createElement('li');
    li.textContent = key;
    li.style.padding = '0.4rem 1rem';
    li.style.cursor = 'pointer';
    li.style.whiteSpace = 'nowrap';

    li.addEventListener('mouseenter', () => {
      li.style.background = '#e6f3ff';
    });
    li.addEventListener('mouseleave', () => {
      li.style.background = 'transparent';
    });

    if (typeof obj[key] === 'function') {
      li.addEventListener('click', () => {
        hideContextMenu();
        obj[key]();
      });
    } else {
      li.classList.add('has-sub');
      li.style.position = 'relative';
      
      // Add arrow indicator
      const arrow = document.createElement('span');
      arrow.textContent = '▶';
      arrow.style.float = 'right';
      arrow.style.fontSize = '0.8rem';
      li.appendChild(arrow);
      
      const submenu = buildMenu(obj[key], li);
      li.appendChild(submenu);
      
      li.addEventListener('mouseenter', () => {
        submenu.style.display = 'block';
      });
      li.addEventListener('mouseleave', () => {
        submenu.style.display = 'none';
      });
    }

    ul.appendChild(li);
  }

  if (parent) {
    ul.style.position = 'absolute';
    ul.style.top = '0';
    ul.style.left = '100%';
    ul.style.display = 'none';
    ul.style.zIndex = '10001';
  }

  return ul;
}

export function showContextMenu(x, y) {
  hideContextMenu();
  
  // Check if filtering is active (prevent modifications during filtering)
  if (sharedState.filterState !== 'all' || sharedState.showOnlyMine) {
    const menuContainer = document.getElementById('contextMenu');
    menuContainer.innerHTML = '<div style="padding:1rem; font-size:0.9rem; background:#fff; border:1px solid #ccc; box-shadow:2px 2px 8px rgba(0,0,0,0.2);">⚠️ Use "Show All" to make changes.</div>';
    menuContainer.style.left = `${x}px`;
    menuContainer.style.top = `${y}px`;
    menuContainer.style.display = 'block';
    menuContainer.style.position = 'absolute';
    menuContainer.style.zIndex = '10000';
    return;
  }

  const menuContainer = document.getElementById('contextMenu');
  menuContainer.innerHTML = '';
  menuContainer.appendChild(buildMenu(MENU_DEF));
  menuContainer.style.left = `${x}px`;
  menuContainer.style.top = `${y}px`;
  menuContainer.style.display = 'block';
  menuContainer.style.position = 'absolute';
  menuContainer.style.zIndex = '10000';
}

export function hideContextMenu() {
  const menu = document.getElementById('contextMenu');
  if (menu) menu.style.display = 'none';
  
  // Also close popup lists when clicking elsewhere
  const popupList = document.getElementById('popupList');
  if (popupList) popupList.remove();
}

// Initialize context menu system
export function buildContextMenu() {
  // Context menu will be built dynamically in showContextMenu
  document.addEventListener('click', hideContextMenu);
}
