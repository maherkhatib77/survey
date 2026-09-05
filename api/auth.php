<?php
/**
 * api/auth.php – Secure Server-Side Authentication & Session Management
 */

require_once __DIR__ . '/config.php';
apply_security_headers_and_cors();

// Start secure session
if (session_status() === PHP_SESSION_NONE) {
    ini_set('session.cookie_httponly', 1);
    ini_set('session.use_only_cookies', 1);
    session_start();
}

$rawInput = file_get_contents('php://input');
$input = json_decode($rawInput, true) ?? [];
$action = $_GET['action'] ?? ($input['action'] ?? 'check');

$usersPath = dirname(__DIR__) . '/data/users.json';

// Helper: Read users safely
function get_all_users($path) {
    if (!file_exists($path)) return [];
    $content = @file_get_contents($path);
    return json_decode($content, true) ?: [];
}

// Helper: Strip sensitive fields before returning user to client
function sanitize_user($user) {
    $clean = $user;
    unset($clean['password']);
    return $clean;
}

// 1. ACTION: LOGIN
if ($action === 'login') {
    $username = trim($input['username'] ?? '');
    $password = trim($input['password'] ?? '');

    if (empty($username) || empty($password)) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'נא להזין שם משתמש וסיסמה']);
        exit;
    }

    $users = get_all_users($usersPath);
    $matchedUser = null;
    $userIndex = -1;

    foreach ($users as $idx => $u) {
        if (($u['username'] ?? '') === $username && ($u['isActive'] ?? true) !== false) {
            $userPassword = $u['password'] ?? '';
            
            // Check hashed password first, fallback to plaintext for legacy migration
            $isPasswordValid = false;
            if (password_verify($password, $userPassword)) {
                $isPasswordValid = true;
            } elseif ($userPassword === $password) {
                // Password was plaintext - automatically upgrade to secure bcrypt hash
                $isPasswordValid = true;
                $users[$idx]['password'] = password_hash($password, PASSWORD_BCRYPT);
                @file_put_contents($usersPath, json_encode($users, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE), LOCK_EX);
            }

            if ($isPasswordValid) {
                $matchedUser = $users[$idx];
                $userIndex = $idx;
                break;
            }
        }
    }

    if (!$matchedUser) {
        http_response_code(401);
        echo json_encode(['success' => false, 'message' => 'שם משתמש או סיסמה שגויים']);
        exit;
    }

    // Set server session
    $_SESSION['userId'] = $matchedUser['id'];
    $_SESSION['username'] = $matchedUser['username'];
    $_SESSION['role'] = $matchedUser['role'] ?? 'guide';
    $_SESSION['fullName'] = $matchedUser['fullName'] ?? '';

    $sessionData = [
        'userId'    => $matchedUser['id'],
        'username'  => $matchedUser['username'],
        'fullName'  => $matchedUser['fullName'] ?? '',
        'role'      => $matchedUser['role'] ?? 'guide',
        'loginTime' => date('c')
    ];

    echo json_encode([
        'success' => true,
        'user'    => sanitize_user($matchedUser),
        'session' => $sessionData
    ]);
    exit;
}

// 2. ACTION: CHECK SESSION
if ($action === 'check') {
    if (!empty($_SESSION['userId'])) {
        $users = get_all_users($usersPath);
        foreach ($users as $u) {
            if ($u['id'] === $_SESSION['userId'] && ($u['isActive'] ?? true) !== false) {
                echo json_encode([
                    'success' => true,
                    'user'    => sanitize_user($u),
                    'session' => [
                        'userId'   => $u['id'],
                        'username' => $u['username'],
                        'fullName' => $u['fullName'] ?? '',
                        'role'     => $u['role'] ?? 'guide'
                    ]
                ]);
                exit;
            }
        }
    }

    echo json_encode(['success' => false, 'user' => null]);
    exit;
}

// 3. ACTION: LOGOUT
if ($action === 'logout') {
    $_SESSION = [];
    if (ini_get("session.use_cookies")) {
        $params = session_get_cookie_params();
        setcookie(session_name(), '', time() - 42000,
            $params["path"], $params["domain"],
            $params["secure"], $params["httponly"]
        );
    }
    session_destroy();
    echo json_encode(['success' => true, 'message' => 'Logged out successfully']);
    exit;
}

http_response_code(400);
echo json_encode(['success' => false, 'error' => 'Unknown action']);
