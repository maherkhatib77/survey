/**
 * Users Management - ניהול משתמשים
 */
const API = '../api';
let users = [];
let currentUser = null;
let editingUserId = null;

// ===== Auth Check =====
async function checkAuth() {
  try {
    const res = await fetch(`${API}/auth.php?action=check`);
    
    if (!res.ok) {
      console.error('Auth check failed:', res.status);
      window.location.href = 'login.html';
      return false;
    }
    
    const json = await res.json();
    if (!json.loggedIn) {
      window.location.href = 'login.html';
      return false;
    }
    
    // טען את פרטי המשתמש הנוכחי
    const userRes = await fetch(`${API}/users.php?action=me`);
    
    if (!userRes.ok) {
      console.error('Get current user failed:', userRes.status);
      window.location.href = 'login.html';
      return false;
    }
    
    const userJson = await userRes.json();
    if (userJson.success) {
      currentUser = userJson.data;
      
      // בדיקה אם יש הרשאת ניהול משתמשים
      if (currentUser.role !== 'admin' && !currentUser.permissions?.manage_users) {
        alert('אין לך הרשאה לגשת לדף זה');
        window.location.href = 'dashboard.html';
        return false;
      }
    }
    
    return true;
  } catch(e) {
    console.error('Auth check exception:', e);
    window.location.href = 'login.html';
    return false;
  }
}

async function logout() {
  await fetch(`${API}/auth.php?action=logout`, { method: 'POST' });
  window.location.href = 'login.html';
}

// ===== Load Users =====
async function loadUsers() {
  try {
    const res = await fetch(`${API}/users.php?action=list`);
    
    if (!res.ok) {
      const errorText = await res.text();
      console.error('Load users error:', res.status, errorText);
      showError(`שגיאה בשרת: ${res.status}`);
      return;
    }
    
    const json = await res.json();
    if (json.success) {
      users = json.data;
      renderUsers();
    } else {
      showError(json.error || 'שגיאה בטעינת משתמשים');
    }
  } catch (error) {
    console.error('Load users exception:', error);
    showError('שגיאה בחיבור לשרת: ' + error.message);
  }
}

function renderUsers() {
  const container = document.getElementById('usersList');
  
  if (users.length === 0) {
    container.innerHTML = `
      <div class="empty-state" style="grid-column:1/-1;">
        <div class="icon">👥</div>
        <h3>אין משתמשים</h3>
        <p>הוסף משתמש חדש כדי להתחיל</p>
        <button class="btn btn-primary" onclick="showAddUserModal()">➕ הוסף משתמש חדש</button>
      </div>
    `;
    return;
  }
  
  container.innerHTML = users.map(user => {
    const roleLabel = user.role === 'admin' ? '👑 מנהל' : '👤 משתמש';
    const statusLabel = user.active ? '✅ פעיל' : '❌ מושבת';
    const statusColor = user.active ? 'var(--success)' : 'var(--danger)';
    const lastLogin = user.lastLogin ? formatDateTime(user.lastLogin) : 'מעולם לא';
    
    return `
      <div class="card">
        <div style="display:flex;justify-content:space-between;align-items:start;margin-bottom:12px;">
          <div>
            <div style="font-size:18px;font-weight:700;margin-bottom:4px;">${esc(user.fullName || user.username)}</div>
            <div style="font-size:13px;color:var(--slate-500);">@${esc(user.username)}</div>
            ${user.email ? `<div style="font-size:13px;color:var(--slate-500);">📧 ${esc(user.email)}</div>` : ''}
          </div>
          <div style="text-align:left;">
            <div style="font-size:14px;font-weight:600;">${roleLabel}</div>
            <div style="font-size:13px;color:${statusColor};">${statusLabel}</div>
          </div>
        </div>
        
        <div style="font-size:12px;color:var(--slate-500);margin-bottom:12px;">
          <div>📅 נוצר: ${formatDate(user.createdAt)}</div>
          <div>🕐 כניסה אחרונה: ${lastLogin}</div>
        </div>
        
        <div style="display:flex;gap:8px;flex-wrap:wrap;">
          <button class="btn btn-sm btn-outline" onclick="editUser('${user.id}')">✏️ ערוך</button>
          <button class="btn btn-sm btn-outline" onclick="showResetPasswordModal('${user.id}', '${esc(user.username)}')">🔑 אפס סיסמא</button>
          ${user.username !== currentUser.username ? `
            <button class="btn btn-sm btn-outline" style="color:var(--danger);" onclick="deleteUser('${user.id}', '${esc(user.username)}')">🗑️ מחק</button>
          ` : ''}
        </div>
      </div>
    `;
  }).join('');
}

// ===== Add/Edit User =====
function showAddUserModal() {
  editingUserId = null;
  document.getElementById('modalTitle').textContent = 'הוסף משתמש חדש';
  document.getElementById('userUsername').value = '';
  document.getElementById('userUsername').disabled = false;
  document.getElementById('userFullName').value = '';
  document.getElementById('userEmail').value = '';
  document.getElementById('userPassword').value = '';
  document.getElementById('userPassword').placeholder = 'סיסמא (מינימום 6 תווים)';
  document.getElementById('userRole').value = 'user';
  document.getElementById('userActive').checked = true;
  document.getElementById('permCreateForms').checked = true;
  document.getElementById('permEditForms').checked = true;
  document.getElementById('permDeleteForms').checked = false;
  document.getElementById('permViewResponses').checked = true;
  document.getElementById('permExportData').checked = true;
  document.getElementById('permManageUsers').checked = false;
  document.getElementById('userModal').style.display = 'flex';
}

function editUser(userId) {
  const user = users.find(u => u.id === userId);
  if (!user) return;
  
  editingUserId = userId;
  document.getElementById('modalTitle').textContent = 'ערוך משתמש';
  document.getElementById('userUsername').value = user.username;
  document.getElementById('userUsername').disabled = true;
  document.getElementById('userFullName').value = user.fullName || '';
  document.getElementById('userEmail').value = user.email || '';
  document.getElementById('userPassword').value = '';
  document.getElementById('userPassword').placeholder = 'השאר ריק אם לא ברצונך לשנות';
  document.getElementById('userRole').value = user.role;
  document.getElementById('userActive').checked = user.active !== false;
  
  const perms = user.permissions || {};
  document.getElementById('permCreateForms').checked = perms.create_forms !== false;
  document.getElementById('permEditForms').checked = perms.edit_forms !== false;
  document.getElementById('permDeleteForms').checked = perms.delete_forms === true;
  document.getElementById('permViewResponses').checked = perms.view_responses !== false;
  document.getElementById('permExportData').checked = perms.export_data !== false;
  document.getElementById('permManageUsers').checked = perms.manage_users === true;
  
  document.getElementById('userModal').style.display = 'flex';
}

async function saveUser() {
  const username = document.getElementById('userUsername').value.trim();
  const fullName = document.getElementById('userFullName').value.trim();
  const email = document.getElementById('userEmail').value.trim();
  const password = document.getElementById('userPassword').value;
  const role = document.getElementById('userRole').value;
  const active = document.getElementById('userActive').checked;
  
  const permissions = {
    create_forms: document.getElementById('permCreateForms').checked,
    edit_forms: document.getElementById('permEditForms').checked,
    delete_forms: document.getElementById('permDeleteForms').checked,
    view_responses: document.getElementById('permViewResponses').checked,
    export_data: document.getElementById('permExportData').checked,
    manage_users: document.getElementById('permManageUsers').checked
  };
  
  // ולידציה
  if (!username) {
    showError('יש להזין שם משתמש');
    return;
  }
  
  if (!editingUserId && !password) {
    showError('יש להזין סיסמא');
    return;
  }
  
  if (password && password.length < 6) {
    showError('הסיסמא חייבת להכיל לפחות 6 תווים');
    return;
  }
  
  const userData = {
    username,
    fullName,
    email,
    role,
    active,
    permissions
  };
  
  if (password) {
    userData.password = password;
  }
  
  try {
    let res;
    if (editingUserId) {
      // עדכון משתמש קיים
      res = await fetch(`${API}/users.php?action=update&id=${editingUserId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(userData)
      });
    } else {
      // יצירת משתמש חדש
      res = await fetch(`${API}/users.php?action=create`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(userData)
      });
    }
    
    if (!res.ok) {
      const errorText = await res.text();
      console.error('Save user error:', res.status, errorText);
      showError(`שגיאה בשרת: ${res.status}`);
      return;
    }
    
    const json = await res.json();
    
    if (json.success) {
      closeUserModal();
      await loadUsers();
      showSuccess(editingUserId ? 'המשתמש עודכן בהצלחה' : 'המשתמש נוצר בהצלחה');
    } else {
      showError(json.error || 'שגיאה בשמירה');
    }
  } catch (error) {
    console.error('Save user exception:', error);
    showError('שגיאה בחיבור לשרת: ' + error.message);
  }
}

async function deleteUser(userId, username) {
  if (!confirm(`האם אתה בטוח שברצונך למחוק את המשתמש "${username}"?`)) {
    return;
  }
  
  try {
    const res = await fetch(`${API}/users.php?id=${userId}`, {
      method: 'DELETE'
    });
    
    if (!res.ok) {
      const errorText = await res.text();
      console.error('Delete user error:', res.status, errorText);
      showError(`שגיאה בשרת: ${res.status}`);
      return;
    }
    
    const json = await res.json();
    
    if (json.success) {
      await loadUsers();
      showSuccess('המשתמש נמחק בהצלחה');
    } else {
      showError(json.error || 'שגיאה במחיקה');
    }
  } catch (error) {
    console.error('Delete user exception:', error);
    showError('שגיאה בחיבור לשרת: ' + error.message);
  }
}

function closeUserModal() {
  document.getElementById('userModal').style.display = 'none';
  editingUserId = null;
}

// ===== Reset Password =====
let resettingUserId = null;

function showResetPasswordModal(userId, username) {
  resettingUserId = userId;
  document.getElementById('resetPasswordUser').textContent = username;
  document.getElementById('newPassword').value = '';
  document.getElementById('resetPasswordModal').style.display = 'flex';
}

async function resetPassword() {
  const newPassword = document.getElementById('newPassword').value;
  
  if (!newPassword || newPassword.length < 6) {
    showError('הסיסמא חייבת להכיל לפחות 6 תווים');
    return;
  }
  
  if (!resettingUserId) {
    showError('שגיאה: לא נבחר משתמש');
    return;
  }
  
  try {
    const res = await fetch(`${API}/users.php?action=reset-password&id=${resettingUserId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ newPassword })
    });
    
    if (!res.ok) {
      const errorText = await res.text();
      console.error('Reset password error:', res.status, errorText);
      showError(`שגיאה בשרת: ${res.status}`);
      return;
    }
    
    const json = await res.json();
    
    if (json.success) {
      closeResetPasswordModal();
      showSuccess('הסיסמא אופסה בהצלחה');
    } else {
      showError(json.error || 'שגיאה באיפוס סיסמא');
    }
  } catch (error) {
    console.error('Reset password exception:', error);
    showError('שגיאה בחיבור לשרת: ' + error.message);
  }
}

function closeResetPasswordModal() {
  document.getElementById('resetPasswordModal').style.display = 'none';
  resettingUserId = null;
}

// ===== Profile =====
async function showProfileModal() {
  try {
    const res = await fetch(`${API}/users.php?action=me`);
    
    if (!res.ok) {
      const errorText = await res.text();
      console.error('Get profile error:', res.status, errorText);
      showError(`שגיאה בשרת: ${res.status}`);
      return;
    }
    
    const json = await res.json();
    
    if (!json.success) {
      showError(json.error || 'שגיאה בטעינת פרופיל');
      return;
    }
    
    const user = json.data;
    const permissions = user.permissions || {};
    const permList = [
      permissions.create_forms ? '✅ יצירת סקרים' : '❌ יצירת סקרים',
      permissions.edit_forms ? '✅ עריכת סקרים' : '❌ עריכת סקרים',
      permissions.delete_forms ? '✅ מחיקת סקרים' : '❌ מחיקת סקרים',
      permissions.view_responses ? '✅ צפייה בתגובות' : '❌ צפייה בתגובות',
      permissions.export_data ? '✅ ייצוא נתונים' : '❌ ייצוא נתונים',
      permissions.manage_users ? '✅ ניהול משתמשים' : '❌ ניהול משתמשים'
    ].join('<br>');
    
    document.getElementById('profileContent').innerHTML = `
      <div style="background:var(--slate-50);padding:16px;border-radius:8px;margin-bottom:16px;">
        <div style="font-size:18px;font-weight:700;margin-bottom:8px;">${esc(user.fullName || user.username)}</div>
        <div style="font-size:14px;color:var(--slate-600);">@${esc(user.username)}</div>
        ${user.email ? `<div style="font-size:14px;color:var(--slate-600);">📧 ${esc(user.email)}</div>` : ''}
        <div style="font-size:14px;color:var(--slate-600);margin-top:8px;">
          תפקיד: <strong>${user.role === 'admin' ? '👑 מנהל' : '👤 משתמש'}</strong>
        </div>
      </div>
      
      <div style="margin-bottom:16px;">
        <div style="font-weight:600;margin-bottom:8px;">הרשאות:</div>
        <div style="background:var(--slate-50);padding:12px;border-radius:8px;font-size:14px;">
          ${permList}
        </div>
      </div>
      
      <div style="margin-bottom:16px;">
        <div style="font-size:13px;color:var(--slate-500);">
          <div>📅 נוצר: ${formatDate(user.createdAt)}</div>
          <div>🕐 כניסה אחרונה: ${user.lastLogin ? formatDateTime(user.lastLogin) : 'מעולם לא'}</div>
        </div>
      </div>
      
      <button class="btn btn-primary" style="width:100%;" onclick="showChangePasswordModal()">🔑 שנה סיסמא</button>
    `;
    
    document.getElementById('profileModal').style.display = 'flex';
  } catch (error) {
    console.error('Show profile exception:', error);
    showError('שגיאה בחיבור לשרת: ' + error.message);
  }
}

function closeProfileModal() {
  document.getElementById('profileModal').style.display = 'none';
}

async function showChangePasswordModal() {
  const oldPassword = prompt('הזן את הסיסמא הנוכחית:');
  if (!oldPassword) return;
  
  const newPassword = prompt('הזן סיסמא חדשה (מינימום 6 תווים):');
  if (!newPassword || newPassword.length < 6) {
    showError('הסיסמא חייבת להכיל לפחות 6 תווים');
    return;
  }
  
  try {
    const res = await fetch(`${API}/users.php?action=change-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ oldPassword, newPassword })
    });
    
    if (!res.ok) {
      const errorText = await res.text();
      console.error('Change password error:', res.status, errorText);
      showError(`שגיאה בשרת: ${res.status}`);
      return;
    }
    
    const json = await res.json();
    
    if (json.success) {
      showSuccess('הסיסמא שונתה בהצלחה');
      closeProfileModal();
    } else {
      showError(json.error || 'שגיאה בשינוי סיסמא');
    }
  } catch (error) {
    console.error('Change password exception:', error);
    showError('שגיאה בחיבור לשרת: ' + error.message);
  }
}

// ===== Helpers =====
function showSuccess(message) {
  alert('✅ ' + message);
}

function showError(message) {
  alert('❌ ' + message);
}

function esc(s) {
  if (!s) return '';
  const div = document.createElement('div');
  div.textContent = s;
  return div.innerHTML;
}

function formatDate(dateString) {
  if (!dateString) return '';
  return new Date(dateString).toLocaleDateString('he-IL');
}

function formatDateTime(dateString) {
  if (!dateString) return '';
  return new Date(dateString).toLocaleString('he-IL');
}

// ===== Init =====
async function init() {
  if (!await checkAuth()) return;
  await loadUsers();
}

init();
