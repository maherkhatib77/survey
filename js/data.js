const DataStore = (() => {
    const STORAGE_PREFIX = 'matspanet_';
    
    // מנגנון זיכרון - שומר נתונים ב-RAM
    const _memoryCache = {};
    let _localStorageFull = false;
    
    const KEYS = {
        USERS: 'users', CATEGORIES: 'categories', SOLUTIONS: 'solutions',
        MENTORS: 'mentors', GUIDES_REPO: 'guides_repo', BUDGETS: 'budgets',
        PERIODS: 'periods', INSTITUTIONS: 'institutions',
        SOLUTION_INSTRUCTORS: 'solution_instructors',
        LOOKUP_DOMAINS: 'lookup_domains',
        LOOKUP_EDUCATION_STAGES: 'lookup_education_stages',
        LOOKUP_EDUCATION_TYPES: 'lookup_education_types',
        LOOKUP_BUDGET_TYPES: 'lookup_budget_types',
        LOOKUP_ALLOCATION_STATUS: 'lookup_allocation_status',
        LOOKUP_SOLUTION_STATUS: 'lookup_solution_status',
        LOOKUP_PERFORMER_TYPES: 'lookup_performer_types',
        LOOKUP_LECTURER_STATUS: 'lookup_lecturer_status',
        LOOKUP_CERTIFIED_LECTURER: 'lookup_certified_lecturer',
        LOOKUP_EXPERT_FIELD: 'lookup_expert_field',
        LOOKUP_FIELD_KNOWLEDGE: 'lookup_field_knowledge',
        LOOKUP_ROLE_HOLDERS: 'lookup_role_holders',
        LOOKUP_BROAD_TOPICS: 'lookup_broad_topics',
        LOOKUP_DESIGNATED_PROGRAMS: 'lookup_designated_programs',
        LOOKUP_WEEK_DAYS: 'lookup_week_days',
        LOOKUP_MEETING_TYPES: 'lookup_meeting_types',
        LOOKUP_SCHOOLS: 'lookup_schools',
        SOLUTION_COMMENTS: 'solution_comments',
        CATALOG_ENTRIES: 'catalog_entries',
        CATALOG_ITEMS: 'catalog_items',
        REGISTRATIONS: 'registrations',
        SETTINGS: 'settings', SESSION: 'session',
        ACTIVITY_LOG: 'activity_log', RECYCLE_BIN: 'recycle_bin',
        INSPECTORS: 'inspectors',
        PEDAGOGICAL_EXECUTORS: 'pedagogical_executors',
        LOOKUP_RESPONSIBILITY_TYPES: 'lookup_responsibility_types',
        HOMEPAGE: 'homepage', FAQ_DATA: 'faq_data',
        CUSTOM_PAGES: 'custom_pages',
        WORKSHOP_SETTINGS: 'workshop_settings',
        WORKSHOP_BOOKINGS: 'workshop_bookings',
        WORKSHOP_SIM_SETTINGS: 'workshop_sim_settings',
        WORKSHOP_SIM_BOOKINGS: 'workshop_sim_bookings',
        CLUSTERS: 'clusters',
        CLUSTER_REGISTRATIONS: 'cluster_registrations',
        CLUSTERS_SETTINGS: 'clusters_settings'
    };

    const KEY_TO_FILE = {
        [KEYS.USERS]: 'users.json', [KEYS.CATEGORIES]: 'categories.json',
        [KEYS.SOLUTIONS]: 'solutions.json', [KEYS.MENTORS]: 'mentors.json',
        [KEYS.GUIDES_REPO]: 'guides_repo.json', [KEYS.BUDGETS]: 'budgets.json',
        [KEYS.PERIODS]: 'periods.json',
        [KEYS.SOLUTION_INSTRUCTORS]: 'solution_instructors.json',
        [KEYS.LOOKUP_DOMAINS]: 'lookup_domains.json',
        [KEYS.LOOKUP_EDUCATION_STAGES]: 'lookup_education_stages.json',
        [KEYS.LOOKUP_EDUCATION_TYPES]: 'lookup_education_types.json',
        [KEYS.LOOKUP_BUDGET_TYPES]: 'lookup_budget_types.json',
        [KEYS.LOOKUP_ALLOCATION_STATUS]: 'lookup_allocation_status.json',
        [KEYS.LOOKUP_SOLUTION_STATUS]: 'lookup_solution_status.json',
        [KEYS.LOOKUP_PERFORMER_TYPES]: 'lookup_performer_types.json',
        [KEYS.LOOKUP_LECTURER_STATUS]: 'lookup_lecturer_status.json',
        [KEYS.LOOKUP_CERTIFIED_LECTURER]: 'lookup_certified_lecturer.json',
        [KEYS.LOOKUP_EXPERT_FIELD]: 'lookup_expert_field.json',
        [KEYS.LOOKUP_FIELD_KNOWLEDGE]: 'lookup_field_knowledge.json',
        [KEYS.LOOKUP_ROLE_HOLDERS]: 'lookup_role_holders.json',
        [KEYS.LOOKUP_BROAD_TOPICS]: 'lookup_broad_topics.json',
        [KEYS.LOOKUP_DESIGNATED_PROGRAMS]: 'lookup_designated_programs.json',
        [KEYS.LOOKUP_WEEK_DAYS]: 'lookup_week_days.json',
        [KEYS.LOOKUP_MEETING_TYPES]: 'lookup_meeting_types.json',
        [KEYS.LOOKUP_SCHOOLS]: 'lookup_schools.json',
        [KEYS.SOLUTION_COMMENTS]: 'solution_comments.json',
        [KEYS.CATALOG_ENTRIES]: 'catalog_entries.json',
        [KEYS.CATALOG_ITEMS]: 'catalog_items.json',
        [KEYS.REGISTRATIONS]: 'registrations.json',
        [KEYS.SETTINGS]: 'settings.json',
        [KEYS.ACTIVITY_LOG]: 'activity_log.json',
        [KEYS.RECYCLE_BIN]: 'recycle_bin.json',
        [KEYS.INSPECTORS]: 'inspectors.json',
        [KEYS.PEDAGOGICAL_EXECUTORS]: 'pedagogical_executors.json',
        [KEYS.LOOKUP_RESPONSIBILITY_TYPES]: 'lookup_responsibility_types.json',
        [KEYS.HOMEPAGE]: 'homepage.json',
        [KEYS.FAQ_DATA]: 'faq_data.json',
        [KEYS.WORKSHOP_SETTINGS]: 'workshop_settings.json',
        [KEYS.WORKSHOP_BOOKINGS]: 'workshop_bookings.json',
        [KEYS.WORKSHOP_SIM_SETTINGS]: 'workshop_sim_settings.json',
        [KEYS.WORKSHOP_SIM_BOOKINGS]: 'workshop_sim_bookings.json',
        [KEYS.CLUSTERS]: 'clusters.json',
        [KEYS.CLUSTER_REGISTRATIONS]: 'cluster_registrations.json',
        [KEYS.CLUSTERS_SETTINGS]: 'clusters_settings.json',
        [KEYS.CUSTOM_PAGES]: 'custom_pages.json'
    };

    const DEFAULT_DATA = {
        [KEYS.USERS]: [{ id: 'usr_admin_001', username: 'admin', password: 'admin123', fullName: 'מנהל מערכת', email: 'admin@matspanet.co.il', role: 'system_admin', isActive: true }],
        [KEYS.SETTINGS]: { systemName: 'מצפן נט', language: 'he' },
        [KEYS.SESSION]: null,
        [KEYS.HOMEPAGE]: { siteName: { he: 'מצפן נט', ar: 'بوصلة نت' } }
    };

    function getKey(key) { return STORAGE_PREFIX + key; }
    function generateId() { return Date.now().toString(36) + Math.random().toString(36).substr(2, 9); }
    function now() { return new Date().toISOString(); }

    // getAll - קורא קודם מהזיכרון ב-RAM, ואז מ-localStorage
    function getAll(key) {
        if (_memoryCache[key] !== undefined) {
            return _memoryCache[key];
        }
        
        try {
            const raw = localStorage.getItem(getKey(key));
            if (raw !== null && raw !== '') {
                const parsed = JSON.parse(raw);
                _memoryCache[key] = parsed;
                return parsed;
            }
        } catch (e) {
            console.warn('[DataStore] שגיאת קריאת JSON עבור מפתח:', key);
            localStorage.removeItem(getKey(key));
        }
        return DEFAULT_DATA[key] !== undefined ? DEFAULT_DATA[key] : [];
    }

    function getById(key, id) {
        const items = getAll(key);
        if (!Array.isArray(items)) return null;
        return items.find(item => item.id === id) || null;
    }

    // saveAll - שומר בזיכרון, ב-localStorage ובשרת
    function saveAll(key, items) {
        _memoryCache[key] = items;
        
        if (!_localStorageFull) {
            try {
                localStorage.setItem(getKey(key), JSON.stringify(items));
            } catch (e) {
                if (e.name === 'QuotaExceededError' || e.name === 'NS_ERROR_DOM_QUOTA_REACHED') {
                    console.warn('[DataStore] נפח localStorage מלא. המערכת עוברת לפעולה בזיכרון בלבד.');
                    _localStorageFull = true; 
                }
                localStorage.removeItem(getKey(key));
            }
        }
        
        _syncToServer(key, items);
        return true;
    }

    function create(key, item) {
        const items = getAll(key) || [];
        const newItem = { ...item, id: item.id || generateId(), createdAt: item.createdAt || now(), updatedAt: now() };
        items.push(newItem);
        saveAll(key, items);
        return newItem;
    }

    function update(key, id, updates) {
        const items = getAll(key);
        if (!Array.isArray(items)) return null;
        const index = items.findIndex(item => item.id === id);
        if (index === -1) return null;
        items[index] = { ...items[index], ...updates, id, updatedAt: now() };
        saveAll(key, items);
        return items[index];
    }

    function remove(key, id) {
        const items = getAll(key);
        if (!Array.isArray(items)) return false;
        const filtered = items.filter(item => item.id !== id);
        if (filtered.length === items.length) return false;
        saveAll(key, filtered);
        return true;
    }

    function getSettings() { return getAll(KEYS.SETTINGS) || DEFAULT_DATA[KEYS.SETTINGS]; }
    function updateSettings(updates) { const current = getSettings(); saveAll(KEYS.SETTINGS, { ...current, ...updates }); }
    function getHomepage() { return getAll(KEYS.HOMEPAGE) || DEFAULT_DATA[KEYS.HOMEPAGE]; }
    function updateHomepage(updates) { const current = getHomepage(); saveAll(KEYS.HOMEPAGE, { ...current, ...updates }); }
    
    function setSession(user) {
        const session = { userId: user.id, username: user.username, fullName: user.fullName, email: user.email || '', role: user.role, loginTime: now() };
        try { sessionStorage.setItem(getKey(KEYS.SESSION), JSON.stringify(session)); } catch (e) {}
        saveAll(KEYS.SESSION, session);
        return session;
    }
    
    function getSession() {
        try {
            const raw = sessionStorage.getItem(getKey(KEYS.SESSION));
            if (raw) return JSON.parse(raw);
        } catch (e) {}
        return getAll(KEYS.SESSION);
    }
    
    function clearSession() {
        sessionStorage.removeItem(getKey(KEYS.SESSION));
        localStorage.removeItem(getKey(KEYS.SESSION));
        delete _memoryCache[KEYS.SESSION];
    }

    function getStats() {
        const stats = {};
        Object.keys(KEYS).forEach(keyName => {
            const key = KEYS[keyName];
            const items = getAll(key);
            if (Array.isArray(items)) {
                stats[key] = items.length;
            } else if (items && typeof items === 'object') {
                stats[key] = 1;
            } else {
                stats[key] = 0;
            }
        });
        return stats;
    }

    function _syncToServer(key, items) {
        const filename = KEY_TO_FILE[key];
        if (!filename) return;
        
        const currentSession = DataStore.getSession();
        if (!currentSession || !currentSession.userId) return;
        
        const pathParts = window.location.pathname.split('/');
        pathParts.pop();
        const basePath = pathParts.join('/') + '/';
        const url = basePath + 'api/data-save.php';
        
        const payload = { filename: filename, data: items, session: currentSession };
        
        fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        }).catch(err => console.warn('[DataStore] Server sync failed:', err));
    }

    function _getDataUrl(filename) {
        const pathParts = window.location.pathname.split('/');
        pathParts.pop();
        const basePath = pathParts.join('/') + '/';
        return `${basePath}api/get-data.php?file=${encodeURIComponent(filename)}`;
    }

    async function _fetchJson(filename) {
        try {
            const primaryUrl = _getDataUrl(filename) + `&t=${Date.now()}`;
            const res = await fetch(primaryUrl);
            if (res.ok) {
                return await res.json();
            }
        } catch (e) {
            // Fallback for static/offline
        }

        try {
            const fallbackRes = await fetch(`./data/${filename}?t=${Date.now()}`);
            if (fallbackRes.ok) {
                return await fallbackRes.json();
            }
        } catch (e) {}
        return null;
    }

    /**
     * טוען קובץ מסוים לפי דרישה (Lazy Loading) אם טרם נטען לזיכרון
     */
    async function ensureLoaded(key) {
        if (_memoryCache[key] !== undefined && _memoryCache[key] !== null) {
            return _memoryCache[key];
        }
        const filename = KEY_TO_FILE[key];
        if (!filename) return null;
        
        const data = await _fetchJson(filename);
        if (data && (Array.isArray(data) || typeof data === 'object')) {
            _memoryCache[key] = data;
            return data;
        }
        return null;
    }

    /**
     * אתחול המערכת וטעינת נתונים
     * @param {boolean} forceReloadFromServer - טעינה מחדש כפויה
     * @param {string[]|null} specificKeys - רשימת מפתחות ספציפיים לטעינה (למניעת טעינת יתר בדפים ציבוריים)
     */
    async function init(forceReloadFromServer = false, specificKeys = null) {
        try {
            localStorage.setItem('_test_', '1');
            localStorage.removeItem('_test_');
        } catch (e) {
            _localStorageFull = true;
            console.warn('[DataStore] localStorage is full - using memory cache');
        }
        
        // בחירת המפתחות לטעינה
        let keysToProcess;
        if (Array.isArray(specificKeys) && specificKeys.length > 0) {
            keysToProcess = specificKeys;
        } else {
            // בטעינה מלאה (למשל בדאשבורד) - דוחים את טעינת mentors.json (8.2MB) לטעינה עצלה
            keysToProcess = Object.keys(KEY_TO_FILE);
        }
        
        for (const key of keysToProcess) {
            const filename = KEY_TO_FILE[key];
            if (!filename) continue;

            let hasLocalData = false;
            if (!_localStorageFull && !forceReloadFromServer) {
                const stored = localStorage.getItem(getKey(key));
                if (stored !== null && stored !== '' && stored !== '[]' && stored !== 'null') {
                    try {
                        const parsed = JSON.parse(stored);
                        if (Array.isArray(parsed) && parsed.length > 0) {
                            _memoryCache[key] = parsed;
                            hasLocalData = true;
                        } else if (parsed && typeof parsed === 'object' && !Array.isArray(parsed) && Object.keys(parsed).length > 0) {
                            _memoryCache[key] = parsed;
                            hasLocalData = true;
                        }
                    } catch (e) {
                        console.warn(`[DataStore] שגיאה בקריאת ${key} מ-localStorage`);
                    }
                }
            }
            
            if (!hasLocalData) {
                const data = await _fetchJson(filename);
                if (data && (Array.isArray(data) || typeof data === 'object')) {
                    _memoryCache[key] = data;
                    
                    // קבצים מעל 1MB לא שומרים ב-localStorage למניעת קריסת מכסה
                    if (!_localStorageFull && key !== KEYS.MENTORS && key !== KEYS.LOOKUP_SCHOOLS) {
                        try {
                            localStorage.setItem(getKey(key), JSON.stringify(data));
                        } catch (e) {
                            _localStorageFull = true;
                        }
                    }
                }
            }
        }
    }

    async function forceReloadFromServer() {
        console.log('[DataStore] טעינה מחדש של כל הנתונים מהשרת...');
        for (const key of Object.keys(KEY_TO_FILE)) {
            localStorage.removeItem(getKey(key));
            delete _memoryCache[key];
        }
        await init(true);
        return true;
    }

    return {
        KEYS, KEY_TO_FILE, DEFAULT_DATA, generateId,
        getAll, getById, create, update, remove, saveAll,
        getSettings, updateSettings, getHomepage, updateHomepage,
        setSession, getSession, clearSession, getStats, init, ensureLoaded, forceReloadFromServer
    };
})();