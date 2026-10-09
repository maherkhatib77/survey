/**
 * Admin Dashboard - דשבורד מנהל
 */
const API = '../api';
let forms = [];
let deleteTargetId = null;
let currentUser = null;
let currentStatusFilter = 'all'; // סינון נוכחי: 'all', 'draft', 'published', 'closed'

// ===== Auth Check =====
async function checkAuth() {
  try {
    const res = await fetch(`${API}/auth.php?action=check`);
    const json = await res.json();
    if (!json.loggedIn) {
      window.location.href = 'login.html';
      return false;
    }
    
    // טען את פרטי המשתמש
    const userRes = await fetch(`${API}/users.php?action=me`);
    const userJson = await userRes.json();
    if (userJson.success) {
      currentUser = userJson.data;
      const displayName = currentUser.fullName || currentUser.username;
      document.getElementById('userBadge').textContent = `👤 ${displayName}`;
      
      // הצג כפתור ניהול משתמשים רק למנהלים
      const usersBtn = document.getElementById('usersBtn');
      if (usersBtn) {
        if (currentUser.role === 'admin' || currentUser.permissions?.manage_users) {
          usersBtn.style.display = 'inline-flex';
        } else {
          usersBtn.style.display = 'none';
        }
      }
    }
    
    return true;
  } catch(e) {
    window.location.href = 'login.html';
    return false;
  }
}

async function logout() {
  // fbLogout שולח POST עם כותרת CSRF, מנקה אחסון מקומי ומפנה לדף ההתחברות
  if (window.FBAuth && typeof FBAuth.fbLogout === 'function') {
    await FBAuth.fbLogout(API, 'login.html');
    return;
  }
  // Fallback – ניתוק מקומי גם אם שכבת FBAuth לא נטענה
  try { localStorage.clear(); sessionStorage.clear(); } catch (e) {}
  window.location.href = 'login.html';
}

// ===== Data =====
async function fetchForms() {
  const res = await fetch(`${API}/forms.php?action=list`);
  const json = await res.json();
  return json.success ? json.data : [];
}

async function createForm(form) {
  form.id = form.id || uuid();
  form.createdAt = form.createdAt || new Date().toISOString();
  form.updatedAt = new Date().toISOString();
  form.responseCount = 0;
  const res = await fetch(`${API}/forms.php?action=create`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(form)
  });
  const json = await res.json();
  return json.success ? json.data : null;
}

async function updateForm(form) {
  form.updatedAt = new Date().toISOString();
  const res = await fetch(`${API}/forms.php?action=update&id=${form.id}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(form)
  });
  const json = await res.json();
  return json.success ? json.data : null;
}

async function deleteForm(id) {
  await fetch(`${API}/forms.php?id=${id}`, { method: 'DELETE' });
}

// ===== Render =====
async function init() {
  if (!await checkAuth()) return;
  forms = await fetchForms();
  render();
}

function render() {
  const total = forms.length;
  const published = forms.filter(f => f.status === 'published').length;
  const totalResponses = forms.reduce((s, f) => s + (f.responseCount || 0), 0);
  const drafts = forms.filter(f => f.status === 'draft').length;
  const closed = forms.filter(f => f.status === 'closed').length;

  document.getElementById('stats').innerHTML = `
    <div class="stat-card"><div><div class="label">סה״כ סקרים</div><div class="value">${total}</div></div><div class="icon">📋</div></div>
    <div class="stat-card"><div><div class="label">סקרים פעילים</div><div class="value">${published}</div></div><div class="icon">✅</div></div>
    <div class="stat-card"><div><div class="label">סה״כ תגובות</div><div class="value">${totalResponses}</div></div><div class="icon">💬</div></div>
    <div class="stat-card"><div><div class="label">טיוטות</div><div class="value">${drafts}</div></div><div class="icon">📝</div></div>
  `;

  // עדכון מונים בלשוניות
  document.getElementById('count-all').textContent = total;
  document.getElementById('count-draft').textContent = drafts;
  document.getElementById('count-published').textContent = published;
  document.getElementById('count-closed').textContent = closed;

  // סינון סקרים לפי הלשונית הנבחרת
  const filteredForms = currentStatusFilter === 'all' 
    ? forms 
    : forms.filter(f => f.status === currentStatusFilter);

  const list = document.getElementById('formsList');
  if (!filteredForms.length) {
    const statusLabels = {
      'all': 'סקרים',
      'draft': 'טיוטות',
      'published': 'סקרים מפורסמים',
      'closed': 'סקרים סגורים'
    };
    list.innerHTML = `
      <div class="empty-state" style="grid-column:1/-1;">
        <div class="icon">${currentStatusFilter === 'draft' ? '📝' : currentStatusFilter === 'published' ? '✅' : currentStatusFilter === 'closed' ? '🔒' : '📋'}</div>
        <h3>אין ${statusLabels[currentStatusFilter]}</h3>
        <p>${currentStatusFilter === 'all' ? 'צור את הסקר הראשון שלך כדי להתחיל' : `אין סקרים בסטטוס זה`}</p>
        ${currentStatusFilter === 'all' ? '<button class="btn btn-primary btn-lg" onclick="createNewForm()">צור סקר חדש</button>' : ''}
      </div>
    `;
    return;
  }

  list.innerHTML = filteredForms.map(form => {
    const statusMap = {
      draft: { label: 'טיוטה', cls: 'badge-yellow' },
      published: { label: 'מפורסם', cls: 'badge-green' },
      closed: { label: 'סגור', cls: 'badge-red' }
    };
    const st = statusMap[form.status] || statusMap.draft;
    const fieldCount = form.pages.reduce((s, p) => s + p.fields.length, 0);
    const link = `${window.location.origin}${window.location.pathname.replace('admin/dashboard.html', '')}fill.html?id=${form.id}`;

    const description = form.settings.description || 'ללא תיאור';
    const shortDesc = description.length > 100 ? description.substring(0, 100) + '...' : description;
    const needsExpand = description.length > 100;
    
    return `
      <div class="card form-card fade-in">
        <div style="display:flex;justify-content:space-between;align-items:start;margin-bottom:12px;">
          <div style="flex:1;">
            <div class="form-title">${esc(form.settings.title)}</div>
            <div class="form-desc" id="desc-${form.id}">
              <span class="desc-text">${esc(shortDesc)}</span>
              ${needsExpand ? `<button class="read-more-btn" onclick="toggleDescription('${form.id}', '${esc(description).replace(/'/g, "\\'")}')">קרא עוד</button>` : ''}
            </div>
          </div>
          <span class="badge ${st.cls}">${st.label}</span>
        </div>
        <div class="form-meta">
          <span>📝 ${fieldCount} שדות</span>
          <span>📅 ${formatDate(form.createdAt)}</span>
          <span>💬 ${form.responseCount || 0}</span>
        </div>
        <div class="form-actions">
          <div class="form-actions-row">
            <a href="builder.html?id=${form.id}" class="btn btn-sm btn-outline">✏️ ערוך</a>
            <a href="../fill.html?id=${form.id}" target="_blank" class="btn btn-sm btn-outline" style="color:var(--primary);">👁️ תצוגה</a>
            <a href="reports.html?id=${form.id}" class="btn btn-sm btn-outline" style="color:var(--purple);">📊 דוחות</a>
          </div>
          <div class="form-actions-row">
            <button class="btn btn-sm btn-outline" style="color:var(--success);" onclick="copyLink('${link}')">🔗 העתק קישור</button>
            <button class="btn btn-sm btn-outline" style="color:var(--primary);" onclick="duplicateForm('${form.id}')">📋 שכפל</button>
            <button class="btn btn-sm btn-outline" style="color:var(--warning);" onclick="askDeleteResponses('${form.id}', '${esc(form.settings.title)}')">🗑️ מחק תגובות</button>
            <button class="btn btn-sm btn-outline" style="color:var(--danger);" onclick="askDelete('${form.id}')">🗑️</button>
          </div>
        </div>
      </div>
    `;
  }).join('');
}

async function createNewForm() {
  const form = {
    settings: {
      title: 'סקר חדש',
      description: '',
      theme: { primaryColor: '#2563eb', backgroundColor: '#ffffff', fontFamily: 'Assistant, sans-serif' },
      submitMessage: 'תודה! הטופס נשלח בהצלחה.',
      integrations: []
    },
    pages: [{ id: uuid(), title: 'עמוד 1', fields: [] }],
    status: 'draft',
    responseCount: 0
  };
  const created = await createForm(form);
  if (created) window.location.href = `builder.html?id=${created.id}`;
}

function askDelete(id) {
  const form = forms.find(f => f.id === id);
  if (!form) return;
  
  deleteTargetId = id;
  
  // אם יש תגובות - דרוש סיסמה
  if (form.responseCount && form.responseCount > 0) {
    document.getElementById('deleteFormTitle').textContent = `"${form.settings.title}"`;
    document.getElementById('deleteResponseCount').textContent = form.responseCount;
    document.getElementById('deleteModalWithPassword').style.display = 'flex';
    
    // מיקוד אוטומטי בשדה הסיסמה
    setTimeout(() => {
      document.getElementById('deleteFormPassword').focus();
    }, 100);
  } else {
    // אין תגובות - מחיקה רגילה
    document.getElementById('deleteModal').style.display = 'flex';
  }
}

function closeDeleteModal() {
  document.getElementById('deleteModal').style.display = 'none';
  document.getElementById('deleteModalWithPassword').style.display = 'none';
  document.getElementById('deleteFormPassword').value = '';
  deleteTargetId = null;
}

async function confirmDelete() {
  if (deleteTargetId) {
    await deleteForm(deleteTargetId);
    closeDeleteModal();
    forms = await fetchForms();
    render();
  }
}

async function confirmDeleteWithPassword() {
  const password = document.getElementById('deleteFormPassword').value;
  
  // בדיקת סיסמה
  if (password !== 'Adan.3011$') {
    alert('❌ סיסמה שגויה!');
    return;
  }
  
  if (deleteTargetId) {
    await deleteForm(deleteTargetId);
    closeDeleteModal();
    forms = await fetchForms();
    render();
  }
}

function copyLink(link) {
  navigator.clipboard.writeText(link).then(() => {
    alert('הקישור הועתק ללוח! שלח למשיבים.');
  }).catch(() => {
    prompt('העתק את הקישור:', link);
  });
}

// ===== Helpers =====
function uuid() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = Math.random() * 16 | 0;
    return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
  });
}

function formatDate(d) {
  if (!d) return '';
  return new Date(d).toLocaleDateString('he-IL');
}

function esc(s) {
  if (!s) return '';
  const d = document.createElement('div');
  d.textContent = s;
  return d.innerHTML;
}

function toggleDescription(formId, fullText) {
  const descDiv = document.getElementById(`desc-${formId}`);
  const textSpan = descDiv.querySelector('.desc-text');
  const btn = descDiv.querySelector('.read-more-btn');
  
  if (textSpan.dataset.expanded === 'true') {
    // קטן את הטקסט
    textSpan.textContent = fullText.substring(0, 100) + '...';
    textSpan.dataset.expanded = 'false';
    btn.textContent = 'קרא עוד';
  } else {
    // הרחב את הטקסט
    textSpan.textContent = fullText;
    textSpan.dataset.expanded = 'true';
    btn.textContent = 'הצג פחות';
  }
}

function switchStatusTab(status) {
  currentStatusFilter = status;
  
  // עדכון הלשונית הפעילה
  document.querySelectorAll('.status-tab').forEach(tab => {
    if (tab.dataset.status === status) {
      tab.classList.add('active');
    } else {
      tab.classList.remove('active');
    }
  });
  
  // רענון התצוגה
  render();
}

// ===== שכפול סקר =====
async function duplicateForm(formId) {
  const form = forms.find(f => f.id === formId);
  if (!form) {
    alert('שגיאה: הסקר לא נמצא');
    return;
  }
  
  if (!confirm(`האם לשכפל את הסקר "${form.settings.title}"?\n\nהסקר המשוכפל ייווצר כטיוטה ללא תגובות.`)) {
    return;
  }
  
  try {
    // יצירת עותק של הסקר
    const duplicatedForm = {
      ...form,
      id: uuid(),
      settings: {
        ...form.settings,
        title: `${form.settings.title} (עותק)`
      },
      status: 'draft',
      responseCount: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    // שמירת הסקר החדש
    const res = await fetch(`${API}/forms.php?action=create`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(duplicatedForm)
    });
    
    const json = await res.json();
    
    if (json.success) {
      alert(`✅ הסקר שוכפל בהצלחה!\n\nשם הסקר החדש: "${duplicatedForm.settings.title}"`);
      forms = await fetchForms();
      render();
    } else {
      alert('❌ שגיאה בשכפול הסקר: ' + (json.error || 'לא ידוע'));
    }
  } catch (error) {
    console.error('Error duplicating form:', error);
    alert('❌ שגיאה בחיבור לשרת');
  }
}

// ===== מחיקת תגובות =====
let deleteResponsesTargetId = null;

function askDeleteResponses(formId, formTitle) {
  deleteResponsesTargetId = formId;
  
  const modal = document.createElement('div');
  modal.id = 'deleteResponsesModal';
  modal.className = 'modal-overlay';
  modal.style.display = 'flex';
  modal.innerHTML = `
    <div class="modal" style="text-align:center;">
      <div style="font-size:48px;margin-bottom:16px;">⚠️</div>
      <h3>מחיקת כל התגובות</h3>
      <p style="color:var(--slate-500);margin:16px 0;">
        האם אתה בטוח שברצונך למחוק את כל התגובות לסקר:<br>
        <strong>"${formTitle}"</strong>?
      </p>
      <p style="color:var(--danger);font-size:13px;margin-bottom:20px;">
        ⚠️ פעולה זו בלתי הפיכה!
      </p>
      <div class="field-group" style="text-align:right;">
        <label style="font-weight:600;">הזן סיסמת מנהל:</label>
        <input type="password" id="deleteResponsesPassword" class="form-control" placeholder="סיסמה" style="margin-top:8px;">
      </div>
      <div style="display:flex;gap:12px;margin-top:24px;">
        <button class="btn btn-outline" style="flex:1;" onclick="closeDeleteResponsesModal()">ביטול</button>
        <button class="btn btn-danger" style="flex:1;" onclick="confirmDeleteResponses()">מחק תגובות</button>
      </div>
    </div>
  `;
  
  document.body.appendChild(modal);
  
  // מיקוד אוטומטי בשדה הסיסמה
  setTimeout(() => {
    document.getElementById('deleteResponsesPassword').focus();
  }, 100);
}

function closeDeleteResponsesModal() {
  const modal = document.getElementById('deleteResponsesModal');
  if (modal) {
    modal.remove();
  }
  deleteResponsesTargetId = null;
}

async function confirmDeleteResponses() {
  const password = document.getElementById('deleteResponsesPassword').value;
  
  // בדיקת סיסמה
  if (password !== 'Adan.3011$') {
    alert('❌ סיסמה שגויה!');
    return;
  }
  
  if (!deleteResponsesTargetId) {
    alert('❌ שגיאה: לא נבחר סקר');
    return;
  }
  
  try {
    const res = await fetch(`${API}/responses.php?action=clear&formId=${deleteResponsesTargetId}`, {
      method: 'DELETE'
    });
    
    const json = await res.json();
    
    if (json.success) {
      alert('✅ כל התגובות נמחקו בהצלחה!');
      closeDeleteResponsesModal();
      forms = await fetchForms();
      render();
    } else {
      alert('❌ שגיאה במחיקת התגובות: ' + (json.error || 'לא ידוע'));
    }
  } catch (error) {
    console.error('Error deleting responses:', error);
    alert('❌ שגיאה בחיבור לשרת');
  }
}

// Init
init();
