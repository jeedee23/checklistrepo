// ui-events.js

import { sharedState } from './constants.js';
import { saveChecklist, markSaveDirty, getItemByPath, getParentArray } from './data2.js';
import { highlightSelectedRow, expandAll, expandAncestors, addSameLevel } from './ui-mainrender.js';
import { showContextMenu } from './menu-context.js';
import { fieldDefs } from './data-fields.js';
import { renderCollaborators } from './data-users.js';
import { renderChecklist } from './renderchecklist.js';
// Global selection state for keyboard events
let selectedItem = null;
let selectedPath = null;

export { selectedItem, selectedPath };

export function setSelectedItem(item, path) {
  selectedItem = item;
  selectedPath = path;
}

export function initUIEvents() {
  // Save Checklist
  document.getElementById('saveChecklistButton')?.addEventListener('click', () => {
    saveChecklist(sharedState.FILE_PATH);
  });

  // ─── Full Search Implementation (matching oldscript.js) ─────────────────────
  const input = document.getElementById('searchInput');
  const results = document.getElementById('searchResults');

  function flattenChecklistData(items, parentPath = []) {
    return items.reduce((acc, item, idx) => {
      const path = parentPath.concat(idx);
      acc.push({ item, path });
      if (item.children?.length) {
        acc.push(...flattenChecklistData(item.children, path));
      }
      return acc;
    }, []);
  }

  function getItemDisplay(item) {
    const parts = [];
    if (item.no != null) parts.push(item.no);
    for (const [key, val] of Object.entries(item)) {
      if (key === 'no' || key === 'children') continue;
      if (typeof val === 'string' || typeof val === 'number') {
        parts.push(val);
      } else if (Array.isArray(val)) {
        parts.push(val.join(', '));
      }
    }
    return parts.join(' – ');
  }

  let allEntries = [];

  function populateResultsList() {
    results.innerHTML = '';
    allEntries = flattenChecklistData(sharedState.checklistData.items).map(({ item, path }) => {
      const display = getItemDisplay(item);
      const oneBasedPath = path.map(idx => idx + 1);
      const pathKey = JSON.stringify(oneBasedPath);

      const li = document.createElement('li');
      li.textContent = display;
      li.dataset.path = pathKey;
      li.style.cursor = 'pointer';

      li.addEventListener('click', e => {
        e.stopPropagation();
        e.preventDefault();

        // 1) Expand the tree so the target <tr> exists
        if (typeof expandAncestors === 'function') expandAncestors(path);
        else if (typeof expandAll === 'function') expandAll();

        // 2) Find the matching row by its one-based data-path
        const selector = `#checklistContainer tr[data-path='${pathKey}']`;
        const tr = document.querySelector(selector);

        if (tr) {
          // 3a) Visually highlight via helper
          highlightSelectedRow(tr);

          // 3b) Update the global selection variables
          selectedPath = JSON.parse(tr.dataset.path);
          selectedItem = getItemByPath(selectedPath);

          // 3c) Scroll and focus just like a click
          tr.tabIndex = -1;
          tr.focus();
          tr.scrollIntoView({ behavior: 'smooth', block: 'center' });

          // 3d) Brief flash so users see the match
          tr.classList.add('search-highlight');
          setTimeout(() => tr.classList.remove('search-highlight'), 2000);
        } else {
          console.warn('⚠️ No <tr> matched selector', selector);
        }

        // 4) Hide dropdown and clear input
        results.style.display = 'none';
        input.value = '';
      });

      results.appendChild(li);
      return { li, hay: display.toLowerCase() };
    });
  }

  // Search input event handlers (full parity with oldscript.js)
  input?.addEventListener('focus', () => {
    console.log('🔍 Input focused, populating full list');
    populateResultsList();
    results.style.display = 'block';
  });

  input?.addEventListener('mousedown', () => {
    console.log('🔍 Input mousedown, populating full list');
    populateResultsList();
    results.style.display = 'block';
  });

  input?.addEventListener('input', () => {
    const terms = input.value.trim().toLowerCase().split(/\s+/).filter(Boolean);
    let anyVisible = false;
    allEntries.forEach(({ li, hay }) => {
      const matches = terms.every(t => hay.includes(t));
      li.style.display = matches ? '' : 'none';
      if (matches) anyVisible = true;
    });
    results.style.display = anyVisible ? 'block' : 'none';
    console.log('🔍 Filtered with terms', terms, 'anyVisible =', anyVisible);
  });

  // Click outside to hide search results
  document.addEventListener('click', e => {
    if (!document.getElementById('searchContainer')?.contains(e.target)) {
      console.log('🚪 Click outside, hiding dropdown');
      results.style.display = 'none';
    }
  });

  // ─── Double-Click Handler (matching oldscript.js) ───────────────────────────
  document.addEventListener('dblclick', (e) => {
    const row = e.target.closest('tr[data-path]');
    if (!row) return;
    const path = JSON.parse(row.dataset.path);
    const arr = getParentArray(path);
    const idx = path[path.length - 1];
    const item = getItemByPath(path);
    const isLast = idx === arr.length;
    const hasChildren = item.children && item.children.length > 0;
    if (isLast && !hasChildren) {
      selectedItem = item;
      selectedPath = path;
      setSelectedItem(item, path);
      addSameLevel();
    }
  });

  // Add Collaborator
  document.getElementById('addCollaboratorBtn')?.addEventListener('click', () => {
    const name = prompt('Enter collaborator name:');
    if (!name) return;
    sharedState.checklistData.collaborators ||= [];
    sharedState.checklistData.collaborators.push(name);
    renderCollaborators();
  });

  // Field Manager Popup with deferred apply
  document.getElementById('fieldsButton')?.addEventListener('click', () => {
    const container = document.getElementById('fieldPopupContent');
    container.innerHTML = '';
    const layout = sharedState.checklistData.layout ||= { columns: {} };
    const fieldsInChecklist = new Set(Object.keys(layout.columns));
    const pendingChanges = {};

    Object.entries(fieldDefs).forEach(([key, def]) => {
      const inList = fieldsInChecklist.has(key);
      const isVisible = inList && layout.columns[key]?.visible !== false;

      const row = document.createElement('div');
      row.className = 'field-row';

      const inListBox = document.createElement('input');
      inListBox.type = 'checkbox';
      inListBox.checked = inList;
      inListBox.disabled = true;

      const visibleBox = document.createElement('input');
      visibleBox.type = 'checkbox';
      visibleBox.checked = isVisible;
      visibleBox.disabled = !inList;
      visibleBox.addEventListener('change', () => {
        pendingChanges[key] = visibleBox.checked;
      });

      row.innerHTML = `<label>${def.label || key}</label>`;
      row.appendChild(inListBox);
      row.appendChild(document.createTextNode(' In list'));
      row.appendChild(visibleBox);
      row.appendChild(document.createTextNode(' Visible'));
      container.appendChild(row);
    });

    document.getElementById('fieldPopup').style.display = 'block';

    const confirmBtn = document.getElementById('applyFieldChanges');
    if (confirmBtn) {
      confirmBtn.onclick = () => {
        const layout = sharedState.checklistData.layout ||= { columns: {} };
        Object.entries(pendingChanges).forEach(([key, visible]) => {
          if (layout.columns[key]) {
            layout.columns[key].visible = visible;
          }
        });
        sharedState.layoutDirty = true;
        markSaveDirty(true, sharedState.DIRTY_EVENTS.COLUMN_VISIBILITY);
        renderChecklist();
        document.getElementById('fieldPopup').style.display = 'none';
      };
    }
  });

  // Mark as Not Done
  document.body.addEventListener('click', (e) => {
    if (e.target.classList.contains('mark-not-done')) {
      const row = e.target.closest('tr');
      if (row) {
        const path = JSON.parse(row.dataset.path);
        const item = getItemByPath(path);
        if (item) {
          item.done = false;
          markSaveDirty(true, sharedState.DIRTY_EVENTS.CONTENT_CHANGE);
          renderChecklist();
        }
      }
    }
  });

  // Show Only Mine
  document.getElementById('filterOnlyMineCheckbox')?.addEventListener('change', (e) => {
    sharedState.showOnlyMine = e.target.checked;
    renderChecklist();
  });

  // Edit User (login as)
  document.getElementById('collaboratorList')?.addEventListener('click', (e) => {
    if (e.target.tagName === 'A') {
      e.stopPropagation();
    }
  });

  // Edit → Add Same Level
  document.getElementById('menu-edit-add-same-level')?.addEventListener('click', e => {
    e.preventDefault();
    addSameLevel();
  });
}
