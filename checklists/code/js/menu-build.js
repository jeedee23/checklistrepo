// menus-build.js — UI popup menus (e.g., column visibility)

import { sharedState } from './constants.js';
import { markSaveDirty } from './data.js';
import { renderChecklist } from './renderchecklist.js';

export function toggleColumnMenu(btn) {
  sharedState.ColumnVisibilityMenu.visible = !sharedState.ColumnVisibilityMenu.visible;
  sharedState.ColumnVisibilityMenu.x = btn.offsetLeft;
  sharedState.ColumnVisibilityMenu.y = btn.offsetTop + btn.offsetHeight;
}


export function showColumnVisibilityMenu(x, y, columnKey = null) {
  const existingMenu = document.getElementById('columnMenu');
  if (existingMenu) existingMenu.remove();

  sharedState.ColumnVisibilityMenu.visible = true;
  sharedState.ColumnVisibilityMenu.x = x;
  sharedState.ColumnVisibilityMenu.y = y;

  const menu = document.createElement('div');
  menu.id = 'columnMenu';
  menu.style.position = 'absolute';
  menu.style.left = x + 'px';
  menu.style.top = y + 'px';
  menu.style.background = '#fff';
  menu.style.border = '1px solid #ccc';
  menu.style.boxShadow = '0 2px 6px rgba(0,0,0,0.2)';
  menu.style.padding = '8px';
  menu.style.zIndex = 9999;

  const columns = sharedState.checklistData.layout.columns;

  for (const key in columns) {
    const col = columns[key];
    const label = sharedState.checklistData.layout.labels?.[key] || key;

    const wrapper = document.createElement('label');
    wrapper.style.display = 'block';
    wrapper.style.fontSize = '0.8rem';
    wrapper.style.cursor = 'pointer';

    const cb = document.createElement('input');
    cb.type = 'checkbox';
    cb.checked = !!col.visible;
    cb.style.marginRight = '4px';

    cb.addEventListener('change', () => {
      col.visible = cb.checked;
      markSaveDirty(true);
      renderChecklist();
      closeColumnMenu();
    });

    wrapper.appendChild(cb);
    wrapper.appendChild(document.createTextNode(label));
    menu.appendChild(wrapper);
  }

  document.body.appendChild(menu);

  const handleClickOutside = (e) => {
    if (!menu.contains(e.target)) {
      closeColumnMenu();
      document.removeEventListener('mousedown', handleClickOutside);
    }
  };

  document.addEventListener('mousedown', handleClickOutside);
}

export function closeColumnMenu() {
  const menu = document.getElementById('columnMenu');
  if (menu) menu.remove();
  sharedState.ColumnVisibilityMenu.visible = false;
}
