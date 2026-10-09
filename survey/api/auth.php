<?php
/**
 * Auth API - ניהול התחברות
 */
require_once 'config.php';

$method = $_SERVER['REQUEST_METHOD'];
$action = isset($_GET['action']) ? $_GET['action'] : '';

switch ($method) {
    case 'POST':
        $input = getJSONInput();
        
        // logout לא דורש input
        if ($action === 'logout') {
            sendResponse(logoutUser());
            break;
        }
        
        if (!$input) sendResponse(['success' => false, 'error' => 'נתונים לא תקינים'], 400);

        if ($action === 'login') {
            $username = $input['username'] ?? '';
            $password = $input['password'] ?? '';
            
            if (empty($username) || empty($password)) {
                sendResponse(['success' => false, 'error' => 'יש להזין שם משתמש וסיסמא'], 400);
            }
            
            $result = loginUser($username, $password);
            sendResponse($result, $result['success'] ? 200 : 401);
            
        } elseif ($action === 'logout') {
            sendResponse(logoutUser());
            
        } elseif ($action === 'change-password') {
            requireLogin();
            $oldPass = $input['oldPassword'] ?? '';
            $newPass = $input['newPassword'] ?? '';
            
            if (empty($oldPass) || empty($newPass)) {
                sendResponse(['success' => false, 'error' => 'יש להזין סיסמא ישנה וחדשה'], 400);
            }
            if (strlen($newPass) < 6) {
                sendResponse(['success' => false, 'error' => 'הסיסמא החדשה חייבת להכיל לפחות 6 תווים'], 400);
            }
            
            sendResponse(changePassword($oldPass, $newPass));
        }
        break;

    case 'GET':
        if ($action === 'check') {
            // בדיקה אם המשתמש מחובר
            sendResponse([
                'success' => true,
                'loggedIn' => isLoggedIn(),
                'username' => $_SESSION['username'] ?? null,
                'role' => $_SESSION['role'] ?? null
            ]);
        }
        break;

    default:
        sendResponse(['success' => false, 'error' => 'מתודה לא נתמכת'], 405);
}
