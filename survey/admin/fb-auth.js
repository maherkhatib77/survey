/**
 * Form Builder Pro - שכבת אימות ואבטחה משותפת לכל דפי הניהול (ומקראים ציבוריים)
 * ---------------------------------------------------------------------------
 * 1. ניהול טוקן CSRF (Double Submit Cookie):
 *    - השרת משליך Cookie בשם fb_csrf בכל בקשת API.
 *    - הלקוח קורא את הערך מה-Cookie ושולח אותו בכותרת X-CSRF-Token בכל POST/DELETE.
 *    - אם ה-Cookie חסר (למשל הזמנה ראשונה), מבקשים GET ל-/api/auth.php?action=csrf-token
 *      כדי שהשרת ישליך אותו, ואז מנסים שוב.
 * 2. fetch מאובטח (fbFetch) עם fallback ידידותי לשגיאות 401/419.
 * 3. פונקציות התנתקות (fbLogout) ומניעת גישה לא מורשית.
 */
(function (global) {
  'use strict';

  const WRITE_METHODS = ['POST', 'PUT', 'PATCH', 'DELETE'];

  // ===== Cookie helpers =====
  function getCookie(name) {
    const m = document.cookie.match(new RegExp('(?:^|;\\s*)' + name.replace(/([.$?*|{}()[\]\\/+^])/g, '\\$1') + '=([^;]*)'));
    return m ? decodeURIComponent(m[1]) : '';
  }

  // Cache של טוקן CSRF – מתאפס כאשר ה-Cookie משתנה/נעלם
  let cachedToken = '';

  /**
   * נתיב גיבוי: אם דפדפן/שרת חוסמים את Cookie ה-CSRF (למשל העלאות multipart),
   * שולפים את הטוקן מכותרת התגובה X-CSRF-Token של בקשת GET ל-API
   * ומשמרים אותו ב-sessionStorage.
   */
  async function tokenFromHeader(base) {
    try {
      const res = await fetch(`${base}/auth.php?action=csrf-token`, {
        credentials: 'same-origin',
        cache: 'no-store',
      });
      const h = res.headers.get('X-CSRF-Token') || '';
      if (/^[a-f0-9]{64}$/.test(h)) {
        try { sessionStorage.setItem('fb_csrf_token', h); } catch (e) {}
        return h;
      }
    } catch (e) { /* אין ברירה – נחזיר ריק */ }
    return '';
  }

  // ===== CSRF token =====
  async function ensureCsrfToken(base) {
    const cookieToken = getCookie('fb_csrf');
    if (cookieToken && /^[a-f0-9]{64}$/.test(cookieToken)) {
      cachedToken = cookieToken;
      return cookieToken;
    }
    if (cachedToken) return cachedToken;

    // אין עדיין Cookie – מזמינים מהשרת (GET ציבורי שמשליך את ה-Cookie)
    try {
      await fetch(`${base}/auth.php?action=csrf-token`, { credentials: 'same-origin' });
    } catch (e) { /* ננסה לקרוא את ה-Cookie שוב בכל מקרה */ }

    const t = getCookie('fb_csrf');
    if (t) { cachedToken = t; return t; }

    // גיבוי: הטוקן מכותרת התגובה (עובד גם כשה-Cookie חסם)
    const stored = (() => { try { return sessionStorage.getItem('fb_csrf_token') || ''; } catch (e) { return ''; } })();
    if (/^[a-f0-9]{64}$/.test(stored)) { cachedToken = stored; return stored; }
    const headerToken = await tokenFromHeader(base);
    if (headerToken) cachedToken = headerToken;
    return headerToken || '';
  }

  /**
   * שליחת בקשת כתיבה עם כותרת CSRF.
   * אם השרת מחזיר 419 (טוקן לא תואם) – מנקים cache, מזמינים טוקן חדש ומנסים פעם אחת.
   */
  async function writeRequest(url, opts, base) {
    base = base || detectApiBase(url);
    const method = (opts.method || 'POST').toUpperCase();
    let attempt = 0;

    while (attempt < 2) {
      attempt++;
      const token = await ensureCsrfToken(base);
      const headers = Object.assign({}, opts.headers || {});
      if (token) headers['X-CSRF-Token'] = token;
      if (!headers['Content-Type'] && opts.body && typeof opts.body === 'string') {
        headers['Content-Type'] = 'application/json';
      }

      let res;
      try {
        res = await fetch(url, Object.assign({}, opts, {
          method,
          headers,
          credentials: 'same-origin',
        }));
      } catch (networkErr) {
        return { success: false, error: 'שגיאת תקשורת מול השרת', status: 0, networkError: true };
      }

      if (res.status === 419 && attempt === 1) {
        // טוקן הסתנכרן מחדש בצד השרת (למשל עמוד ישן) – מנסים עם טוקן חדש
        cachedToken = '';
        continue;
      }

      let json = null;
      const text = await res.text();
      try { json = JSON.parse(text); } catch (e) { json = null; }

      if (!res.ok) {
        const msg = (json && json.error) ? json.error : `שגיאת שרת (${res.status})`;
        return Object.assign({ success: false, status: res.status }, json || {}, { error: msg });
      }
      return json || { success: true, raw: text };
    }
    return { success: false, error: 'אימות אבטחה (CSRF) נכשל. רעננו את הדף ונסו שוב.', status: 419 };
  }

  /**
   * fetch ייעודי למערכת – מוסיף כותרת CSRF לבקשות כתיבה ונוהל שגיאות אחיד.
   * @param {string} url    כתובת מלאה או יחסית ל-API
   * @param {object} opts   options רגילים של fetch (method/body וכו')
   * @returns {Promise<object>} JSON מהשרת (תמיד אובייקט עם success/error)
   */
  async function fbFetch(url, opts = {}) {
    const method = (opts.method || 'GET').toUpperCase();
    const base = detectApiBase(url);

    // בקשות כתיבה – עם כותרת CSRF ו-retry אוטומטי על 419
    if (WRITE_METHODS.includes(method)) {
      return writeRequest(url, opts, base);
    }

    let res;
    try {
      res = await fetch(url, Object.assign({}, opts, {
        method,
        credentials: 'same-origin', // חיוני: העברת Cookie session + CSRF
      }));
    } catch (networkErr) {
      return { success: false, error: 'שגיאת תקשורת מול השרת', status: 0, networkError: true };
    }

    let json = null;
    const text = await res.text();
    try { json = JSON.parse(text); } catch (e) { json = null; }

    if (!res.ok) {
      const msg = (json && json.error) ? json.error : `שגיאת שרת (${res.status})`;
      // 401 = לא מחובר/פג תוקף – מועבר לדף ההתחברות על ידי הקריאה (היא מחליטה)
      return Object.assign({ success: false, status: res.status }, json || {}, { error: msg });
    }

    return json || { success: true, raw: text };
  }

  /**
   * נוחות שימוש: החלפת window.fetch כך שכל קריאות ה-API הקיימות (גם בלעדשי
   * עדון כל נקודת קריאה) יקבלו אוטומטית כותרת CSRF ו-credentials.
   * מוגבל אך ורק לבקשות אל ספריית ה-API של המערכת – שאר הבקשות עוברות כרגיל.
   */
  function installAutoCsrf() {
    const origFetch = global.fetch.bind(global);
    global.fetch = async function (input, init) {
      try {
        const url = typeof input === 'string' ? input : (input && input.url) || '';
        const isApi = /\/api\/[A-Za-z0-9_.-]+\.php/.test(url);
        const method = ((init && init.method) || (typeof input === 'object' && input.method) || 'GET').toUpperCase();

        if (isApi && WRITE_METHODS.includes(method)) {
          const base = detectApiBase(url);
          const token = await ensureCsrfToken(base);
          const isMultipart = init && typeof FormData !== 'undefined' && init.body instanceof FormData;
          const headers = new Headers((init && init.headers) || (typeof input === 'object' ? input.headers : undefined) || {});
          if (token) headers.set('X-CSRF-Token', token);
          // גיבוי להעלאות: העלאת קובץ בFormData – הטוקן נשלח גם כשדה בגוף הבקשה
          if (isMultipart && token) {
            try { init.body.append('csrf_token', token); } catch (e) {}
          }
          if (!headers.has('Content-Type') && init && typeof init.body === 'string') {
            headers.set('Content-Type', 'application/json');
          }
          init = Object.assign({}, init, { method, headers, credentials: init && init.credentials ? init.credentials : 'same-origin' });
          const res = await origFetch(input, init);
          if (res.status === 419) {
            // ניסיון חוזר אחד עם טוקן מעודכן (מה-Cookie או מכותרת התגובה)
            cachedToken = '';
            try { sessionStorage.removeItem('fb_csrf_token'); } catch (e) {}
            const fresh = (await ensureCsrfToken(base)) || (await tokenFromHeader(base));
            if (fresh) {
              const retryInit = Object.assign({}, init, { headers });
              headers.set('X-CSRF-Token', fresh);
              if (isMultipart) {
                try {
                  const body2 = (typeof input === 'object' && input.method) ? init.body : init.body;
                  if (body2 instanceof FormData) {
                    body2.delete('csrf_token');
                    body2.append('csrf_token', fresh);
                  }
                } catch (e) {}
              }
              return origFetch(input, retryInit);
            }
          }
          return res;
        }

        if (isApi) {
          init = Object.assign({}, init, { credentials: (init && init.credentials) || 'same-origin' });
        }
        return origFetch(input, init);
      } catch (e) {
        return origFetch(input, init);
      }
    };
  }

  function detectApiBase(url) {
    // כתובות API נבנות בדפים כ-`../api/xxx.php` (דפי ניהול) או `api/xxx.php` (דפים ציבוריים)
    const m = url.match(/(^|[^A-Za-z0-9_])((?:\.\.\/)?(?:[A-Za-z0-9_.\-]+\/)*api)\//);
    if (m) return m[2];
    return '../api';
  }

  // ===== Auth check =====
  async function fbCheckAuth(apiBase) {
    const json = await fbFetch(`${apiBase}/auth.php?action=check`);
    return !!(json.success && json.loggedIn);
  }

  async function fbCurrentUser(apiBase) {
    const json = await fbFetch(`${apiBase}/users.php?action=me`);
    return json.success ? json.data : null;
  }

  // ===== Logout =====
  async function fbLogout(apiBase, redirectTo) {
    try {
      await writeRequest(`${apiBase}/auth.php?action=logout`, { method: 'POST' }, apiBase);
    } catch (e) { /* מתעלמים – תמיד מנתקים בצד הלקוח */ }
    try { localStorage.clear(); sessionStorage.clear(); } catch (e) {}
    window.location.href = redirectTo || 'login.html';
  }

  // הפעלה אוטומטית של מגן ה-CSRF הגלובלי
  installAutoCsrf();

  global.FBAuth = {
    getCookie,
    ensureCsrfToken,
    fbFetch,
    writeRequest,
    fbCheckAuth,
    fbCurrentUser,
    fbLogout,
    installAutoCsrf,
  };
})(window);
