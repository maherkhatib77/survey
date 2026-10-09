<?php
/**
 * Form Builder Pro - PHP API Configuration
 * הגדרות מערכת + ניהול Sessions + אבטחה (CSRF / CORS / Brute-force)
 */

// ===== הגדרות Session מאובטחות (חייבות להיות לפני session_start) =====
$__secure = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off')
            || (($_SERVER['HTTP_X_FORWARDED_PROTO'] ?? '') === 'https');
ini_set('session.cookie_httponly', '1');
ini_set('session.cookie_secure', $__secure ? '1' : '0');
ini_set('session.cookie_samesite', 'Lax');
ini_set('session.use_strict_mode', '1');
ini_set('session.use_only_cookies', '1');
session_start();

// הגדרות בסיסיות
define('DATA_DIR', __DIR__ . '/../data');
define('FORMS_DIR', DATA_DIR . '/forms');
define('RESPONSES_DIR', DATA_DIR . '/responses');
define('SOURCES_DIR', DATA_DIR . '/sources');
define('USERS_FILE', DATA_DIR . '/users.json');
define('LOGIN_ATTEMPTS_FILE', DATA_DIR . '/login_attempts.json');
define('RESET_TOKENS_FILE', DATA_DIR . '/reset_tokens.json');

// ===== הגדרות אבטחה =====
define('SESSION_LIFETIME', 60 * 60 * 4);          // 4 שעות
define('MAX_LOGIN_ATTEMPTS', 5);                   // ניסיונות לפני נעילה
define('LOCKOUT_SECONDS', 15 * 60);                // 15 דקות נעילה
define('RESET_TOKEN_TTL', 60 * 60);                // קישור איפוס תקף שעה

// שמירת סיסמת ברירת מחדל רק בהתקנה מקומית; בייצור אין לחשוף אותה בשום מקום
define('DEFAULT_ADMIN_USER', 'admin');
define('DEFAULT_ADMIN_PASS', getenv('FB_DEFAULT_ADMIN_PASS') ?: 'admin123');
$__fbHost = explode(':', $_SERVER['HTTP_HOST'] ?? '')[0];
define('IS_LOCALHOST', filter_var($__fbHost, FILTER_VALIDATE_IP)
        ? in_array($__fbHost, ['127.0.0.1', '::1'], true)
        : ($__fbHost === 'localhost' || substr($__fbHost, -strlen('.localhost')) === '.localhost'));

// ===== CORS מבוקר (במקום Access-Control-Allow-Origin: *) =====
$FB_ALLOWED_ORIGINS = [
    'http://localhost', 'http://127.0.0.1',
    'https://ejpisga.org.il', 'https://www.ejpisga.org.il',
];
$origin = $_SERVER['HTTP_ORIGIN'] ?? '';
$allowed = false;
if ($origin !== '') {
    $host = parse_url($origin, PHP_URL_HOST) ?: '';
    foreach ($FB_ALLOWED_ORIGINS as $o) {
        $oh = parse_url($o, PHP_URL_HOST) ?: '';
        if ($host === $oh || substr($host, -strlen('.' . $oh)) === '.' . $oh) {
            $allowed = true;
            header('Access-Control-Allow-Origin: ' . $o);
            header('Vary: Origin');
            break;
        }
    }
    if (!$allowed && IS_LOCALHOST) { // הקלות בפיתוח מקומי בלבד
        $allowed = true;
        header('Access-Control-Allow-Origin: ' . $origin);
        header('Vary: Origin');
    }
    if (!$allowed) {
        http_response_code(403);
        echo json_encode(['success' => false, 'error' => 'Origin not allowed'], JSON_UNESCAPED_UNICODE);
        exit();
    }
}

// כותרות אבטחה
header('Content-Type: application/json; charset=utf-8');
header('X-Content-Type-Options: nosniff');
header('X-Frame-Options: DENY');
header('Referrer-Policy: strict-origin-when-cross-origin');
header("Content-Security-Policy: default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src https://fonts.gstatic.com data:; img-src 'self' data:; connect-src 'self'; frame-ancestors 'none'");
header('Access-Control-Allow-Credentials: true');
header('Access-Control-Allow-Methods: GET, POST, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, X-CSRF-Token');

// Handle preflight
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit();
}

// ===== הגנת CSRF (Double Submit Cookie + תוקף) =====
// ההגנה מבוססת על cookie לא-HttpOnly (fb_csrf) שהלקוח מחזיר בכותרת X-CSRF-Token.
// אין תלות ב-Session – לכן הפעולות הציבוריות (שכחתי סיסמה / איפוס עם טוקן) עובדות גם
// כשהמשתמש אינו מחובר, וכל פעולת POST/DELETE מאומתת באותו מנגנון אחיד.

/**
 * השלכת Cookie XSS (או יצירת אחד חדש אם אינו קיים).
 * מחזיר את ערך הטוקן.
 */
function issueCsrfCookie() {
    $token = isset($_COOKIE['fb_csrf']) && preg_match('/^[a-f0-9]{64}$/', $_COOKIE['fb_csrf'])
             ? $_COOKIE['fb_csrf']
             : bin2hex(random_bytes(32));

    $https = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off')
             || (($_SERVER['HTTP_X_FORWARDED_PROTO'] ?? '') === 'https');

    // SameSite=Lax: דפדפנים עדכניים דורשים Secure עבור Lax ב-HTTPS.
    // ב-localhost (פיתוח, HTTP) – Cookie ללא Secure כדי שהזרימה תעבוד מקומית.
    setcookie('fb_csrf', $token, [
        'expires'  => time() + 12 * 3600,
        'path'     => '/',
        'httponly' => false,   // הנדרש כדי ש-js יוכל לקרוא ולהחזיר בכותרת
        'samesite' => 'Lax',
        'secure'   => $https,
    ]);
    return $token;
}

/**
 * עטיפת request עם Cookie ה-CSRF – חובה לכל קובץ API.
 * מבטיחה שה-Cookie קיים כבר בהזמנה הראשונה (גם GET ציבורי), כך שלקוח יכול
 * לשלוף אותו מה-Cookie ולשלוח בכותרת עוד לפני כל התחברות.
 */
function csrfBootstrap() {
    issueCsrfCookie();
}

function getCsrfToken() {
    return issueCsrfCookie();
}

/**
 * אימות טוקן CSRF לבקשות כתיבה (POST/PUT/DELETE/PATCH).
 * GET/OPTIONS מדלגים אוטומטית.
 */
function validateCsrf() {
    if (in_array($_SERVER['REQUEST_METHOD'], ['GET', 'HEAD', 'OPTIONS'], true)) return;

    $sent = trim($_SERVER['HTTP_X_CSRF_TOKEN'] ?? '');
    $cookie = $_COOKIE['fb_csrf'] ?? '';

    if ($sent === '' || $cookie === '' || !preg_match('/^[a-f0-9]{64}$/', $cookie)
        || !hash_equals($cookie, $sent)) {
        http_response_code(419);
        echo json_encode(['success' => false, 'error' => 'אישור אבטחה (CSRF) נכשל. רענן את הדף ונסה שוב.'], JSON_UNESCAPED_UNICODE);
        exit();
    }
    // החייאת תוקף ה-Cookie בכל שימוש תקין
    issueCsrfCookie();
}

// ===== פקיעת תוקף Session =====
if (isset($_SESSION['login_time']) && (time() - $_SESSION['login_time']) > SESSION_LIFETIME) {
    $_SESSION = [];
    session_destroy();
    http_response_code(401);
    echo json_encode(['success' => false, 'error' => 'ההתחברות פגה. יש להתחבר מחדש'], JSON_UNESCAPED_UNICODE);
    exit();
}

// ===== בדיקת התחברות =====
function isLoggedIn() {
    // תאימות: logged_in (סקרים) או userId (מצפן נט)
    return (isset($_SESSION['logged_in']) && $_SESSION['logged_in'] === true)
           || !empty($_SESSION['userId']);
}

function requireLogin() {
    if (!isLoggedIn()) {
        http_response_code(401);
        echo json_encode(['success' => false, 'error' => 'נדרשת התחברות'], JSON_UNESCAPED_UNICODE);
        exit();
    }
}

// ===== ניהול משתמשים =====
function getUsers() {
    if (!file_exists(USERS_FILE)) {
        // יצירת משתמש ברירת מחדל
        $users = [
            [
                'id' => generateUUID(),
                'username' => DEFAULT_ADMIN_USER,
                'password' => password_hash(DEFAULT_ADMIN_PASS, PASSWORD_DEFAULT),
                'fullName' => 'מנהל מערכת',
                'email' => 'admin@example.com',
                'role' => 'admin',
                'permissions' => [
                    'create_forms' => true,
                    'edit_forms' => true,
                    'delete_forms' => true,
                    'view_responses' => true,
                    'export_data' => true,
                    'manage_users' => true
                ],
                'active' => true,
                'createdAt' => date('c'),
                'lastLogin' => null
            ]
        ];
        ensureDirectories();
        $users[0]['defaultPassword'] = true; // מסמן שטרם הוחלפה סיסמת ברירת המחדל
        writeJSON(USERS_FILE, $users);
        return $users;
    }
    
    $users = readJSON(USERS_FILE) ?: [];
    
    // עדכון משתמשים קיימים
    $updated = false;
    foreach ($users as &$user) {
        // הוספת שדה active אם חסר
        if (!isset($user['active'])) {
            $user['active'] = true;
            $updated = true;
        }
        
        // הוספת שדה id אם חסר
        if (!isset($user['id']) || empty($user['id'])) {
            $user['id'] = generateUUID();
            $updated = true;
        }
    }
    
    if ($updated) {
        writeJSON(USERS_FILE, $users);
    }
    
    return $users;
}

function saveUsers($users) {
    return writeJSON(USERS_FILE, $users);
}

function getCurrentUser() {
    if (!isLoggedIn()) return null;
    $users = getUsers();
    foreach ($users as $user) {
        if ($user['username'] === $_SESSION['username']) {
            return $user;
        }
    }
    return null;
}

function hasPermission($permission) {
    $user = getCurrentUser();
    if (!$user) return false;
    if ($user['role'] === 'admin') return true;
    return isset($user['permissions'][$permission]) && $user['permissions'][$permission];
}

function requirePermission($permission) {
    if (!hasPermission($permission)) {
        http_response_code(403);
        echo json_encode(['success' => false, 'error' => 'אין לך הרשאה לבצע פעולה זו'], JSON_UNESCAPED_UNICODE);
        exit();
    }
}

// ===== הגנת Brute-Force (נעילת חשבון זמנית) =====
function recordLoginAttempt($username, $success) {
    $attempts = readJSON(LOGIN_ATTEMPTS_FILE) ?: [];
    // ניקוי רשומות ישנות
    $now = time();
    foreach ($attempts as $k => $rec) {
        if (($now - ($rec['last'] ?? 0)) > LOCKOUT_SECONDS * 4) unset($attempts[$k]);
    }
    $key = strtolower($username);
    if ($success) {
        unset($attempts[$key]);
    } else {
        if (!isset($attempts[$key])) $attempts[$key] = ['count' => 0, 'first' => $now, 'last' => $now];
        $attempts[$key]['count']++;
        $attempts[$key]['last'] = $now;
    }
    writeJSON(LOGIN_ATTEMPTS_FILE, array_values($attempts) ? $attempts : (object)$attempts);
}

function isAccountLocked($username) {
    $attempts = readJSON(LOGIN_ATTEMPTS_FILE) ?: [];
    $rec = $attempts[strtolower($username)] ?? null;
    if (!$rec) return [false, 0];
    if (($rec['count'] ?? 0) >= MAX_LOGIN_ATTEMPTS && (time() - ($rec['last'] ?? 0)) < LOCKOUT_SECONDS) {
        $remaining = LOCKOUT_SECONDS - (time() - $rec['last']);
        return [true, $remaining];
    }
    // חלון זמן עבר – איפוס מונוטוני
    if (($rec['count'] ?? 0) >= MAX_LOGIN_ATTEMPTS && (time() - ($rec['last'] ?? 0)) >= LOCKOUT_SECONDS) {
        unset($attempts[strtolower($username)]);
        writeJSON(LOGIN_ATTEMPTS_FILE, $attempts);
    }
    return [false, 0];
}

function authenticateUser($username, $password) {
    $users = getUsers();
    foreach ($users as $user) {
        if ($user['username'] === $username && password_verify($password, $user['password'])) {
            // שדרוג אוטומטי של סיסמאות ישנות להאש חדש
            if (password_needs_rehash($user['password'], PASSWORD_DEFAULT)) {
                $user['password'] = password_hash($password, PASSWORD_DEFAULT);
                saveUsers($users);
            }
            return $user;
        }
    }
    return false;
}

function loginUser($username, $password) {
    // בדיקת נעילה לפני אימות
    list($locked, $remaining) = isAccountLocked($username);
    if ($locked) {
        $mins = ceil($remaining / 60);
        return ['success' => false, 'error' => "החשבון ננעל זמנית עקב ניסיונות התחברות כושלים. נסה שוב בעוד {$mins} דקות."];
    }

    $user = authenticateUser($username, $password);
    if ($user) {
        // בדיקה אם המשתמש פעיל
        if (isset($user['active']) && !$user['active']) {
            return ['success' => false, 'error' => 'המשתמש מושבת. פנה למנהל המערכת'];
        }

        recordLoginAttempt($username, true);

        // מניעת Session Fixation – יצירת Session ID חדש אחרי התחברות
        session_regenerate_id(true);
        $_SESSION['logged_in'] = true;
        $_SESSION['username'] = $user['username'];
        $_SESSION['role'] = $user['role'];
        $_SESSION['userId'] = $user['id'];
        $_SESSION['login_time'] = time();

        // עדכון זמן כניסה אחרון
        updateLastLogin($username);

        return [
            'success' => true,
            'username' => $user['username'],
            'role' => $user['role'],
            'fullName' => $user['fullName'] ?? '',
            'permissions' => $user['permissions'] ?? []
        ];
    }
    recordLoginAttempt($username, false);
    return ['success' => false, 'error' => 'שם משתמש או סיסמא שגויים'];
}

function logoutUser() {
    // ניקוי כל משתני ה-session
    $_SESSION = array();

    // מחיקת cookie ה-session אם קיים
    if (isset($_COOKIE[session_name()])) {
        setcookie(session_name(), '', time()-42000, '/');
    }
    // הערה: cookie ה-CSRF אינו נמחק – הוא Cookie אורח חסר ערך מאובטח בפני עצמו
    // (Double Submit) והלקוח ממשיך להשתמש בו בבקשות שאחרי ההתנתקות.

    // הרס ה-session
    session_destroy();

    return ['success' => true];
}

// ===== שליחת דוא"ל כללית (עם Fallback לרישום קובץ כשהSMTP לא מוגדר/נכשל) =====
/**
 * מחזיר מעטפת SMTP או null אם לא מוגדרת (פיתוח מקומי).
 */
function fbGetMailConfigOrNull() {
    if (!function_exists('get_smtp_config')) return null;
    $cfg = @get_smtp_config();
    if (!is_array($cfg) || empty($cfg['host']) || empty($cfg['username'])) return null;
    return $cfg;
}

/**
 * שליחת מייל HTML פשוט דרך PHPMailer עם fallback:
 * אם SMTP אינו מוגדר או השליחה נכשלת – נרשם העתק ב-data/mail_outbox.json
 * כדי שהמנהל יוכל לשלח/לבדוק ידנית (סביבת פיתוח). אף קישור לא נחשף ללקוח.
 */
function fbSendMail($toEmail, $toName, $subject, $htmlBody) {
    $cfg = fbGetMailConfigOrNull();
    if ($cfg) {
        if (!class_exists('PHPMailer\\PHPMailer\\PHPMailer')) {
            $base = __DIR__ . '/../../api/PHPMailer/';
            foreach (['PHPMailer.php','SMTP.php','Exception.php'] as $f) {
                if (is_readable($base . $f)) require_once $base . $f;
            }
        }
        if (class_exists('PHPMailer\\PHPMailer\\PHPMailer')) {
            try {
                $mail = new \PHPMailer\PHPMailer\PHPMailer(true);
                $mail->isSMTP();
                $mail->Host       = $cfg['host'];
                $mail->Port       = $cfg['port'] ?? 465;
                $mail->SMTPAuth   = true;
                $mail->SMTPSecure = $cfg['secure'] ?? 'ssl';
                $mail->Username   = $cfg['username'];
                $mail->Password   = $cfg['password'];
                $mail->CharSet    = 'UTF-8';
                $mail->setFrom($cfg['from_email'], $cfg['from_name']);
                $mail->addAddress($toEmail, $toName ?: '');
                $mail->Subject = $subject;
                $mail->isHTML(true);
                $mail->Body = $htmlBody;
                if ($mail->send()) return true;
            } catch (\Throwable $e) {
                error_log('fbSendMail failed: ' . $e->getMessage());
            }
        }
    }
    // Fallback רישום (לא נזרק לפלט) – לצפייה ע"י המנהל בסביבת פיתוח
    $outbox = DATA_DIR . '/mail_outbox.json';
    $items = is_readable($outbox) ? (json_decode(file_get_contents($outbox), true) ?: []) : [];
    $items[] = ['to' => $toEmail, 'name' => $toName, 'subject' => $subject,
                'body' => $htmlBody, 'at' => date('c')];
    @file_put_contents($outbox, json_encode(array_slice($items, -50), JSON_UNESCAPED_UNICODE), LOCK_EX);
    return false;
}

// ===== שחזור סיסמה (Forgot Password) =====
function findUserByEmail($email) {
    $email = strtolower(trim((string)$email));
    if ($email === '') return null;
    foreach (getUsers() as $user) {
        if (!empty($user['email']) && strcasecmp(trim($user['email']), $email) === 0) return $user;
    }
    return null;
}

function findUserByIdentifier($identifier) {
    $users = getUsers();
    $identifier = trim($identifier);
    foreach ($users as $user) {
        if ($user['username'] === $identifier) return $user;
        if (!empty($user['email']) && strcasecmp($user['email'], $identifier) === 0) return $user;
    }
    return null;
}

function createPasswordResetToken($user) {
    $token = bin2hex(random_bytes(32));
    $tokens = readJSON(RESET_TOKENS_FILE) ?: [];
    // ניקוי טוקנים פגים + הגבלת טוקנים פעילים למשתמש
    $now = time();
    $tokens = array_values(array_filter($tokens, function($t) use ($now, $user) {
        return ($t['expires'] ?? 0) > $now && ($t['used'] ?? false) === false
               && ($t['created'] ?? 0) > $now - 86400;
    }));
    $tokens[] = [
        'tokenHash' => hash('sha256', $token),
        'username'  => $user['username'],
        'email'     => $user['email'] ?? '',
        'expires'   => $now + RESET_TOKEN_TTL,
        'created'   => $now,
        'used'      => false
    ];
    writeJSON(RESET_TOKENS_FILE, $tokens);
    return $token;
}

function buildResetEmailHtml($toName, $resetLink) {
    return '
        <div dir="rtl" style="font-family:Arial,sans-serif;max-width:520px;margin:auto;padding:24px;border:1px solid #e2e8f0;border-radius:12px">
            <h2 style="color:#1e293b">בקשה לאיפוס סיסמה</h2>
            <p>שלום ' . htmlspecialchars($toName ?: 'משתמש') . ',</p>
            <p>קיבלנו בקשה לאיפוס הסיסמה לחשבון שלך במערכת הסקרים.</p>
            <p><a href="' . htmlspecialchars($resetLink) . '"
                style="display:inline-block;background:#2563eb;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none">
                לאיפוס הסיסמה</a></p>
            <p>הקישור תקף לשעה (60 דקות) ויכול לשמש לשימוש אחד בלבד.</p>
            <p style="color:#64748b;font-size:13px">אם לא אתה ביקשת איפוס סיסמה – התעלם מהבקשה והמייל.</p>
        </div>';
}

function buildResetLink($token) {
    $scheme = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') ? 'https' : 'http';
    $host = $_SERVER['HTTP_HOST'] ?? 'localhost';
    // הכתובת תמיד מצביעה על מסך האיפוס של מערכת הסקרים
    $path = rtrim(str_replace('\\', '/', dirname($_SERVER['SCRIPT_NAME'] ?? '/')), '/');
    $path = preg_replace('#/api$#', '', $path); // .../survey/api -> .../survey
    return sprintf('%s://%s%s/reset-password.html?token=%s', $scheme, $host, $path, $token);
}

function sendPasswordResetEmail($toEmail, $toName, $token) {
    $resetLink = buildResetLink($token);
    return fbSendMail($toEmail, $toName, 'איפוס סיסמה - Form Builder Pro',
                      buildResetEmailHtml($toName, $resetLink));
}

function requestPasswordReset($identifier) {
    list($locked, $remaining) = isAccountLocked($identifier);
    if ($locked) {
        $mins = ceil($remaining / 60);
        return ['success' => false, 'error' => "יותר מדי בקשות. נסה שוב בעוד {$mins} דקות."];
    }
    // מניעת מיפוי משתמשים – תמיד מחזירים הצלחה
    $response = ['success' => true, 'message' => 'אם הכתובת קיימת במערכת, נשלח אליה קישור לאיפוס הסיסמה.'];

    $user = findUserByIdentifier($identifier);
    if ($user && !empty($user['email']) && ($user['active'] ?? true)) {
        $token = createPasswordResetToken($user);
        $sent = sendPasswordResetEmail($user['email'], $user['fullName'] ?? $user['username'], $token);
        if (!$sent) {
            // לא לחשוף פרטי משתמש בשגיאה
            error_log("Password reset email failed for user hash: " . substr(md5($user['username']), 0, 8));
        }
    }
    recordLoginAttempt($identifier, false); // שימוש באותו מנגנון הגבלת קצב
    return $response;
}

function validateResetToken($token) {
    $tokens = readJSON(RESET_TOKENS_FILE) ?: [];
    $hash = hash('sha256', $token);
    foreach ($tokens as $i => $t) {
        if (($t['used'] ?? false)) continue;
        if (hash_equals($t['tokenHash'], $hash)) {
            if (($t['expires'] ?? 0) < time()) return null;
            return ['index' => $i, 'token' => $t];
        }
    }
    return null;
}

function completePasswordReset($token, $newPassword) {
    $found = validateResetToken($token);
    if (!$found) {
        return ['success' => false, 'error' => 'הקישור אינו תקין או שפג תוקפו. יש לבקש קישור חדש.'];
    }
    if (strlen($newPassword) < 8) {
        return ['success' => false, 'error' => 'הסיסמא החדשה חייבת להכיל לפחות 8 תווים.'];
    }
    $tokens = readJSON(RESET_TOKENS_FILE) ?: [];
    $idx = $found['index'];
    $username = $tokens[$idx]['username'];

    $users = getUsers();
    $updated = false;
    foreach ($users as &$user) {
        if ($user['username'] === $username) {
            $user['password'] = password_hash($newPassword, PASSWORD_DEFAULT);
            $updated = true;
            break;
        }
    }
    if (!$updated) return ['success' => false, 'error' => 'משתמש לא נמצא'];
    saveUsers($users);

    // סימון הטוקן כ"use" + ביטול כל הטוקנים הפעילים של אותו משתמש
    foreach ($tokens as &$t) {
        if ($t['username'] === $username) $t['used'] = true;
    }
    writeJSON(RESET_TOKENS_FILE, $tokens);

    // שחרור נעילה
    recordLoginAttempt($username, true);

    return ['success' => true, 'message' => 'הסיסמה עודכנה בהצלחה. ניתן להתחבר.'];
}

function changePassword($oldPassword, $newPassword) {
    if (!isLoggedIn()) return ['success' => false, 'error' => 'נדרשת התחברות'];
    
    $users = getUsers();
    $currentUser = null;
    foreach ($users as &$user) {
        if ($user['username'] === $_SESSION['username']) {
            if (!password_verify($oldPassword, $user['password'])) {
                return ['success' => false, 'error' => 'סיסמא נוכחית שגויה'];
            }
            $user['password'] = password_hash($newPassword, PASSWORD_DEFAULT);
            unset($user['defaultPassword']);
            $currentUser = &$user;
            break;
        }
    }
    
    if ($currentUser) {
        saveUsers($users);
        return ['success' => true];
    }
    return ['success' => false, 'error' => 'משתמש לא נמצא'];
}

function addUser($userData) {
    if (!hasPermission('manage_users')) {
        return ['success' => false, 'error' => 'אין לך הרשאה להוסיף משתמשים'];
    }
    
    $users = getUsers();
    
    // בדיקה אם שם המשתמש כבר קיים
    foreach ($users as $user) {
        if ($user['username'] === $userData['username']) {
            return ['success' => false, 'error' => 'שם המשתמש כבר קיים'];
        }
    }
    
    // יצירת משתמש חדש
    $newUser = [
        'id' => generateUUID(),
        'username' => $userData['username'],
        'password' => password_hash($userData['password'], PASSWORD_DEFAULT),
        'fullName' => $userData['fullName'] ?? '',
        'email' => $userData['email'] ?? '',
        'role' => $userData['role'] ?? 'user',
        'permissions' => $userData['permissions'] ?? [
            'create_forms' => true,
            'edit_forms' => true,
            'delete_forms' => false,
            'view_responses' => true,
            'export_data' => true,
            'manage_users' => false
        ],
        'active' => $userData['active'] ?? true,
        'createdAt' => date('c'),
        'lastLogin' => null
    ];
    
    $users[] = $newUser;
    saveUsers($users);
    
    return ['success' => true, 'user' => $newUser];
}

function updateUser($userId, $userData) {
    if (!hasPermission('manage_users')) {
        return ['success' => false, 'error' => 'אין לך הרשאה לערוך משתמשים'];
    }
    
    $users = getUsers();
    $userFound = false;
    
    foreach ($users as &$user) {
        if ($user['id'] === $userId) {
            $userFound = true;
            
            // עדכון שדות
            if (isset($userData['fullName'])) $user['fullName'] = $userData['fullName'];
            if (isset($userData['email'])) $user['email'] = $userData['email'];
            if (isset($userData['role'])) $user['role'] = $userData['role'];
            if (isset($userData['permissions'])) $user['permissions'] = $userData['permissions'];
            if (isset($userData['active'])) $user['active'] = $userData['active'];
            
            // עדכון סיסמא אם סופקה
            if (isset($userData['password']) && !empty($userData['password'])) {
                $user['password'] = password_hash($userData['password'], PASSWORD_DEFAULT);
            }
            
            break;
        }
    }
    
    if ($userFound) {
        saveUsers($users);
        return ['success' => true];
    }
    
    return ['success' => false, 'error' => 'משתמש לא נמצא'];
}

function deleteUser($userId) {
    if (!hasPermission('manage_users')) {
        return ['success' => false, 'error' => 'אין לך הרשאה למחוק משתמשים'];
    }
    
    $users = getUsers();
    $newUsers = [];
    $deleted = false;
    
    foreach ($users as $user) {
        if ($user['id'] === $userId) {
            $deleted = true;
            // לא למחוק את המשתמש הנוכחי
            if ($user['username'] === $_SESSION['username']) {
                return ['success' => false, 'error' => 'לא ניתן למחוק את המשתמש הנוכחי'];
            }
        } else {
            $newUsers[] = $user;
        }
    }
    
    if ($deleted) {
        saveUsers($newUsers);
        return ['success' => true];
    }
    
    return ['success' => false, 'error' => 'משתמש לא נמצא'];
}

function resetPassword($userId, $newPassword) {
    if (!hasPermission('manage_users')) {
        return ['success' => false, 'error' => 'אין לך הרשאה לאפס סיסמאות'];
    }
    
    $users = getUsers();
    $userFound = false;
    
    foreach ($users as &$user) {
        if ($user['id'] === $userId) {
            $userFound = true;
            $user['password'] = password_hash($newPassword, PASSWORD_DEFAULT);
            break;
        }
    }
    
    if ($userFound) {
        saveUsers($users);
        return ['success' => true];
    }
    
    return ['success' => false, 'error' => 'משתמש לא נמצא'];
}

function updateLastLogin($username) {
    $users = getUsers();
    foreach ($users as &$user) {
        if ($user['username'] === $username) {
            $user['lastLogin'] = date('c');
            break;
        }
    }
    saveUsers($users);
}

// ===== פונקציות עזר =====
function ensureDirectories() {
    if (!is_dir(DATA_DIR)) mkdir(DATA_DIR, 0755, true);
    if (!is_dir(FORMS_DIR)) mkdir(FORMS_DIR, 0755, true);
    if (!is_dir(RESPONSES_DIR)) mkdir(RESPONSES_DIR, 0755, true);
    if (!is_dir(SOURCES_DIR)) mkdir(SOURCES_DIR, 0755, true);
}

function readJSON($filepath) {
    if (!file_exists($filepath)) return null;
    $content = file_get_contents($filepath);
    return json_decode($content, true);
}

function writeJSON($filepath, $data) {
    ensureDirectories();
    $json = json_encode($data, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
    
    if ($json === false) {
        error_log("JSON encode failed for: $filepath");
        return false;
    }
    
    $result = file_put_contents($filepath, $json, LOCK_EX);
    
    if ($result === false) {
        error_log("file_put_contents failed for: $filepath");
        error_log("Directory exists: " . (is_dir(dirname($filepath)) ? 'yes' : 'no'));
        error_log("Directory writable: " . (is_writable(dirname($filepath)) ? 'yes' : 'no'));
    }
    
    return $result;
}

function getAllForms() {
    ensureDirectories();
    $forms = [];
    $files = glob(FORMS_DIR . '/*.json');
    foreach ($files as $file) {
        $form = readJSON($file);
        if ($form) $forms[] = $form;
    }
    usort($forms, function($a, $b) {
        return strtotime($b['updatedAt'] ?? $b['createdAt'] ?? 'now') - strtotime($a['updatedAt'] ?? $a['createdAt'] ?? 'now');
    });
    return $forms;
}

function getPublishedForms() {
    $forms = getAllForms();
    return array_values(array_filter($forms, function($f) {
        return ($f['status'] ?? 'draft') === 'published';
    }));
}

function getForm($id) {
    $filepath = FORMS_DIR . '/' . sanitizeFilename($id) . '.json';
    return readJSON($filepath);
}

function saveForm($form) {
    ensureDirectories();
    $filepath = FORMS_DIR . '/' . sanitizeFilename($form['id']) . '.json';
    return writeJSON($filepath, $form);
}

function deleteFormFile($id) {
    $filepath = FORMS_DIR . '/' . sanitizeFilename($id) . '.json';
    if (file_exists($filepath)) {
        unlink($filepath);
        $responsesFile = RESPONSES_DIR . '/' . sanitizeFilename($id) . '.json';
        if (file_exists($responsesFile)) unlink($responsesFile);
        return true;
    }
    return false;
}

function getFormResponses($formId) {
    $filepath = RESPONSES_DIR . '/' . sanitizeFilename($formId) . '.json';
    return readJSON($filepath) ?: [];
}

function saveResponse($formId, $response) {
    ensureDirectories();
    $filepath = RESPONSES_DIR . '/' . sanitizeFilename($formId) . '.json';

    $responses = readJSON($filepath) ?: [];
    $responses[] = $response;

    $result = writeJSON($filepath, $responses);
    if ($result === false) {
        error_log("Failed to write response to: $filepath");
    }
    
    $form = getForm($formId);
    if ($form) {
        $form['responseCount'] = count($responses);
        $form['updatedAt'] = date('c');
        saveForm($form);
    }
    return $response;
}

function sanitizeFilename($name) {
    return preg_replace('/[^a-zA-Z0-9_\-]/', '', $name);
}

function getJSONInput() {
    return json_decode(file_get_contents('php://input'), true);
}

function sendResponse($data, $code = 200) {
    http_response_code($code);
    echo json_encode($data, JSON_UNESCAPED_UNICODE);
    exit();
}

function generateUUID() {
    $b = random_bytes(16); // CSPRNG – UUID v4 אמיתי
    $b[6] = chr((ord($b[6]) & 0x0f) | 0x40);
    $b[8] = chr((ord($b[8]) & 0x3f) | 0x80);
    $h = bin2hex($b);
    return substr($h,0,8).'-'.substr($h,8,4).'-'.substr($h,12,4).'-'.substr($h,16,4).'-'.substr($h,20,12);
}
