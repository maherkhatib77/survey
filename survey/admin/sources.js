// Data Sources Management
let sources = [];
let currentSource = null;
let currentRecords = [];
let editingRecordIndex = null; // מעקב אחרי רשומה בעריכה (אינדקס ב-currentRecords)
let lastFilteredRecords = null; // הרשומות המוצגות כרגע (אחרי סינון חיפוש)

// ייצוב סדר: מיון לפי עמודת "סדר" אם קיימת — זהה למערך ולתצוגה
function sortRecordsByOrder(records, fields) {
    if (!Array.isArray(records)) return [];
    if (!fields || !fields.includes('סדר')) return records.slice();
    return records.slice().sort((a, b) => {
        const na = parseFloat(a['סדר']), nb = parseFloat(b['סדר']);
        const va = isNaN(na) ? Infinity : na;
        const vb = isNaN(nb) ? Infinity : nb;
        if (va !== vb) return va - vb;
        return String(a[fields[0]] || '').localeCompare(String(b[fields[0]] || ''), 'he');
    });
}

// השוואת תוכן רשומה (למציאת אינדקס אמין ב-currentRecords)
function recordContentKey(rec) {
    return JSON.stringify(rec);
}

// Load sources on page load
document.addEventListener('DOMContentLoaded', async () => {
    await loadSources();
});

async function loadSources() {
    try {
        const response = await fetch('../api/sources.php?action=list');
        const result = await response.json();
        
        if (result.success) {
            sources = result.data;
            renderSources();
        } else {
            showError('שגיאה בטעינת מאגרים');
        }
    } catch (error) {
        showError('שגיאה בחיבור לשרת');
    }
}

function renderSources() {
    const container = document.getElementById('sourcesList');
    
    if (sources.length === 0) {
        container.innerHTML = `
            <div class="empty-state" style="grid-column:1/-1;">
                <div class="icon">🗄️</div>
                <h3>אין מאגרי נתונים</h3>
                <p>צור מאגר חדש כדי להתחיל</p>
                <button class="btn btn-primary" onclick="showCreateModal()">➕ צור מאגר חדש</button>
            </div>
        `;
        return;
    }
    
    container.innerHTML = sources.map(source => `
        <div class="source-card">
            <div class="source-header">
                <div style="flex:1;">
                    <div class="source-title">${escapeHtml(source.name)}</div>
                    <div class="source-desc">${escapeHtml(source.description || 'ללא תיאור')}</div>
                </div>
            </div>
            <div class="source-meta">
                <span>📊 ${source.recordCount || 0} רשומות</span>
                <span>🏷️ ${source.fields ? source.fields.length : 0} שדות</span>
                <span>📅 ${formatDate(source.updatedAt)}</span>
            </div>
            <div class="source-actions">
                <button class="btn btn-sm btn-outline" onclick="viewRecords('${source.id}')">👁️ צפה ברשומות</button>
                <button class="btn btn-sm btn-outline" onclick="editSource('${source.id}')">✏️ ערוך</button>
                <button class="btn btn-sm btn-outline" onclick="exportSource('${source.id}', 'csv')" title="ייצוא לקובץ CSV">📥 CSV</button>
                <button class="btn btn-sm btn-outline" onclick="exportSource('${source.id}', 'excel')" title="ייצוא לקובץ Excel">📊 Excel</button>
                <button class="btn btn-sm btn-outline" style="color:var(--danger);" onclick="deleteSource('${source.id}')">🗑️ מחק</button>
            </div>
        </div>
    `).join('');
}

/**
 * ייצוא מאגר – פותח כתורן מוסתר כך שהדפדפן מוריד את הקובץ ישירות
 * (ה-Session/Cookie נשלחים אוטומטית, ולכן אין צורך בטוקן CSRF ב-GET).
 */
function exportSource(id, format) {
    const source = sources.find(s => s.id === id);
    if (source && (source.recordCount || 0) === 0) {
        showError('המאגר ריק – אין מה לייצא');
        return;
    }
    const url = `../api/sources.php?action=export&id=${encodeURIComponent(id)}&format=${format}`;
    const a = document.createElement('a');
    a.href = url;
    a.download = '';
    document.body.appendChild(a);
    a.click();
    a.remove();
}

// ייצוא מהחלון "צפה ברשומות" – מייצא את כל המאגר הפתוח (לא רק את התוצאות המסוננות)
function exportCurrentSource(format) {
    if (!currentSource) return;
    exportSource(currentSource.id, format);
}

function showCreateModal() {
    document.getElementById('modalTitle').textContent = 'צור מאגר חדש';
    document.getElementById('sourceName').value = '';
    document.getElementById('sourceDescription').value = '';
    document.getElementById('fieldsList').innerHTML = '';
    addField(); // Add one default field
    document.getElementById('sourceModal').style.display = 'flex';
}

function editSource(id) {
    const source = sources.find(s => s.id === id);
    if (!source) return;
    
    // Load full source with records
    fetch(`../api/sources.php?action=get&id=${id}`)
        .then(res => res.json())
        .then(result => {
            if (result.success) {
                currentSource = result.data;
                document.getElementById('modalTitle').textContent = 'ערוך מאגר';
                document.getElementById('sourceName').value = currentSource.name;
                document.getElementById('sourceDescription').value = currentSource.description || '';
                
                const fieldsList = document.getElementById('fieldsList');
                fieldsList.innerHTML = '';
                
                if (currentSource.fields && currentSource.fields.length > 0) {
                    currentSource.fields.forEach(field => addField(field));
                } else {
                    addField();
                }
                
                document.getElementById('sourceModal').style.display = 'flex';
            }
        });
}

function addField(fieldName = '') {
    const fieldsList = document.getElementById('fieldsList');
    const fieldDiv = document.createElement('div');
    fieldDiv.className = 'field-row';
    fieldDiv.innerHTML = `
        <input type="text" class="field-name" placeholder="שם השדה" value="${escapeHtml(fieldName)}">
        <button class="btn btn-sm btn-outline" style="color:var(--danger);" onclick="this.parentElement.remove()">✕</button>
    `;
    fieldsList.appendChild(fieldDiv);
}

async function saveSource() {
    const name = document.getElementById('sourceName').value.trim();
    const description = document.getElementById('sourceDescription').value.trim();
    
    if (!name) {
        showError('יש להזין שם למאגר');
        return;
    }
    
    const fieldInputs = document.querySelectorAll('.field-name');
    const fields = Array.from(fieldInputs)
        .map(input => input.value.trim())
        .filter(f => f.length > 0);
    
    if (fields.length === 0) {
        showError('יש להגדיר לפחות שדה אחד');
        return;
    }
    
    const sourceData = {
        name,
        description,
        fields
    };
    
    try {
        let response;
        if (currentSource) {
            // Update existing
            sourceData.records = currentSource.records || [];
            response = await fetch(`../api/sources.php?action=update&id=${currentSource.id}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(sourceData)
            });
        } else {
            // Create new
            sourceData.records = [];
            response = await fetch('../api/sources.php?action=create', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(sourceData)
            });
        }
        
        const result = await response.json();
        
        if (result.success) {
            closeModal();
            await loadSources();
            showSuccess(currentSource ? 'המאגר עודכן בהצלחה' : 'המאגר נוצר בהצלחה');
        } else {
            showError(result.error || 'שגיאה בשמירה');
        }
    } catch (error) {
        showError('שגיאה בחיבור לשרת');
    }
}

async function deleteSource(id) {
    if (!confirm('האם אתה בטוח שברצונך למחוק מאגר זה? פעולה זו בלתי הפיכה.')) {
        return;
    }
    
    try {
        const response = await fetch(`../api/sources.php?id=${id}`, {
            method: 'DELETE'
        });
        
        const result = await response.json();
        
        if (result.success) {
            await loadSources();
            showSuccess('המאגר נמחק בהצלחה');
        } else {
            showError(result.error || 'שגיאה במחיקה');
        }
    } catch (error) {
        showError('שגיאה בחיבור לשרת');
    }
}

async function viewRecords(id) {
    try {
        const response = await fetch(`../api/sources.php?action=get&id=${id}`);
        const result = await response.json();
        
        if (result.success) {
            currentSource = result.data;
            // מיון יציב — זהה הן למערך והן לתצוגה, כך שאינדקסים תואמים
            currentRecords = sortRecordsByOrder(result.data.records || [], result.data.fields);
            lastFilteredRecords = null;

            document.getElementById('recordsTitle').textContent = `${result.data.name} - רשומות`;
            renderRecords();
            document.getElementById('recordsModal').style.display = 'flex';
        }
    } catch (error) {
        showError('שגיאה בטעינת רשומות');
    }
}

function renderRecords(filteredRecords = null) {
    const records = filteredRecords || currentRecords;
    const container = document.getElementById('recordsTable');
    
    if (!currentSource || !currentSource.fields) {
        container.innerHTML = '<p>אין שדות מוגדרים</p>';
        return;
    }
    
    if (records.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <p>אין רשומות במאגר</p>
                <button class="btn btn-primary" onclick="showAddRecordModal()">➕ הוסף רשומה</button>
            </div>
        `;
        return;
    }
    
    let html = '<table class="data-table"><thead><tr>';
    currentSource.fields.forEach(field => {
        html += `<th>${escapeHtml(field)}</th>`;
    });
    html += '<th>פעולות</th></tr></thead><tbody>';
    
    records.forEach((record) => {
        // האינדקס האמיתי ב-currentRecords — גם בתצוגה מסוננת אחרי חיפוש
        const realIdx = currentRecords.indexOf(record);
        if (realIdx === -1) return;
        html += '<tr>';
        currentSource.fields.forEach(field => {
            html += `<td>${escapeHtml(record[field] || '')}</td>`;
        });
        html += `<td>
            <button class="btn btn-sm btn-outline" onclick="editRecord(${realIdx})" title="ערוך רשומה">✏️</button>
            <button class="btn btn-sm btn-outline" style="color:var(--danger);" onclick="deleteRecord(${realIdx})" title="מחק רשומה">🗑️</button>
        </td>`;
        html += '</tr>';
    });
    
    html += '</tbody></table>';
    container.innerHTML = html;
}

function filterRecords() {
    const query = document.getElementById('searchRecords').value.toLowerCase();
    
    if (!query) {
        renderRecords();
        return;
    }
    
    const filtered = currentRecords.filter(record => {
        return Object.values(record).some(value => 
            String(value).toLowerCase().includes(query)
        );
    });
    
    renderRecords(filtered);
}

function showAddRecordModal() {
    if (!currentSource || !currentSource.fields) return;
    
    const form = document.getElementById('addRecordForm');
    form.innerHTML = currentSource.fields.map(field => `
        <div class="field-group">
            <label>${escapeHtml(field)}</label>
            <input type="text" class="record-field form-control" data-field="${escapeHtml(field)}">
        </div>
    `).join('');
    
    document.getElementById('addRecordModal').style.display = 'flex';
}

async function saveRecord() {
    const inputs = document.querySelectorAll('.record-field');
    const record = {};
    
    inputs.forEach(input => {
        record[input.dataset.field] = input.value.trim();
    });
    
    currentRecords.push(record);
    
    try {
        const response = await fetch(`../api/sources.php?action=update&id=${currentSource.id}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                ...currentSource,
                records: currentRecords
            })
        });
        
        const result = await response.json();
        
        if (result.success) {
            closeAddRecordModal();
            await viewRecords(currentSource.id);
            await loadSources();
            showSuccess('הרשומה נוספה בהצלחה');
        } else {
            showError(result.error || 'שגיאה בשמירה');
        }
    } catch (error) {
        showError('שגיאה בחיבור לשרת');
    }
}

async function deleteRecord(index) {
    if (index == null || index < 0 || index >= currentRecords.length) {
        showError('שגיאה: הרשומה לא נמצאה. נא לרענן את הדף ולנסות שוב.');
        return;
    }
    if (!confirm('האם אתה בטוח שברצונך למחוק רשומה זו?\n\nפעולה זו בלתי הפיכה!')) {
        return;
    }
    
    currentRecords.splice(index, 1);
    
    try {
        const response = await fetch(`../api/sources.php?action=update&id=${currentSource.id}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                ...currentSource,
                records: currentRecords
            })
        });
        
        const result = await response.json();
        
        if (result.success) {
            await viewRecords(currentSource.id);
            await loadSources();
            showSuccess('הרשומה נמחקה בהצלחה');
        } else {
            showError(result.error || 'שגיאה במחיקה');
        }
    } catch (error) {
        showError('שגיאה בחיבור לשרת');
    }
}

function editRecord(index) {
    if (!currentSource || !currentSource.fields) return;
    
    const record = currentRecords[index];
    if (!record) {
        showError('שגיאה: הרשומה לא נמצאה. נא לרענן את הדף ולנסות שוב.');
        return;
    }
    editingRecordIndex = index;
    
    // עדכון כותרת המודאל
    document.getElementById('addRecordModal').querySelector('h3').textContent = 'ערוך רשומה';
    
    // יצירת הטופס עם הנתונים הקיימים
    const form = document.getElementById('addRecordForm');
    form.innerHTML = currentSource.fields.map(field => `
        <div class="field-group">
            <label>${escapeHtml(field)}</label>
            <input type="text" 
                   class="record-field form-control" 
                   data-field="${escapeHtml(field)}" 
                   value="${escapeHtml(record[field] || '')}">
        </div>
    `).join('');
    
    // שינוי כפתור השמירה
    const saveButton = document.querySelector('#addRecordModal .btn-primary');
    saveButton.textContent = 'עדכן רשומה';
    saveButton.onclick = updateRecord;
    
    document.getElementById('addRecordModal').style.display = 'flex';
}

async function updateRecord() {
    if (editingRecordIndex === null) return;
    
    const inputs = document.querySelectorAll('.record-field');
    const updatedRecord = {};
    
    inputs.forEach(input => {
        updatedRecord[input.dataset.field] = input.value.trim();
    });
    
    // עדכון הרשומה במערך — וידוא שהאינדקס תקין
    let targetIdx = (editingRecordIndex != null && editingRecordIndex >= 0 && editingRecordIndex < currentRecords.length)
        ? editingRecordIndex : -1;
    if (targetIdx === -1) {
        // fallback: איתור לפי עמודת מפתח (סמל/קוד)
        const keyField = currentSource.fields.find(f => /קוד|סמל|code/i.test(f)) || currentSource.fields[0];
        const kv = String(updatedRecord[keyField] ?? '').trim();
        targetIdx = kv ? currentRecords.findIndex(r => String(r[keyField] ?? '').trim() === kv) : -1;
    }
    if (targetIdx === -1) {
        showError('לא ניתן היה לאתר את הרשומה לעדכון. נא לרענן ולנסות שוב.');
        return;
    }
    currentRecords[targetIdx] = updatedRecord;
    
    try {
        const response = await fetch(`../api/sources.php?action=update&id=${currentSource.id}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                ...currentSource,
                records: currentRecords
            })
        });
        
        const result = await response.json();
        
        if (result.success) {
            closeAddRecordModal();
            await viewRecords(currentSource.id);
            await loadSources();
            showSuccess('הרשומה עודכנה בהצלחה');
        } else {
            showError(result.error || 'שגיאה בעדכון');
        }
    } catch (error) {
        showError('שגיאה בחיבור לשרת');
    }
}

function showImportModal() {
    document.getElementById('importSourceName').value = '';
    document.getElementById('importSourceDesc').value = '';
    document.getElementById('csvFile').value = '';
    document.getElementById('importModal').style.display = 'flex';
}

function showImportRecordsModal() {
    document.getElementById('csvFileRecords').value = '';
    
    // מילוי dropdown עם מאגרים
    const sourceSelect = document.getElementById('importSourceSelect');
    sourceSelect.innerHTML = '<option value="">-- בחר מאגר --</option>';
    sources.forEach(source => {
        const option = document.createElement('option');
        option.value = source.id;
        option.textContent = `${source.name} (${source.recordCount || 0} רשומות)`;
        // אם יש currentSource, בחר אותו כברירת מחדל
        if (currentSource && currentSource.id === source.id) {
            option.selected = true;
        }
        sourceSelect.appendChild(option);
    });
    
    document.getElementById('importRecordsModal').style.display = 'flex';
}

async function importCSVAsNew() {
    const name = document.getElementById('importSourceName').value.trim();
    const description = document.getElementById('importSourceDesc').value.trim();
    const fileInput = document.getElementById('csvFile');
    const file = fileInput.files[0];
    
    if (!name) {
        showError('יש להזין שם למאגר');
        return;
    }
    
    if (!file) {
        showError('יש לבחור קובץ CSV');
        return;
    }
    
    const formData = new FormData();
    formData.append('file', file);
    formData.append('name', name);
    formData.append('description', description);
    
    try {
        const response = await fetch('../api/sources.php?action=import-csv', {
            method: 'POST',
            body: formData
        });
        
        // קריאה עמידה: השרת מחזיר JSON תקין, אך שאריות HTML/Warning ישנות
        // עלולות להישאר בתגובה – מנקים ומאתרים את בלוק ה-JSON שבתוכה.
        const text = await response.text();
        let result;
        try {
            result = JSON.parse(text);
        } catch (e) {
            const startIdx = text.indexOf('{');
            const endIdx = text.lastIndexOf('}');
            if (startIdx !== -1 && endIdx > startIdx) {
                try { result = JSON.parse(text.slice(startIdx, endIdx + 1)); } catch (e2) { result = null; }
            }
            if (!result) {
                console.error('Raw server response:', text);
                showError('תגובת השרת אינה תקינה – נא בדקו את log השגיאות של PHP');
                return;
            }
        }
        
        if (result.success) {
            closeImportModal();
            await loadSources();
            showSuccess(`המאגר נוצר עם ${result.data.recordCount} רשומות`);
        } else {
            showError(result.error || 'שגיאה בייבוא');
        }
    } catch (error) {
        showError('שגיאה בחיבור לשרת');
    }
}

async function importCSV() {
    const fileInput = document.getElementById('csvFileRecords');
    const file = fileInput.files[0];
    
    if (!file) {
        showError('יש לבחור קובץ CSV');
        return;
    }
    
    // בדיקה אם נבחר מאגר
    const sourceSelect = document.getElementById('importSourceSelect');
    const selectedSourceId = sourceSelect ? sourceSelect.value : null;
    
    if (!selectedSourceId) {
        showError('יש לבחור מאגר לייבוא');
        return;
    }
    
    const formData = new FormData();
    formData.append('file', file);
    formData.append('sourceId', selectedSourceId);
    
    try {
        const response = await fetch('../api/sources.php?action=import-records', {
            method: 'POST',
            body: formData
        });
        
        const result = await response.json();
        
        if (result.success) {
            closeImportRecordsModal();
            // עדכון currentSource אם נבחר מאגר אחר
            if (selectedSourceId && (!currentSource || currentSource.id !== selectedSourceId)) {
                await viewRecords(selectedSourceId);
            } else if (currentSource) {
                await viewRecords(currentSource.id);
            }
            await loadSources();
            showSuccess(`יובאו ${result.imported || 0} רשומות בהצלחה`);
        } else {
            showError(result.error || 'שגיאה בייבוא');
        }
    } catch (error) {
        showError('שגיאה בחיבור לשרת');
    }
}

function closeModal() {
    document.getElementById('sourceModal').style.display = 'none';
    currentSource = null;
}

function closeRecordsModal() {
    document.getElementById('recordsModal').style.display = 'none';
    document.getElementById('searchRecords').value = '';
}

function closeAddRecordModal() {
    document.getElementById('addRecordModal').style.display = 'none';
    editingRecordIndex = null;
    
    // שחזור כפתור השמירה למצב המקורי
    const saveButton = document.querySelector('#addRecordModal .btn-primary');
    if (saveButton) {
        saveButton.textContent = 'שמור';
        saveButton.onclick = saveRecord;
    }
    
    // שחזור כותרת המודאל
    const modalTitle = document.getElementById('addRecordModal').querySelector('h3');
    if (modalTitle) {
        modalTitle.textContent = 'הוסף רשומה';
    }
}

function closeImportModal() {
    document.getElementById('importModal').style.display = 'none';
}

function closeImportRecordsModal() {
    document.getElementById('importRecordsModal').style.display = 'none';
}

async function logout() {
    try {
        if (window.FBAuth && typeof FBAuth.fbLogout === 'function') {
            await FBAuth.fbLogout('../api', 'login.html');
            return;
        }
    } catch (error) { /* fallback below */ }
    try { localStorage.clear(); sessionStorage.clear(); } catch (e) {}
    window.location.href = 'login.html';
}

function showSuccess(message) {
    alert(message);
}

function showError(message) {
    alert('שגיאה: ' + message);
}

function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function formatDate(dateString) {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('he-IL');
}
