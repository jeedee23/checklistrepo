// ui-subrender.js
import { sharedState } from './constants.js';
import { fieldDefs } from './data-fields.js';
import { markSaveDirty } from './data.js';
import { highlightSelectedRow } from './ui-mainrender.js';
import { showContextMenu } from './menu-context.js';
import { editNote } from './data-notes.js';
import { viewFile } from './data-files.js';
import { setSelectedItem } from './events-ui.js';
import { WORKER_URL } from './constants.js';
import { renderChecklist } from './renderchecklist.js';
export function renderItem(item, tbody, path, columnDefs, rowHeight) {
  // 1. Visibility & filtering
  const isVisible = (
    sharedState.filterState === 'all' ||
    (sharedState.filterState === 'done' && item.done === true) ||
    (sharedState.filterState === 'notdone' && item.done !== true)
  );
  const matchesWho = !sharedState.showOnlyMine || item.who === sharedState.currentUser;
  if (!isVisible || !matchesWho) {
    if (item.children && !item.collapsed) {
      item.children.forEach((child, i) => {
        // Always use 1-indexed for path references (i+1) but don't modify the item
        renderItem(child, tbody, path.concat(i + 1), columnDefs, rowHeight);
      });
    }
    return;
  }

  // 2. Row setup
  const row = document.createElement('tr');
  row.classList.add('tr-item');
  row.style.height = (item.rowHeight || rowHeight) + 'px';
  row.style.verticalAlign = 'middle';
  row.style.lineHeight = '1';
  row.style.fontFamily = 'Consolas, monospace';
  row.dataset.path = JSON.stringify(path);
  if (item.important) row.classList.add('important');
  // IMPORTANT: Never modify item.no here - use exactly as saved in file
  // The item.no field is part of the saved file structure and should never be recalculated

  // Events
  row.addEventListener('click', () => {
    sharedState.selectedPath = path.slice();
    sharedState.selectedItem = item;
    setSelectedItem(item, path.slice()); // Update global state for keyboard events
    highlightSelectedRow(row);
  });
  row.addEventListener('contextmenu', e => {
    e.preventDefault();
    sharedState.selectedPath = path.slice();
    sharedState.selectedItem = item;
    setSelectedItem(item, path.slice()); // Update global state for keyboard events
    showContextMenu(e.pageX, e.pageY);
  });

  // Helpers
  const resolveDefault = dv => {
    if (dv === 'now') return new Date().toISOString().split('T')[0];
    if (dv === 'currentuser') return sharedState.currentUser;
    return dv;
  };
  const computeFormula = (formula, ctx) => {
    try {
      const fn = new Function(...Object.keys(ctx), `return ${formula}`);
      return fn(...Object.values(ctx));
    } catch {
      return '';
    }
  };

  // 3. Render each cell dynamically by field ID or key
  // Get column keys in the correct order
  let columnKeys;
  if (sharedState.checklistData.layout.columnOrder && 
      Array.isArray(sharedState.checklistData.layout.columnOrder) &&
      sharedState.checklistData.layout.columnOrder.length > 0) {
    // Use the defined column order
    columnKeys = sharedState.checklistData.layout.columnOrder;
  } else {
    // No column order defined, use default order
    columnKeys = Object.keys(columnDefs);
  }
  
  // Create cells in the specified order
  columnKeys.forEach(colId => {
    const col = columnDefs[colId];
    if (!col || !col.visible) return;
    
    let def = fieldDefs[colId] || {};
    if (!def.key) {
      def = Object.values(fieldDefs).find(d => d.key === colId) || {};
    }
    const key = def.key || colId;
    let val = item[key];
    if (def.type === 'computed' && def.formula) {
      val = computeFormula(def.formula, item);
    }
    if (val === undefined || val === '') {
      val = resolveDefault(def.default_value);
    }

    const td = document.createElement('td');
    td.style.fontFamily = 'Consolas, monospace';

    switch (def.type) {
      case 'checkbox': {
        const cb = document.createElement('input');
        cb.type = 'checkbox';
        cb.checked = !!val;
        cb.onchange = () => { 
          item[key] = cb.checked; 
          sharedState.isDirty = true;  // Content change - no render needed
        };
        td.appendChild(cb);
        break;
      }
      case 'select': {
        const span = document.createElement('span');
        span.textContent = val;
        span.style.cursor = 'pointer';
        const rawOptions = def.options ? def.options.slice() : (Array.isArray(sharedState.checklistData[def.source]) ? sharedState.checklistData[def.source].slice() : []);
        const options = rawOptions.filter(opt => opt !== def.default_value);
        span.addEventListener('click', e => {
          e.stopPropagation();
          showPopupList(span, options, sel => { 
            item[key] = sel; 
            sharedState.isDirty = true;  // Content change - no render needed
          });
        });
        td.appendChild(span);
        break;
      }
      case 'date': {
        const input = document.createElement('input');
        input.type = 'date';
        input.value = val;
        input.onchange = () => { 
          item[key] = input.value; 
          sharedState.isDirty = true;  // Content change - no render needed
        };
        td.appendChild(input);
        break;
      }
      case 'number': {
        const input = document.createElement('input');
        input.type = 'text';
        input.value = val;
        Object.assign(input.style, { width:'90%', textAlign:'left', fontFamily:'Consolas' });
        input.onblur = () => {
          const v = input.value.trim();
          item[key] = (v === ''||isNaN(v)) ? '' : parseFloat(v);
          sharedState.isDirty = true;  // Content change - no render needed
        };
        td.appendChild(input);
        break;
      }
      default: {
        if (key==='label' || def.type==='tree') {
          const wrapper = document.createElement('div');
          Object.assign(wrapper.style, { display:'flex', alignItems:'center', gap:'0.4rem', marginLeft:`${(path.length-1)*20}px` });
          if(item.color) wrapper.style.color=item.color;
          if(item.bold) wrapper.style.fontWeight='bold';

          // Arrow
          if(item.children?.length) {
            const arrow=document.createElement('span');
            arrow.textContent=item.collapsed?'▶':'▼';
            arrow.style.cursor='pointer';
            arrow.onclick=e=>{e.stopPropagation();item.collapsed=!item.collapsed;markSaveDirty(true, sharedState.DIRTY_EVENTS.TOGGLE_COLLAPSE);};
            wrapper.appendChild(arrow);
          }
          // Note icon
          if(item.noteFile) {
            const noteIcon=document.createElement('span');
            noteIcon.textContent='📝';
            noteIcon.style.cursor='pointer';
            noteIcon.title='Open note';
            noteIcon.onclick=e=>{e.stopPropagation();sharedState.selectedPath=path.slice();sharedState.selectedItem=item;highlightSelectedRow(row);editNote(item.noteFile,item);};
            wrapper.appendChild(noteIcon);
          }
          // Image icon
          if(item.imageFile) {
            const ext=item.imageFile.split('.').pop().toLowerCase();
            const imgIcon=document.createElement('span');
            imgIcon.textContent=ext==='pdf'?'📄':'📷';
            imgIcon.style.cursor='pointer';
            imgIcon.title='View image';
            const imgURL=`${WORKER_URL}?file=checklists/images/${item.imageFile}`;
            imgIcon.onmouseenter=()=>{const tooltip=document.getElementById('noteTooltip');tooltip.innerHTML=ext==='pdf'?`<div style="font-size:0.9rem;padding:0.5rem;">PDF: ${item.imageFile}</div>`:`<img src="${imgURL}" style="max-width:300px;">`;tooltip.style.left=`${imgIcon.getBoundingClientRect().right+5}px`;tooltip.style.top=`${imgIcon.getBoundingClientRect().top}px`;tooltip.style.display='block';};
            imgIcon.onmouseleave=()=>document.getElementById('noteTooltip').style.display='none';
            imgIcon.onclick=e=>{e.stopPropagation();window.open(imgURL,'_blank');};
            wrapper.appendChild(imgIcon);
          }
          // Per-item file icons
          if (Array.isArray(item.files)) {
            item.files.forEach(f => {
              const fileIcon = document.createElement('span');
              fileIcon.textContent = '📎';
              fileIcon.style.cursor = 'pointer';
              fileIcon.title = f.name;
              fileIcon.onclick = e => { e.stopPropagation(); viewFile(f.path); };
              wrapper.appendChild(fileIcon);
            });
          }
          // Link icon & input
          if(item.link) {
            const linkIcon=document.createElement('span');
            linkIcon.textContent='🔗';
            linkIcon.style.cursor='pointer';
            linkIcon.title=item.link;
            linkIcon.onclick=e=>{e.stopPropagation();window.open(item.link,'_blank');};
            wrapper.appendChild(linkIcon);
          }
          const input=document.createElement('input');
          input.type='text';
          input.value=val;
          Object.assign(input.style,{width:'100%',fontFamily:'Consolas, monospace',background:'transparent'});
          if(item.bold) input.style.fontWeight='bold';
          if(item.color) input.style.color=item.color;
          input.onblur=e=>{const v=input.value.trim();if(v.startsWith('http://')||v.startsWith('https://')){item.link=v;item[key]='';}else{item[key]=v;}sharedState.isDirty=true;};
          wrapper.appendChild(input);
          td.appendChild(wrapper);
        } else {
          td.textContent=val;
        }
      }
    }
    row.appendChild(td);
  });

  // 4. Append and recurse
  tbody.appendChild(row);
  if(item.children && !item.collapsed) {
    item.children.forEach((child,i)=>renderItem(child,tbody,path.concat(i+1),columnDefs,rowHeight));
  }
}

// Helper function for popup lists - creates a proper dropdown menu
function showPopupList(anchor, options, onSelect, refocusEl = null) {
  // Remove existing popup if present
  const existing = document.getElementById('popupList');
  if (existing) existing.remove();

  const list = document.createElement('div');
  list.id = 'popupList';
  list.style.position = 'absolute';
  list.style.background = '#fff';
  list.style.border = '1px solid #ccc';
  list.style.padding = '0.25rem';
  list.style.zIndex = 1000;
  list.style.fontFamily = 'Consolas, monospace';
  list.style.boxShadow = '2px 2px 4px rgba(0,0,0,0.1)';
  list.style.maxHeight = '200px';
  list.style.overflowY = 'auto';

  options.forEach(opt => {
    const item = document.createElement('div');
    item.textContent = opt;
    item.style.padding = '0.2rem 0.5rem';
    item.style.cursor = 'pointer';

    item.onmouseenter = () => item.style.background = '#eee';
    item.onmouseleave = () => item.style.background = 'transparent';

    item.onclick = () => {
      onSelect(opt);
      list.remove();
      if (refocusEl) {
        refocusEl.focus();
        refocusEl.select?.();
      }
    };

    list.appendChild(item);
  });

  document.body.appendChild(list);
  const rect = anchor.getBoundingClientRect();
  list.style.left = `${rect.left + window.scrollX}px`;
  list.style.top = `${rect.bottom + window.scrollY}px`;

  list.onmouseleave = () => list.remove();
  anchor.onmouseleave = () => {
    setTimeout(() => {
      if (!list.matches(':hover')) list.remove();
    }, 150);
  };
}

export function reorderColumns(srcKey, destKey) {
  // Instead of reordering the columns object, update the columnOrder array
  const layout = sharedState.checklistData.layout;
  
  // Initialize columnOrder if it doesn't exist
  if (!layout.columnOrder || !Array.isArray(layout.columnOrder)) {
    layout.columnOrder = Object.keys(layout.columns || {});
  }
  
  // Get current order
  const currentOrder = [...layout.columnOrder];
  
  // Find positions
  const sourceIndex = currentOrder.indexOf(srcKey);
  const targetIndex = currentOrder.indexOf(destKey);
  
  if (sourceIndex === -1 || targetIndex === -1) {
    console.error(`Column keys not found in columnOrder: ${srcKey}, ${destKey}`);
    return;
  }
  
  console.log(`Reordering columns in ui-subrender: moving ${srcKey} (${sourceIndex}) to ${destKey} (${targetIndex})`);
  
  // Remove source and insert at target position
  currentOrder.splice(sourceIndex, 1);
  const insertAt = targetIndex > sourceIndex ? targetIndex - 1 : targetIndex;
  currentOrder.splice(insertAt, 0, srcKey);
  
  // Update column order in layout
  layout.columnOrder = currentOrder;
  
  // Mark as dirty and re-render with column reorder event
  sharedState.layoutDirty = true;
  markSaveDirty(true, sharedState.DIRTY_EVENTS.COLUMN_REORDER);
}

export function showColumnVisibilityMenu(x, y) {
  const menu = document.getElementById('columnVisibilityMenu');
  if (!menu) return;

  menu.style.left = x + 'px';
  menu.style.top = y + 'px';
  menu.style.display = 'block';

  sharedState.ColumnVisibilityMenu = { visible: true, x, y };
} 
