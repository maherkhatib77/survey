/**
 * Filler - מילוי טופס (ציבורי)
 */
let form = null;
let currentPage = 0;
let values = {};
let signatures = {};
let errors = {};
let loadedSources = {}; // מטמון גלובלי לרשומות ממאגרים

async function init() {
  await loadSampleData();
  const id = getParam('id');
  if (!id) { window.location.href = 'index.html'; return; }

  // מצב עריכת תגובה קיימת (נפתח מדוחות → ✏️ ערוך): edit=<responseId>
  const editRid = getParam('edit');
  if (editRid) {
    try {
      await editExistingResponse(id, editRid);
    } catch (e) {
      console.error('Edit mode failed:', e);
      alert('שגיאה בטעינת התגובה לעריכה: ' + e.message);
      window.location.href = `admin/reports.html?id=${encodeURIComponent(id)}`;
    }
    return;
  }

  form = await fetchForm(id);
  if (!form) {
    document.getElementById('formContent').innerHTML = `
      <div style="text-align:center;padding:60px;">
        <div style="font-size:64px;margin-bottom:16px;">❌</div>
        <h2 style="margin-bottom:8px;">הסקר לא נמצא</h2>
        <p style="color:var(--slate-500);margin-bottom:24px;">ייתכן שהסקר אינו פעיל או שנמחק</p>
        <a href="index.html" class="btn btn-primary">العودة إلى قائمة الاستبيانات</a>
      </div>`;
    return;
  }
  
  // טעינה מוקדמת של כל המאגרים
  await preloadAllSources();
  
  render();
}

function render() {
  const page = form.pages[currentPage];
  const total = form.pages.length;
  const progress = ((currentPage + 1) / total) * 100;

  document.getElementById('progressBar').style.width = progress + '%';
  document.getElementById('pageInfo').textContent = `صفحة ${currentPage + 1} من ${total}`;

  let html = '';
  if (currentPage === 0) {
    html += `<div style="text-align:center;margin-bottom:40px;">
      <h1 class="filler-title">${esc(form.settings.title)}</h1>
      ${form.settings.description ? `<p class="filler-desc">${esc(form.settings.description)}</p>` : ''}
    </div>`;
  }
  if (total > 1) {
    html += `<h2 class="page-title">${esc(page.title)}</h2>`;
  }
  html += '<div style="display:flex;flex-direction:column;gap:24px;">';
  page.fields.forEach(field => {
    if (!isFieldVisible(field)) return;
    html += renderField(field);
  });
  html += '</div>';
  html += `<div class="filler-nav">
    <button class="btn btn-outline" onclick="prevPage()" ${currentPage === 0 ? 'disabled style="opacity:0.5;"' : ''}>→ السابق</button>`;
  if (currentPage < total - 1) html += `<button class="btn btn-primary" onclick="nextPage()">التالي ←</button>`;
  else html += `<button class="btn btn-success btn-lg" onclick="submitForm()">✓ إرسال الاستبيان</button>`;
  html += '</div>';

  document.getElementById('formContent').innerHTML = html;
  page.fields.filter(f => f.type === 'signature').forEach(f => initSignature(f.id));
}

function renderField(field) {
  const val = values[field.id];
  const err = errors[field.id];
  const req = field.required ? '<span class="required">*</span>' : '';
  let html = `<div class="filler-field ${err ? 'has-error' : ''}" id="field-${field.id}">`;
  html += `<label>${esc(field.label)} ${req}</label>`;
  if (field.helpText) html += `<div class="help-text">${esc(field.helpText)}</div>`;

  switch (field.type) {
    case 'text': case 'email': case 'phone':
      html += `<input type="${field.type === 'phone' ? 'tel' : field.type}" value="${esc(val || '')}" placeholder="${esc(field.placeholder || '')}" onchange="setValue('${field.id}', this.value)">`;
      break;
    case 'number':
      html += `<input type="number" value="${esc(val || '')}" placeholder="${esc(field.placeholder || '')}" onchange="setValue('${field.id}', this.value)">`;
      break;
    case 'textarea':
      html += `<textarea rows="4" placeholder="${esc(field.placeholder || '')}" onchange="setValue('${field.id}', this.value)">${esc(val || '')}</textarea>`;
      break;
    case 'richtext':
      html += `<div class="rte-toolbar">
        <button onclick="execRTE('${field.id}','bold')"><b>B</b></button>
        <button onclick="execRTE('${field.id}','italic')"><i>I</i></button>
        <button onclick="execRTE('${field.id}','underline')"><u>U</u></button>
      </div><div class="rte-content" contenteditable="true" id="rte-${field.id}" oninput="setValue('${field.id}', this.innerHTML)">${val || ''}</div>`;
      break;
    case 'date':
      html += `<input type="date" value="${esc(val || '')}" onchange="setValue('${field.id}', this.value)">`;
      break;
    case 'select':
      html += `<select onchange="handleSelectChange('${field.id}', this.value, ${field.enableOther || false})">
        <option value="">اختر...</option>
        ${(field.options || []).map(o => `<option value="${esc(o.value)}" ${val === o.value ? 'selected' : ''}>${esc(o.label)}</option>`).join('')}
        ${field.enableOther ? `<option value="__other__" ${val === '__other__' ? 'selected' : ''}>${esc(field.otherLabel || 'أخرى - حدد')}</option>` : ''}
      </select>`;
      if (field.enableOther && val === '__other__') {
        const otherValue = values[`${field.id}_other`] || '';
        html += `<input type="text" 
               value="${esc(otherValue)}" 
               placeholder="حدد..." 
               onchange="setOtherValue('${field.id}', this.value)"
               style="margin-top:8px;width:100%;padding:10px;border:2px solid var(--slate-200);border-radius:8px;">`;
      }
      break;
    case 'radio':
      html += '<div class="option-list">';
      (field.options || []).forEach(o => {
        html += `<label class="option-item ${val === o.value ? 'selected' : ''}" onclick="setValue('${field.id}','${esc(o.value)}')">
          <input type="radio" name="${field.id}" ${val === o.value ? 'checked' : ''}><span>${esc(o.label)}</span></label>`;
      });
      if (field.enableOther) {
        const otherValue = values[`${field.id}_other`];
        const isOtherSelected = val === '__other__' || otherValue !== undefined;
        html += `<label class="option-item ${isOtherSelected ? 'selected' : ''}" onclick="toggleRadioOther('${field.id}')">
          <input type="radio" name="${field.id}" ${isOtherSelected ? 'checked' : ''}><span>${esc(field.otherLabel || 'أخرى - حدد')}</span></label>`;
        if (isOtherSelected) {
          html += `<input type="text" 
                 value="${esc(otherValue || '')}" 
                 placeholder="ציין..." 
                 onchange="setOtherValue('${field.id}', this.value)"
                 style="margin-top:8px;width:100%;padding:10px;border:2px solid var(--slate-200);border-radius:8px;">`;
        }
      }
      html += '</div>';
      break;
    case 'checkbox':
      const arr = val || [];
      const maxSel = field.maxSelections || 0;
      const isMaxReached = maxSel > 0 && arr.length >= maxSel;
      
      if (maxSel > 0) {
        html += `<div style="font-size:13px;color:${isMaxReached ? 'var(--danger)' : 'var(--slate-500)'};margin-bottom:8px;font-weight:500;">
          ${isMaxReached ? '⚠️' : 'ℹ️'} تم تحديد ${arr.length} من ${maxSel} خيارات
        </div>`;
      }
      
      html += '<div class="option-list">';
      (field.options || []).forEach(o => {
        const checked = arr.includes(o.value);
        const disabled = isMaxReached && !checked;
        html += `<label class="option-item ${checked ? 'selected' : ''} ${disabled ? 'disabled' : ''}" 
                        onclick="${disabled ? '' : `toggleCheckbox('${field.id}','${esc(o.value)}')`}"
                        style="${disabled ? 'opacity:0.5;cursor:not-allowed;' : ''}">
          <input type="checkbox" ${checked ? 'checked' : ''} ${disabled ? 'disabled' : ''}><span>${esc(o.label)}</span></label>`;
      });
      if (field.enableOther) {
        const otherValue = values[`${field.id}_other`];
        const isOtherChecked = otherValue !== undefined;
        const otherDisabled = isMaxReached && !isOtherChecked;
        html += `<label class="option-item ${isOtherChecked ? 'selected' : ''} ${otherDisabled ? 'disabled' : ''}" 
                        onclick="${otherDisabled ? '' : `toggleCheckboxOther('${field.id}')`}"
                        style="${otherDisabled ? 'opacity:0.5;cursor:not-allowed;' : ''}">
          <input type="checkbox" ${isOtherChecked ? 'checked' : ''} ${otherDisabled ? 'disabled' : ''}><span>${esc(field.otherLabel || 'أخرى - حدد')}</span></label>`;
        if (isOtherChecked) {
          html += `<input type="text" 
                 value="${esc(otherValue || '')}" 
                 placeholder="ציין..." 
                 onchange="setOtherValue('${field.id}', this.value)"
                 style="margin-top:8px;width:100%;padding:10px;border:2px solid var(--slate-200);border-radius:8px;">`;
        }
      }
      html += '</div>';
      break;
    case 'rating':
      html += '<div class="rating-group">';
      (field.options || []).forEach((o, i) => {
        html += `<button class="rating-btn ${val === o.value ? 'selected' : ''}" onclick="setValue('${field.id}','${esc(o.value)}')" title="${esc(o.label)}">
          <div style="font-size:18px;font-weight:700;">${i + 1}</div>
          <div style="font-size:10px;margin-top:2px;white-space:nowrap;">${esc(o.label)}</div>
        </button>`;
      });
      html += '</div>';
      break;
    case 'signature':
      html += `<div class="signature-area">
        <canvas id="sig-${field.id}" width="600" height="180"></canvas>
        <div class="signature-placeholder" id="sig-placeholder-${field.id}">وقّع هنا ✍️</div>
      </div><button class="signature-clear" onclick="clearSignature('${field.id}')">🗑️ נקה חתימה</button>`;
      break;
    case 'file':
      html += `<div style="border:2px dashed var(--slate-300);border-radius:var(--radius);padding:32px;text-align:center;">
        <div style="font-size:36px;margin-bottom:8px;">📎</div>
        <p style="color:var(--slate-500);">اسحب الملفات أو انقر للاختيار</p>
        <input type="file" style="margin-top:12px;" onchange="setValue('${field.id}', this.files[0]?.name)"></div>`;
      break;
    case 'calculation':
      const calcVal = evaluateCalc(field.calculation?.formula || '0', values);
      html += `<div class="calc-display"><div class="calc-label">🧮 תוצאת חישוב</div><div class="calc-value">${calcVal.toFixed(2)}</div></div>`;
      break;
    case 'divider':
      html = '<hr style="margin:16px 0;border:none;border-top:1px solid var(--slate-200);">';
      break;
    case 'heading':
      html = `<h3 style="font-size:20px;font-weight:700;">${esc(field.label)}</h3>`;
      break;
    case 'record':
      html += renderRecordField(field);
      break;
    case 'matrix':
      html += renderMatrixField(field);
      break;
    default:
      html += `<div style="color:var(--slate-400);">(${field.type})</div>`;
  }
  if (err) html += `<div class="field-error">⚠️ ${esc(err)}</div>`;
  html += '</div>';
  return html;
}

function isFieldVisible(field) {
  if (!field.conditionalLogic) return true;
  const result = checkLogic(field.conditionalLogic, values);
  if (field.conditionalLogic.action === 'show') return result;
  if (field.conditionalLogic.action === 'hide') return !result;
  return true;
}

function setValue(id, value) { 
  values[id] = value; 
  if (errors[id]) { delete errors[id]; }
  render(); 
}
function toggleCheckbox(id, value) { 
  const field = form.pages.flatMap(p => p.fields).find(f => f.id === id);
  const arr = values[id] || []; 
  
  // אם מנסים להוסיף ובדק אם יש מקסימום
  if (!arr.includes(value) && field && field.maxSelections > 0) {
    if (arr.length >= field.maxSelections) {
      alert(`❌ يمكن اختيار ${field.maxSelections} خيارات فقط`);
      return;
    }
  }
  
  values[id] = arr.includes(value) ? arr.filter(v => v !== value) : [...arr, value]; 
  render();
}

function handleSelectChange(id, value, enableOther) {
  if (enableOther && value === '__other__') {
    values[id] = '__other__';
    values[`${id}_other`] = '';
  } else {
    values[id] = value;
    delete values[`${id}_other`];
  }
  render();
}

function toggleRadioOther(id) {
  const otherValue = values[`${id}_other`];
  if (otherValue !== undefined) {
    // כבר מסומן, בטל
    values[id] = '';
    delete values[`${id}_other`];
  } else {
    // סמן
    values[id] = '__other__';
    values[`${id}_other`] = '';
  }
  render();
}

function toggleCheckboxOther(id) {
  const field = form.pages.flatMap(p => p.fields).find(f => f.id === id);
  const otherValue = values[`${id}_other`];
  const arr = values[id] || [];
  
  if (otherValue !== undefined) {
    // כבר מסומן, בטל
    delete values[`${id}_other`];
  } else {
    // בדוק אם יש מקסימום
    if (field && field.maxSelections > 0 && arr.length >= field.maxSelections) {
      alert(`❌ يمكن اختيار ${field.maxSelections} خيارات فقط`);
      return;
    }
    // סמן
    values[`${id}_other`] = '';
  }
  render();
}

// ===== מצב עריכה (דוחות → ✏️ ערוך): שימוש באותו טופס מקורי לעריכת תגובה קיימת =====
window.__editMode = false;
window.__editResponseId = null;

// הרכבת אובייקט "record" מלא מתוך ערכי שדות רגילים — נחוץ כדי ששדות
// מסוג record יציגו נכון את הרשומה שנבחרה במקור (גם אם אינה קיימת במאגר כעת)
function buildRecordFromFields(allFields, vals) {
  const rec = {};
  allFields.forEach(f => {
    if (!f.autoFill || !f.sourceId) return;
    f.autoFill.forEach(m => {
      if (m.targetField && m.sourceField && vals[m.targetField] !== undefined && vals[m.targetField] !== '') {
        rec[m.sourceField] = vals[m.targetField];
      }
    });
  });
  return Object.keys(rec).length ? rec : null;
}

// נרמול מטריצה: fill.js משתמש ב-matrixRows/matrixColumns; שמות ישנים rows/columns
// וכן matrixCols מהעורך הישן — ממירים למבנה התקין [{id,label,value}]
function normalizeMatrixField(field) {
  if (!field || field.type !== 'matrix') return;
  const toObj = (x, prefix, i) => {
    if (x && typeof x === 'object') {
      const label = String(x.label ?? x.value ?? '');
      return { id: String(x.id ?? x.value ?? (prefix + '_' + i)), label, value: String(x.value ?? x.id ?? label) };
    }
    const s = String(x ?? '');
    return { id: prefix + '_' + i, label: s, value: s };
  };
  if ((!field.matrixRows || !field.matrixRows.length)) {
    const src = (field.rows && field.rows.length) ? field.rows
      : ((field.options && field.options.length && !(field.matrixColumns || field.columns)) ? field.options : null);
    if (src) field.matrixRows = src.map((r, i) => toObj(r, 'row', i));
  } else {
    field.matrixRows = field.matrixRows.map((r, i) => toObj(r, 'row', i));
  }
  if ((!field.matrixColumns || !field.matrixColumns.length)) {
    const src = (field.columns && field.columns.length) ? field.columns : (field.matrixCols && field.matrixCols.length ? field.matrixCols : null);
    if (src) field.matrixColumns = src.map((c, i) => toObj(c, 'col', i));
  } else {
    field.matrixColumns = field.matrixColumns.map((c, i) => toObj(c, 'col', i));
  }
  if (!Array.isArray(field.matrixRows)) field.matrixRows = [];
  if (!Array.isArray(field.matrixColumns)) field.matrixColumns = [];
}

async function editExistingResponse(formId, responseId) {
  // טעינת הטופס המלא דרך API מוגן (מופעל רק מדפי ניהול)
  const res = await fetch(`${API_BASE}/forms.php?action=get&id=` + encodeURIComponent(formId), { credentials: 'same-origin' });
  const json = await res.json();
  if (!json.success || !json.data) throw new Error('forms get failed');
  form = json.data;
  (form.pages || []).forEach(p => (p.fields || []).forEach(normalizeMatrixField));

  // טעינת מאגרים לרשומות
  await preloadAllSources();

  // שליפת כל התגובות ומציאת הרשומה הנערכת
  const rres = await fetch(`${API_BASE}/responses.php?action=list&formId=` + encodeURIComponent(formId), { credentials: 'same-origin' });
  const rjson = await rres.json();
  if (!rjson.success) throw new Error('responses list failed');
  const target = (rjson.data || []).find(x => x.id === responseId);
  if (!target) throw new Error('response not found');

  // טעינת הערכים השמורים לתוך state המילוי
  values = JSON.parse(JSON.stringify(target.data || {}));
  signatures = {};
  errors = {};
  currentPage = 0;

  // שחזור חתימות: הצגת התמונה השמורה
  (form.pages || []).flatMap(p => p.fields).forEach(f => {
    if (f.type === 'signature' && typeof values[f.id] === 'string' && values[f.id].startsWith('data:image')) {
      signatures[f.id] = values[f.id];
    }
  });

  // שחזור רשומות מלאות (single) בשדות record — כולל בנייה מהערכים המפוזים
  const allF = (form.pages || []).flatMap(p => p.fields);
  const fallbackRec = buildRecordFromFields(allF, values);
  allF.forEach(f => {
    if (f.type !== 'record' || !f.sourceId) return;
    if (values[`${f.id}_record`]) return; // כבר שמור במבנה המקורי
    const df = f.displayField || '';
    const v = values[f.id];
    if (f.recordSelectionType === 'multiple') return;
    if (v && typeof v === 'string') {
      const recs = loadedSources[f.sourceId] || [];
      const found = recs.find(r => String(r[df] ?? '') === v) || fallbackRec;
      if (found) values[`${f.id}_record`] = found;
    }
  });

  window.__editMode = true;
  window.__editResponseId = responseId;

  render();
  // החלפת כפתור השליחה לכפתור שמירת עריכה
  setTimeout(() => {
    const nav = document.querySelector('.filler-nav');
    if (nav) {
      const sendBtn = nav.querySelector('.btn-success');
      if (sendBtn) {
        sendBtn.textContent = '💾 שמור שינויים';
        sendBtn.classList.remove('btn-success');
        sendBtn.classList.add('btn-primary');
        sendBtn.onclick = saveEditChanges;
      }
    }
  }, 50);
}

async function saveEditChanges() {
  if (!validatePage()) return;
  const btn = document.querySelector('.filler-nav .btn-primary');
  if (btn) { btn.disabled = true; btn.textContent = '⏳ שומר...'; }
  try {
    const out = await FBAuth.writeRequest(`${API_BASE}/responses.php?action=update&formId=${encodeURIComponent(form.id)}`, {
      method: 'POST',
      body: JSON.stringify({ responseId: window.__editResponseId, data: values })
    });
    if (out && out.success) {
      alert('✅ התגובה עודכנה בהצלחה');
      if (document.referrer && /reports\.html/.test(document.referrer)) {
        window.location.href = document.referrer;
      } else {
        window.location.href = `admin/reports.html?id=${encodeURIComponent(form.id)}`;
      }
    } else {
      alert('❌ ' + ((out && out.error) || 'העדכון נכשל'));
      if (btn) { btn.disabled = false; btn.textContent = '💾 שמור שינויים'; }
    }
  } catch (e) {
    console.error('saveEditChanges error:', e);
    alert('❌ שגיאה בשמירת העריכה');
    if (btn) { btn.disabled = false; btn.textContent = '💾 שמור שינויים'; }
  }
}

function execRTE(id, cmd) { document.execCommand(cmd, false, null); const el = document.getElementById(`rte-${id}`); if (el) values[id] = el.innerHTML; }

function initSignature(fieldId) {
  const canvas = document.getElementById(`sig-${fieldId}`);
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  let drawing = false;
  function getPos(e) {
    const rect = canvas.getBoundingClientRect();
    const x = (e.touches ? e.touches[0].clientX : e.clientX) - rect.left;
    const y = (e.touches ? e.touches[0].clientY : e.clientY) - rect.top;
    return { x: x * (canvas.width / rect.width), y: y * (canvas.height / rect.height) };
  }
  function start(e) { e.preventDefault(); drawing = true; const p = getPos(e); ctx.beginPath(); ctx.moveTo(p.x, p.y); document.getElementById(`sig-placeholder-${fieldId}`).style.display = 'none'; }
  function draw(e) { if (!drawing) return; e.preventDefault(); const p = getPos(e); ctx.lineTo(p.x, p.y); ctx.strokeStyle = '#1e293b'; ctx.lineWidth = 2; ctx.lineCap = 'round'; ctx.stroke(); }
  function stop() { if (drawing) { drawing = false; signatures[fieldId] = canvas.toDataURL(); } }
  canvas.addEventListener('mousedown', start); canvas.addEventListener('mousemove', draw); canvas.addEventListener('mouseup', stop); canvas.addEventListener('mouseleave', stop);
  canvas.addEventListener('touchstart', start); canvas.addEventListener('touchmove', draw); canvas.addEventListener('touchend', stop);
}

function clearSignature(fieldId) {
  const canvas = document.getElementById(`sig-${fieldId}`);
  if (canvas) canvas.getContext('2d').clearRect(0, 0, canvas.width, canvas.height);
  delete signatures[fieldId];
  const ph = document.getElementById(`sig-placeholder-${fieldId}`);
  if (ph) ph.style.display = 'flex';
}

function validatePage() {
  const page = form.pages[currentPage];
  errors = {};
  let valid = true;
  page.fields.forEach(field => {
    if (!isFieldVisible(field)) return;
    if (field.type === 'signature') {
      if (field.required && !signatures[field.id]) { errors[field.id] = 'يجب التوقيع'; valid = false; }
      return;
    }
    if (field.required && (!values[field.id] || values[field.id] === '')) { errors[field.id] = 'حقل مطلوب'; valid = false; return; }
    // מטריצה: ודא שכל השורות סומנו (גם אם "חובה" אינה מוגדרת במיפוי ה-validation)
    if (field.type === 'matrix') {
      const mErr = validateMatrix(field);
      if (mErr) { errors[field.id] = mErr; valid = false; return; }
    }
    const err = validateField(field, values[field.id]);
    if (err) { errors[field.id] = err; valid = false; }
  });
  if (!valid) {
    render();
    scrollToFirstError();
  }
  return valid;
}

// בדיקת מטריצה: כל שורה חייבת להיות מסומנת (radio/checkbox)
function validateMatrix(field) {
  const rows = field.matrixRows || [];
  const cols = field.matrixColumns || [];
  if (!rows.length || !cols.length) return null;
  const mv = values[field.id];
  const isReq = field.required === true;
  const answered = [];
  const unanswered = [];
  rows.forEach(row => {
    const v = mv ? mv[row.id] : undefined;
    const filled = Array.isArray(v) ? v.length > 0 : (v !== undefined && v !== null && String(v).trim() !== '');
    if (filled) answered.push(row); else unanswered.push(row);
  });
  if (isReq && unanswered.length === rows.length && rows.length > 0) {
    return 'يجب تقييم جميع البنود في هذا السؤال';
  }
  if (unanswered.length > 0 && (isReq || answered.length > 0)) {
    const names = unanswered.slice(0, 3).map(r => r.label).join('، ');
    return `يجب الإجابة على جميع بنود السؤال — لم يتم تقييم: ${names}${unanswered.length > 3 ? ' …' : ''} (${unanswered.length}/${rows.length})`;
  }
  return null;
}

// גלילה לשדה הראשון עם שגיאה + הדגה
function scrollToFirstError() {
  setTimeout(() => {
    const el = document.querySelector('.filler-field.has-error');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      el.classList.add('error-flash');
      setTimeout(() => el.classList.remove('error-flash'), 1600);
    }
  }, 60);
}

function nextPage() { if (validatePage()) { currentPage++; render(); window.scrollTo(0, 0); } }
function prevPage() { if (currentPage > 0) { currentPage--; render(); window.scrollTo(0, 0); } }

async function submitForm() {
  if (!validatePage()) return;
  const calculatedValues = {};
  form.pages.forEach(p => { p.fields.forEach(f => { if (f.type === 'calculation') calculatedValues[f.id] = evaluateCalc(f.calculation?.formula || '0', values); }); });
  const responseData = { ...values };
  Object.entries(signatures).forEach(([k, v]) => { responseData[k] = v; });
  await submitResponse(form.id, responseData);
  document.getElementById('formContent').innerHTML = `
    <div class="success-screen">
      <div class="icon">✅</div>
      <h2>${esc(form.settings.submitMessage)}</h2>
      <p>תגובתך נרשמה בהצלחה</p>
      <a href="index.html" class="btn btn-primary btn-lg">العودة إلى قائمة الاستبيانات</a>
    </div>`;
}

// ===== Record Field =====

// טעינה מוקדמת של כל המאגרים בשדות
async function preloadAllSources() {
  const allFields = form.pages.flatMap(p => p.fields);
  const recordFields = allFields.filter(f => f.type === 'record' && f.sourceId);
  
  console.log('Preloading sources for fields:', recordFields.length);
  
  // טען כל מאגר פעם אחת
  for (const field of recordFields) {
    if (!loadedSources[field.sourceId]) {
      console.log('Loading source:', field.sourceId, 'for field:', field.id);
      let records = null;

      // נסיון 1: שליאת המאגר המלא עם Cookie של Session (המסלול הרגיל)
      try {
        const res = await fetch(`${API_BASE}/sources.php?action=get&id=${field.sourceId}`, {
          credentials: 'same-origin'
        });
        if (res.ok) {
          const json = await res.json();
          if (json.success && Array.isArray(json.data.records)) {
            records = json.data.records;
          }
        } else {
          console.warn('Source get failed with status', res.status, '– trying public fallback');
        }
      } catch (e) {
        console.warn('Error loading source via get:', e);
      }

      // נסל 2 (fallback): גישה ציבורית לשדות בלבד – עובדת גם כשה-Cookie
      // של ה-Session לא מגיע לשרת (חסימת מעקב/Privacy Badger בסביבת localhost)
      if (records === null) {
        try {
          const res2 = await fetch(`${API_BASE}/sources.php?action=fields&id=${field.sourceId}`);
          if (res2.ok) {
            const json2 = await res2.json();
            if (json2.success && Array.isArray(json2.data.records)) {
              records = json2.data.records;
            }
          }
        } catch (e) {
          console.error('Error loading source via fields fallback:', e);
        }
      }

      if (records !== null) {
        loadedSources[field.sourceId] = records;
        console.log('Loaded', records.length, 'records for source:', field.sourceId);
      } else {
        console.error('Failed to load source:', field.sourceId);
        loadedSources[field.sourceId] = [];
      }
    } else {
      console.log('Source already loaded:', field.sourceId, 'Records:', loadedSources[field.sourceId].length);
    }
  }
}

function renderRecordField(field) {
  if (!field.sourceId) {
    return `<div style="color:var(--warning);padding:12px;background:var(--warning-light);border-radius:8px;">⚠️ هذا الحقل غير مرتبط بقاعدة بيانات</div>`;
  }
  
  const isMultiple = field.recordSelectionType === 'multiple';
  const val = values[field.id];
  const otherValue = values[`${field.id}_other`];
  const enableOther = field.enableOther === true;
  
  // קבל את הרשומות מהמטמון
  const allRecords = loadedSources[field.sourceId] || [];
  
  console.log('Rendering record field:', field.id, 'Source:', field.sourceId, 'Records loaded:', allRecords.length, 'Multiple:', isMultiple);
  
  if (allRecords.length === 0) {
    console.warn('No records loaded for source:', field.sourceId);
  }
  
  if (isMultiple) {
    // בחירה מרובה - dropdown עם checkboxes
    const displayField = field.displayField || Object.keys(allRecords[0] || {})[0];
    const selectedRecords = Array.isArray(val) ? val : [];
    const maxSel = field.maxSelections || 0;
    const isMaxReached = maxSel > 0 && selectedRecords.length >= maxSel;
    
    console.log('renderRecordField (multiple) - field:', field.id, 'val:', val, 'selectedRecords:', selectedRecords);
    
    let html = `<div class="custom-dropdown-wrapper multi-select" id="dropdown-wrapper-${field.id}">`;
    
    // הודעה על מקסימום בחירות
    if (maxSel > 0) {
      html += `<div style="font-size:13px;color:${isMaxReached ? 'var(--danger)' : 'var(--slate-500)'};margin-bottom:8px;font-weight:500;">
        ${isMaxReached ? '⚠️' : 'ℹ️'} تم تحديد ${selectedRecords.length} من ${maxSel} سجلات
      </div>`;
    }
    
    // תיבת ה-dropdown - מציגה את מספר הפריטים שנבחרו
    const selectedCount = selectedRecords.length;
    const displayText = selectedCount > 0 
      ? `${selectedCount} عناصر محددة${maxSel > 0 ? ` / ${maxSel}` : ''}` 
      : 'اختر من القائمة...';
    
    html += `<div class="custom-dropdown-box" onclick="toggleDropdown('${field.id}')">
      <span class="dropdown-display">${esc(displayText)}</span>
      <span class="dropdown-arrow">▼</span>
    </div>`;
    
    // רשימת האפשרויות עם checkboxes
    html += `<div class="custom-dropdown-list multi-select" id="dropdown-list-${field.id}" style="display:none;">
      <input type="text" 
             class="dropdown-search" 
             placeholder="🔍 ابحث..." 
             oninput="filterDropdown('${field.id}', this.value)"
             onclick="event.stopPropagation()">`;
    
    if (allRecords.length > 0) {
      html += `<div class="dropdown-options" id="dropdown-options-${field.id}">`;
      allRecords.forEach((record, idx) => {
        const displayValue = record[displayField] || '';
        const isSelected = selectedRecords.some(selected => 
          JSON.stringify(selected) === JSON.stringify(record)
        );
        
        // הצגת מידע נוסף - כל השדות האחרים
        const otherFields = Object.entries(record)
          .filter(([key]) => key !== displayField)
          .slice(0, 3) // מציג עד 3 שדות נוספים
          .map(([key, value]) => `<div class="record-extra-info">${esc(key)}: ${esc(value)}</div>`)
          .join('');
        
        // השתמש ב-div במקום label כדי למנוע בעיות עם checkbox
        html += `<div class="dropdown-option checkbox-option ${isSelected ? 'selected' : ''}" 
                      onclick="toggleDropdownCheckbox('${field.id}', '${esc(displayValue).replace(/'/g, "\\'")}', event)"
                      data-value="${esc(displayValue)}"
                      data-record='${JSON.stringify(record).replace(/'/g, "&apos;")}'
                      style="cursor:pointer;">
          <input type="checkbox" ${isSelected ? 'checked' : ''} style="pointer-events:none;">
          <div style="flex:1;">
            <div class="option-main">${esc(displayValue)}</div>
            ${otherFields}
            <div class="match-highlight" style="display:none;"></div>
          </div>
        </div>`;
      });
      html += `</div>`;
    } else {
      html += `<div class="dropdown-empty">لا توجد سجلات متاحة</div>`;
    }
    
    html += `</div>`;
    
    // הצגת הפריטים שנבחרו
    if (selectedRecords.length > 0) {
      html += `<div class="selected-tags" id="selected-tags-${field.id}">`;
      selectedRecords.forEach((record, idx) => {
        const displayValue = record[displayField] || '';
        html += `<span class="selected-tag">
          ${esc(displayValue)}
          <button type="button" onclick="removeSelectedTag('${field.id}', ${idx})" class="remove-tag">×</button>
        </span>`;
      });
      html += `</div>`;
    }
    
    // אפשרות "אחר"
    if (enableOther) {
      html += `<div class="other-option-wrapper" style="margin-top:12px;">
        <label class="checkbox-label">
          <input type="checkbox" 
                 ${otherValue !== undefined ? 'checked' : ''} 
                 onchange="toggleOtherOption('${field.id}', this.checked)">
          <span>${esc(field.otherLabel || 'أخرى - حدد')}</span>
        </label>
        ${otherValue !== undefined ? `
          <input type="text" 
                 value="${esc(otherValue)}" 
                 placeholder="ציין..." 
                 onchange="setOtherValue('${field.id}', this.value)"
                 style="margin-top:8px;width:100%;padding:10px;border:2px solid var(--slate-200);border-radius:8px;">
        ` : ''}
      </div>`;
    }
    
    html += `</div>`;
    return html;
  } else {
    // בחירה בודדת - dropdown מותאם אישית
    const displayField = field.displayField || Object.keys(allRecords[0] || {})[0];
    const selectedValue = val || '';
    
    let html = `<div class="custom-dropdown-wrapper" id="dropdown-wrapper-${field.id}">`;
    
    // תיבת ה-dropdown
    html += `<div class="custom-dropdown-box" onclick="toggleDropdown('${field.id}')">
      <span class="dropdown-display">${selectedValue ? esc(selectedValue) : 'اختر من القائمة...'}</span>
      <span class="dropdown-arrow">▼</span>
    </div>`;
    
    // רשימת האפשרויות (נסתרת כברירת מחדל)
    html += `<div class="custom-dropdown-list" id="dropdown-list-${field.id}" style="display:none;">
      <input type="text" 
             class="dropdown-search" 
             placeholder="🔍 ابحث..." 
             oninput="filterDropdown('${field.id}', this.value)"
             onclick="event.stopPropagation()">`;
    
    if (allRecords.length > 0) {
      html += `<div class="dropdown-options" id="dropdown-options-${field.id}">`;
      allRecords.forEach((record, idx) => {
        const displayValue = record[displayField] || '';
        const isSelected = selectedValue === displayValue;
        
        // הצגת מידע נוסף - כל השדות האחרים
        const otherFields = Object.entries(record)
          .filter(([key]) => key !== displayField)
          .slice(0, 3) // מציג עד 3 שדות נוספים
          .map(([key, value]) => `<div class="record-extra-info">${esc(key)}: ${esc(value)}</div>`)
          .join('');
        
        html += `<div class="dropdown-option ${isSelected ? 'selected' : ''}" 
                      onclick="selectDropdownOption('${field.id}', '${esc(displayValue)}', event)"
                      data-value="${esc(displayValue)}"
                      data-record='${JSON.stringify(record).replace(/'/g, "&apos;")}'>
          <div style="flex:1;">
            <div class="option-main">${esc(displayValue)}</div>
            ${otherFields}
            <div class="match-highlight" style="display:none;"></div>
          </div>
        </div>`;
      });
      html += `</div>`;
    } else {
      html += `<div class="dropdown-empty">אין רשומות זמינות</div>`;
    }
    
    html += `</div>`;
    
    // אפשרות "אחר"
    if (enableOther) {
      html += `<div class="other-option-wrapper" style="margin-top:12px;">
        <label class="checkbox-label">
          <input type="checkbox" 
                 ${otherValue !== undefined ? 'checked' : ''} 
                 onchange="toggleOtherOption('${field.id}', this.checked)">
          <span>${esc(field.otherLabel || 'אחר - ציין')}</span>
        </label>
        ${otherValue !== undefined ? `
          <input type="text" 
                 value="${esc(otherValue)}" 
                 placeholder="ציין..." 
                 onchange="setOtherValue('${field.id}', this.value)"
                 style="margin-top:8px;width:100%;padding:10px;border:2px solid var(--slate-200);border-radius:8px;">
        ` : ''}
      </div>`;
    }
    
    html += `</div>`;
    return html;
  }
}



function selectSingleRecord(fieldId, displayValue) {
  const field = form.pages.flatMap(p => p.fields).find(f => f.id === fieldId);
  if (!field || !field.sourceId) return;
  
  // קבל את כל הרשומות מהמטמון
  const allRecords = loadedSources[field.sourceId] || [];
  
  // מצא את הרשומה המתאימה
  const recordField = field.displayField || Object.keys(allRecords[0] || {})[0];
  const record = allRecords.find(r => r[recordField] === displayValue);
  
  if (!record) return;
  
  // שמור את הערך הנבחר
  values[fieldId] = displayValue;
  
  // שמור את הרשומה המלאה למילוי אוטומטי
  values[`${fieldId}_record`] = record;
  
  // מחק ערך "אחר" אם קיים
  delete values[`${fieldId}_other`];
  
  // מילוי אוטומטי של שדות אחרים
  if (field.autoFill && field.autoFill.length > 0) {
    field.autoFill.forEach(mapping => {
      if (mapping.targetField && mapping.sourceField && record[mapping.sourceField]) {
        values[mapping.targetField] = record[mapping.sourceField];
      }
    });
  }
  
  // רענון התצוגה
  render();
}

// ===== Custom Dropdown Functions =====
function toggleDropdown(fieldId) {
  const dropdown = document.getElementById(`dropdown-list-${fieldId}`);
  const allDropdowns = document.querySelectorAll('.custom-dropdown-list');
  
  // סגור את כל ה-dropdowns האחרים
  allDropdowns.forEach(d => {
    if (d.id !== `dropdown-list-${fieldId}`) {
      d.style.display = 'none';
    }
  });
  
  // פתח/סגור את ה-dropdown הנוכחי
  if (dropdown.style.display === 'none') {
    dropdown.style.display = 'block';
    // התמקד בשדה החיפוש
    const searchInput = dropdown.querySelector('.dropdown-search');
    if (searchInput) {
      setTimeout(() => searchInput.focus(), 100);
    }
  } else {
    dropdown.style.display = 'none';
  }
}

function selectDropdownOption(fieldId, value, event) {
  event.stopPropagation();
  
  const field = form.pages.flatMap(p => p.fields).find(f => f.id === fieldId);
  if (!field || !field.sourceId) return;
  
  // קבל את כל הרשומות מהמטמון
  const allRecords = loadedSources[field.sourceId] || [];
  const displayField = field.displayField || Object.keys(allRecords[0] || {})[0];
  const record = allRecords.find(r => r[displayField] === value);
  
  if (!record) return;
  
  // שמור את הערך הנבחר
  values[fieldId] = value;
  values[`${fieldId}_record`] = record;
  
  // מחק ערך "אחר" אם קיים
  delete values[`${fieldId}_other`];
  
  // מילוי אוטומטי של שדות אחרים
  if (field.autoFill && field.autoFill.length > 0) {
    field.autoFill.forEach(mapping => {
      if (mapping.targetField && mapping.sourceField && record[mapping.sourceField]) {
        values[mapping.targetField] = record[mapping.sourceField];
      }
    });
  }
  
  // סגור את ה-dropdown
  const dropdown = document.getElementById(`dropdown-list-${fieldId}`);
  dropdown.style.display = 'none';
  
  // רענון התצוגה
  render();
}

function toggleDropdownCheckbox(fieldId, displayValue, event) {
  console.log('toggleDropdownCheckbox called with:', fieldId, displayValue);
  event.stopPropagation();
  
  const field = form.pages.flatMap(p => p.fields).find(f => f.id === fieldId);
  if (!field || !field.sourceId) {
    console.error('Field not found:', fieldId);
    return;
  }
  
  const allRecords = loadedSources[field.sourceId] || [];
  const displayField = field.displayField || Object.keys(allRecords[0] || {})[0];
  
  // מצא את הרשומה לפי הערך המוצג
  const record = allRecords.find(r => r[displayField] === displayValue);
  
  if (!record) {
    console.error('Record not found for value:', displayValue);
    console.log('Available records:', allRecords.map(r => r[displayField]));
    return;
  }
  
  console.log('Found record:', record);
  
  // אתחול array אם לא קיים
  if (!Array.isArray(values[fieldId])) {
    values[fieldId] = [];
    console.log('Initialized array for field:', fieldId);
  }
  
  // בדוק אם הרשומה כבר נבחרה
  const existingIndex = values[fieldId].findIndex(selected => 
    JSON.stringify(selected) === JSON.stringify(record)
  );
  
  console.log('Existing index:', existingIndex, 'Current values:', values[fieldId]);
  
  if (existingIndex >= 0) {
    // הסר את הרשומה
    values[fieldId].splice(existingIndex, 1);
    console.log('Removed record:', displayValue, 'Total selected:', values[fieldId].length);
  } else {
    // בדוק אם יש מקסימום בחירות
    if (field.maxSelections > 0 && values[fieldId].length >= field.maxSelections) {
      alert(`❌ يمكن اختيار ${field.maxSelections} سجلات فقط`);
      return;
    }
    // הוסף את הרשומה
    values[fieldId].push(record);
    console.log('Added record:', displayValue, 'Total selected:', values[fieldId].length);
  }
  
  console.log('Final values for field:', fieldId, values[fieldId]);
  
  // מחק ערך "אחר" אם קיים
  delete values[`${fieldId}_other`];
  
  // רענון התצוגה
  render();
}

function filterDropdown(fieldId, query) {
  const optionsContainer = document.getElementById(`dropdown-options-${fieldId}`);
  if (!optionsContainer) return;
  
  const field = form.pages.flatMap(p => p.fields).find(f => f.id === fieldId);
  if (!field) return;
  
  const options = optionsContainer.querySelectorAll('.dropdown-option');
  const queryLower = query.toLowerCase().trim();
  
  // אם אין חיפוש, הצג הכל בלי הדגשות
  if (!queryLower) {
    options.forEach(option => {
      option.style.display = 'flex';
      const highlightSpan = option.querySelector('.match-highlight');
      if (highlightSpan) {
        highlightSpan.style.display = 'none';
      }
    });
    return;
  }
  
  options.forEach(option => {
    const recordData = JSON.parse(option.getAttribute('data-record') || '{}');
    const displayField = field.displayField || Object.keys(recordData)[0];
    
    // חיפוש בכל השדות של הרשומה
    let found = false;
    let matchedField = null;
    let matchedValue = null;
    
    for (const [key, value] of Object.entries(recordData)) {
      if (String(value).toLowerCase().includes(queryLower)) {
        found = true;
        matchedField = key;
        matchedValue = value;
        break;
      }
    }
    
    if (found) {
      option.style.display = 'flex';
      
      // עדכון תצוגה עם הדגשה ומידע נוסף
      const highlightSpan = option.querySelector('.match-highlight');
      if (highlightSpan) {
        highlightSpan.style.display = 'block';
        if (matchedField === displayField) {
          // ההתאמה בשדה המוצג
          highlightSpan.innerHTML = `✓ مطابق: <strong>${esc(matchedValue)}</strong>`;
          highlightSpan.className = 'match-highlight match-in-display';
        } else {
          // ההתאמה בשדה אחר
          highlightSpan.innerHTML = `🔍 موجود في: <strong>${esc(matchedField)}</strong> - ${esc(matchedValue)}`;
          highlightSpan.className = 'match-highlight match-in-other';
        }
      }
    } else {
      option.style.display = 'none';
    }
  });
}

function removeSelectedTag(fieldId, index) {
  if (!Array.isArray(values[fieldId])) return;
  
  const removed = values[fieldId].splice(index, 1);
  console.log('Removed tag at index:', index, 'Total remaining:', values[fieldId].length);
  render();
}

// סגור dropdown בלחיצה מחוץ לו
document.addEventListener('click', function(event) {
  const dropdowns = document.querySelectorAll('.custom-dropdown-list');
  dropdowns.forEach(dropdown => {
    const wrapper = dropdown.closest('.custom-dropdown-wrapper');
    if (wrapper && !wrapper.contains(event.target)) {
      dropdown.style.display = 'none';
    }
  });
});

function toggleOtherOption(fieldId, checked) {
  if (checked) {
    values[`${fieldId}_other`] = '';
    // נקה את הערך הנבחר מהרשימה
    delete values[fieldId];
    delete values[`${fieldId}_record`];
  } else {
    delete values[`${fieldId}_other`];
  }
  render();
}

function setOtherValue(fieldId, value) {
  values[`${fieldId}_other`] = value;
}

// ===== Multiple Selection Functions =====


// ===== Matrix Field =====
function renderMatrixField(field) {
  if (!field.matrixRows || !field.matrixColumns || field.matrixRows.length === 0 || field.matrixColumns.length === 0) {
    return `<div style="color:var(--warning);padding:12px;background:var(--warning-light);border-radius:8px;">⚠️ מטריצה לא מוגדרת כראוי</div>`;
  }

  const matrixValues = values[field.id] || {};
  const isCheckbox = field.matrixType === 'checkbox';

  let html = `<div class="matrix-wrapper">
    <table class="matrix-table">
      <thead>
        <tr>
          <th></th>`;
  
  // כותרות עמודות
  field.matrixColumns.forEach(col => {
    html += `<th>${esc(col.label)}</th>`;
  });
  
  html += `</tr></thead><tbody>`;
  
  // שורות
  field.matrixRows.forEach(row => {
    html += `<tr>
      <td class="matrix-row-label">${esc(row.label)}</td>`;
    
    field.matrixColumns.forEach(col => {
      const cellValue = matrixValues[row.id];
      const isChecked = isCheckbox 
        ? (Array.isArray(cellValue) && cellValue.includes(col.value))
        : (cellValue === col.value);
      
      html += `<td class="matrix-cell">
        <input type="${isCheckbox ? 'checkbox' : 'radio'}" 
               name="matrix-${field.id}-${row.id}" 
               value="${esc(col.value)}"
               ${isChecked ? 'checked' : ''}
               onchange="setMatrixValue('${field.id}','${row.id}','${esc(col.value)}',${isCheckbox})">
      </td>`;
    });
    
    html += `</tr>`;
  });
  
  html += `</tbody></table></div>`;
  
  return html;
}

function setMatrixValue(fieldId, rowId, colValue, isCheckbox) {
  if (!values[fieldId]) values[fieldId] = {};
  
  if (isCheckbox) {
    // בחירה מרובה
    if (!Array.isArray(values[fieldId][rowId])) {
      values[fieldId][rowId] = [];
    }
    const arr = values[fieldId][rowId];
    const idx = arr.indexOf(colValue);
    if (idx > -1) {
      arr.splice(idx, 1);
    } else {
      arr.push(colValue);
    }
  } else {
    // בחירה יחידה
    values[fieldId][rowId] = colValue;
  }
  
  render();
}

function esc(s) { if (!s) return ''; const d = document.createElement('div'); d.textContent = s; return d.innerHTML; }

init();
