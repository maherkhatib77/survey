// ==========================================
// פונקציית עזר להצגת הודעות Toast (מוגנת ועצמאית)
// ==========================================
function showToast(message, type = 'info') {
    const container = document.getElementById('toastContainer');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    
    // הוספת אייקון מתאים לסוג ההודעה
    let icon = 'ℹ️';
    if (type === 'success') icon = '✅';
    if (type === 'error') icon = '❌';
    if (type === 'warning') icon = '⚠️';

    toast.innerHTML = `<span style="font-size:18px; margin-left:8px;">${icon}</span><span>${message}</span>`;
    
    container.appendChild(toast);

    // הסרה אוטומטית עם אנימציה לאחר 3.5 שניות
    setTimeout(() => {
        toast.style.animation = 'slideOut 0.4s forwards';
        setTimeout(() => {
            if (toast.parentNode) toast.remove();
        }, 400);
    }, 3500);
}

// ==========================================
// לוגיקה ראשית של דף הרישום
// ==========================================
document.addEventListener('DOMContentLoaded', async () => {
    console.log("✅✅✅ הקובץ registration.js החדש נטען בהצלחה! ✅✅✅");

    // 1. אתחול מערכת הנתונים
    await DataStore.init(false);

    // 2. קריאת פרמטרים מה-URL
    const urlParams = new URLSearchParams(window.location.search);
    const solutionId = urlParams.get('solutionId');
    
    let currentSolutionName = 'רישום כללי / تسجيل عام';
    let currentSolutionId = '';

    // 3. שליפת שם פתרון הלמידה והצגתו
    if (solutionId) {
        const solutions = DataStore.getAll(DataStore.KEYS.SOLUTIONS) || [];
        const sol = solutions.find(s => s.id === solutionId);
        if (sol) {
            currentSolutionName = sol.solutionNameAr || sol.solutionName;
            currentSolutionId = sol.id;
            
            const badge = document.getElementById('solutionBadge');
            const nameEl = document.getElementById('solutionName');
            if (badge && nameEl) {
                badge.style.display = 'inline-flex';
                nameEl.textContent = currentSolutionName;
            }
        }
    }

    // 4. איוש רשימת התפקידים
    const roleSelect = document.getElementById('role');
    const roles = DataStore.getAll(DataStore.KEYS.LOOKUP_ROLE_HOLDERS) || [];
    if (roles.length > 0) {
        roles.forEach(role => {
            const option = document.createElement('option');
            option.value = role.labelAr || role.label || role.value;
            option.textContent = role.labelAr || role.label || role.value;
            roleSelect.appendChild(option);
        });
    } else {
        // גיבוי אם הטבלה ריקה
        ['מורה / معلم', 'מנהל/ת / مدير', 'רכז/ת / مركز', 'יועץ/ת / مرشد', 'אחר / آخر'].forEach(r => {
            const option = document.createElement('option');
            option.value = r;
            option.textContent = r;
            roleSelect.appendChild(option);
        });
    }

    // 5. ניהול אוטו-קומפליט למוסדות (תגיות)
    const schools = DataStore.getAll(DataStore.KEYS.LOOKUP_SCHOOLS) || [];
    const searchInput = document.getElementById('institutionSearch');
    const suggestionsBox = document.getElementById('schoolSuggestions');
    const tagsContainer = document.getElementById('institutionTags');
    const hiddenInput = document.getElementById('institutionCodes');
    
    let selectedSchools = [];

    searchInput.addEventListener('input', function() {
        const query = this.value.trim().toLowerCase();
        if (query.length < 2) {
            suggestionsBox.style.display = 'none';
            return;
        }

        const matches = schools.filter(s => 
            (s.code && s.code.toString().toLowerCase().includes(query)) ||
            (s.name && s.name.toLowerCase().includes(query)) ||
            (s.nameHe && s.nameHe.toLowerCase().includes(query))
        ).slice(0, 8);

        if (matches.length > 0) {
            suggestionsBox.innerHTML = matches.map(s => `
                <div class="suggestion-item" data-code="${s.code || s.id}" data-name="${s.nameHe || s.name}">
                    <div class="sug-header">
                        <span class="sug-code">${s.code || s.id}</span>
                        <span class="sug-name">${s.nameHe || s.name}</span>
                    </div>
                </div>
            `).join('');
            suggestionsBox.style.display = 'block';
        } else {
            suggestionsBox.style.display = 'none';
        }
    });

    suggestionsBox.addEventListener('click', function(e) {
        const item = e.target.closest('.suggestion-item');
        if (!item) return;

        const code = item.dataset.code;
        const name = item.dataset.name;

        if (!selectedSchools.find(s => s.code === code)) {
            selectedSchools.push({ code, name });
            renderTags();
        }
        
        searchInput.value = '';
        suggestionsBox.style.display = 'none';
    });

    function renderTags() {
        tagsContainer.innerHTML = selectedSchools.map(s => `
            <div class="institution-tag">
                <span class="tag-text">${s.code} - ${s.name}</span>
                <button type="button" class="tag-remove" data-code="${s.code}">×</button>
            </div>
        `).join('');
        
        hiddenInput.value = selectedSchools.map(s => s.code).join(',');
    }

    tagsContainer.addEventListener('click', function(e) {
        if (e.target.classList.contains('tag-remove')) {
            const code = e.target.dataset.code;
            selectedSchools = selectedSchools.filter(s => s.code !== code);
            renderTags();
        }
    });

    document.addEventListener('click', function(e) {
        if (!e.target.closest('.autocomplete-wrapper') && !e.target.closest('.autocomplete-dropdown')) {
            suggestionsBox.style.display = 'none';
        }
    });

    // 6. טיפול בשליחת הטופס
    const form = document.getElementById('registrationForm');
    const submitBtn = document.getElementById('submitBtn');
    const successMessage = document.getElementById('successMessage');

    form.addEventListener('submit', async function(e) {
        e.preventDefault();

        if (!form.checkValidity()) {
            form.reportValidity();
            return;
        }

        if (selectedSchools.length === 0) {
            showToast('יש לבחור לפחות מוסד אחד', 'warning');
            return;
        }

        // איסוף הנתונים
        const registrationData = {
            id: 'reg_' + Date.now(),
            solutionId: currentSolutionId,
            solutionName: currentSolutionName,
            fullName: document.getElementById('fullName').value.trim(),
            phone: document.getElementById('phone').value.trim(),
            email: document.getElementById('email').value.trim(),
            institutionCodes: hiddenInput.value,
            institutionNames: selectedSchools.map(s => s.name).join(' | '),
            role: document.getElementById('role').value,
            createdAt: new Date().toISOString()
        };

        // שינוי מצב הכפתור
        submitBtn.disabled = true;
        submitBtn.innerHTML = '⏳ שולח... | جارٍ الإرسال...';

        try {
            // שליחה לשרת לשמירה ב-JSON
            const response = await fetch('./api/save_registration.php', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(registrationData)
            });

            const result = await response.json();

            if (result.success) {
                // הצגת הודעת הצלחה
                form.style.display = 'none';
                document.getElementById('solutionBadge').style.display = 'none';
                successMessage.style.display = 'block';
                showToast('הרישום נשמר בהצלחה!', 'success');
            } else {
                throw new Error(result.message || 'שגיאה בשמירה');
            }
        } catch (error) {
            console.error('Registration Error:', error);
            showToast('אירעה שגיאה בשמירת הרישום. אנא נסה שוב.', 'error');
            submitBtn.disabled = false;
            submitBtn.innerHTML = 'שליחה | إرسال';
        }
    });

    // עדכון שנת הפוטר
    const footerYear = document.getElementById('footerYear');
    if (footerYear) footerYear.textContent = new Date().getFullYear();
});