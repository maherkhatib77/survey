/**
 * Admin Reports - דוחות וניתוח
 */
const API = '../api';
const COLORS = ['#2563eb','#16a34a','#ea580c','#9333ea','#0891b2','#dc2626','#4f46e5','#ca8a04'];
let form = null;
let responses = [];
let filteredResponses = []; // תשובות מסוננות לפי פילטר
let dataSourcesWithRecords = [];
let activeTab = 'overview';
let activeFilters = {}; // מעקב אחר פילטרים פעילים: { fieldId: selectedValue }

// רישום plugin של תוויות נתונים
Chart.register(ChartDataLabels);

async function checkAuth() {
  try {
    const res = await fetch(`${API}/auth.php?action=check`);
    const json = await res.json();
    if (!json.loggedIn) { window.location.href = 'login.html'; return false; }
    return true;
  } catch(e) { window.location.href = 'login.html'; return false; }
}

async function logout() {
  if (window.FBAuth && typeof FBAuth.fbLogout === 'function') {
    await FBAuth.fbLogout(API, 'login.html');
    return;
  }
  try { localStorage.clear(); sessionStorage.clear(); } catch (e) {}
  window.location.href = 'login.html';
}

// ===== UUID Generator =====
function uuid() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

async function init() {
  if (!await checkAuth()) return;
  const id = new URLSearchParams(window.location.search).get('id');
  if (!id) { window.location.href = 'dashboard.html'; return; }
  
  const formRes = await fetch(`${API}/forms.php?action=get&id=${id}`);
  const formJson = await formRes.json();
  if (!formJson.success) { window.location.href = 'dashboard.html'; return; }
  form = formJson.data;

  const resRes = await fetch(`${API}/responses.php?action=list&formId=${id}`);
  // זיהוי ברור של פג תוקף Session – במקום "0 תגובות" נציג הודעה ונחזיר להתחברות.
  if (resRes.status === 401) {
    alert('פג תוקף ההתחברות. יש להתחבר מחדש.');
    window.location.href = 'login.html';
    return;
  }
  let resJson = {};
  try { resJson = await resRes.json(); } catch (e) { resJson = { success: false }; }
  if (!resJson.success && resJson.error) {
    console.warn('שגיאה בטעינת תגובות:', resRes.status, resJson.error);
    const banner = document.getElementById('reportSubtitle');
    if (banner) banner.textContent = `⚠️ לא ניתן לטעון תגובות: ${resJson.error}`;
  }
  responses = resJson.success ? resJson.data : [];
  filteredResponses = [...responses]; // אתחול - ללא סינון

  // טען מאגרים עם הרשומות שלהם
  await loadDataSources();
  
  document.getElementById('reportTitle').textContent = `📊 ${form.settings.title}`;
  document.getElementById('reportSubtitle').textContent = `${responses.length} תגובות`;
  renderTab();
}

async function loadDataSources() {
  try {
    const sourcesRes = await fetch(`${API}/sources.php?action=list`);
    const sourcesJson = await sourcesRes.json();
    if (sourcesJson.success) {
      // טען את הרשומות של כל מאגר
      for (const source of sourcesJson.data) {
        const detailsRes = await fetch(`${API}/sources.php?action=get&id=${source.id}`);
        const detailsJson = await detailsRes.json();
        if (detailsJson.success) {
          dataSourcesWithRecords.push(detailsJson.data);
        }
      }
    }
  } catch (e) {
    console.warn('Could not load data sources', e);
  }
}

// ===== פונקציית סינון לפי רשומה =====
function applyRecordFilter(fieldId, selectedValue) {
  if (!selectedValue || selectedValue === '__all__') {
    // הסר פילטר
    delete activeFilters[fieldId];
  } else {
    // החל פילטר
    activeFilters[fieldId] = selectedValue;
  }
  
  // סנן תשובות לפי כל הפילטרים הפעילים
  filteredResponses = responses.filter(response => {
    return Object.entries(activeFilters).every(([filterFieldId, filterValue]) => {
      const fieldValue = response.data[filterFieldId];
      
      // בדוק אם הערך תואם לפילטר
      if (Array.isArray(fieldValue)) {
        // בחירה מרובה - מערך של אובייקטים
        return fieldValue.some(record => {
          const displayValue = getRecordDisplayValue(record, filterFieldId);
          return displayValue === filterValue;
        });
      } else if (typeof fieldValue === 'object' && fieldValue !== null) {
        // בחירה בודדת - אובייקט
        const displayValue = getRecordDisplayValue(fieldValue, filterFieldId);
        return displayValue === filterValue;
      } else {
        // ערך רגיל
        return fieldValue === filterValue;
      }
    });
  });
  
  // עדכן כותרת משנית
  const filterCount = Object.keys(activeFilters).length;
  const subtitle = filterCount > 0 
    ? `${filteredResponses.length} תגובות (מסונן: ${filterCount} פילטרים פעילים)`
    : `${responses.length} תגובות`;
  document.getElementById('reportSubtitle').textContent = subtitle;
  
  // רענן תצוגה
  renderTab();
}

// פונקציית עזר - קבלת ערך תצוגה מרשומה
function getRecordDisplayValue(record, fieldId) {
  const field = form.pages.flatMap(p => p.fields).find(f => f.id === fieldId);
  if (!field || !field.sourceId) return '';
  
  const source = dataSourcesWithRecords.find(s => s.id === field.sourceId);
  if (!source) return '';
  
  const displayField = field.displayField || (source.fields && source.fields[0]);
  return record[displayField] || Object.values(record)[0] || '';
}

// פונקציה לאיפוס כל הפילטרים
function resetAllFilters() {
  activeFilters = {};
  filteredResponses = [...responses];
  document.getElementById('reportSubtitle').textContent = `${responses.length} תגובות`;
  renderTab();
}

// פונקציית סינון לפי שורה במטריצה
function applyMatrixFilter(fieldId, rowId) {
  if (!rowId || rowId === '__all__') {
    // הסר פילטר
    delete activeFilters[fieldId];
  } else {
    // החל פילטר
    activeFilters[fieldId] = rowId;
  }
  
  // סנן תשובות לפי כל הפילטרים הפעילים
  filteredResponses = responses.filter(response => {
    return Object.entries(activeFilters).every(([filterFieldId, filterValue]) => {
      const field = form.pages.flatMap(p => p.fields).find(f => f.id === filterFieldId);
      
      // אם זה שדה matrix
      if (field && field.type === 'matrix') {
        const matrixData = response.data[filterFieldId];
        if (!matrixData || typeof matrixData !== 'object') return false;
        // בדוק אם השורה הספציפית קיימת בנתונים
        return matrixData[filterValue] !== undefined;
      }
      
      // אחרת - פילטר רגיל (record)
      const fieldValue = response.data[filterFieldId];
      
      if (Array.isArray(fieldValue)) {
        return fieldValue.some(record => {
          const displayValue = getRecordDisplayValue(record, filterFieldId);
          return displayValue === filterValue;
        });
      } else if (typeof fieldValue === 'object' && fieldValue !== null) {
        const displayValue = getRecordDisplayValue(fieldValue, filterFieldId);
        return displayValue === filterValue;
      } else {
        return fieldValue === filterValue;
      }
    });
  });
  
  // עדכן כותרת משנית
  const filterCount = Object.keys(activeFilters).length;
  const subtitle = filterCount > 0 
    ? `${filteredResponses.length} תגובות (מסונן: ${filterCount} פילטרים פעילים)`
    : `${responses.length} תגובות`;
  document.getElementById('reportSubtitle').textContent = subtitle;
  
  // רענן תצוגה
  renderTab();
}

function switchTab(tab, btn) {
  activeTab = tab;
  document.querySelectorAll('.reports-tab').forEach(t => t.classList.remove('active'));
  btn.classList.add('active');
  renderTab();
}

function renderTab() {
  const content = document.getElementById('tabContent');
  switch (activeTab) {
    case 'overview': content.innerHTML = renderOverview(); break;
    case 'fields': content.innerHTML = renderFields(); break;
    case 'responses': content.innerHTML = renderResponses(); break;
    case 'export': content.innerHTML = renderExport(); break;
  }
}

function renderOverview() {
  const allFields = form.pages.flatMap(p => p.fields);
  const total = filteredResponses.length;
  const ratingFields = allFields.filter(f => f.type === 'rating');
  const avgRating = ratingFields.length ? ratingFields.reduce((s, f) => s + getFieldAvg(f.id), 0) / ratingFields.length : 0;

  let html = `
    <div class="stats-grid">
      <div class="stat-card"><div><div class="label">סה״כ תגובות (מסונן)</div><div class="value" style="color:var(--primary);">${total}</div></div><div class="icon">💬</div></div>
      <div class="stat-card"><div><div class="label">מספר שדות</div><div class="value" style="color:var(--purple);">${allFields.length}</div></div><div class="icon">📝</div></div>
      <div class="stat-card"><div><div class="label">מספר עמודים</div><div class="value" style="color:var(--success);">${form.pages.length}</div></div><div class="icon">📄</div></div>
      <div class="stat-card"><div><div class="label">דירוג ממוצע</div><div class="value" style="color:#eab308;">${avgRating.toFixed(1)}⭐</div></div><div class="icon">⭐</div></div>
    </div>`;

  html += `<div class="chart-container"><h3>תגובות לפי יום (7 ימים אחרונים)</h3>${renderDailyChart()}</div>`;

  allFields.filter(f => ['radio','select','rating','checkbox'].includes(f.type)).forEach(f => {
    html += `<div class="chart-container"><h3>${esc(f.label)}</h3>${renderFieldChart(f)}</div>`;
  });

  return html;
}

function renderDailyChart() {
  const days = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(); d.setDate(d.getDate() - i);
    const ds = d.toLocaleDateString('he-IL');
    const count = filteredResponses.filter(r => new Date(r.submittedAt).toLocaleDateString('he-IL') === ds).length;
    days.push({ date: ds, count });
  }
  const max = Math.max(...days.map(d => d.count), 1);
  return `<div class="bar-chart">${days.map(d => `
    <div class="bar-item">
      <div class="bar-value">${d.count}</div>
      <div class="bar" style="height:${(d.count/max)*150}px;background:var(--primary);"></div>
      <div class="bar-label">${d.date.slice(-5)}</div>
    </div>
  `).join('')}</div>`;
}

function renderFieldChart(field) {
  const dist = getFieldDistribution(field.id, field);
  if (!dist.length) return '<p style="color:var(--slate-400);">אין נתונים</p>';
  const max = Math.max(...dist.map(d => d.count), 1);
  return `<div class="bar-chart">${dist.map((d, i) => `
    <div class="bar-item">
      <div class="bar-value">${d.count}</div>
      <div class="bar" style="height:${(d.count/max)*150}px;background:${COLORS[i % COLORS.length]};"></div>
      <div class="bar-label">${esc(d.label)}</div>
    </div>
  `).join('')}</div>`;
}

function renderFields() {
  const allFields = form.pages.flatMap(p => p.fields);
  let html = '<div style="display:flex;flex-direction:column;gap:16px;">';
  
  // כפתור ייצוא כללי ל-PPT וכפתור איפוס פילטרים
  html += `<div style="margin-bottom:16px;display:flex;gap:12px;justify-content:space-between;align-items:center;">
    <button class="btn btn-primary" onclick="exportAllToPPT()">📊 ייצוא כל הגרפים ל-PowerPoint</button>
    ${Object.keys(activeFilters).length > 0 ? `<button class="btn btn-outline" onclick="resetAllFilters()">🔄 אפס כל הפילטרים (${Object.keys(activeFilters).length} פעילים)</button>` : ''}
  </div>`;
  
  // הצגת פילטרים פעילים
  if (Object.keys(activeFilters).length > 0) {
    html += `<div style="background:var(--primary-light);padding:12px;border-radius:8px;margin-bottom:16px;border:2px solid var(--primary);">
      <div style="font-weight:600;margin-bottom:8px;">🔍 פילטרים פעילים:</div>
      <div style="display:flex;flex-wrap:wrap;gap:8px;">`;
    
    Object.entries(activeFilters).forEach(([fieldId, filterValue]) => {
      const field = allFields.find(f => f.id === fieldId);
      if (field) {
        html += `<span style="background:white;padding:6px 12px;border-radius:16px;font-size:13px;display:flex;align-items:center;gap:6px;">
          <strong>${esc(field.label)}:</strong> ${esc(filterValue)}
          <button onclick="applyRecordFilter('${fieldId}', '__all__')" style="background:none;border:none;cursor:pointer;color:var(--danger);font-size:16px;padding:0;">✕</button>
        </span>`;
      }
    });
    
    html += `</div></div>`;
  }
  
  allFields.forEach((field, fieldIndex) => {
    const count = filteredResponses.filter(r => r.data[field.id] !== undefined && r.data[field.id] !== '').length;
    html += `<div class="card" id="field-card-${fieldIndex}">
      <div style="display:flex;justify-content:space-between;align-items:start;margin-bottom:12px;">
        <div><strong>${esc(field.label)}</strong><br><span style="font-size:13px;color:var(--slate-500);">${field.type} • ${count} תגובות</span></div>
        <span class="badge badge-green">${count}/${filteredResponses.length}</span>
      </div>`;
    
    // הוספת פילטר לשדות record
    if (field.type === 'record' && field.sourceId) {
      const source = dataSourcesWithRecords.find(s => s.id === field.sourceId);
      if (source && source.records && source.records.length > 0) {
        const displayField = field.displayField || (source.fields && source.fields[0]);
        const uniqueValues = [...new Set(source.records.map(r => r[displayField] || Object.values(r)[0]))];
        const currentFilter = activeFilters[field.id] || '__all__';
        
        html += `<div style="background:var(--slate-50);padding:12px;border-radius:8px;margin-bottom:12px;border:1px solid var(--slate-200);">
          <label style="display:block;font-weight:600;margin-bottom:8px;font-size:13px;">🔍 סנן לפי ${esc(field.label)}:</label>
          <select onchange="applyRecordFilter('${field.id}', this.value)" style="width:100%;padding:8px;border:1px solid var(--slate-300);border-radius:6px;font-family:inherit;">
            <option value="__all__" ${currentFilter === '__all__' ? 'selected' : ''}>הצג את כל התשובות (${responses.length})</option>
            ${uniqueValues.map(val => {
              const filterCount = responses.filter(r => {
                const fieldValue = r.data[field.id];
                if (Array.isArray(fieldValue)) {
                  return fieldValue.some(record => {
                    const displayValue = getRecordDisplayValue(record, field.id);
                    return displayValue === val;
                  });
                } else if (typeof fieldValue === 'object' && fieldValue !== null) {
                  const displayValue = getRecordDisplayValue(fieldValue, field.id);
                  return displayValue === val;
                }
                return false;
              }).length;
              return `<option value="${esc(val)}" ${currentFilter === val ? 'selected' : ''}>${esc(val)} (${filterCount} תשובות)</option>`;
            }).join('')}
          </select>
        </div>`;
      }
    }
    
    if (field.type === 'number') {
      const nums = filteredResponses.map(r => Number(r.data[field.id])).filter(n => !isNaN(n));
      if (nums.length) {
        const avg = nums.reduce((a,b)=>a+b,0)/nums.length;
        html += `<div style="display:grid;grid-template-columns:repeat(4,1fr);gap:12px;">
          <div style="background:var(--primary-light);padding:12px;border-radius:8px;text-align:center;"><div style="font-size:12px;color:var(--primary);">ממוצע</div><div style="font-size:20px;font-weight:700;color:var(--primary-dark);">${avg.toFixed(2)}</div></div>
          <div style="background:#dcfce7;padding:12px;border-radius:8px;text-align:center;"><div style="font-size:12px;color:var(--success);">מינימום</div><div style="font-size:20px;font-weight:700;color:#166534;">${Math.min(...nums)}</div></div>
          <div style="background:#fff7ed;padding:12px;border-radius:8px;text-align:center;"><div style="font-size:12px;color:var(--warning);">מקסימום</div><div style="font-size:20px;font-weight:700;color:#9a3412;">${Math.max(...nums)}</div></div>
          <div style="background:#faf5ff;padding:12px;border-radius:8px;text-align:center;"><div style="font-size:12px;color:var(--purple);">סכום</div><div style="font-size:20px;font-weight:700;color:#6b21a8;">${nums.reduce((a,b)=>a+b,0).toFixed(1)}</div></div>
        </div>`;
      }
    } else if (['radio','select','rating','checkbox'].includes(field.type)) {
      // כפתורי החלפת סוג גרף
      html += `<div style="display:flex;gap:8px;margin-bottom:12px;flex-wrap:wrap;">
        <button class="btn btn-sm btn-outline" onclick="changeChartType(${fieldIndex}, 'bar')">📊 עמודות</button>
        <button class="btn btn-sm btn-outline" onclick="changeChartType(${fieldIndex}, 'pie')">🥧 עוגה</button>
        <button class="btn btn-sm btn-outline" onclick="changeChartType(${fieldIndex}, 'doughnut')">🍩 דונאט</button>
        <button class="btn btn-sm btn-outline" onclick="changeChartType(${fieldIndex}, 'line')">📈 קו</button>
        <button class="btn btn-sm btn-success" onclick="saveChartAsPNG(${fieldIndex})">💾 שמור כ-PNG</button>
      </div>`;
      html += `<div id="chart-container-${fieldIndex}" style="position:relative;height:300px;margin-bottom:12px;">
        <canvas id="chart-${fieldIndex}"></canvas>
      </div>`;
      if (field.type === 'rating') html += `<div style="margin-top:12px;text-align:center;font-size:18px;font-weight:700;color:#eab308;">ממוצע: ${getFieldAvg(field.id).toFixed(1)} ⭐</div>`;
    } else if (field.type === 'matrix') {
      // הוספת פילטר לשדות matrix - סינון לפי שורות
      if (field.matrixRows && field.matrixRows.length > 0) {
        const currentFilter = activeFilters[field.id] || '__all__';
        
        html += `<div style="background:var(--slate-50);padding:12px;border-radius:8px;margin-bottom:12px;border:1px solid var(--slate-200);">
          <label style="display:block;font-weight:600;margin-bottom:8px;font-size:13px;">🔍 סנן לפי שורה ב-${esc(field.label)}:</label>
          <select onchange="applyMatrixFilter('${field.id}', this.value)" style="width:100%;padding:8px;border:1px solid var(--slate-300);border-radius:6px;font-family:inherit;">
            <option value="__all__" ${currentFilter === '__all__' ? 'selected' : ''}>הצג את כל השורות (${field.matrixRows.length})</option>
            ${field.matrixRows.map(row => {
              const filterCount = filteredResponses.filter(r => {
                const matrixData = r.data[field.id];
                return matrixData && typeof matrixData === 'object' && matrixData[row.id] !== undefined;
              }).length;
              return `<option value="${esc(row.id)}" ${currentFilter === row.id ? 'selected' : ''}>${esc(row.label)} (${filterCount} תשובות)</option>`;
            }).join('')}
          </select>
        </div>`;
      }
      
      // כפתורי החלפת סוג גרף למטריצה
      html += `<div style="display:flex;gap:8px;margin-bottom:12px;flex-wrap:wrap;">
        <button class="btn btn-sm btn-outline" onclick="changeChartType(${fieldIndex}, 'bar')">📊 עמודות</button>
        <button class="btn btn-sm btn-outline" onclick="changeChartType(${fieldIndex}, 'pie')">🥧 עוגה</button>
        <button class="btn btn-sm btn-success" onclick="saveChartAsPNG(${fieldIndex})">💾 שמור כ-PNG</button>
      </div>`;
      html += `<div id="chart-container-${fieldIndex}" style="position:relative;height:400px;margin-bottom:12px;">
        <canvas id="chart-${fieldIndex}"></canvas>
      </div>`;
    } else if (['text','textarea','email','phone'].includes(field.type)) {
      const texts = filteredResponses.map(r => r.data[field.id]).filter(v => v);
      if (texts.length) {
        html += `<div style="max-height:150px;overflow-y:auto;display:flex;flex-direction:column;gap:6px;">`;
        texts.slice(0, 10).forEach(t => { html += `<div style="background:var(--slate-50);padding:8px 12px;border-radius:6px;font-size:14px;">${esc(String(t).substring(0, 100))}</div>`; });
        html += '</div>';
      }
    }
    html += '</div>';
  });
  html += '</div>';
  
  // הוספת setTimeout ליצירת הגרפים אחרי שה-DOM נטען
  setTimeout(() => {
    allFields.forEach((field, fieldIndex) => {
      if (['radio','select','rating','checkbox','matrix'].includes(field.type)) {
        createChart(field, fieldIndex, 'bar');
      }
    });
  }, 100);
  
  return html;
}

function renderResponses() {
  if (!filteredResponses.length) return `<div class="empty-state"><div class="icon">💬</div><h3>אין תגובות עדיין</h3></div>`;
  const allFields = form.pages.flatMap(p => p.fields);
  let html = `<div class="card" style="overflow-x:auto;"><table class="data-table"><thead><tr><th>#</th><th>תאריך</th>`;
  allFields.slice(0, 5).forEach(f => { html += `<th>${esc(f.label)}</th>`; });
  html += '<th>פעולות</th></tr></thead><tbody>';
  filteredResponses.forEach((r, i) => {
    html += `<tr><td>${i + 1}</td><td>${formatDateTime(r.submittedAt)}</td>`;
    allFields.slice(0, 5).forEach(f => {
      const v = r.data[f.id];
      let displayText = '';
      
      // טיפול מיוחד ברשומה ממאגר
      if (f.type === 'record') {
        if (Array.isArray(v)) {
          // בחירה מרובה - מערך של אובייקטים
          const displayField = f.displayField || Object.keys(v[0] || {})[0];
          displayText = v.map(record => record[displayField] || Object.values(record)[0] || '').join(', ');
        } else if (typeof v === 'object' && v !== null) {
          // בחירה בודדת - אובייקט
          const displayField = f.displayField || Object.keys(v)[0];
          displayText = String(v[displayField] || Object.values(v)[0] || '');
        } else {
          displayText = String(v || '-');
        }
      }
      // מערך רגיל
      else if (Array.isArray(v)) {
        displayText = v.join(', ');
      }
      // ערך רגיל
      else {
        displayText = String(v || '-');
      }
      
      html += `<td style="max-width:150px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${esc(displayText)}</td>`;
    });
    html += `<td><button class="btn btn-sm btn-outline" onclick="showResponse(${i})">צפה</button></td></tr>`;
  });
  html += '</tbody></table></div>';
  return html;
}

function showResponse(idx) {
  const r = responses[idx];
  const allFields = form.pages.flatMap(p => p.fields);
  
  // כותרת עם תאריך וכפתור ייצוא
  let html = `
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:20px;padding-bottom:16px;border-bottom:2px solid var(--slate-200);">
      <div>
        <h3 style="margin:0 0 4px 0;color:var(--slate-800);">תשובה #${idx + 1}</h3>
        <p style="margin:0;font-size:13px;color:var(--slate-500);">נשלח: ${formatDateTime(r.submittedAt)}</p>
      </div>
      <button class="btn btn-primary" onclick="exportSingleResponseToWord(${idx})">📄 שמור כ-Word</button>
    </div>
    <div style="display:flex;flex-direction:column;gap:16px;">`;
  
  // הצגת כל השאלות והתשובות
  allFields.forEach(f => {
    const v = r.data[f.id];
    const otherValue = r.data[`${f.id}_other`];
    
    // טיפול מיוחד במטריצות
    if (f.type === 'matrix' && typeof v === 'object' && v !== null) {
      html += `<div style="border:1px solid var(--slate-200);border-radius:8px;padding:16px;background:var(--slate-50);">
        <div style="font-size:14px;font-weight:600;color:var(--slate-700);margin-bottom:12px;">${esc(f.label)}</div>
        <table style="width:100%;border-collapse:collapse;font-size:13px;">
          <thead>
            <tr style="background:var(--primary);color:white;">
              <th style="padding:8px;text-align:right;border:1px solid var(--primary);">${esc(f.label)}</th>
              ${(f.matrixColumns || []).map(col => `<th style="padding:8px;text-align:center;border:1px solid var(--primary);">${esc(col.label)}</th>`).join('')}
            </tr>
          </thead>
          <tbody>`;
      
      (f.matrixRows || []).forEach(row => {
        html += `<tr style="background:white;">
          <td style="padding:8px;font-weight:500;border:1px solid var(--slate-200);">${esc(row.label)}</td>`;
        
        (f.matrixColumns || []).forEach(col => {
          const cellValue = v[row.id];
          let isChecked = false;
          
          if (Array.isArray(cellValue)) {
            isChecked = cellValue.includes(col.value);
          } else {
            isChecked = cellValue === col.value;
          }
          
          html += `<td style="padding:8px;text-align:center;border:1px solid var(--slate-200);">
            ${isChecked ? '<span style="color:var(--success);font-weight:bold;font-size:16px;">✓</span>' : '<span style="color:var(--slate-300);">—</span>'}
          </td>`;
        });
        
        html += `</tr>`;
      });
      
      html += `</tbody></table></div>`;
    }
    // טיפול רגיל בשאר השדות
    else {
      let displayValue = '';
      
      // חתימה
      if (v && String(v).startsWith('data:image')) {
        displayValue = `<img src="${v}" style="max-height:80px;border:1px solid var(--slate-200);border-radius:4px;background:white;padding:4px;">`;
      }
      // רשומה ממאגר - בחירה מרובה (מערך של אובייקטים)
      else if (f.type === 'record' && Array.isArray(v)) {
        if (v.length === 0) {
          displayValue = '<span style="color:var(--slate-400);font-style:italic;">לא נבחר</span>';
        } else {
          // הצגת רק השדה displayField של כל רשומה
          const displayField = f.displayField || Object.keys(v[0] || {})[0];
          const labels = v.map(record => {
            return record[displayField] || Object.values(record)[0] || '';
          });
          displayValue = `<div style="display:flex;flex-wrap:wrap;gap:6px;">
            ${labels.map(label => `<span style="background:var(--primary-light);color:var(--primary-dark);padding:4px 10px;border-radius:12px;font-size:12px;font-weight:500;">${esc(String(label))}</span>`).join('')}
          </div>`;
        }
      }
      // רשומה ממאגר - בחירה בודדת (אובייקט)
      else if (f.type === 'record' && typeof v === 'object' && v !== null && !Array.isArray(v)) {
        const displayField = f.displayField || Object.keys(v)[0];
        displayValue = esc(String(v[displayField] || Object.values(v)[0] || '-'));
      }
      // מערך רגיל (בחירה מרובה)
      else if (Array.isArray(v)) {
        if (v.length === 0) {
          displayValue = '<span style="color:var(--slate-400);font-style:italic;">לא נבחר</span>';
        } else {
          // המרת ערכים לתוויות
          const labels = v.map(val => {
            const opt = (f.options || []).find(o => o.value === val);
            return opt ? opt.label : val;
          });
          displayValue = `<div style="display:flex;flex-wrap:wrap;gap:6px;">
            ${labels.map(label => `<span style="background:var(--primary-light);color:var(--primary-dark);padding:4px 10px;border-radius:12px;font-size:12px;font-weight:500;">${esc(String(label))}</span>`).join('')}
          </div>`;
        }
      }
      // דירוג
      else if (f.type === 'rating' && v) {
        const ratingNum = parseInt(v);
        const stars = '⭐'.repeat(ratingNum) + '☆'.repeat(5 - ratingNum);
        const opt = (f.options || []).find(o => o.value === v);
        displayValue = `<div style="font-size:18px;">${stars}</div>
          ${opt ? `<div style="font-size:12px;color:var(--slate-500);margin-top:4px;">${esc(opt.label)}</div>` : ''}`;
      }
      // טקסט רגיל
      else {
        // המרת ערך לתווית אם יש אפשרויות
        if (f.options && v) {
          const opt = f.options.find(o => o.value === v);
          displayValue = opt ? esc(opt.label) : esc(String(v));
        } else {
          displayValue = esc(String(v || '-'));
        }
      }
      
      // הוספת "אחר" אם קיים
      if (otherValue) {
        displayValue += `<div style="margin-top:8px;padding:8px;background:var(--warning-light);border-radius:6px;font-size:13px;">
          <strong>${esc(f.otherLabel || 'אחר')}:</strong> ${esc(otherValue)}
        </div>`;
      }
      
      html += `<div style="border-bottom:1px solid var(--slate-100);padding-bottom:12px;">
        <div style="font-size:13px;font-weight:600;color:var(--slate-600);margin-bottom:6px;">${esc(f.label)}${f.required ? ' <span style="color:var(--danger);">*</span>' : ''}</div>
        <div style="margin-top:4px;font-size:14px;color:var(--slate-800);line-height:1.6;">${displayValue}</div>
      </div>`;
    }
  });
  
  html += '</div>';
  
  // הגדלת ה-modal
  const modal = document.getElementById('responseModal');
  modal.querySelector('.modal').style.maxWidth = '800px';
  modal.querySelector('.modal').style.width = '90%';
  
  document.getElementById('responseDetail').innerHTML = html;
  modal.style.display = 'flex';
}

function closeResponseModal() { document.getElementById('responseModal').style.display = 'none'; }

// ===== ייצוא תשובה בודדת ל-Word =====
function exportSingleResponseToWord(idx) {
  const r = responses[idx];
  const allFields = form.pages.flatMap(p => p.fields);
  const primaryColor = form.settings.theme?.primaryColor || '#2563eb';
  const title = form.settings.title || 'סקר';
  
  let html = `
<!DOCTYPE html>
<html xmlns:o='urn:schemas-microsoft-com:office:office' 
      xmlns:w='urn:schemas-microsoft-com:office:word' 
      xmlns:v='urn:schemas-microsoft-com:vml'
      xmlns='http://www.w3.org/TR/REC-html40'>
<head>
<meta charset='utf-8'>
<title>${esc(title)} - תשובה #${idx + 1}</title>
<!--[if gte mso 9]>
<xml>
<w:WordDocument>
<w:View>Print</w:View>
<w:Zoom>100</w:Zoom>
<w:DoNotOptimizeForBrowser/>
</w:WordDocument>
</xml>
<![endif]-->
<style>
@page {
  size: A4;
  margin: 2cm;
}
body {
  font-family: 'Arial', 'David', 'Times New Roman', 'Traditional Arabic', sans-serif;
  direction: rtl;
  line-height: 1.8;
  color: #1e293b;
  font-size: 12pt;
}
.header {
  text-align: center;
  margin-bottom: 30px;
  padding-bottom: 20px;
  border-bottom: 3px solid ${primaryColor};
}
.header h1 {
  color: ${primaryColor};
  font-size: 24pt;
  margin: 0 0 10px 0;
  font-weight: bold;
}
.header p {
  color: #64748b;
  font-size: 11pt;
  margin: 0;
}
.response-info {
  background-color: #f1f5f9;
  padding: 15px;
  border-radius: 8px;
  margin-bottom: 24px;
  border-right: 4px solid ${primaryColor};
}
.question-container {
  margin-bottom: 20px;
  padding: 15px;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  background-color: #fafafa;
  page-break-inside: avoid;
}
.question-label {
  font-size: 13pt;
  font-weight: bold;
  color: #1e293b;
  margin-bottom: 10px;
  display: block;
}
.answer-value {
  font-size: 12pt;
  color: #334155;
  padding: 10px;
  background-color: white;
  border-radius: 6px;
  border: 1px solid #e2e8f0;
  margin-top: 8px;
}
.matrix-table {
  width: 100%;
  border-collapse: collapse;
  margin: 10px 0;
  page-break-inside: avoid;
}
.matrix-table th {
  background-color: ${primaryColor};
  color: white;
  padding: 10px;
  text-align: center;
  border: 1px solid ${primaryColor};
}
.matrix-table td {
  padding: 10px;
  border: 1px solid #cbd5e1;
  text-align: center;
  background-color: white;
}
.matrix-table td:first-child {
  text-align: right;
  font-weight: bold;
  background-color: #f8fafc;
}
.footer {
  margin-top: 40px;
  padding-top: 20px;
  border-top: 2px solid #e2e8f0;
  text-align: center;
  color: #64748b;
  font-size: 10pt;
}
</style>
</head>
<body>
<div class="header">
  <h1>${esc(title)}</h1>
  <p>תשובה #${idx + 1}</p>
</div>

<div class="response-info">
  <strong>תאריך שליחה:</strong> ${formatDateTime(r.submittedAt)}<br>
  <strong>מזהה תשובה:</strong> ${r.id || 'לא זמין'}
</div>
`;

  // מעבר על כל השאלות
  allFields.forEach(f => {
    const v = r.data[f.id];
    const otherValue = r.data[`${f.id}_other`];
    
    // דילוג על שדות ללא תשובה
    if (f.type === 'heading' || f.type === 'divider') return;
    if (v === undefined || v === null || v === '') return;
    
    html += `<div class="question-container">
      <span class="question-label">${esc(f.label)}</span>`;
    
    // טיפול מיוחד במטריצות
    if (f.type === 'matrix' && typeof v === 'object' && v !== null) {
      html += `<table class="matrix-table">
        <thead>
          <tr>
            <th></th>
            ${(f.matrixColumns || []).map(col => `<th>${esc(col.label)}</th>`).join('')}
          </tr>
        </thead>
        <tbody>`;
      
      (f.matrixRows || []).forEach(row => {
        html += `<tr>
          <td>${esc(row.label)}</td>`;
        
        (f.matrixColumns || []).forEach(col => {
          const cellValue = v[row.id];
          let isChecked = false;
          
          if (Array.isArray(cellValue)) {
            isChecked = cellValue.includes(col.value);
          } else {
            isChecked = cellValue === col.value;
          }
          
          html += `<td>${isChecked ? '✓' : '—'}</td>`;
        });
        
        html += `</tr>`;
      });
      
      html += `</tbody></table>`;
    }
    // טיפול רגיל בשאר השדות
    else {
      let displayValue = '';
      
      // חתימה
      if (v && String(v).startsWith('data:image')) {
        displayValue = `<img src="${v}" style="max-height:100px;border:1px solid #cbd5e1;border-radius:4px;">`;
      }
      // רשומה ממאגר - בחירה מרובה (מערך של אובייקטים)
      else if (f.type === 'record' && Array.isArray(v)) {
        if (v.length > 0) {
          const displayField = f.displayField || Object.keys(v[0] || {})[0];
          const labels = v.map(record => {
            return record[displayField] || Object.values(record)[0] || '';
          });
          displayValue = labels.join(', ');
        } else {
          displayValue = 'לא נבחר';
        }
      }
      // רשומה ממאגר - בחירה בודדת (אובייקט)
      else if (f.type === 'record' && typeof v === 'object' && v !== null && !Array.isArray(v)) {
        const displayField = f.displayField || Object.keys(v)[0];
        displayValue = esc(String(v[displayField] || Object.values(v)[0] || ''));
      }
      // מערך רגיל (בחירה מרובה)
      else if (Array.isArray(v)) {
        if (v.length > 0) {
          const labels = v.map(val => {
            const opt = (f.options || []).find(o => o.value === val);
            return opt ? opt.label : val;
          });
          displayValue = labels.join(', ');
        } else {
          displayValue = 'לא נבחר';
        }
      }
      // דירוג
      else if (f.type === 'rating' && v) {
        const ratingNum = parseInt(v);
        const opt = (f.options || []).find(o => o.value === v);
        displayValue = `${'★'.repeat(ratingNum)}${'☆'.repeat(5 - ratingNum)} (${ratingNum}/5)`;
        if (opt) displayValue += ` - ${esc(opt.label)}`;
      }
      // טקסט רגיל
      else {
        if (f.options && v) {
          const opt = f.options.find(o => o.value === v);
          displayValue = opt ? esc(opt.label) : esc(String(v));
        } else {
          displayValue = esc(String(v));
        }
      }
      
      html += `<div class="answer-value">${displayValue}</div>`;
      
      // הוספת "אחר" אם קיים
      if (otherValue) {
        html += `<div class="answer-value" style="margin-top:8px;background-color:#fef3c7;">
          <strong>${esc(f.otherLabel || 'אחר')}:</strong> ${esc(otherValue)}
        </div>`;
      }
    }
    
    html += `</div>`;
  });

  html += `
<div class="footer">
  <p>נוצר על ידי Form Builder Pro | ${new Date().toLocaleDateString('he-IL')}</p>
</div>
</body>
</html>`;

  // יצירת קובץ Word
  const blob = new Blob(['\ufeff', html], {
    type: 'application/msword'
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${title}_תשובה_${idx + 1}.doc`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function renderExport() {
  return `<div class="card">
    <h3 style="font-size:20px;font-weight:700;margin-bottom:24px;">📤 ייצוא נתונים</h3>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:20px;">
      <div style="border:2px solid var(--slate-200);border-radius:var(--radius);padding:24px;text-align:center;">
        <div style="font-size:36px;margin-bottom:12px;">📋</div>
        <h4 style="margin-bottom:8px;">ייצוא מבנה השאלון</h4>
        <p style="font-size:13px;color:var(--slate-500);margin-bottom:16px;">ייצוא הגדרות השאלון בלבד (ללא תשובות)</p>
        <button class="btn btn-primary" onclick="exportFormStructure()">הורד JSON</button>
      </div>
      <div style="border:2px solid var(--slate-200);border-radius:var(--radius);padding:24px;text-align:center;">
        <div style="font-size:36px;margin-bottom:12px;">📄</div>
        <h4 style="margin-bottom:8px;">ייצוא Word</h4>
        <p style="font-size:13px;color:var(--slate-500);margin-bottom:16px;">מסמך מעוצב של הסקר</p>
        <button class="btn btn-primary" onclick="exportWord()">הורד Word</button>
      </div>
    </div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:20px;margin-top:20px;">
      <div style="border:2px solid var(--slate-200);border-radius:var(--radius);padding:24px;text-align:center;">
        <div style="font-size:36px;margin-bottom:12px;">📊</div>
        <h4 style="margin-bottom:8px;">ייצוא CSV</h4>
        <p style="font-size:13px;color:var(--slate-500);margin-bottom:16px;">מתאים ל-Excel ו-Google Sheets</p>
        <button class="btn btn-success" onclick="exportCSV()" ${!filteredResponses.length?'disabled style="opacity:0.5;"':''}>הורד CSV (${filteredResponses.length} שורות)</button>
      </div>
      <div style="border:2px solid var(--slate-200);border-radius:var(--radius);padding:24px;text-align:center;">
        <div style="font-size:36px;margin-bottom:12px;">🔧</div>
        <h4 style="margin-bottom:8px;">ייצוא JSON</h4>
        <p style="font-size:13px;color:var(--slate-500);margin-bottom:16px;">מתאים לאינטגרציה ו-API (ולשחזור באמצעות ייבוא)</p>
        <button class="btn btn-primary" onclick="exportJSON()" ${!responses.length?'disabled style="opacity:0.5;"':''}>הורד JSON</button>
      </div>
    </div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:20px;margin-top:20px;">
      <div style="border:2px dashed var(--slate-300);border-radius:var(--radius);padding:24px;text-align:center;">
        <div style="font-size:36px;margin-bottom:12px;">📥</div>
        <h4 style="margin-bottom:8px;">ייבוא תגובות מקובץ JSON</h4>
        <p style="font-size:13px;color:var(--slate-500);margin-bottom:16px;">שחזור נתונים מקובץ "ייצוא JSON" של המערכת. תגובות כפולות (לפי מזהה) דולגות אוטומטית.</p>
        <input type="file" id="importResponsesFile" accept=".json,application/json" style="display:none;" onchange="importResponsesFromFile(this)" />
        <button class="btn btn-success" onclick="document.getElementById('importResponsesFile').click()">בחר קובץ JSON וייבא</button>
        <div id="importResult" style="margin-top:12px;font-size:13px;"></div>
      </div>
      <div style="border:2px dashed var(--slate-300);border-radius:var(--radius);padding:24px;text-align:center;">
        <div style="font-size:36px;margin-bottom:12px;">🪄</div>
        <h4 style="margin-bottom:8px;">השלמת שדות אוטומטיים מהמאגר</h4>
        <p style="font-size:13px;color:var(--slate-500);margin-bottom:16px;">משלים תגובות ישנות (למשל שם מוסד/מנהל/מפקח לפי סמל המוסד) ע"פ המאגר. לא דורס תשובות קיימות, ויוצר גיבוי לפני שינוי.</p>
        <button class="btn btn-primary" onclick="runBackfill(false)">🔍 בדיקה מקדימה (Preview)</button>
        <button class="btn btn-success" onclick="runBackfill(true)" style="margin-inline-start:8px;">▶️ בצע השלמה</button>
        <div id="backfillResult" style="margin-top:12px;font-size:13px;text-align:start;"></div>
      </div>
    </div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:20px;margin-top:20px;">
      <div style="border:2px dashed var(--slate-300);border-radius:var(--radius);padding:24px;text-align:center;">
        <div style="font-size:36px;margin-bottom:12px;">🧩</div>
        <h4 style="margin-bottom:8px;">השלמת סעיפי מטריצה חסרים</h4>
        <p style="font-size:13px;color:var(--slate-500);margin-bottom:16px;">סורק את כל התגובות ומשלים שורות ריקות בשאלות מטריצה, בהתאם לתשובות המשיב בשאר המטריצות (ממוצע/שכיח/היסטוריה). לא דורס שורות שנענו, ויוצר גיבוי לפני שינוי.</p>
        <button class="btn btn-primary" onclick="runMatrixCompletion(false)">🔍 סריקה (Preview)</button>
        <button class="btn btn-success" onclick="runMatrixCompletion(true)" style="margin-inline-start:8px;">🧩 השלמת מטריצות</button>
        <div id="matrixCompleteResult" style="margin-top:12px;font-size:13px;text-align:start;"></div>
      </div>
    </div>
    <div style="margin-top:24px;padding-top:24px;border-top:1px solid var(--slate-200);">
      <h4 style="margin-bottom:12px;">🌐 API Endpoints</h4>
      <div style="background:var(--slate-50);padding:16px;border-radius:8px;font-family:monospace;font-size:13px;">
        <div>GET /api/forms.php?action=get&id=${form.id}</div>
        <div>GET /api/responses.php?action=list&formId=${form.id}</div>
        <div>POST /api/responses.php?action=submit&formId=${form.id}</div>
      </div>
    </div>
  </div>`;
}

// === עזרי ייצוא: המרת ערך תגובה למחרוזת קריאה (ללא [object Object]) ===
function csvOptionLabel(f, val) {
  if (val === '__other__') return '__other__';
  const opt = (f.options || []).find(o => o.value === val || o.id === val);
  if (opt) return opt.label != null ? String(opt.label) : String(val);
  return String(val);
}

function recordDisplayValue(f, rec) {
  if (rec == null) return '';
  if (typeof rec !== 'object') return String(rec);
  const df = f.displayField || f.sourceDisplayField || null;
  if (df && rec[df] != null && rec[df] !== '') return String(rec[df]);
  const keys = Object.keys(rec);
  const nameKey = keys.find(k => /שם|name/i.test(k));
  if (nameKey && rec[nameKey]) return String(rec[nameKey]);
  const nonEmpty = keys.find(k => rec[k] != null && String(rec[k]).trim() !== '');
  return nonEmpty ? String(rec[nonEmpty]) : (keys.length ? String(rec[keys[0]]) : '');
}

function matrixRowLabel(f, rowId) {
  const row = (f.matrixRows || []).find(r => r.id === rowId || r.value === rowId || r.label === rowId);
  if (row) return row.label != null ? String(row.label) : String(rowId);
  return String(rowId);
}

function matrixColLabel(f, colValue) {
  const col = (f.matrixColumns || []).find(c => c.value === colValue || c.id === colValue || c.label === colValue);
  if (col) return col.label != null ? String(col.label) : String(colValue);
  return String(colValue);
}

// המרה גנרית של כל ערך (מטריצות/מאגרים/בחירה מרובה/קבצים) לטקסט קריא ב-CSV
function csvCellValue(f, v, otherVal) {
  if (v === undefined || v === null || v === '') return '';
  // מטריצה: עצם {rowId: colValue | [colValues]}
  if (f && f.type === 'matrix' && typeof v === 'object' && !Array.isArray(v)) {
    const parts = [];
    Object.keys(v).forEach(rowKey => {
      const cell = v[rowKey];
      if (cell === undefined || cell === null || cell === '' || (Array.isArray(cell) && cell.length === 0)) return;
      const rowLabel = matrixRowLabel(f, rowKey);
      if (Array.isArray(cell)) {
        parts.push(rowLabel + ': ' + cell.map(cv => matrixColLabel(f, cv)).join(' / '));
      } else {
        parts.push(rowLabel + ': ' + matrixColLabel(f, cell));
      }
    });
    return parts.join('; ');
  }
  // רשומה ממאגר (עצם או מערך עצמים)
  if (f && (f.type === 'record' || f.sourceId) && typeof v === 'object') {
    if (Array.isArray(v)) return v.map(rec => recordDisplayValue(f, rec)).filter(Boolean).join('; ');
    return recordDisplayValue(f, v);
  }
  if (Array.isArray(v)) {
    return v.map(item => {
      if (item === '__other__') {
        const txt = otherVal ? String(otherVal) : '';
        return txt ? 'אחר: ' + txt : 'אחר';
      }
      if (item && typeof item === 'object') return recordDisplayValue(f || {}, item);
      return f && (f.options || []).length ? csvOptionLabel(f, item) : String(item);
    }).filter(s => s !== '').join('; ');
  }
  if (typeof v === 'object') {
    if (v.name) return String(v.name);
    if (v.url) return String(v.url);
    try { return JSON.stringify(v); } catch (e) { return String(v); }
  }
  let s = String(v);
  if (s === '__other__') {
    const txt = otherVal ? String(otherVal) : '';
    return txt ? 'אחר: ' + txt : 'אחר';
  }
  if (s.startsWith('data:image')) return '[חתימה]';
  if (s.startsWith('data:')) return '[קובץ מצורף]';
  return s;
}

function exportCSV() {
  const allFields = form.pages.flatMap(p => p.fields);
  const headers = ['תאריך שליחה', ...allFields.map(f => f.label)];
  const rows = filteredResponses.map(r => [
    formatDateTime(r.submittedAt),
    ...allFields.map(f => csvCellValue(f, r.data[f.id], r.data[f.id + '_other']))
  ]);
  const escCsv = (c) => '"' + String(c).split('"').join('""') + '"';
  const csv = '\ufeff' + [headers.map(escCsv).join(','), ...rows.map(r => r.map(escCsv).join(','))].join('\r\n');
  download(csv, `${form.settings.title}.csv`, 'text/csv;charset=utf-8;');
}

function exportJSON() {
  const data = { form: form.settings, responses, exportedAt: new Date().toISOString() };
  download(JSON.stringify(data, null, 2), `${form.settings.title}.json`, 'application/json');
}

/**
 * ייבוא תגובות מקובץ JSON שיוצר ע"י "ייצוא JSON" של המערכת (או מגיבוי קובץ התגובות).
 * נשלח ל-POST api/responses.php?action=import&formId=<id> עם טוקן CSRF.
 */
// ===== השלמת שדות אוטומטיים מהמאגר (Backfill) =====
async function runBackfill(apply) {
  const box = document.getElementById('backfillResult');
  if (!box) return;
  box.innerHTML = '<span style="color:var(--slate-500);">⏳ סורק תגובות...</span>';
  try {
    let res;
    if (apply) {
      if (!confirm('לבצע השלמה בפועל? ייווצר קובץ גיבוי לפני השינוי.')) { box.innerHTML = ''; return; }
      res = await FBAuth.writeRequest(`${API}/backfill.php?action=run&formId=${form.id}`, { method: 'POST' });
    } else {
      res = await FBAuth.fbFetch(`${API}/backfill.php?action=preview&formId=${form.id}`);
    }
    const data = res && res.data ? res.data : null;
    if (!res || !res.success || !data) {
      box.innerHTML = `<span style="color:#dc2626;">❌ ${ (res && res.error) ? res.error : 'שגיאה בתפעול' }</span>`;
      return;
    }
    if (data.message) { box.innerHTML = `<span style="color:var(--slate-500);">${data.message}</span>`; return; }
    let html = `<div style="background:var(--slate-50);border-radius:8px;padding:12px;">`;
    html += `<b>${data.dryRun ? '🔍 בדיקה מקדימה' : '✅ ההשלמה בוצעה'}</b> — סה"כ תגובות: ${data.totalResponses} | שינויים: <b>${data.changes}</b> | שדות שכבר היו מלאים: ${data.alreadyFilled}<br>`;
    if (data.backup) html += `📦 גיבוי נשמר: <code>${data.backup}</code><br>`;
    if (data.unmatchedSymbols && data.unmatchedSymbols.length) {
      html += `⚠️ סמלים שלא נמצאו במאגר: <code>${data.unmatchedSymbols.join(', ')}</code><br>`;
    }
    if (data.details && data.details.length) {
      html += `<details style="margin-top:6px;"><summary>פירוט שינויים (${data.details.length})</summary><ul style="margin:6px 0;padding-inline-start:20px;">`;
      data.details.slice(0, 100).forEach(d => {
        html += `<li>תגובה <code>${String(d.responseId||'').slice(0,8)}</code> → <b>${d.target || d.field}</b>: ${d.to && typeof d.to === 'string' ? d.to : ''}</li>`;
      });
      html += `</ul></details>`;
    }
    if (!data.dryRun && data.changes > 0) {
      html += `<div style="margin-top:8px;"><button class="btn btn-primary" onclick="location.reload()">רענן דף כדי לראות את הנתונים המעודכנים</button></div>`;
    }
    html += `</div>`;
    box.innerHTML = html;
  } catch (e) {
    console.error('Backfill error:', e);
    box.innerHTML = `<span style="color:#dc2626;">❌ שגיאה: ${e.message}</span>`;
  }
}

// ===== השלמת סעיפי מטריצה חסרים (Matrix Completion) =====
async function runMatrixCompletion(apply) {
  const box = document.getElementById('matrixCompleteResult');
  if (!box) return;
  box.innerHTML = '<span style="color:var(--slate-500);">⏳ סורק תגובות ומזהה סעיפי מטריצה חסרים...</span>';
  try {
    let res;
    if (apply) {
      if (!confirm('להשלים סעיפי מטריצה חסרים בפועל? ייווצר קובץ גיבוי לפני השינוי.\nמומלץ לבצע "סריקה (Preview)" תחילה.')) { box.innerHTML = ''; return; }
      res = await FBAuth.writeRequest(`${API}/backfill.php?action=matrix-complete&formId=${form.id}`, { method: 'POST' });
    } else {
      res = await FBAuth.fbFetch(`${API}/backfill.php?action=matrix-preview&formId=${form.id}`);
    }
    const data = res && res.data ? res.data : null;
    if (!res || !res.success || !data) {
      box.innerHTML = `<span style="color:#dc2626;">❌ ${ (res && res.error) ? res.error : 'שגיאה בתפעול' }</span>`;
      return;
    }
    if (data.message) { box.innerHTML = `<span style="color:var(--slate-500);">${data.message}</span>`; return; }
    let html = `<div style="background:var(--slate-50);border-radius:8px;padding:12px;">`;
    html += `<b>${data.dryRun ? '🔍 סריקה מקדימה' : '✅ ההשלמה בוצעה'}</b> — סה"כ תגובות: ${data.totalResponses} | סעיפים שהושלמו: <b>${data.changes}</b> | סעיפים שנענו כבר (לא נגע): ${data.alreadyFilled}<br>`;
    if (data.backup) html += `📦 גיבוי נשמר: <code>${data.backup}</code><br>`;
    if (data.details && data.details.length) {
      html += `<details style="margin-top:6px;" open><summary>פירוט השלמות (${data.details.length})</summary><ul style="margin:6px 0;padding-inline-start:20px;">`;
      data.details.slice(0, 100).forEach(d => {
        html += `<li>תגובה <code>${String(d.responseId||'').slice(0,8)}</code> → <b>${d.target}</b> = ${d.to} <span style="color:var(--slate-400);">(${d.via||''})</span></li>`;
      });
      html += `</ul></details>`;
    } else if (data.changes === 0) {
      html += `<span style="color:var(--success);">✔️ אין סעיפי מטריצה חסרים — כל התגובות שלמות.</span>`;
    }
    if (!data.dryRun && data.changes > 0) {
      html += `<div style="margin-top:8px;"><button class="btn btn-primary" onclick="location.reload()">רענן דף כדי לראות את הנתונים המעודכנים</button></div>`;
    }
    html += `</div>`;
    box.innerHTML = html;
  } catch (e) {
    console.error('Matrix completion error:', e);
    box.innerHTML = `<span style="color:#dc2626;">❌ שגיאה: ${e.message}</span>`;
  }
}

async function importResponsesFromFile(inputEl) {
  const file = inputEl.files && inputEl.files[0];
  if (!file) return;
  const resultBox = document.getElementById('importResult');
  const setMsg = (html, color) => { if (resultBox) { resultBox.innerHTML = html; if (color) resultBox.style.color = color; } };

  // ולידציה גסנה: עד 20MB
  if (file.size > 20 * 1024 * 1024) {
    setMsg('❌ הקובץ גדול מדי (מקסימום 20MB)', '#c62828');
    inputEl.value = '';
    return;
  }

  let payload;
  try {
    const text = await file.text();
    payload = JSON.parse(text);
  } catch (e) {
    setMsg('❌ הקובץ אינו JSON חוקי (' + e.message + ')', '#c62828');
    inputEl.value = '';
    return;
  }

  // זיהוי רשימת התגובות בקובץ: מעטפה {responses:[...]}, מערך גולמי, או קובץ תגובות גולמי
  let rows = null;
  if (payload && Array.isArray(payload.responses)) rows = payload.responses;
  else if (Array.isArray(payload)) rows = payload;
  if (!rows || rows.length === 0) {
    setMsg('❌ לא נמצאו תגובות בקובץ. יש להשתמש בפלט "ייצוא JSON" של המערכת', '#c62828');
    inputEl.value = '';
    return;
  }

  setMsg('⏳ מייבא ' + rows.length + ' תגובות...', '#1565c0');
  try {
    const res = await fetch(`${API}/responses.php?action=import&formId=${encodeURIComponent(form.id)}`, {
      method: 'POST',
      credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ formId: form.id, responses: rows }),
    });
    let out = null;
    try { out = await res.json(); } catch (e) { /* ננסה לחלץ מתוך תגובה מעורבת */ }
    if (!out) {
      const txt = await res.text().catch(() => '');
      const m = txt.match(/\{[\s\S]*\}\s*$/);
      if (m) { try { out = JSON.parse(m[0]); } catch (e) {} }
      if (!out) {
        setMsg('❌ השירות החזיר תשובה לא צפויה (HTTP ' + res.status + '). בדוק את לוג ה-PHP.', '#c62828');
        inputEl.value = '';
        return;
      }
    }
    // גיבוי עצמי ל-CSRF: installAutoCsrf של fb-auth.js מוסיף אוטומטית את הטוקן
    // ומבצע ניסיון חוזר אחד ב-419. אם בכל זאת נכשל – מנסים שוב עם טוקן עדש מהשרת.
    if (res.status === 419 || (out && out.csrfFail)) {
      try {
        const fresh = await FBAuth.ensureCsrfToken('../api');
        if (fresh) {
          const retry = await fetch(`${API}/responses.php?action=import&formId=${encodeURIComponent(form.id)}`, {
            method: 'POST',
            credentials: 'same-origin',
            headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': fresh },
            body: JSON.stringify({ formId: form.id, responses: rows }),
          });
          out = await retry.json().catch(() => null);
          if (retry.ok && out && out.success) res.status = retry.status; // ממשיכים לזרימת ההצלחה
          else if (out && out.error) { setMsg('❌ ' + out.error, '#c62828'); inputEl.value = ''; return; }
        }
      } catch (e) { /* נופל להודעה הכללית למטה */ }
    }
    if (res.ok && out.success) {
      const dup = out.skippedDuplicates ? ` (${out.skippedDuplicates} כפילויות דולגו)` : '';
      const bad = out.invalid ? ` (${out.invalid} שורות לא תקינות נדחו)` : '';
      setMsg(`✅ יובאו ${out.imported} תגובות${dup}${bad}. מרענן נתונים...`, '#2e7d32');
      inputEl.value = '';
      await init(); // טעינה מחדש מלאה של הנתונים והדוח
    } else {
      setMsg('❌ ' + (out.error || 'הייבוא נכשל'), '#c62828');
      inputEl.value = '';
    }
  } catch (e) {
    setMsg('❌ שגיאת תקשורת: ' + e.message, '#c62828');
    inputEl.value = '';
  }
}

function exportFormStructure() {
  // ייצוא מבנה השאלון בלבד (ללא תשובות)
  const formStructure = {
    id: form.id,
    settings: form.settings,
    pages: form.pages,
    createdAt: form.createdAt,
    updatedAt: form.updatedAt,
    status: form.status,
    exportedAt: new Date().toISOString(),
    metadata: {
      totalPages: form.pages.length,
      totalFields: form.pages.reduce((sum, page) => sum + page.fields.length, 0),
      fieldTypes: form.pages.reduce((types, page) => {
        page.fields.forEach(field => {
          types[field.type] = (types[field.type] || 0) + 1;
        });
        return types;
      }, {})
    }
  };
  
  download(
    JSON.stringify(formStructure, null, 2), 
    `${form.settings.title}_structure.json`, 
    'application/json'
  );
}

function exportWord() {
  const primaryColor = form.settings.theme?.primaryColor || '#2563eb';
  const title = form.settings.title || 'סקר';
  const description = form.settings.description || '';
  
  // מונה שאלות גלובלי
  let questionNumber = 0;
  
  // בניית HTML ל-Word עם CSS מיוחד למניעת חיתוך שאלות
  let html = `
<!DOCTYPE html>
<html xmlns:o='urn:schemas-microsoft-com:office:office' 
      xmlns:w='urn:schemas-microsoft-com:office:word' 
      xmlns:w14='http://schemas.microsoft.com/office/word/2010/wordml'
      xmlns:v='urn:schemas-microsoft-com:vml'
      xmlns='http://www.w3.org/TR/REC-html40'>
<head>
<meta charset='utf-8'>
<title>${esc(title)}</title>
<!--[if gte mso 9]>
<xml>
<w:WordDocument>
<w:View>Print</w:View>
<w:Zoom>100</w:Zoom>
<w:DoNotOptimizeForBrowser/>
<w:DisplayHorizontalDrawingGridEvery>0</w:DisplayHorizontalDrawingGridEvery>
<w:DisplayVerticalDrawingGridEvery>0</w:DisplayVerticalDrawingGridEvery>
<w:UseVirtualViewPort/>
<w:Compatibility>
<w:UseFELayout/>
</w:Compatibility>
</w:WordDocument>
</xml>
<![endif]-->
<style>
@page {
  size: A4;
  margin: 2cm;
  mso-page-orientation: portrait;
}
body {
  font-family: 'Arial', 'David', 'Times New Roman', 'Traditional Arabic', 'Simplified Arabic', sans-serif;
  direction: rtl;
  line-height: 1.8;
  color: #1e293b;
  font-size: 12pt;
}
.header {
  text-align: center;
  margin-bottom: 30px;
  padding-bottom: 20px;
  border-bottom: 3px solid ${primaryColor};
}
.header h1 {
  color: ${primaryColor};
  font-size: 28pt;
  margin: 0 0 10px 0;
  font-weight: bold;
}
.header p {
  color: #64748b;
  font-size: 12pt;
  margin: 0;
}
.page-title {
  font-size: 18pt;
  font-weight: bold;
  color: ${primaryColor};
  margin: 30px 0 20px 0;
  padding: 10px;
  background-color: #f1f5f9;
  border-right: 4px solid ${primaryColor};
  page-break-after: avoid;
}
.question-container {
  margin-bottom: 25px;
  padding: 15px;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  background-color: #fafafa;
  page-break-inside: avoid !important;
  break-inside: avoid !important;
  mso-element: para-border;
  mso-element-frame-prms: '[height:100;wrap-page:1;wrap-h:1;wrap-h-rule:atleast;wrap-v:1;wrap-v-rule:atleast;anchor-h:margin;anchor-h-rel:margin;anchor-v:margin;anchor-v-rel:margin;x-pos:0;x-rel:margin;y-pos:0;y-rel:margin]';
}
.question-label {
  font-size: 13pt;
  font-weight: bold;
  color: #1e293b;
  margin-bottom: 12px;
  display: block;
}
.question-number {
  display: inline-block;
  background-color: ${primaryColor};
  color: white;
  width: 28px;
  height: 28px;
  line-height: 28px;
  text-align: center;
  border-radius: 50%;
  font-size: 11pt;
  font-weight: bold;
  margin-left: 8px;
}
.required-mark {
  color: #dc2626;
  font-weight: bold;
}
.options-list {
  margin: 10px 0;
  padding: 0;
  list-style: none;
}
.options-list li {
  margin: 8px 0;
  padding: 8px 12px;
  background-color: white;
  border: 1px solid #cbd5e1;
  border-radius: 4px;
}
.input-line {
  border-bottom: 1px solid #94a3b8;
  margin: 15px 0;
  min-height: 30px;
}
.text-area {
  border: 1px solid #94a3b8;
  min-height: 80px;
  margin: 15px 0;
  background-color: white;
  padding: 10px;
}
.rating-table {
  width: 100%;
  border-collapse: collapse;
  margin: 15px 0;
  page-break-inside: avoid;
}
.rating-table th {
  background-color: ${primaryColor};
  color: white;
  padding: 12px 8px;
  text-align: center;
  border: 1px solid ${primaryColor};
  font-size: 11pt;
}
.rating-table td {
  padding: 12px 8px;
  border: 1px solid #cbd5e1;
  text-align: center;
  background-color: white;
  font-size: 11pt;
}
.rating-label {
  font-size: 10pt;
  color: #64748b;
  margin-top: 4px;
}
.matrix-table {
  width: 100%;
  border-collapse: collapse;
  margin: 10px 0;
  page-break-inside: avoid;
}
.matrix-table th {
  background-color: ${primaryColor};
  color: white;
  padding: 10px;
  text-align: center;
  border: 1px solid ${primaryColor};
}
.matrix-table td {
  padding: 10px;
  border: 1px solid #cbd5e1;
  text-align: center;
  background-color: white;
}
.matrix-table td:first-child {
  text-align: right;
  font-weight: bold;
  background-color: #f8fafc;
}
.footer {
  margin-top: 40px;
  padding-top: 20px;
  border-top: 2px solid #e2e8f0;
  text-align: center;
  color: #64748b;
  font-size: 10pt;
}
input[type="text"], input[type="email"], input[type="tel"], input[type="number"] {
  width: 100%;
  border: none;
  border-bottom: 1px solid #94a3b8;
  padding: 8px;
  font-size: 11pt;
  background-color: transparent;
}
textarea {
  width: 100%;
  border: 1px solid #94a3b8;
  padding: 8px;
  font-size: 11pt;
  min-height: 60px;
  background-color: white;
}
</style>
</head>
<body>
<div class="header">
  <h1>${esc(title)}</h1>
  ${description ? `<p>${esc(description)}</p>` : ''}
</div>
`;

  // מעבר על כל העמודים והשאלות
  form.pages.forEach((page, pageIndex) => {
    if (form.pages.length > 1) {
      html += `<div class="page-title">${esc(page.title || `עמוד ${pageIndex + 1}`)}</div>`;
    }
    
    page.fields.forEach(field => {
      // מספור שאלות (לא כולל divider ו-heading)
      if (!['divider', 'heading'].includes(field.type)) {
        questionNumber++;
      }
      html += renderFieldForWord(field, questionNumber, dataSourcesWithRecords);
    });
  });

  html += `
<div class="footer">
  <p>נוצר על ידי Form Builder Pro | ${new Date().toLocaleDateString('he-IL')}</p>
</div>
</body>
</html>`;

  // יצירת קובץ Word
  const blob = new Blob(['\ufeff', html], {
    type: 'application/msword'
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${title}.doc`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function renderFieldForWord(field, questionNum, dataSources = []) {
  const required = field.required ? '<span class="required-mark">*</span>' : '';
  const numberBadge = !['divider', 'heading', 'calculation'].includes(field.type) 
    ? `<span class="question-number">${questionNum}</span>` 
    : '';
  
  let html = `<div class="question-container">`;
  html += `<span class="question-label">${numberBadge}${esc(field.label)} ${required}</span>`;
  
  if (field.helpText) {
    html += `<p style="font-size:10pt;color:#64748b;margin:5px 0;">${esc(field.helpText)}</p>`;
  }

  switch (field.type) {
    case 'text':
    case 'email':
    case 'phone':
      // Plain Text Content Control - שורה חדשה, בלי טקסט מנחה
      html += `<w:p/>
      <w:sdt>
        <w:sdtPr>
          <w:text/>
        </w:sdtPr>
        <w:sdtContent>
          <w:p>
            <w:pPr>
              <w:pBdr>
                <w:bottom w:val="single" w:sz="4" w:space="1" w:color="auto"/>
              </w:pBdr>
            </w:pPr>
            <w:r>
              <w:rPr>
                <w:rFonts w:ascii="Arial" w:hAnsi="Arial" w:cs="Arial"/>
                <w:sz w:val="22"/>
                <w:szCs w:val="22"/>
              </w:rPr>
              <w:t></w:t>
            </w:r>
          </w:p>
        </w:sdtContent>
      </w:sdt>`;
      break;
    
    case 'number':
      // Plain Text Content Control for numbers - שורה חדשה, בלי טקסט מנחה
      html += `<w:p/>
      <w:sdt>
        <w:sdtPr>
          <w:text/>
        </w:sdtPr>
        <w:sdtContent>
          <w:p>
            <w:pPr>
              <w:pBdr>
                <w:bottom w:val="single" w:sz="4" w:space="1" w:color="auto"/>
              </w:pBdr>
            </w:pPr>
            <w:r>
              <w:rPr>
                <w:rFonts w:ascii="Arial" w:hAnsi="Arial" w:cs="Arial"/>
                <w:sz w:val="22"/>
                <w:szCs w:val="22"/>
              </w:rPr>
              <w:t></w:t>
            </w:r>
          </w:p>
        </w:sdtContent>
      </w:sdt>`;
      break;
    
    case 'textarea':
    case 'richtext':
      // Plain Text Content Control for long text - שורה חדשה, בלי טקסט מנחה
      html += `<w:p/>
      <w:sdt>
        <w:sdtPr>
          <w:text/>
        </w:sdtPr>
        <w:sdtContent>
          <w:p>
            <w:pPr>
              <w:pBdr>
                <w:top w:val="single" w:sz="4" w:space="1" w:color="auto"/>
                <w:left w:val="single" w:sz="4" w:space="4" w:color="auto"/>
                <w:bottom w:val="single" w:sz="4" w:space="1" w:color="auto"/>
                <w:right w:val="single" w:sz="4" w:space="4" w:color="auto"/>
              </w:pBdr>
            </w:pPr>
            <w:r>
              <w:rPr>
                <w:rFonts w:ascii="Arial" w:hAnsi="Arial" w:cs="Arial"/>
                <w:sz w:val="22"/>
                <w:szCs w:val="22"/>
              </w:rPr>
              <w:t></w:t>
            </w:r>
          </w:p>
          <w:p><w:r><w:t> </w:t></w:r></w:p>
          <w:p><w:r><w:t> </w:t></w:r></w:p>
          <w:p><w:r><w:t> </w:t></w:r></w:p>
        </w:sdtContent>
      </w:sdt>`;
      break;
    
    case 'date':
      // Plain Text Content Controls for date fields - שורה חדשה, בלי טקסט מנחה
      html += `<w:p/>
      <w:p>
        <w:pPr>
          <w:jc w:val="right"/>
        </w:pPr>
        <w:r>
          <w:rPr>
            <w:rFonts w:ascii="Arial" w:hAnsi="Arial" w:cs="Arial"/>
            <w:sz w:val="22"/>
            <w:szCs w:val="22"/>
          </w:rPr>
          <w:t>יום: </w:t>
        </w:r>
        <w:sdt>
          <w:sdtPr><w:text/></w:sdtPr>
          <w:sdtContent>
            <w:p>
              <w:pPr><w:pBdr><w:bottom w:val="single" w:sz="4" w:space="1" w:color="auto"/></w:pBdr></w:pPr>
              <w:r><w:rPr><w:rFonts w:ascii="Arial" w:hAnsi="Arial" w:cs="Arial"/><w:sz w:val="22"/><w:szCs w:val="22"/></w:rPr><w:t></w:t></w:r>
            </w:p>
          </w:sdtContent>
        </w:sdt>
        <w:r>
          <w:rPr><w:rFonts w:ascii="Arial" w:hAnsi="Arial" w:cs="Arial"/><w:sz w:val="22"/><w:szCs w:val="22"/></w:rPr>
          <w:t xml:space="preserve">   חודש: </w:t>
        </w:r>
        <w:sdt>
          <w:sdtPr><w:text/></w:sdtPr>
          <w:sdtContent>
            <w:p>
              <w:pPr><w:pBdr><w:bottom w:val="single" w:sz="4" w:space="1" w:color="auto"/></w:pBdr></w:pPr>
              <w:r><w:rPr><w:rFonts w:ascii="Arial" w:hAnsi="Arial" w:cs="Arial"/><w:sz w:val="22"/><w:szCs w:val="22"/></w:rPr><w:t></w:t></w:r>
            </w:p>
          </w:sdtContent>
        </w:sdt>
        <w:r>
          <w:rPr><w:rFonts w:ascii="Arial" w:hAnsi="Arial" w:cs="Arial"/><w:sz w:val="22"/><w:szCs w:val="22"/></w:rPr>
          <w:t xml:space="preserve">   שנה: </w:t>
        </w:r>
        <w:sdt>
          <w:sdtPr><w:text/></w:sdtPr>
          <w:sdtContent>
            <w:p>
              <w:pPr><w:pBdr><w:bottom w:val="single" w:sz="4" w:space="1" w:color="auto"/></w:pBdr></w:pPr>
              <w:r><w:rPr><w:rFonts w:ascii="Arial" w:hAnsi="Arial" w:cs="Arial"/><w:sz w:val="22"/><w:szCs w:val="22"/></w:rPr><w:t></w:t></w:r>
            </w:p>
          </w:sdtContent>
        </w:sdt>
      </w:p>`;
      break;
    
    case 'select':
      // Dropdown List Content Control
      html += `<div style="margin:10px 0;padding:10px;background-color:white;border:1px solid #cbd5e1;border-radius:4px;">
        <p style="font-size:10pt;color:#64748b;margin:0 0 8px 0;">בחר אחת מהאפשרויות הבאות:</p>
        <w:sdt>
          <w:sdtPr>
            <w:dropDownList>
              ${(field.options || []).map(opt => `<w:listItem w:displayText="${esc(opt.label)}" w:value="${esc(opt.value)}"/>`).join('')}
              ${field.enableOther ? `<w:listItem w:displayText="${esc(field.otherLabel || 'אחר')}" w:value="__other__"/>` : ''}
            </w:dropDownList>
          </w:sdtPr>
          <w:sdtContent>
            <w:r>
              <w:rPr>
                <w:rFonts w:ascii="Arial" w:hAnsi="Arial" w:cs="Arial"/>
                <w:sz w:val="22"/>
                <w:szCs w:val="22"/>
              </w:rPr>
              <w:t>▼ בחר אפשרות</w:t>
            </w:r>
          </w:sdtContent>
        </w:sdt>
      </div>`;
      break;
    
    case 'radio':
      // Option Button Form Fields - בחירה יחידה
      html += `<ul class="options-list">`;
      (field.options || []).forEach((opt, idx) => {
        html += `<li><w:fldSimple w:instr=" FORMCHECKBOX "><w:r><w:rPr><w:sz w:val="22"/></w:rPr><w:t>○</w:t></w:r></w:fldSimple> ${esc(opt.label)}</li>`;
      });
      if (field.enableOther) {
        html += `<li><w:fldSimple w:instr=" FORMCHECKBOX "><w:r><w:rPr><w:sz w:val="22"/></w:rPr><w:t>○</w:t></w:r></w:fldSimple> ${esc(field.otherLabel || 'אחר')} 
        <w:sdt>
          <w:sdtPr><w:text/></w:sdtPr>
          <w:sdtContent>
            <w:p>
              <w:pPr><w:pBdr><w:bottom w:val="single" w:sz="4" w:space="1" w:color="auto"/></w:pBdr></w:pPr>
              <w:r><w:rPr><w:rFonts w:ascii="Arial" w:hAnsi="Arial" w:cs="Arial"/><w:sz w:val="22"/><w:szCs w:val="22"/></w:rPr><w:t></w:t></w:r>
            </w:p>
          </w:sdtContent>
        </w:sdt></li>`;
      }
      html += `</ul>`;
      break;
    
    case 'checkbox':
      // Checkbox Form Fields - בחירה מרובה
      html += `<p style="font-size:10pt;color:#64748b;margin:5px 0;">(ניתן לבחור יותר מאפשרות אחת)</p>`;
      html += `<ul class="options-list">`;
      (field.options || []).forEach((opt, idx) => {
        html += `<li><w:fldSimple w:instr=" FORMCHECKBOX "><w:r><w:rPr><w:sz w:val="22"/></w:rPr><w:t>☐</w:t></w:r></w:fldSimple> ${esc(opt.label)}</li>`;
      });
      if (field.enableOther) {
        html += `<li><w:fldSimple w:instr=" FORMCHECKBOX "><w:r><w:rPr><w:sz w:val="22"/></w:rPr><w:t>☐</w:t></w:r></w:fldSimple> ${esc(field.otherLabel || 'אחר')} 
        <w:sdt>
          <w:sdtPr><w:text/></w:sdtPr>
          <w:sdtContent>
            <w:p>
              <w:pPr><w:pBdr><w:bottom w:val="single" w:sz="4" w:space="1" w:color="auto"/></w:pBdr></w:pPr>
              <w:r><w:rPr><w:rFonts w:ascii="Arial" w:hAnsi="Arial" w:cs="Arial"/><w:sz w:val="22"/><w:szCs w:val="22"/></w:rPr><w:t></w:t></w:r>
            </w:p>
          </w:sdtContent>
        </w:sdt></li>`;
      }
      html += `</ul>`;
      break;
    
    case 'rating':
      // Rating scale - סולם דירוג עם Option Buttons
      html += `<table class="rating-table">
        <thead>
          <tr>
            <th style="width:120px;background-color:#f8fafc;color:#1e293b;border:2px solid #cbd5e1;">דירוג</th>
            ${(field.options || []).map((opt, idx) => `<th style="background-color:${form.settings.theme?.primaryColor || '#2563eb'};">
              <div style="font-size:16pt;font-weight:bold;color:white;">${idx + 1}</div>
              <div style="font-size:9pt;color:white;margin-top:4px;">${esc(opt.label)}</div>
            </th>`).join('')}
          </tr>
        </thead>
        <tbody>
          <tr>
            <td style="font-weight:bold;text-align:right;background-color:#f8fafc;border:2px solid #cbd5e1;">סמן את הדירוג:</td>
            ${(field.options || []).map((opt, idx) => `<td style="border:2px solid #cbd5e1;padding:15px;text-align:center;">
              <w:fldSimple w:instr=" FORMCHECKBOX "><w:r><w:rPr><w:sz w:val="28"/></w:rPr><w:t>○</w:t></w:r></w:fldSimple>
            </td>`).join('')}
          </tr>
        </tbody>
      </table>`;
      break;
    
    case 'matrix':
      // Matrix - מטריצה עם Checkbox/Option Buttons
      const isCheckbox = field.matrixType === 'checkbox';
      html += `<table class="matrix-table">
        <thead>
          <tr>
            <th style="background-color:${form.settings.theme?.primaryColor || '#2563eb'};">&nbsp;</th>
            ${(field.matrixColumns || []).map(col => `<th style="background-color:${form.settings.theme?.primaryColor || '#2563eb'};">${esc(col.label)}</th>`).join('')}
          </tr>
        </thead>
        <tbody>
          ${(field.matrixRows || []).map((row, rowIdx) => `
            <tr>
              <td style="font-weight:bold;text-align:right;">${esc(row.label)}</td>
              ${(field.matrixColumns || []).map((col, colIdx) => `<td style="text-align:center;padding:12px;">
                <w:fldSimple w:instr=" FORMCHECKBOX "><w:r><w:rPr><w:sz w:val="24"/></w:rPr><w:t>${isCheckbox ? '☐' : '○'}</w:t></w:r></w:fldSimple>
              </td>`).join('')}
            </tr>
          `).join('')}
        </tbody>
      </table>`;
      break;
    
    case 'signature':
      html += `<div style="border:2px dashed #94a3b8;min-height:120px;margin:15px 0;background-color:white;padding:10px;">
        <p style="color:#94a3b8;text-align:center;margin:0;font-size:11pt;">אזור חתימה</p>
        <p style="color:#94a3b8;text-align:center;margin:5px 0 0 0;font-size:9pt;">חתום/י כאן</p>
      </div>`;
      break;
    
    case 'file':
      html += `<div style="border:2px dashed #94a3b8;padding:30px;text-align:center;margin:15px 0;background-color:white;">
        <p style="color:#94a3b8;margin:0;font-size:11pt;">📎 אזור העלאת קובץ</p>
        <p style="color:#94a3b8;margin:5px 0 0 0;font-size:9pt;">צרף/י קובץ כאן</p>
      </div>`;
      break;
    
    case 'heading':
      html = `<div style="font-size:16pt;font-weight:bold;color:${form.settings.theme?.primaryColor || '#2563eb'};margin:20px 0 10px 0;page-break-after:avoid;">${esc(field.label)}</div>`;
      break;
    
    case 'divider':
      html = `<hr style="border:none;border-top:2px solid #e2e8f0;margin:20px 0;">`;
      break;
    
    case 'record':
      // הצג את הרשומות מהמאגר כרשימת Option Buttons
      const source = dataSources.find(s => s.id === field.sourceId);
      if (source && source.records && source.records.length > 0) {
        const displayField = field.displayField || (source.fields && source.fields[0]);
        
        html += `<w:p/>
        <ul class="options-list">`;
        
        // הצג עד 20 רשומות
        const recordsToShow = source.records.slice(0, 20);
        recordsToShow.forEach((record, idx) => {
          const displayValue = displayField ? record[displayField] : Object.values(record)[0];
          html += `<li><w:fldSimple w:instr=" FORMCHECKBOX "><w:r><w:rPr><w:sz w:val="22"/></w:rPr><w:t>○</w:t></w:r></w:fldSimple> ${esc(displayValue)}</li>`;
        });
        
        // אם יש יותר מ-20 רשומות, הוסף הערה
        if (source.records.length > 20) {
          html += `<li style="color:#64748b;font-size:10pt;">... ועוד ${source.records.length - 20} רשומות</li>`;
        }
        
        // הוסף אפשרות "אחר"
        if (field.enableOther) {
          html += `<li><w:fldSimple w:instr=" FORMCHECKBOX "><w:r><w:rPr><w:sz w:val="22"/></w:rPr><w:t>○</w:t></w:r></w:fldSimple> ${esc(field.otherLabel || 'אחר')} 
          <w:sdt>
            <w:sdtPr><w:text/></w:sdtPr>
            <w:sdtContent>
              <w:p>
                <w:pPr><w:pBdr><w:bottom w:val="single" w:sz="4" w:space="1" w:color="auto"/></w:pBdr></w:pPr>
                <w:r><w:rPr><w:rFonts w:ascii="Arial" w:hAnsi="Arial" w:cs="Arial"/><w:sz w:val="22"/><w:szCs w:val="22"/></w:rPr><w:t></w:t></w:r>
              </w:p>
            </w:sdtContent>
          </w:sdt></li>`;
        }
        
        html += `</ul>`;
      } else {
        // אם אין מאגר או אין רשומות, הצג שדה טקסט ריק
        html += `<w:p/>
        <w:sdt>
          <w:sdtPr><w:text/></w:sdtPr>
          <w:sdtContent>
            <w:p>
              <w:pPr><w:pBdr><w:bottom w:val="single" w:sz="4" w:space="1" w:color="auto"/></w:pBdr></w:pPr>
              <w:r><w:rPr><w:rFonts w:ascii="Arial" w:hAnsi="Arial" w:cs="Arial"/><w:sz w:val="22"/><w:szCs w:val="22"/></w:rPr><w:t></w:t></w:r>
            </w:p>
          </w:sdtContent>
        </w:sdt>`;
      }
      break;
    
    case 'calculation':
      html += `<div style="background-color:#f3e8ff;padding:15px;border-radius:8px;text-align:center;color:#7c3aed;font-weight:bold;">🧮 שדה חישוב (מוצג אוטומטית)</div>`;
      break;
    
    default:
      // Plain Text Content Control for default - שורה חדשה, בלי טקסט מנחה
      html += `<w:p/>
      <w:sdt>
        <w:sdtPr>
          <w:text/>
        </w:sdtPr>
        <w:sdtContent>
          <w:p>
            <w:pPr>
              <w:pBdr>
                <w:bottom w:val="single" w:sz="4" w:space="1" w:color="auto"/>
              </w:pBdr>
            </w:pPr>
            <w:r>
              <w:rPr>
                <w:rFonts w:ascii="Arial" w:hAnsi="Arial" w:cs="Arial"/>
                <w:sz w:val="22"/>
                <w:szCs w:val="22"/>
              </w:rPr>
              <w:t></w:t>
            </w:r>
          </w:p>
        </w:sdtContent>
      </w:sdt>`;
  }
  
  html += `</div>`;
  return html;
}

function download(content, filename, type) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

function getFieldDistribution(fieldId, field) {
  const dist = {};
  filteredResponses.forEach(r => {
    const v = r.data[fieldId];
    if (v === undefined || v === '') return;
    if (Array.isArray(v)) {
      v.forEach(val => { const opt = field.options?.find(o => o.value === val); dist[opt?.label || String(val)] = (dist[opt?.label || String(val)] || 0) + 1; });
    } else {
      const opt = field.options?.find(o => o.value === v);
      const label = opt?.label || String(v);
      dist[label] = (dist[label] || 0) + 1;
    }
  });
  return Object.entries(dist).map(([label, count]) => ({ label, count }));
}

function getFieldAvg(fieldId) {
  const nums = filteredResponses.map(r => Number(r.data[fieldId])).filter(n => !isNaN(n));
  return nums.length ? nums.reduce((a,b)=>a+b,0)/nums.length : 0;
}

// ===== פונקציות גרפים =====
let chartInstances = {};

function createChart(field, fieldIndex, chartType = 'bar') {
  const canvas = document.getElementById(`chart-${fieldIndex}`);
  if (!canvas) return;
  
  // השמדת גרף קיים אם יש
  if (chartInstances[fieldIndex]) {
    chartInstances[fieldIndex].destroy();
  }
  
  const ctx = canvas.getContext('2d');
  let chartData = {};
  
  if (field.type === 'matrix') {
    // גרף למטריצה - הצגה נכונה: גרף עמודות מקובצות
    // כל שורה (פריט/טיעון) מוצגת כקבוצה, כל עמודה (דירוג) בצבע שונה
    
    // בדוק אם יש פילטר פעיל לשדה matrix
    const activeFilter = activeFilters[field.id];
    let rowsToDisplay = field.matrixRows || [];
    
    // אם יש פילטר פעיל, הצג רק את השורה המסוננת
    if (activeFilter && activeFilter !== '__all__') {
      rowsToDisplay = rowsToDisplay.filter(row => row.id === activeFilter);
    }
    
    const rowLabels = rowsToDisplay.map(row => row.label);
    
    // בניית datasets - כל עמודה (דירוג) היא dataset נפרד
    const datasets = (field.matrixColumns || []).map((col, colIdx) => {
      const data = [];
      
      // עבור כל שורה, ספור כמה פעמים נבחר הדירוג הזה
      rowsToDisplay.forEach(row => {
        let count = 0;
        filteredResponses.forEach(r => {
          const matrixData = r.data[field.id];
          if (matrixData && typeof matrixData === 'object') {
            const cellValue = matrixData[row.id];
            if (Array.isArray(cellValue)) {
              if (cellValue.includes(col.value)) count++;
            } else if (cellValue === col.value) {
              count++;
            }
          }
        });
        data.push(count);
      });
      
      return {
        label: col.label,
        data: data,
        backgroundColor: COLORS[colIdx % COLORS.length],
        borderWidth: 1,
        borderColor: '#fff'
      };
    });
    
    chartData = {
      labels: rowLabels,
      datasets: datasets
    };
  } else {
    // גרף רגיל
    const dist = getFieldDistribution(field.id, field);
    chartData = {
      labels: dist.map(d => d.label),
      datasets: [{
        label: 'מספר תשובות',
        data: dist.map(d => d.count),
        backgroundColor: COLORS.slice(0, dist.length),
        borderWidth: 2,
        borderColor: '#fff'
      }]
    };
  }
  
  const config = {
    type: chartType,
    data: chartData,
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: false // הסרת המקרא
        },
        tooltip: {
          callbacks: {
            label: function(context) {
              const label = context.label || '';
              const value = context.parsed || context.parsed.y || 0;
              const total = context.dataset.data.reduce((a, b) => a + b, 0);
              const percentage = total > 0 ? ((value / total) * 100).toFixed(1) : 0;
              return `${label}: ${value} (${percentage}%)`;
            }
          }
        },
        datalabels: {
          display: true,
          color: '#1e293b',
          font: {
            size: 12,
            weight: 'bold'
          },
          formatter: function(context) {
            // תאימות ל-Chart.js v3/v4 (item) וגרסאות ישנות יותר (context): מציאת ה-dataset בבטחה
            const ctx = (context && context.dataset) ? context
                      : (context && context.dataIndex !== undefined && context.chart) ? (context.dataset || { data: [] })
                      : null;
            const dataset = (context && context.dataset) ? context.dataset
                          : (context && context.chart && context.chart.data && context.chart.data.datasets)
                            ? context.chart.data.datasets[context.datasetIndex ?? 0]
                            : null;
            if (!dataset || !Array.isArray(dataset.data)) return '';
            const idx = (context.dataIndex !== undefined) ? context.dataIndex : 0;
            const value = Number(dataset.data[idx]) || 0;
            const total = dataset.data.reduce((a, b) => a + (Number(b) || 0), 0);
            const percentage = total > 0 ? ((value / total) * 100).toFixed(1) : 0;
            return `${value}\n(${percentage}%)`;
          },
          anchor: function(context) {
            const type = (context.dataset && context.dataset.type) || (context.chart && context.chart.config && context.chart.config.type);
            return (type === 'pie' || type === 'doughnut') ? 'center' : 'end';
          },
          align: function(context) {
            const type = (context.dataset && context.dataset.type) || (context.chart && context.chart.config && context.chart.config.type);
            return (type === 'pie' || type === 'doughnut') ? 'center' : 'top';
          }
        }
      },
      scales: ['pie', 'doughnut'].includes(chartType) ? {} : {
        y: {
          beginAtZero: true,
          ticks: {
            font: {
              family: 'Assistant'
            }
          }
        },
        x: {
          ticks: {
            font: {
              family: 'Assistant'
            }
          }
        }
      }
    }
  };
  
  chartInstances[fieldIndex] = new Chart(ctx, config);
}

function changeChartType(fieldIndex, chartType) {
  const allFields = form.pages.flatMap(p => p.fields);
  const field = allFields[fieldIndex];
  createChart(field, fieldIndex, chartType);
}

async function saveChartAsPNG(fieldIndex) {
  const container = document.getElementById(`chart-container-${fieldIndex}`);
  if (!container) return;
  
  try {
    const canvas = await html2canvas(container, {
      backgroundColor: '#ffffff',
      scale: 2
    });
    
    const link = document.createElement('a');
    link.download = `גרף-${fieldIndex + 1}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
  } catch (error) {
    console.error('Error saving chart as PNG:', error);
    alert('שגיאה בשמירת הגרף כ-PNG');
  }
}

// פונקציה להכנת נתוני גרף עבור PowerPoint
function getChartDataForPPT(field) {
  if (field.type === 'matrix') {
    // גרף עמודות מקובצות למטריצה
    const activeFilter = activeFilters[field.id];
    let rowsToDisplay = field.matrixRows || [];
    
    if (activeFilter && activeFilter !== '__all__') {
      rowsToDisplay = rowsToDisplay.filter(row => row.id === activeFilter);
    }
    
    const rowLabels = rowsToDisplay.map(row => row.label);
    
    // בניית datasets
    const datasets = (field.matrixColumns || []).map((col, colIdx) => {
      const data = [];
      
      rowsToDisplay.forEach(row => {
        let count = 0;
        filteredResponses.forEach(r => {
          const matrixData = r.data[field.id];
          if (matrixData && typeof matrixData === 'object') {
            const cellValue = matrixData[row.id];
            if (Array.isArray(cellValue)) {
              if (cellValue.includes(col.value)) count++;
            } else if (cellValue === col.value) {
              count++;
            }
          }
        });
        data.push(count);
      });
      
      return {
        name: col.label,
        labels: rowLabels,
        values: data
      };
    });
    
    return {
      type: 'bar',
      data: datasets
    };
  } else {
    // גרף רגיל
    const dist = getFieldDistribution(field.id, field);
    
    return {
      type: 'bar',
      data: [{
        name: 'מספר תשובות',
        labels: dist.map(d => d.label),
        values: dist.map(d => d.count)
      }]
    };
  }
}

async function exportAllToPPT() {
  const allFields = form.pages.flatMap(p => p.fields);
  const chartFields = allFields.filter(f => ['radio','select','rating','checkbox','matrix'].includes(f.type));
  
  if (chartFields.length === 0) {
    alert('אין שדות עם גרפים לייצוא');
    return;
  }
  
  try {
    const pptx = new PptxGenJS();
    pptx.layout = 'LAYOUT_WIDE';
    pptx.title = form.settings.title || 'סקר';
    pptx.rtlMode = true; // הפעלת RTL
    
    // שקף כותרת
    const titleSlide = pptx.addSlide();
    titleSlide.addText(form.settings.title || 'סקר', {
      x: 0.5, y: 1, w: '90%', h: 1.5,
      fontSize: 44,
      bold: true,
      color: '2563eb',
      align: 'center',
      fontFace: 'Calibri',
      rtlMode: true
    });
    
    if (form.settings.description) {
      titleSlide.addText(form.settings.description, {
        x: 0.5, y: 2.7, w: '90%', h: 1,
        fontSize: 20,
        color: '64748b',
        align: 'center',
        fontFace: 'Calibri',
        rtlMode: true
      });
    }
    
    titleSlide.addText(`נוצר בתאריך: ${new Date().toLocaleDateString('he-IL')}`, {
      x: 0.5, y: 4.5, w: '90%', h: 0.5,
      fontSize: 14,
      color: '94a3b8',
      align: 'center',
      fontFace: 'Calibri',
      rtlMode: true
    });
    
    // יצירת שקף לכל שאלה עם גרף אינטראקטיבי
    for (let i = 0; i < chartFields.length; i++) {
      const field = chartFields[i];
      const fieldIndex = allFields.indexOf(field);
      
      const slide = pptx.addSlide();
      
      // כותרת השקף - השאלה עצמה (ניתנת לעריכה)
      slide.addText(field.label, {
        x: 0.5, y: 0.3, w: '90%', h: 0.8,
        fontSize: 28,
        bold: true,
        color: '1e293b',
        align: 'right',
        fontFace: 'Calibri',
        rtlMode: true
      });
      
      // יצירת גרף אינטראקטיבי ב-PowerPoint
      const chartData = getChartDataForPPT(field);
      
      if (chartData) {
        slide.addChart(chartData.type, chartData.data, {
          x: 0.5, y: 1.3, w: 12, h: 5.5,
          showTitle: false,
          showLegend: true,
          legendPos: 'b',
          showValue: true,
          catAxisLabelFontFace: 'Calibri',
          catAxisLabelFontSize: 11,
          valAxisLabelFontFace: 'Calibri',
          valAxisLabelFontSize: 11,
          dataLabelFontFace: 'Calibri',
          dataLabelFontSize: 10,
          legendFontFace: 'Calibri',
          legendFontSize: 11,
          rtlMode: true
        });
      }
      
      // הוספת מספר תשובות
      const count = filteredResponses.filter(r => r.data[field.id] !== undefined && r.data[field.id] !== '').length;
      slide.addText(`מספר תשובות: ${count}`, {
        x: 0.5, y: 7, w: '90%', h: 0.4,
        fontSize: 14,
        color: '64748b',
        align: 'right',
        fontFace: 'Calibri',
        rtlMode: true
      });
    }
    
    // שמירת הקובץ
    await pptx.writeFile({ fileName: `${form.settings.title || 'סקר'}_גרפים.pptx` });
  } catch (error) {
    console.error('Error exporting to PPT:', error);
    alert('שגיאה בייצוא ל-PowerPoint');
  }
}

function esc(s) { if(!s) return ''; const d = document.createElement('div'); d.textContent = s; return d.innerHTML; }
function formatDateTime(d) { if(!d) return ''; return new Date(d).toLocaleString('he-IL'); }

init();
