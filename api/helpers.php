<?php
/**
 * api/helpers.php – Shared server-side helpers for Matzpen Net
 * אמצעי עזר משותפים: נעילת IP, קריאה/כתיבה בטוחה של users.json,
 * אימות Session בצד השרת וייצוב ההתנתקות.
 */

require_once __DIR__ . '/config.php';

define('USERS_JSON_PATH', dirname(__DIR__) . '/data/users.json');
define('LOGIN_ATTEMPTS_PATH', dirname(__DIR__) . '/data/login_attempts.json');
define('RESET_TOKENS_PATH', dirname(__DIR__) . '/data/password_resets.json');

const GENERIC_LOGIN_ERROR = 'שם משתמש או סיסמה שגויים';

/**
 * מנקה רישיוני ניסיונות ישנים (מעבר 15 דקות)
 */
function _prune_old_attempts($attempts) {
    $threshold = time() - (15 * 60);
    foreach ($attempts as $key => $list) {
        if (!is_array($list)) { unset($attempts[$key]); continue; }
        $fresh = array_values(array_filter($list, function ($a) use ($threshold) {
            return isset($a['time']) && $a['time'] >= $threshold;
        }));
        if (empty($fresh)) unset($attempts[$key]); else $attempts[$key] = $fresh;
    }
    return $attempts;
}

/**
 * בדיקת נעילת Brute-Force לפי IP + שם משתמש
 * @return array ['locked' => bool, 'retry_after' => int|null]
 */
function is_login_locked($username) {
    $ip = $_SERVER['REMOTE_ADDR'] ?? 'unknown';
    if (!file_exists(LOGIN_ATTEMPTS_PATH)) return ['locked' => false, 'retry_after' => null];

    $attempts = json_decode(@file_get_contents(LOGIN_ATTEMPTS_PATH), true) ?: [];
    $attempts = _prune_old_attempts($attempts);

    $maxAttempts = 10;
    $lockSeconds = 900; // 15 minutes

    foreach ([$ip, strtolower(trim($username))] as $key) {
        $list = $attempts[$key] ?? [];
        if (count($list) >= $maxAttempts) {
            $newest = 0;
            foreach ($list as $a) { $newest = max($newest, $a['time'] ?? 0); }
            $unlockAt = $newest + $lockSeconds;
            if ($unlockAt > time()) {
                return ['locked' => true, 'retry_after' => $unlockAt - time()];
            }
        }
    }
    return ['locked' => false, 'retry_after' => null];
}

/**
 * רישום ניסיון התחברות כושל
 */
function record_failed_login($username) {
    $ip = $_SERVER['REMOTE_ADDR'] ?? 'unknown';
    $attempts = [];
    if (file_exists(LOGIN_ATTEMPTS_PATH)) {
        $attempts = json_decode(@file_get_contents(LOGIN_ATTEMPTS_PATH), true) ?: [];
    }
    $attempts = _prune_old_attempts($attempts);

    $entry = ['time' => time(), 'ua' => substr($_SERVER['HTTP_USER_AGENT'] ?? '', 0, 200)];
    $attempts[$ip][] = $entry;
    $uKey = strtolower(trim($username));
    if ($uKey !== '') { $attempts[$uKey][] = $entry; }

    @file_put_contents(LOGIN_ATTEMPTS_PATH, json_encode($attempts, JSON_UNESCAPED_UNICODE), LOCK_EX);
}

/**
 * איפוס ניסיונות לאחר התחברות מוצלחת
 */
function clear_login_attempts($username) {
    $ip = $_SERVER['REMOTE_ADDR'] ?? 'unknown';
    if (!file_exists(LOGIN_ATTEMPTS_PATH)) return;
    $attempts = json_decode(@file_get_contents(LOGIN_ATTEMPTS_PATH), true) ?: [];
    unset($attempts[$ip], $attempts[strtolower(trim($username))]);
    @file_put_contents(LOGIN_ATTEMPTS_PATH, json_encode($attempts, JSON_UNESCAPED_UNICODE), LOCK_EX);
}

/**
 * קריאת כל המשתמשים מ-users.json
 */
function get_all_users($path = USERS_JSON_PATH) {
    if (!file_exists($path)) return [];
    $content = @file_get_contents($path);
    return json_decode($content, true) ?: [];
}

/**
 * שמירת המשתמשים חזרה ל-JSON
 */
function save_all_users($users, $path = USERS_JSON_PATH) {
    return @file_put_contents($path, json_encode($users, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE), LOCK_EX) !== false;
}

/**
 * הסרת שדות רגישים לפני החזרה ללקוח
 */
function sanitize_user($user) {
    $clean = $user;
    unset($clean['password']);
    return $clean;
}

/**
 * האם לסיסמה יש כבר hash bcrypt?
 */
function is_hashed_password($pw) {
    return is_string($pw) && strpos($pw, '$2y$') === 0;
}

/**
 * פונקציית גיבוי להאשת סיסמה (במידה ו-password_hash לא זמין)
 */
function fallback_password_hash($password) {
    $salt = bin2hex(random_bytes(16));
    return 'fb1$' . $salt . '$' . hash_hmac('sha256', $password, $salt);
}

/**
 * אימות סיסמה (bcrypt + תמיכה ב-fallback וב plaintext legacy)
 * @return array [isValid, needsUpgrade]
 */
function verify_user_password($password, $storedHash) {
    if (is_hashed_password($storedHash)) {
        return [password_verify($password, $storedHash), false];
    }
    if (strpos((string)$storedHash, 'fb1$') === 0) {
        $parts = explode('$', $storedHash);
        if (count($parts) === 3) {
            $calc = 'fb1$' . $parts[1] . '$' . hash_hmac('sha256', $password, $parts[1]);
            return [hash_equals($storedHash, $calc), true]; // upgrade to bcrypt
        }
        return [false, false];
    }
    // Legacy plaintext – upgrade to bcrypt on success
    return [hash_equals((string)$storedHash, (string)$password), true];
}

/**
 * האם המשתמש הנוכחי מחובר ומאושר?
 * 1. PHP session (ראשי)
 * 2. תאימות אחורה: אובייקט session מה-client נבדק מול users.json
 */
function is_authenticated($input = []) {
    if (session_status() === PHP_SESSION_NONE) {
        ini_set('session.cookie_httponly', 1);
        ini_set('session.use_only_cookies', 1);
        @session_start();
    }
    if (!empty($_SESSION['userId'])) return true;

    $clientSession = $input['session'] ?? null;
    if (is_array($clientSession) && !empty($clientSession['userId'])) {
        $users = get_all_users();
        foreach ($users as $u) {
            if (($u['id'] ?? '') === $clientSession['userId'] && ($u['isActive'] ?? true) !== false) {
                return true;
            }
        }
    }
    return false;
}

/**
 * האם PHP session פעיל ומאושר?
 */
function has_valid_session() {
    return !empty($_SESSION['userId']);
}

/**
 * זיהוי משתמש מה-request: PHP session (ראשי) או אובייקט session מה-client (תאימות אחורה)
 */
function identify_request_user($input = []) {
    if (session_status() === PHP_SESSION_NONE) {
        ini_set('session.cookie_httponly', 1);
        ini_set('session.use_only_cookies', 1);
        @session_start();
    }
    if (!empty($_SESSION['userId'])) {
        return $_SESSION['userId'];
    }
    // Fallback תואם-לאחור: הלקוח הישן שולח אובייקט session
    $clientSession = $input['session'] ?? null;
    if (is_array($clientSession) && !empty($clientSession['userId'])) {
        return $clientSession['userId'];
    }
    return null;
}

/**
 * ניקוי צד-שרת של ה-session (PHP session + session.json)
 * פונקציה זו מבטיחה שההתנתקות תעבוד גם אם הלקוח לא הצליח לנקות את האחסון המקומי.
 */
function destroy_server_session() {
    // 1. PHP session
    if (session_status() === PHP_SESSION_NONE) {
        @session_start();
    }
    if (session_status() === PHP_SESSION_ACTIVE) {
        $_SESSION = [];
        if (ini_get('session.use_cookies')) {
            $params = session_get_cookie_params();
            setcookie(session_name(), '', time() - 42000,
                $params['path'], $params['domain'], $params['secure'], $params['httponly']);
        }
        @session_destroy();
    }

    // 2. מחיקת session.json (הקובץ שבו DataStore שומר את ההתחברות)
    $sessionFile = dirname(__DIR__) . '/data/session.json';
    if (file_exists($sessionFile)) {
        @file_put_contents($sessionFile, '{}', LOCK_EX);
    }

    // 3. מחיקת localStorage של הדפדפן דרך redirect לעמוד ניקוי
    // (נדרש כי PHP לא יכול לנגוע ב-localStorage ישירות)
}
