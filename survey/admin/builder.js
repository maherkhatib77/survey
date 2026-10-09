/**
 * Admin Builder - עורך סקרים
 */
const API = '../api';
const WIDGETS = [
  {type:'text',label:'טקסט',icon:'📝'},{type:'textarea',label:'טקסט ארוך',icon:'📄'},
  {type:'number',label:'מספר',icon:'🔢'},{type:'email',label:'דוא"ל',icon:'📧'},
  {type:'phone',label:'טלפון',icon:'📱'},{type:'date',label:'תאריך',icon:'📅'},
  {type:'select',label:'רשימה',icon:'📋'},{type:'radio',label:'בחירה יחידה',icon:'🔘'},
  {type:'checkbox',label:'בחירה מרובה',icon:'☑️'},{type:'rating',label:'דירוג',icon:'⭐'},
  {type:'file',label:'קובץ',icon:'📎'},{type:'signature',label:'חתימה',icon:'✍️'},
  {type:'calculation',label:'חישוב',icon:'🧮'},{type:'richtext',label:'עורך טקסט',icon:'📝'},
  {type:'divider',label:'קו הפרדה',icon:'➖'},{type:'heading',label:'כותרת',icon:'🔤'},
  {type:'record',label:'רשומה ממאגר',icon:'🗄️'},{type:'matrix',label:'מטריצה',icon:'📊'}
];

let form = null;
let activePage = 0;
let selectedFieldId = null;
let saveTimeout = null;
let dataSources = []; // מאגרי נתונים זמינים

// ===== Auth =====
async function checkAuth() {
  try {
    const res = await fetch(`${API}/auth.php?action=check`);
    const json = await res.json();
    if (!json.loggedIn) { window.location.href = 'login.html'; return false; }
    return true;
  } catch(e) { window.location.href = 'login.html'; return false; }
}

// ===== Init =====
async function init() {
  if (!await checkAuth()) return;
  const id = new URLSearchParams(window.location.search).get('id');
  if (!id) { window.location.href = 'dashboard.html'; return; }
  
  // טען טופס ומאגרים במקביל
  const [formRes, sourcesRes] = await Promise.all([
    fetch(`${API}/forms.php?action=get&id=${id}`),
    fetch(`${API}/sources.php?action=list`)
  ]);
  
  const formJson = await formRes.json();
  const sourcesJson = await sourcesRes.json();
  
  if (!formJson.success) { window.location.href = 'dashboard.html'; return; }
  
  form = formJson.data;
  dataSources = sourcesJson.success ? sourcesJson.data : [];
  renderAll();
}

function renderAll() {
  document.getElementById('formTitle').value = form.settings.title;
  document.getElementById('publishBtn').textContent = form.status === 'published' ? '✅ מפורסם' : '📝 טיוטה';
  document.getElementById('publishBtn').className = `btn btn-sm ${form.status === 'published' ? 'btn-success' : 'btn-outline'}`;
  renderWidgets();
  renderPageTabs();
  renderFields();
}

function renderWidgets() {
  document.getElementById('widgetsGrid').innerHTML = WIDGETS.map(w =>
    `<button class="widget-btn" onclick="addField('${w.type}')">
      <span class="widget-icon">${w.icon}</span>
      <span class="widget-label">${w.label}</span>
    </button>`
  ).join('');
}

function renderPageTabs() {
  const tabs = form.pages.map((p, i) => {
    const deleteBtn = form.pages.length > 1 
      ? `<button class="page-tab-delete" onclick="event.stopPropagation();deletePage(${i})" title="מחק עמוד">✕</button>`
      : '';
    return `<div class="page-tab-wrapper">
      <button class="page-tab ${i === activePage ? 'active' : ''}" onclick="switchPage(${i})">${esc(p.title)}</button>
      ${deleteBtn}
    </div>`;
  }).join('');
  document.getElementById('pageTabs').innerHTML = tabs +
    `<button class="page-tab-add" onclick="addPage()">+ עמוד</button>`;
  document.getElementById('pageTitle').value = form.pages[activePage].title;
}

function deletePage(pageIndex) {
  const page = form.pages[pageIndex];
  const fieldCount = page.fields.length;
  
  // אזהרה אם יש שאלות בעמוד
  let confirmMsg = `האם אתה בטוח שברצונך למחוק את העמוד "${page.title}"?`;
  if (fieldCount > 0) {
    confirmMsg += `\n\n⚠️ אזהרה: עמוד זה מכיל ${fieldCount} שאלות שימחקו גם הן!`;
  }
  
  if (!confirm(confirmMsg)) {
    return;
  }
  
  // מחיקת העמוד
  form.pages.splice(pageIndex, 1);
  
  // עדכון העמוד הפעיל
  if (activePage >= form.pages.length) {
    activePage = form.pages.length - 1;
  }
  
  // שמירה ורענון
  save();
  renderPageTabs();
  renderFields();
}

function renderFields() {
  const fields = form.pages[activePage].fields;
  const list = document.getElementById('fieldsList');

  if (!fields.length) {
    list.innerHTML = `
      <div class="empty-state">
        <div class="icon">📋</div>
        <h3>בחר ווידג'ט מהתפריט右侧</h3>
        <p>לחץ על אחד הכפתורים מימין כדי להתחיל</p>
      </div>`;
    return;
  }

  list.innerHTML = fields.map((f, i) => `
    <div class="field-item ${f.id === selectedFieldId ? 'selected' : ''}" onclick="selectField('${f.id}')">
      <div class="field-header">
        <div class="field-info">
          <span class="field-icon">${WIDGETS.find(w=>w.type===f.type)?.icon || '📝'}</span>
          <div>
            <div class="field-name">${esc(f.label)}</div>
            <div class="field-type">${f.type}${f.required ? ' • חובה' : ''}</div>
          </div>
        </div>
        <div class="field-actions">
          <button onclick="event.stopPropagation();moveField('${f.id}',-1)" ${i===0?'disabled':''} title="הזז למעלה">↑</button>
          <button onclick="event.stopPropagation();moveField('${f.id}',1)" ${i===fields.length-1?'disabled':''} title="הזז למטה">↓</button>
          <button onclick="event.stopPropagation();showMoveModal('${f.id}')" title="העבר לעמוד אחר" ${form.pages.length<=1?'disabled':''}>📄</button>
          <button onclick="event.stopPropagation();deleteField('${f.id}')" style="color:var(--danger);" title="מחק">🗑️</button>
        </div>
      </div>
      ${f.conditionalLogic ? '<div style="font-size:12px;color:var(--primary);margin-top:8px;">🔀 לוגיקה מותנית</div>' : ''}
      ${f.calculation?.formula ? `<div style="font-size:12px;color:var(--purple);margin-top:8px;font-family:monospace;">🧮 ${esc(f.calculation.formula)}</div>` : ''}
    </div>
  `).join('');
}

// ===== Actions =====
function addField(type) {
  const labels = {text:'שדה טקסט',textarea:'טקסט ארוך',number:'מספר',email:'דוא"ל',phone:'טלפון',date:'תאריך',select:'רשימת בחירה',radio:'בחירה יחידה',checkbox:'בחירה מרובה',rating:'דירוג',file:'העלאת קובץ',signature:'חתימה דיגיטלית',calculation:'חישוב',richtext:'עורך טקסט',divider:'קו הפרדה',heading:'כותרת',record:'רשומה ממאגר'};
  const field = { id: uuid(), type, label: labels[type]||'שדה חדש', required: false, width: 'full' };
  if (['select','radio','checkbox'].includes(type)) {
    field.options = [{label:'אפשרות 1',value:'opt1'},{label:'אפשרות 2',value:'opt2'},{label:'אפשרות 3',value:'opt3'}];
  }
  if (type === 'checkbox') {
    field.maxSelections = 0; // 0 = ללא הגבלה
  }
  if (type === 'rating') {
    field.ratingScale = 5;
    field.options = [
      {label:'גרוע מאוד',value:'1'},
      {label:'גרוע',value:'2'},
      {label:'בינוני',value:'3'},
      {label:'טוב',value:'4'},
      {label:'מצוין',value:'5'}
    ];
  }
  if (type === 'matrix') {
    field.matrixRows = [
      {id: uuid(), label: 'שורה 1'},
      {id: uuid(), label: 'שורה 2'},
      {id: uuid(), label: 'שורה 3'}
    ];
    field.matrixColumns = [
      {id: uuid(), label: 'עמודה 1', value: 'col1'},
      {id: uuid(), label: 'עמודה 2', value: 'col2'},
      {id: uuid(), label: 'עמודה 3', value: 'col3'}
    ];
    field.matrixType = 'radio'; // radio או checkbox
  }
  if (type === 'calculation') field.calculation = { formula: '' };
  if (type === 'record') {
    field.sourceId = '';
    field.displayField = '';
    field.searchFields = [];
    field.autoFill = [];
    field.recordSelectionType = 'single'; // 'single' או 'multiple'
    field.maxSelections = 0; // 0 = ללא הגבלה
  }
  
  form.pages[activePage].fields.push(field);
  selectedFieldId = field.id;
  save();
  renderFields();
  renderProps();
}

function deleteField(id) {
  form.pages[activePage].fields = form.pages[activePage].fields.filter(f => f.id !== id);
  if (selectedFieldId === id) { selectedFieldId = null; closeProps(); }
  save();
  renderFields();
}

function moveField(id, dir) {
  const fields = form.pages[activePage].fields;
  const idx = fields.findIndex(f => f.id === id);
  const newIdx = idx + dir;
  if (newIdx < 0 || newIdx >= fields.length) return;
  [fields[idx], fields[newIdx]] = [fields[newIdx], fields[idx]];
  save();
  renderFields();
}

function showMoveModal(fieldId) {
  if (form.pages.length <= 1) {
    alert('אין עמודים אחרים להעביר אליהם');
    return;
  }
  
  const field = form.pages[activePage].fields.find(f => f.id === fieldId);
  if (!field) return;
  
  // יצירת מודאל דינמי
  const modal = document.createElement('div');
  modal.className = 'modal-overlay';
  modal.style.display = 'flex';
  modal.id = 'moveFieldModal';
  
  const pagesList = form.pages.map((page, idx) => {
    const isCurrentPage = idx === activePage;
    return `
      <div class="page-option ${isCurrentPage ? 'current' : ''}" 
           onclick="${isCurrentPage ? '' : `moveFieldToPage('${fieldId}', ${idx})`}" 
           style="${isCurrentPage ? 'opacity:0.5;cursor:not-allowed;' : 'cursor:pointer;'}">
        <span style="font-size:20px;">${isCurrentPage ? '📍' : '📄'}</span>
        <div style="flex:1;">
          <div style="font-weight:600;">${esc(page.title)}</div>
          <div style="font-size:12px;color:var(--slate-500);">${page.fields.length} שדות${isCurrentPage ? ' (עמוד נוכחי)' : ''}</div>
        </div>
        ${!isCurrentPage ? '<span style="color:var(--primary);">←</span>' : ''}
      </div>
    `;
  }).join('');
  
  modal.innerHTML = `
    <div class="modal" style="max-width:500px;">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:20px;">
        <h3 style="margin:0;">📄 העבר שדה לעמוד אחר</h3>
        <button onclick="closeMoveModal()" style="background:none;border:none;cursor:pointer;font-size:20px;">✕</button>
      </div>
      <div style="background:var(--slate-50);padding:12px;border-radius:8px;margin-bottom:16px;">
        <div style="font-size:13px;color:var(--slate-600);">מעביר את:</div>
        <div style="font-weight:600;margin-top:4px;">${esc(field.label)}</div>
      </div>
      <div style="margin-bottom:12px;font-weight:600;">בחר עמוד יעד:</div>
      <div style="display:flex;flex-direction:column;gap:8px;">
        ${pagesList}
      </div>
      <div style="margin-top:20px;padding-top:16px;border-top:1px solid var(--slate-200);">
        <button onclick="closeMoveModal()" class="btn btn-outline" style="width:100%;">ביטול</button>
      </div>
    </div>
  `;
  
  document.body.appendChild(modal);
}

function closeMoveModal() {
  const modal = document.getElementById('moveFieldModal');
  if (modal) {
    modal.remove();
  }
}

function moveFieldToPage(fieldId, targetPageIdx) {
  if (targetPageIdx === activePage) return;
  
  // מציאת השדה בעמוד הנוכחי
  const currentPage = form.pages[activePage];
  const fieldIdx = currentPage.fields.findIndex(f => f.id === fieldId);
  if (fieldIdx === -1) return;
  
  // הוצאת השדה מהעמוד הנוכחי
  const field = currentPage.fields[fieldIdx];
  currentPage.fields.splice(fieldIdx, 1);
  
  // הוספת השדה לעמוד היעד
  const targetPage = form.pages[targetPageIdx];
  targetPage.fields.push(field);
  
  // שמירה ורענון
  save();
  closeMoveModal();
  renderFields();
  renderPageTabs();
  
  // הודעת הצלחה
  alert(`השדה "${field.label}" הועבר בהצלחה לעמוד "${targetPage.title}"`);
}

function selectField(id) {
  selectedFieldId = id;
  renderFields();
  renderProps();
}

function switchPage(idx) {
  activePage = idx;
  selectedFieldId = null;
  closeProps();
  renderPageTabs();
  renderFields();
}

function addPage() {
  form.pages.push({ id: uuid(), title: `עמוד ${form.pages.length + 1}`, fields: [] });
  activePage = form.pages.length - 1;
  save();
  renderPageTabs();
  renderFields();
}

function savePageTitle() {
  form.pages[activePage].title = document.getElementById('pageTitle').value || `עמוד ${activePage + 1}`;
  save();
  renderPageTabs();
}

function saveFormTitle() {
  form.settings.title = document.getElementById('formTitle').value;
  save();
}

// ===== Properties Panel =====
function renderProps() {
  const panel = document.getElementById('propsPanel');
  const field = getCurrentField();
  if (!field) { panel.style.display = 'none'; return; }
  panel.style.display = 'block';

  let html = `
    <div class="field-group"><label>תווית</label><input type="text" value="${esc(field.label)}" onchange="updateFieldProp('label',this.value)"></div>
    <div class="field-group"><label>טקסט עזרה</label><input type="text" value="${esc(field.helpText||'')}" onchange="updateFieldProp('helpText',this.value)"></div>`;

  if (['text','textarea','email','phone','number'].includes(field.type)) {
    html += `<div class="field-group"><label>Placeholder</label><input type="text" value="${esc(field.placeholder||'')}" onchange="updateFieldProp('placeholder',this.value)"></div>`;
  }

  html += `
    <div class="field-group"><label class="checkbox-label"><input type="checkbox" ${field.required?'checked':''} onchange="updateFieldProp('required',this.checked)"><span>שדה חובה</span></label></div>
    <div class="field-group"><label>רוחב</label>
      <select onchange="updateFieldProp('width',this.value)">
        <option value="full" ${field.width==='full'?'selected':''}>מלא</option>
        <option value="half" ${field.width==='half'?'selected':''}>חצי</option>
        <option value="third" ${field.width==='third'?'selected':''}>שליש</option>
      </select>
    </div>`;

  if (['select','radio','checkbox'].includes(field.type)) {
    html += `<div class="field-group"><label>אפשרויות</label><div id="optionsList">`;
    (field.options||[]).forEach((opt, i) => {
      html += `<div style="display:flex;gap:6px;margin-bottom:6px;align-items:center;">
        <input type="text" value="${esc(opt.label)}" style="flex:1;" onchange="updateOption(${i},this.value)">
        <button onclick="removeOption(${i})" style="background:none;border:none;cursor:pointer;color:var(--danger);">✕</button>
      </div>`;
    });
    html += `</div><button class="btn btn-sm btn-outline" onclick="addOption()" style="margin-top:8px;">+ הוסף אפשרות</button></div>`;
    
    // אפשרות "אחר" לשדות select, radio, checkbox
    html += `<div class="field-group">
      <label class="checkbox-label">
        <input type="checkbox" ${field.enableOther?'checked':''} onchange="toggleOtherOption(this.checked)">
        <span>הוסף אפשרות "אחר"</span>
      </label>
    </div>`;
    
    if (field.enableOther) {
      html += `<div class="field-group">
        <label>תווית לאפשרות "אחר"</label>
        <input type="text" value="${esc(field.otherLabel||'אחר - ציין')}" onchange="updateOtherLabel(this.value)">
        <div class="help">התווית שתוצג למשתמש</div>
      </div>`;
    }
    
    // מקסימום בחירות לשדה checkbox
    if (field.type === 'checkbox') {
      html += `<div class="field-group">
        <label>מקסימום בחירות</label>
        <input type="number" min="0" value="${field.maxSelections||0}" onchange="updateMaxSelections(this.value)" style="width:100px;">
        <div class="help">0 = ללא הגבלה. מספר חיובי = מקסימום אפשרויות לבחירה</div>
      </div>`;
    }
  }

  if (field.type === 'rating') {
    html += `<div class="field-group">
      <label>מספר מדרגות</label>
      <select onchange="updateRatingScale(this.value)">
        <option value="3" ${field.ratingScale===3?'selected':''}>3 מדרגות</option>
        <option value="5" ${field.ratingScale===5||!field.ratingScale?'selected':''}>5 מדרגות</option>
        <option value="7" ${field.ratingScale===7?'selected':''}>7 מדרגות</option>
        <option value="10" ${field.ratingScale===10?'selected':''}>10 מדרגות</option>
      </select>
    </div>`;
    html += `<div class="field-group"><label>תוויות למדרגות</label><div id="ratingLabelsList">`;
    (field.options||[]).forEach((opt, i) => {
      html += `<div style="display:flex;gap:6px;margin-bottom:6px;align-items:center;">
        <span style="min-width:30px;font-weight:600;color:var(--slate-600);">${i+1}</span>
        <input type="text" value="${esc(opt.label)}" style="flex:1;" onchange="updateRatingLabel(${i},this.value)">
      </div>`;
    });
    html += `</div></div>`;
  }

  html += `<div class="field-group"><label>ולידציה</label>
    <label class="checkbox-label" style="margin-bottom:8px;">
      <input type="checkbox" ${hasValidation(field,'required')?'checked':''} onchange="toggleValidation('required',this.checked)">
      <span>חובה למלא</span>
    </label>`;
  if (field.type === 'number') {
    html += `<div style="display:flex;gap:8px;align-items:center;margin-bottom:6px;"><span style="font-size:12px;color:var(--slate-500);">מינימום:</span><input type="number" value="${getValidationValue(field,'min')||''}" style="width:80px;" onchange="setValidation('min',this.value)"></div>
    <div style="display:flex;gap:8px;align-items:center;"><span style="font-size:12px;color:var(--slate-500);">מקסימום:</span><input type="number" value="${getValidationValue(field,'max')||''}" style="width:80px;" onchange="setValidation('max',this.value)"></div>`;
  }
  html += `</div>`;

  html += `<div class="field-group"><label>לוגיקה מותנית</label>
    <button class="btn btn-sm btn-outline" onclick="toggleLogic()" style="width:100%;">${field.conditionalLogic ? '✏️ ערוך תנאי' : '+ הוסף תנאי'}</button>`;
  if (field.conditionalLogic) {
    html += `<div style="margin-top:8px;padding:12px;background:var(--primary-light);border-radius:8px;">
      <select onchange="updateLogicAction(this.value)" style="width:100%;margin-bottom:8px;padding:6px;border-radius:6px;border:1px solid var(--slate-300);">
        <option value="show" ${field.conditionalLogic.action==='show'?'selected':''}>הצג כאשר</option>
        <option value="hide" ${field.conditionalLogic.action==='hide'?'selected':''}>הסתר כאשר</option>
      </select>
      <div id="logicConditions"></div>
      <button class="btn btn-sm" style="color:var(--danger);margin-top:8px;background:none;" onclick="removeLogic()">מחק תנאי</button>
    </div>`;
  }
  html += `</div>`;

  if (field.type === 'calculation') {
    const allFields = form.pages.flatMap(p => p.fields).filter(f => f.id !== field.id && ['number','text'].includes(f.type));
    html += `<div class="field-group"><label>נוסחת חישוב</label>
      <input type="text" value="${esc(field.calculation?.formula||'')}" onchange="updateCalcFormula(this.value)" style="font-family:monospace;" placeholder="{fieldId} + {fieldId2}">
      <div class="help">השתמש ב-{fieldId} להתייחסות לשדות</div>
      <div style="margin-top:8px;"><small style="color:var(--slate-500);">שדות זמינים:</small>
        <div style="display:flex;flex-wrap:wrap;gap:4px;margin-top:4px;">
          ${allFields.map(f => `<code style="font-size:11px;background:var(--slate-100);padding:2px 6px;border-radius:4px;">{${f.id}}</code>`).join('')}
        </div>
      </div>
    </div>`;
  }

  // שדה רשומה ממאגר
  if (field.type === 'record') {
    html += renderRecordFieldProps(field);
  }

  // שדה מטריצה
  if (field.type === 'matrix') {
    html += renderMatrixFieldProps(field);
  }

  document.getElementById('propsContent').innerHTML = html;
  if (field.conditionalLogic) renderLogicConditions();
}

function renderLogicConditions() {
  const field = getCurrentField();
  if (!field?.conditionalLogic) return;
  const allFields = form.pages.flatMap(p => p.fields).filter(f => f.id !== field.id);
  const container = document.getElementById('logicConditions');
  if (!container) return;
  container.innerHTML = field.conditionalLogic.conditions.map((c, i) => `
    <div style="display:flex;gap:4px;margin-bottom:6px;flex-wrap:wrap;align-items:center;">
      <select onchange="updateLogicCondition(${i},'fieldId',this.value)" style="flex:1;min-width:80px;padding:4px;border-radius:4px;border:1px solid var(--slate-300);font-size:12px;">
        ${allFields.map(f => `<option value="${f.id}" ${c.fieldId===f.id?'selected':''}>${esc(f.label)}</option>`).join('')}
      </select>
      <select onchange="updateLogicCondition(${i},'operator',this.value)" style="padding:4px;border-radius:4px;border:1px solid var(--slate-300);font-size:12px;">
        <option value="equals" ${c.operator==='equals'?'selected':''}>שווה</option>
        <option value="notEquals" ${c.operator==='notEquals'?'selected':''}>לא שווה</option>
        <option value="contains" ${c.operator==='contains'?'selected':''}>מכיל</option>
        <option value="greaterThan" ${c.operator==='greaterThan'?'selected':''}>גדול מ</option>
        <option value="lessThan" ${c.operator==='lessThan'?'selected':''}>קטן מ</option>
        <option value="isEmpty" ${c.operator==='isEmpty'?'selected':''}>ריק</option>
        <option value="isNotEmpty" ${c.operator==='isNotEmpty'?'selected':''}>לא ריק</option>
      </select>
      <input type="text" value="${esc(c.value||'')}" onchange="updateLogicCondition(${i},'value',this.value)" style="width:60px;padding:4px;border-radius:4px;border:1px solid var(--slate-300);font-size:12px;" placeholder="ערך">
    </div>
  `).join('');
}

// ===== Field Updates =====
function getCurrentField() { return form.pages[activePage].fields.find(f => f.id === selectedFieldId); }
function updateFieldProp(prop, value) { const f = getCurrentField(); if(!f) return; f[prop] = value; save(); renderFields(); }
function updateOption(idx, value) { const f = getCurrentField(); if(!f) return; f.options[idx] = { label: value, value }; save(); }
function addOption() { const f = getCurrentField(); if(!f) return; const n = (f.options?.length||0)+1; f.options.push({label:`אפשרות ${n}`,value:`opt${n}`}); save(); renderProps(); }
function removeOption(idx) { const f = getCurrentField(); if(!f) return; f.options.splice(idx,1); save(); renderProps(); }

function toggleOtherOption(enabled) {
  const f = getCurrentField(); if(!f) return;
  f.enableOther = enabled;
  if (enabled && !f.otherLabel) {
    f.otherLabel = 'אחר - ציין';
  }
  save();
  renderProps();
}

function updateOtherLabel(label) {
  const f = getCurrentField(); if(!f) return;
  f.otherLabel = label;
  save();
}

function updateMaxSelections(value) {
  const f = getCurrentField(); if(!f) return;
  f.maxSelections = parseInt(value) || 0;
  save();
}

function updateRatingScale(scale) {
  const f = getCurrentField();
  if (!f) return;
  
  const numScale = parseInt(scale);
  f.ratingScale = numScale;
  
  // תוויות ברירת מחדל לפי מספר המדרגות
  const defaultLabels = {
    3: ['נמוך', 'בינוני', 'גבוה'],
    5: ['גרוע מאוד', 'גרוע', 'בינוני', 'טוב', 'מצוין'],
    7: ['גרוע מאוד', 'גרוע', 'בינוני-', 'בינוני', 'בינוני+', 'טוב', 'מצוין'],
    10: ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10']
  };
  
  const labels = defaultLabels[numScale] || defaultLabels[5];
  f.options = labels.map((label, i) => ({
    label: label,
    value: String(i + 1)
  }));
  
  save();
  renderProps();
  renderFields();
}

function updateRatingLabel(idx, label) {
  const f = getCurrentField();
  if (!f || !f.options || !f.options[idx]) return;
  f.options[idx].label = label;
  save();
}

function hasValidation(f, t) { return f.validation?.some(v => v.type === t) || false; }
function getValidationValue(f, t) { return f.validation?.find(v => v.type === t)?.value; }

function toggleValidation(type, checked) {
  const f = getCurrentField(); if(!f) return;
  if (!f.validation) f.validation = [];
  if (checked) f.validation.push({ type, message: type === 'required' ? 'שדה חובה' : '' });
  else f.validation = f.validation.filter(v => v.type !== type);
  save();
}

function setValidation(type, value) {
  const f = getCurrentField(); if(!f) return;
  if (!f.validation) f.validation = [];
  f.validation = f.validation.filter(v => v.type !== type);
  if (value) f.validation.push({ type, value: Number(value), message: `${type === 'min' ? 'מינימום' : 'מקסימום'}: ${value}` });
  save();
}

function toggleLogic() {
  const f = getCurrentField(); if(!f) return;
  if (f.conditionalLogic) { delete f.conditionalLogic; }
  else {
    const allFields = form.pages.flatMap(p => p.fields).filter(f => f.id !== selectedFieldId);
    if (!allFields.length) { alert('אין שדות אחרים לתנאי'); return; }
    f.conditionalLogic = { action: 'show', conditions: [{ fieldId: allFields[0].id, operator: 'equals', value: '' }], matchType: 'all' };
  }
  save(); renderProps(); renderFields();
}

function updateLogicAction(action) { const f = getCurrentField(); if(!f?.conditionalLogic) return; f.conditionalLogic.action = action; save(); }
function updateLogicCondition(idx, prop, value) { const f = getCurrentField(); if(!f?.conditionalLogic) return; f.conditionalLogic.conditions[idx][prop] = value; save(); }
function removeLogic() { const f = getCurrentField(); if(!f) return; delete f.conditionalLogic; save(); renderProps(); renderFields(); }
function updateCalcFormula(formula) { const f = getCurrentField(); if(!f) return; if(!f.calculation) f.calculation = {formula:''}; f.calculation.formula = formula; save(); renderFields(); }

// ===== Record Field Props =====
function renderRecordFieldProps(field) {
  if (dataSources.length === 0) {
    return `<div class="field-group" style="background:var(--warning-light);padding:12px;border-radius:8px;">
      <p style="color:var(--warning);font-size:13px;">⚠️ אין מאגרי נתונים זמינים</p>
      <a href="sources.html" class="btn btn-sm btn-outline" style="margin-top:8px;">🗄️ צור מאגר חדש</a>
    </div>`;
  }

  let html = `<div class="field-group"><label>בחר מאגר נתונים</label>
    <select onchange="updateRecordSource(this.value)">
      <option value="">-- בחר מאגר --</option>
      ${dataSources.map(s => `<option value="${s.id}" ${field.sourceId===s.id?'selected':''}>${esc(s.name)} (${s.recordCount} רשומות)</option>`).join('')}
    </select>
  </div>`;

  // סוג בחירה - בודדת או מרובה
  html += `<div class="field-group"><label>סוג בחירה</label>
    <select onchange="updateRecordSelectionType(this.value)">
      <option value="single" ${field.recordSelectionType==='single'?'selected':''}>בחירה בודדת (רשומה אחת)</option>
      <option value="multiple" ${field.recordSelectionType==='multiple'?'selected':''}>בחירה מרובה (מספר רשומות)</option>
    </select>
    <div class="help">${field.recordSelectionType==='single'?'המשתמש יכול לבחור רשומה אחת בלבד':'המשתמש יכול לבחור מספר רשומות'}</div>
  </div>`;
  
  // מקסימום בחירות לבחירה מרובה
  if (field.recordSelectionType === 'multiple') {
    html += `<div class="field-group">
      <label>מקסימום רשומות לבחירה</label>
      <input type="number" min="0" value="${field.maxSelections||0}" onchange="updateRecordMaxSelections(this.value)" style="width:100px;">
      <div class="help">0 = ללא הגבלה. מספר חיובי = מקסימום רשומות לבחירה</div>
    </div>`;
  }

  // אפשרות "אחר"
  html += `<div class="field-group">
    <label class="checkbox-label">
      <input type="checkbox" ${field.enableOther?'checked':''} onchange="toggleRecordOther(this.checked)">
      <span>הוסף אפשרות "אחר"</span>
    </label>
  </div>`;
  
  if (field.enableOther) {
    html += `<div class="field-group">
      <label>תווית לאפשרות "אחר"</label>
      <input type="text" value="${esc(field.otherLabel||'אחר - ציין')}" onchange="updateRecordOtherLabel(this.value)">
      <div class="help">התווית שתוצג למשתמש</div>
    </div>`;
  }

  if (field.sourceId) {
    const source = dataSources.find(s => s.id === field.sourceId);
    if (source && source.fields) {
      // שדה לתצוגה
      html += `<div class="field-group"><label>שדה לתצוגה (מה יוצג למשתמש)</label>
        <select onchange="updateRecordDisplay(this.value)">
          <option value="">-- בחר שדה --</option>
          ${source.fields.map(f => `<option value="${esc(f)}" ${field.displayField===f?'selected':''}>${esc(f)}</option>`).join('')}
        </select>
      </div>`;

      // שדות לחיפוש
      html += `<div class="field-group"><label>שדות לחיפוש (במה ניתן לחפש)</label>
        <div id="searchFieldsList">`;
      (field.searchFields || []).forEach((sf, i) => {
        html += `<div style="display:flex;gap:6px;margin-bottom:6px;align-items:center;">
          <select onchange="updateSearchField(${i},this.value)" style="flex:1;">
            <option value="">-- בחר שדה --</option>
            ${source.fields.map(f => `<option value="${esc(f)}" ${sf===f?'selected':''}>${esc(f)}</option>`).join('')}
          </select>
          <button onclick="removeSearchField(${i})" style="background:none;border:none;cursor:pointer;color:var(--danger);">✕</button>
        </div>`;
      });
      html += `</div><button class="btn btn-sm btn-outline" onclick="addSearchField()" style="margin-top:8px;">+ הוסף שדה חיפוש</button></div>`;

      // מילוי אוטומטי
      html += `<div class="field-group"><label>מילוי אוטומטי של שדות אחרים</label>
        <p style="font-size:12px;color:var(--slate-500);margin-bottom:8px;">כאשר המשתמש בוחר רשומה, שדות אחרים יתמלאו אוטומטית</p>
        <div id="autoFillList">`;
      (field.autoFill || []).forEach((af, i) => {
        const allFields = form.pages.flatMap(p => p.fields).filter(f => f.id !== field.id && ['text','email','phone','number'].includes(f.type));
        html += `<div style="display:flex;gap:6px;margin-bottom:6px;align-items:center;flex-wrap:wrap;">
          <select onchange="updateAutoFill(${i},'targetField',this.value)" style="flex:1;min-width:120px;">
            <option value="">-- שדה בסקר --</option>
            ${allFields.map(f => `<option value="${f.id}" ${af.targetField===f.id?'selected':''}>${esc(f.label)}</option>`).join('')}
          </select>
          <span style="font-size:12px;">←</span>
          <select onchange="updateAutoFill(${i},'sourceField',this.value)" style="flex:1;min-width:120px;">
            <option value="">-- שדה במאגר --</option>
            ${source.fields.map(f => `<option value="${esc(f)}" ${af.sourceField===f?'selected':''}>${esc(f)}</option>`).join('')}
          </select>
          <button onclick="removeAutoFill(${i})" style="background:none;border:none;cursor:pointer;color:var(--danger);">✕</button>
        </div>`;
      });
      html += `</div><button class="btn btn-sm btn-outline" onclick="addAutoFill()" style="margin-top:8px;">+ הוסף מיפוי</button></div>`;
    }
  }

  return html;
}

function updateRecordSource(sourceId) {
  const f = getCurrentField(); if(!f) return;
  f.sourceId = sourceId;
  f.displayField = '';
  f.searchFields = [];
  f.autoFill = [];
  save();
  renderProps();
}

function updateRecordSelectionType(type) {
  const f = getCurrentField(); if(!f) return;
  f.recordSelectionType = type;
  save();
  renderProps();
}

function updateRecordMaxSelections(value) {
  const f = getCurrentField(); if(!f) return;
  f.maxSelections = parseInt(value) || 0;
  save();
}

function toggleRecordOther(enabled) {
  const f = getCurrentField(); if(!f) return;
  f.enableOther = enabled;
  if (enabled && !f.otherLabel) {
    f.otherLabel = 'אחר - ציין';
  }
  save();
  renderProps();
}

function updateRecordOtherLabel(label) {
  const f = getCurrentField(); if(!f) return;
  f.otherLabel = label;
  save();
}

function updateRecordDisplay(fieldName) {
  const f = getCurrentField(); if(!f) return;
  f.displayField = fieldName;
  save();
}

function addSearchField() {
  const f = getCurrentField(); if(!f) return;
  if (!f.searchFields) f.searchFields = [];
  f.searchFields.push('');
  save();
  renderProps();
}

function updateSearchField(idx, value) {
  const f = getCurrentField(); if(!f) return;
  f.searchFields[idx] = value;
  save();
}

function removeSearchField(idx) {
  const f = getCurrentField(); if(!f) return;
  f.searchFields.splice(idx, 1);
  save();
  renderProps();
}

function addAutoFill() {
  const f = getCurrentField(); if(!f) return;
  if (!f.autoFill) f.autoFill = [];
  f.autoFill.push({ targetField: '', sourceField: '' });
  save();
  renderProps();
}

function updateAutoFill(idx, prop, value) {
  const f = getCurrentField(); if(!f) return;
  f.autoFill[idx][prop] = value;
  save();
}

function removeAutoFill(idx) {
  const f = getCurrentField(); if(!f) return;
  f.autoFill.splice(idx, 1);
  save();
  renderProps();
}

// ===== Matrix Field Props =====
function renderMatrixFieldProps(field) {
  let html = `<div class="field-group">
    <label>סוג בחירה</label>
    <select onchange="updateMatrixType(this.value)">
      <option value="radio" ${field.matrixType==='radio'?'selected':''}>בחירה יחידה לכל שורה</option>
      <option value="checkbox" ${field.matrixType==='checkbox'?'selected':''}>בחירה מרובה לכל שורה</option>
    </select>
  </div>`;

  // שורות
  html += `<div class="field-group">
    <label style="display:flex;justify-content:space-between;align-items:center;">
      <span>שורות (${field.matrixRows?.length || 0})</span>
      <button class="btn btn-sm btn-outline" onclick="addMatrixRow()">+ הוסף שורה</button>
    </label>
    <div style="display:flex;flex-direction:column;gap:6px;margin-top:8px;">`;
  
  (field.matrixRows || []).forEach((row, i) => {
    html += `<div style="display:flex;gap:6px;align-items:center;">
      <span style="min-width:24px;font-weight:600;color:var(--slate-600);">${i+1}</span>
      <input type="text" value="${esc(row.label)}" style="flex:1;" onchange="updateMatrixRow(${i},this.value)">
      <button onclick="removeMatrixRow(${i})" style="background:none;border:none;cursor:pointer;color:var(--danger);">✕</button>
    </div>`;
  });
  
  html += `</div></div>`;

  // עמודות
  html += `<div class="field-group">
    <label style="display:flex;justify-content:space-between;align-items:center;">
      <span>עמודות (${field.matrixColumns?.length || 0})</span>
      <button class="btn btn-sm btn-outline" onclick="addMatrixColumn()">+ הוסף עמודה</button>
    </label>
    <div style="display:flex;flex-direction:column;gap:6px;margin-top:8px;">`;
  
  (field.matrixColumns || []).forEach((col, i) => {
    html += `<div style="display:flex;gap:6px;align-items:center;">
      <span style="min-width:24px;font-weight:600;color:var(--slate-600);">${i+1}</span>
      <input type="text" value="${esc(col.label)}" style="flex:1;" onchange="updateMatrixColumn(${i},this.value)">
      <button onclick="removeMatrixColumn(${i})" style="background:none;border:none;cursor:pointer;color:var(--danger);">✕</button>
    </div>`;
  });
  
  html += `</div></div>`;

  return html;
}

function updateMatrixType(type) {
  const f = getCurrentField(); if(!f) return;
  f.matrixType = type;
  save();
}

function addMatrixRow() {
  const f = getCurrentField(); if(!f) return;
  if (!f.matrixRows) f.matrixRows = [];
  f.matrixRows.push({id: uuid(), label: `שורה ${f.matrixRows.length + 1}`});
  save();
  renderProps();
}

function updateMatrixRow(idx, label) {
  const f = getCurrentField(); if(!f) return;
  f.matrixRows[idx].label = label;
  save();
}

function removeMatrixRow(idx) {
  const f = getCurrentField(); if(!f) return;
  f.matrixRows.splice(idx, 1);
  save();
  renderProps();
}

function addMatrixColumn() {
  const f = getCurrentField(); if(!f) return;
  if (!f.matrixColumns) f.matrixColumns = [];
  f.matrixColumns.push({id: uuid(), label: `עמודה ${f.matrixColumns.length + 1}`, value: `col${f.matrixColumns.length + 1}`});
  save();
  renderProps();
}

function updateMatrixColumn(idx, label) {
  const f = getCurrentField(); if(!f) return;
  f.matrixColumns[idx].label = label;
  f.matrixColumns[idx].value = label.toLowerCase().replace(/\s+/g, '_');
  save();
}

function removeMatrixColumn(idx) {
  const f = getCurrentField(); if(!f) return;
  f.matrixColumns.splice(idx, 1);
  save();
  renderProps();
}

function closeProps() { selectedFieldId = null; document.getElementById('propsPanel').style.display = 'none'; renderFields(); }

// ===== Settings =====
function toggleSettings() {
  const panel = document.getElementById('settingsPanel');
  const visible = panel.style.display !== 'none';
  panel.style.display = visible ? 'none' : 'block';
  if (!visible) {
    document.getElementById('setTitle').value = form.settings.title;
    document.getElementById('setDesc').value = form.settings.description || '';
    document.getElementById('setColor').value = form.settings.theme.primaryColor;
    document.getElementById('setMsg').value = form.settings.submitMessage;
    document.getElementById('setStatus').value = form.status;
    renderColorPalettes();
  }
}

function renderColorPalettes() {
  const palettes = [
    { name: 'כחול מקצועי', colors: ['#2563eb', '#1e40af', '#3b82f6', '#60a5fa', '#dbeafe'] },
    { name: 'ירוק טבעי', colors: ['#16a34a', '#15803d', '#22c55e', '#4ade80', '#dcfce7'] },
    { name: 'סגול יצירתי', colors: ['#9333ea', '#7e22ce', '#a855f7', '#c084fc', '#f3e8ff'] },
    { name: 'כתום חם', colors: ['#ea580c', '#c2410c', '#f97316', '#fb923c', '#fff7ed'] },
    { name: 'אדום אנרגטי', colors: ['#dc2626', '#b91c1c', '#ef4444', '#f87171', '#fee2e2'] },
    { name: 'טורקיז רענן', colors: ['#0891b2', '#0e7490', '#06b6d4', '#22d3ee', '#cffafe'] },
    { name: 'ורוד עדין', colors: ['#db2777', '#be185d', '#ec4899', '#f472b6', '#fce7f3'] },
    { name: 'אפור אלגנטי', colors: ['#475569', '#334155', '#64748b', '#94a3b8', '#f1f5f9'] }
  ];

  const container = document.getElementById('colorPalettes');
  if (!container) return;

  container.innerHTML = palettes.map((palette, idx) => `
    <div class="palette-item" onclick="applyColorPalette(${idx})">
      <div class="palette-name">${palette.name}</div>
      <div class="palette-colors">
        ${palette.colors.map(color => `<div class="palette-color" style="background:${color}"></div>`).join('')}
      </div>
    </div>
  `).join('');
}

function applyColorPalette(idx) {
  const palettes = [
    { name: 'כחול מקצועי', primary: '#2563eb', secondary: '#1e40af', accent: '#3b82f6', light: '#dbeafe', text: '#1e293b' },
    { name: 'ירוק טבעי', primary: '#16a34a', secondary: '#15803d', accent: '#22c55e', light: '#dcfce7', text: '#14532d' },
    { name: 'סגול יצירתי', primary: '#9333ea', secondary: '#7e22ce', accent: '#a855f7', light: '#f3e8ff', text: '#581c87' },
    { name: 'כתום חם', primary: '#ea580c', secondary: '#c2410c', accent: '#f97316', light: '#fff7ed', text: '#7c2d12' },
    { name: 'אדום אנרגטי', primary: '#dc2626', secondary: '#b91c1c', accent: '#ef4444', light: '#fee2e2', text: '#7f1d1d' },
    { name: 'טורקיז רענן', primary: '#0891b2', secondary: '#0e7490', accent: '#06b6d4', light: '#cffafe', text: '#164e63' },
    { name: 'ורוד עדין', primary: '#db2777', secondary: '#be185d', accent: '#ec4899', light: '#fce7f3', text: '#831843' },
    { name: 'אפור אלגנטי', primary: '#475569', secondary: '#334155', accent: '#64748b', light: '#f1f5f9', text: '#1e293b' }
  ];

  const palette = palettes[idx];
  form.settings.theme = {
    ...form.settings.theme,
    primaryColor: palette.primary,
    secondaryColor: palette.secondary,
    accentColor: palette.accent,
    lightColor: palette.light,
    textColor: palette.text
  };
  
  save();
  document.getElementById('setColor').value = palette.primary;
  alert(`פלטת הצבעים "${palette.name}" הוחלה בהצלחה!`);
}

function updateSetting(key, value) {
  if (key === 'title') { form.settings.title = value; document.getElementById('formTitle').value = value; }
  else if (key === 'description') form.settings.description = value;
  else if (key === 'color') form.settings.theme.primaryColor = value;
  else if (key === 'submitMessage') form.settings.submitMessage = value;
  else if (key === 'status') { form.status = value; renderAll(); }
  save();
}

function togglePublish() {
  form.status = form.status === 'published' ? 'draft' : 'published';
  save(); renderAll();
}

// ===== Preview =====
function togglePreview() {
  const modal = document.getElementById('previewModal');
  const visible = modal.style.display !== 'none';
  modal.style.display = visible ? 'none' : 'flex';
  if (!visible) renderPreview();
}

function renderPreview() {
  const page = form.pages[0];
  let html = `<h2 style="margin-bottom:8px;">${esc(form.settings.title)}</h2>`;
  if (form.settings.description) html += `<p style="color:var(--slate-500);margin-bottom:24px;">${esc(form.settings.description)}</p>`;
  html += `<h3 style="margin-bottom:16px;">${esc(page.title)}</h3><div style="display:flex;flex-direction:column;gap:16px;">`;
  page.fields.forEach(f => {
    html += `<div><label style="font-weight:600;display:block;margin-bottom:6px;">${esc(f.label)}${f.required?'<span style="color:var(--danger);"> *</span>':''}</label>`;
    if (['text','email','phone'].includes(f.type)) html += `<input type="text" placeholder="${esc(f.placeholder||'')}" style="width:100%;padding:10px;border:1px solid var(--slate-300);border-radius:8px;">`;
    else if (f.type === 'number') html += `<input type="number" style="width:100%;padding:10px;border:1px solid var(--slate-300);border-radius:8px;">`;
    else if (f.type === 'textarea') html += `<textarea rows="3" style="width:100%;padding:10px;border:1px solid var(--slate-300);border-radius:8px;"></textarea>`;
    else if (f.type === 'date') html += `<input type="date" style="width:100%;padding:10px;border:1px solid var(--slate-300);border-radius:8px;">`;
    else if (f.type === 'select') html += `<select style="width:100%;padding:10px;border:1px solid var(--slate-300);border-radius:8px;"><option>בחר...</option>${(f.options||[]).map(o=>`<option>${esc(o.label)}</option>`).join('')}</select>`;
    else if (f.type === 'radio') html += (f.options||[]).map(o=>`<label style="display:flex;gap:8px;align-items:center;margin-bottom:6px;"><input type="radio" name="${f.id}"> ${esc(o.label)}</label>`).join('');
    else if (f.type === 'checkbox') html += (f.options||[]).map(o=>`<label style="display:flex;gap:8px;align-items:center;margin-bottom:6px;"><input type="checkbox"> ${esc(o.label)}</label>`).join('');
    else if (f.type === 'rating') html += `<div style="display:flex;gap:8px;">${(f.options||[]).map((o,i)=>`<div style="min-width:70px;padding:8px;border:2px solid var(--slate-200);border-radius:8px;display:flex;flex-direction:column;align-items:center;justify-content:center;"><div style="font-size:16px;font-weight:700;">${i+1}</div><div style="font-size:10px;margin-top:2px;">${esc(o.label)}</div></div>`).join('')}</div>`;
    else if (f.type === 'signature') html += `<div style="border:2px dashed var(--slate-300);border-radius:8px;height:100px;display:flex;align-items:center;justify-content:center;color:var(--slate-400);">✍️ אזור חתימה</div>`;
    else if (f.type === 'calculation') html += `<div style="background:#faf5ff;border:1px solid #c4b5fd;border-radius:8px;padding:16px;text-align:center;color:#6d28d9;">🧮 ${esc(f.calculation?.formula||'לא הוגדר')}</div>`;
    else if (f.type === 'divider') html += '<hr>';
    else if (f.type === 'heading') html += `<h3>${esc(f.label)}</h3>`;
    else if (f.type === 'matrix') {
      html += `<div class="matrix-wrapper"><table class="matrix-table" style="width:100%;border-collapse:collapse;">
        <thead><tr><th></th>${(f.matrixColumns||[]).map(c=>`<th style="padding:8px;border-bottom:2px solid var(--slate-200);text-align:center;">${esc(c.label)}</th>`).join('')}</tr></thead>
        <tbody>${(f.matrixRows||[]).map(r=>`<tr><td style="padding:8px;border-bottom:1px solid var(--slate-100);font-weight:500;">${esc(r.label)}</td>${(f.matrixColumns||[]).map(()=>`<td style="padding:8px;border-bottom:1px solid var(--slate-100);text-align:center;"><input type="${f.matrixType||'radio'}" disabled></td>`).join('')}</tr>`).join('')}</tbody>
      </table></div>`;
    }
    else html += `<div style="color:var(--slate-400);">(${f.type})</div>`;
    html += '</div>';
  });
  html += '</div>';
  document.getElementById('previewContent').innerHTML = html;
}

// ===== Save =====
async function save() {
  clearTimeout(saveTimeout);
  saveTimeout = setTimeout(async () => {
    const res = await fetch(`${API}/forms.php?action=update&id=${form.id}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form)
    });
    const json = await res.json();
    if (json.success) {
      form = json.data;
      const status = document.getElementById('saveStatus');
      status.style.display = 'inline';
      setTimeout(() => status.style.display = 'none', 2000);
    }
  }, 500);
}

// ===== Helpers =====
function uuid() { return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => { const r = Math.random()*16|0; return (c==='x'?r:(r&0x3|0x8)).toString(16); }); }
function esc(s) { if(!s) return ''; const d = document.createElement('div'); d.textContent = s; return d.innerHTML; }

// Init
init();
