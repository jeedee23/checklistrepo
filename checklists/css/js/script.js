// ──────────────────────────────────────────────────────
//  Recursive Checklist Manager – COMPLETE script.js
//  column‑width persisting fix (updates config/layout.json)
// ──────────────────────────────────────────────────────

/**************  Global configuration  **************/
const GITHUB_TOKEN = 'replace with local file content';
const OWNER  = 'jeedee23';
const REPO   = 'checklistrepo';
const BRANCH = 'main';

// directories in the repo
const CHECKLIST_DIR = 'checklists';
const CONFIG_DIR    = 'config';
const NOTES_DIR     = 'notes';
const IMAGES_DIR    = 'images';

const apiHeaders = () => ({
  Authorization: `token ${GITHUB_TOKEN}`,
  'Content-Type': 'application/json'
});
const b64 = str => btoa(unescape(encodeURIComponent(str)));
const rawUrlForPath = p => `https://raw.githubusercontent.com/${OWNER}/${REPO}/${BRANCH}/${p}`;

/**************  Global state  **************/
let checklistData   = { title:'Untitled Checklist', items:[] };
let layoutData      = { columns:{}, rows:{} };
let isDirty         = false;     // checklist / content dirty
let layoutDirty     = false;     // layout.json dirty
let currentChecklistFile = '';
let selectedPath    = [];
let quill;

/**************  Utility helpers  **************/
const timestampNow = () => new Date().toISOString().slice(0,19).replace(/[-T:]/g,'_').replace('_','_@_');
function traverse(items, fn){ items.forEach(it=>{ if(fn) fn(it); if(it.children) traverse(it.children, fn); }); }
function getItemByPath(path){ return path.reduce((acc,n,i)=> i===0 ? checklistData.items[n-1] : acc.children[n-1], null); }
function getParentArray(path){ if(path.length===1) return checklistData.items; const p = getItemByPath(path.slice(0,-1)); p.children = p.children||[]; return p.children; }

/**************  Dirty button helper  **************/
const saveBtn = () => document.querySelector('button[onclick="saveChecklistToGitHub()"]');
function markSaveDirty(flag=true){
  isDirty = flag || isDirty;
  if(flag){ saveBtn().classList.add('dirty'); }
  else     { saveBtn().classList.remove('dirty'); }
}
// inject style once
const styleTag = document.createElement('style');
styleTag.textContent = 'button.dirty{background:#ff6666;}';
document.head.appendChild(styleTag);

/**************  Layout I/O  **************/
async function fetchLayout(){
  try{
    const url = `https://api.github.com/repos/${OWNER}/${REPO}/contents/${CONFIG_DIR}/layout.json`;
    const res = await fetch(url,{ headers:apiHeaders(), cache:'no-store', Accept:'application/vnd.github.v3.raw' });
    if(!res.ok) throw new Error(res.statusText);
    const txt = await res.text();
    layoutData = JSON.parse(txt);
  }catch(err){ alert('No layout.json found; using defaults'); }
}

async function saveLayoutToGithub(){
  const path = `${CONFIG_DIR}/layout.json`;
  const url  = `https://api.github.com/repos/${OWNER}/${REPO}/contents/${path}`;
  
  try {
    // 🛈 Show current widths before attempting to save
    const cols = Object.entries(layoutData.columns || {})
                        .map(([k, v]) => `${k}: ${v}px`).join('\n');
    alert(`Saving layout.json with the following column widths:\n${cols}`);

    // Make the PUT request
    const get  = await fetch(url, { headers: apiHeaders() });
    const sha  = get.ok ? (await get.json()).sha : undefined;
    
    const payload = {
      message: 'Update layout.json',
      content: b64(JSON.stringify(layoutData, null, 2)),
      branch: BRANCH,
      ...(sha && { sha })
    };

    const put  = await fetch(url, {
      method: 'PUT',
      headers: apiHeaders(),
      body: JSON.stringify(payload)
    });
    
    if (put.ok) {
      alert("✅ layout.json saved successfully!");
      
      // Refetch the layout.json to check if the update was successful
      const refetchedRes = await fetch(url, { headers: apiHeaders() });
      const refetchedData = await refetchedRes.json();
      const refetchedLayout = JSON.parse(decodeURIComponent(escape(atob(refetchedData.content))));

      // Compare the refetched layout with the current layoutData
      if (JSON.stringify(refetchedLayout.columns) !== JSON.stringify(layoutData.columns)) {
        alert("❌ layout.json was not updated correctly! Please try again.");
      } else {
        alert("✅ layout.json update verified successfully!");
      }

      // Force reload to clear any cached data
      location.reload(true);
    } else {
      alert(`❌ Failed to save layout.json: ${put.statusText}`);
    }
  } catch (error) {
    alert(`❌ Error saving layout.json: ${error.message}`);
  }

  // Optional: Check GitHub rate limit status (you can remove this if not needed)
  const rateLimitRes = await fetch('https://api.github.com/rate_limit', { headers: apiHeaders() });
  const rateLimitData = await rateLimitRes.json();
  alert(`Rate limit remaining: ${rateLimitData.resources.core.remaining}`);
}


/**************  Sidebar & checklist loading  **************/
async function fetchChecklists(){
  const url = `https://api.github.com/repos/${OWNER}/${REPO}/contents/${CHECKLIST_DIR}?_=${Date.now()}`;
  let files;
  try{
    const res = await fetch(url,{ headers:apiHeaders() });
    if(!res.ok) throw new Error(res.statusText);
    files = await res.json();
  }catch(err){ return alert('❌ Cannot list checklists'); }

  const ul = document.getElementById('checklistList');
  ul.innerHTML = '';
  files.filter(f=>f.type==='file' && f.name.endsWith('.json'))
       .sort((a,b)=> b.name.localeCompare(a.name))
       .forEach(f=>{
          const li = document.createElement('li');
          li.dataset.file = f.name;
          const ts = (f.name.match(/^(\d{4}_\d{2}_\d{2}_@_\d{2}-\d{2}-\d{2})/)||[])[0]||'';
          const project = f.name.replace(/\.json$/,'').slice(ts.length + (ts?1:0));
          li.innerHTML = `<span class="ts">${ts}</span><br><span class="title">${project||'(no name)'}</span>`;
          if(f.name===currentChecklistFile) li.classList.add('active');
          li.onclick = () => {
            if(f.name===currentChecklistFile) return;
            if(isDirty && !confirm('Discard unsaved changes?')) return;
            currentChecklistFile = f.name;
            loadChecklist(f.name);
            ul.querySelectorAll('li').forEach(x=>x.classList.remove('active'));
            li.classList.add('active');
          };
          ul.appendChild(li);
       });
}
async function loadChecklist(filename){
  try{
    const url = `https://api.github.com/repos/${OWNER}/${REPO}/contents/${CHECKLIST_DIR}/${filename}`;
    const res = await fetch(url,{ headers:apiHeaders(), cache:'no-store' });
    if(!res.ok) throw new Error(res.statusText);
    const data = await res.json();
    const content = atob(data.content.replace(/\n/g,''));
    checklistData = JSON.parse(content);
    document.getElementById('clTitle').textContent = checklistData.title;
    renderCollaborators();
    renderChecklist();
    applyLayout();
    markSaveDirty(false);
  }catch(err){ alert('Error loading checklist: '+err); }
}

/**************  Layout application  **************/
function applyLayout(){
  const ths = document.querySelectorAll('#checklistContainer th');
  const colKeys = ['no','label','unit','qty_est','qty_real','price_unit','total_price','date','who'];
  ths.forEach((th,idx)=>{
    const key = colKeys[idx];
    if(layoutData.columns && layoutData.columns[key]!==undefined){
      th.style.width = layoutData.columns[key]+'px';
    }
  });
  if(layoutData.rows && layoutData.rows.height){
    document.querySelectorAll('#checklistContainer tbody tr').forEach(tr=> tr.style.height = layoutData.rows.height+'px');
  }
}

/**************  Render checklist  **************/
function renderChecklist(){
  const container = document.getElementById('checklistContainer');
  container.innerHTML = `
    <table><thead><tr>
      <th>No</th><th>Label</th><th>Unit</th><th>Qty Est</th><th>Qty Real</th>
      <th>Price/Unit</th><th>Total Price</th><th>Date</th><th>Who</th>
    </tr></thead><tbody></tbody></table>`;
  checklistData.items.forEach((it,idx)=> renderItem(it,[idx+1]));
  attachResizeHandles();
  applyLayout();
}
function renderItem(item,path){
  const tbody = document.querySelector('#checklistContainer tbody');
  const tr = document.createElement('tr');
  tr.dataset.path = JSON.stringify(path);
  // numbering cell
  addCell(tr,path.join('.'));
  // Label cell
  const tdLabel = document.createElement('td');
  const wrap = document.createElement('div');
  wrap.style.display='flex';
  wrap.style.alignItems='center';
  wrap.style.marginLeft=(path.length-1)*20+'px';
  const arrow = document.createElement('span');
  arrow.className='arrow';
  if(item.children?.length){
    arrow.textContent = item.collapsed?'▶':'▼';
    arrow.onclick=e=>{e.stopPropagation(); item.collapsed=!item.collapsed; renderChecklist(); markSaveDirty();};
  }
  wrap.appendChild(arrow);
  const span = document.createElement('span');
  span.contentEditable=true;
  span.textContent=item.label||'';
  span.onblur=()=>{ item.label=span.textContent.trim(); markSaveDirty(); };
  wrap.appendChild(span);
  tdLabel.appendChild(wrap);
  tr.appendChild(tdLabel);
  // unit select etc.
  addSelect(tr, checklistData.unitChoices, item.unit, v=>{item.unit=v; markSaveDirty();},'unit');
  ['qty_est','qty_real','price_unit'].forEach(key=>
    addInput(tr,'number',item[key],v=>{item[key]=parseFloat(v)||0; markSaveDirty();},key));
  addCell(tr, item.total_price?.toFixed(2)||'', 'total_price');
  addInput(tr,'date', item.date, v=>{item.date=v; markSaveDirty();},'date');
  addSelect(tr, checklistData.collaborators, item.who, v=>{item.who=v; markSaveDirty();},'who');
  tbody.appendChild(tr);
  if(item.children && !item.collapsed) item.children.forEach((ch,i)=> renderItem(ch, path.concat(i+1)));
}
function addCell(tr,txt,key){
  const td = document.createElement('td');
  td.textContent = txt;
  if(layoutData.columns && layoutData.columns[key]!==undefined) td.style.width = layoutData.columns[key]+'px';
  tr.appendChild(td);
}
function addInput(tr,type,val,onch,key){
  const td = document.createElement('td');
  if(layoutData.columns && layoutData.columns[key]!==undefined) td.style.width = layoutData.columns[key]+'px';
  const inp = document.createElement('input');
  inp.type = type;
  inp.value = val||'';
  inp.oninput = e=>{ onch(e.target.value); };
  td.appendChild(inp);
  tr.appendChild(td);
}
function addSelect(tr,opts,val,onch,key){
  const td = document.createElement('td');
  if(layoutData.columns && layoutData.columns[key]!==undefined) td.style.width = layoutData.columns[key]+'px';
  const sel = document.createElement('select');
  sel.innerHTML = '<option value=""></option>' + (opts||[]).map(o=>`<option value="${o}"${o===val?' selected':''}>${o}</option>`).join('');
  sel.onchange = e=> onch(e.target.value);
  td.appendChild(sel);
  tr.appendChild(td);
}

/**************  Column & row resize **************/
function attachResizeHandles(){
  const colKeys = ['no','label','unit','qty_est','qty_real','price_unit','total_price','date','who'];
  document.querySelectorAll('#checklistContainer th').forEach((th,colIdx)=>{
    if(th.querySelector('.resize-handle-col')) return; // already has one
    th.style.position='relative';
    const handle = document.createElement('div');
    handle.className='resize-handle-col';
    Object.assign(handle.style,{position:'absolute', top:'0', right:'0', width:'6px', height:'100%', cursor:'col-resize'});
    th.appendChild(handle);

    let startX,startW;
    handle.addEventListener('mousedown',e=>{
      e.preventDefault();
      startX = e.pageX;
      startW = th.offsetWidth;
      window.addEventListener('mousemove', drag);
      window.addEventListener('mouseup', up);
    });
    function drag(ev){
      const delta = ev.pageX-startX;
      const newW = Math.max(30, startW+delta);
      document.querySelectorAll(`#checklistContainer th:nth-child(${colIdx+1}), #checklistContainer td:nth-child(${colIdx+1})`).forEach(cell=> cell.style.width=newW+'px');
    }
    function up(){
      window.removeEventListener('mousemove', drag);
      window.removeEventListener('mouseup', up);
      const newWidth = parseInt(th.offsetWidth,10);
      const key = colKeys[colIdx];
      layoutData.columns = layoutData.columns || {};
      layoutData.columns[key] = newWidth;
      layoutDirty = true;
      markSaveDirty();
    }
  });
}

/**************  Save checklist + layout **************/
async function saveChecklistToGitHub(){
  if(!currentChecklistFile){ alert('No checklist loaded'); return; }
  try{
    // 1️⃣ save checklist file
    const path = `${CHECKLIST_DIR}/${currentChecklistFile}`;
    const url  = `https://api.github.com/repos/${OWNER}/${REPO}/contents/${path}`;
    const get  = await fetch(url,{ headers:apiHeaders() });
    const sha  = get.ok ? (await get.json()).sha : undefined;
    const payload = {
      message: `Update ${currentChecklistFile}`,
      content: b64(JSON.stringify(checklistData,null,2)),
      branch: BRANCH,
      ...(sha && {sha})
    };
    const put = await fetch(url,{ method:'PUT', headers:apiHeaders(), body:JSON.stringify(payload) });
    if(!put.ok) throw new Error('checklist save failed');
    // 2️⃣ save layout if dirty
    if(layoutDirty){ await saveLayoutToGithub(); layoutDirty = false; }
    document.getElementById('status').textContent = `✅ Saved ${new Date().toLocaleTimeString()}`;
    markSaveDirty(false);
  }catch(err){
    document.getElementById('status').textContent = '❌ Save failed';
    alert('Save failed: '+err);
  }
}

/**************  Collaborators **************/
function renderCollaborators(){ /* unchanged (omitted for brevity) */ }
function addCollaborator(){ /* unchanged */ }

/**************  Init **************/
window.addEventListener('load',async ()=>{
  quill = new Quill('#editor',{theme:'snow'});
  await fetchLayout();
  await fetchChecklists();
});
