<?php
/**
 * Form Builder Pro - PHP API Configuration
 * הגדרות מערכת + ניהול Sessions
 */

session_start();

// הגדרות בסיסיות
define('DATA_DIR', __DIR__ . '/../data');
define('FORMS_DIR', DATA_DIR . '/forms');
define('RESPONSES_DIR', DATA_DIR . '/responses');
define('USERS_FILE', DATA_DIR . '/users.json');

// הגדרות ברירת מחדל למנהל
define('DEFAULT_ADMIN_USER', 'admin');
define('DEFAULT_ADMIN_PASS', 'admin123'); // יש לשנות בהתקנה!

// CORS Headers
header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

// Handle preflight
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

// ===== בדיקת התחברות =====
function isLoggedIn() {
    return isset($_SESSION['logged_in']) && $_SESSION['logged_in'] === true;
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

function authenticateUser($username, $password) {
    $users = getUsers();
    foreach ($users as $user) {
        if ($user['username'] === $username && password_verify($password, $user['password'])) {
            return $user;
        }
    }
    return false;
}

function loginUser($username, $password) {
    $user = authenticateUser($username, $password);
    if ($user) {
        // בדיקה אם המשתמש פעיל
        if (isset($user['active']) && !$user['active']) {
            return ['success' => false, 'error' => 'המשתמש מושבת. פנה למנהל המערכת'];
        }
        
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
    return ['success' => false, 'error' => 'שם משתמש או סיסמא שגויים'];
}

function logoutUser() {
    // ניקוי כל משתני ה-session
    $_SESSION = array();
    
    // מחיקת cookie ה-session אם קיים
    if (isset($_COOKIE[session_name()])) {
        setcookie(session_name(), '', time()-42000, '/');
    }
    
    // הרס ה-session
    session_destroy();
    
    return ['success' => true];
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
    error_log("getForm called for id: $id");
    error_log("Filepath: $filepath");
    error_log("File exists: " . (file_exists($filepath) ? 'yes' : 'no'));
    
    $form = readJSON($filepath);
    
    if ($form) {
        error_log("Form loaded successfully. Status: " . ($form['status'] ?? 'not set'));
    } else {
        error_log("Failed to load form");
    }
    
    return $form;
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
    
    // Debug logging
    error_log("saveResponse: formId=$formId, filepath=$filepath");
    error_log("RESPONSES_DIR exists: " . (is_dir(RESPONSES_DIR) ? 'yes' : 'no'));
    error_log("RESPONSES_DIR writable: " . (is_writable(RESPONSES_DIR) ? 'yes' : 'no'));
    
    $responses = readJSON($filepath) ?: [];
    $responses[] = $response;
    
    $result = writeJSON($filepath, $responses);
    error_log("writeJSON result: " . ($result !== false ? 'success' : 'failed'));
    
    if ($result === false) {
        error_log("Failed to write to: $filepath");
        error_log("File exists: " . (file_exists($filepath) ? 'yes' : 'no'));
        error_log("File writable: " . (is_writable($filepath) ? 'yes' : 'no'));
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
    return sprintf('%04x%04x-%04x-%04x-%04x-%04x%04x%04x',
        mt_rand(0, 0xffff), mt_rand(0, 0xffff),
        mt_rand(0, 0xffff),
        mt_rand(0, 0x0fff) | 0x4000,
        mt_rand(0, 0x3fff) | 0x8000,
        mt_rand(0, 0xffff), mt_rand(0, 0xffff), mt_rand(0, 0xffff)
    );
}
