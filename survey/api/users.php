<?php
/**
 * Users API - ניהול משתמשים
 */
require_once 'config.php';
csrfBootstrap();


$method = $_SERVER['REQUEST_METHOD'];
$action = isset($_GET['action']) ? $_GET['action'] : '';
$id = isset($_GET['id']) ? $_GET['id'] : '';

switch ($method) {
    case 'GET':
        requireLogin();
        
        if ($action === 'list') {
            // רשימת כל המשתמשים (למנהלים בלבד)
            requirePermission('manage_users');
            $users = getUsers();
            // הסרת סיסמאות מהתגובה
            $usersSafe = array_map(function($user) {
                unset($user['password']);
                return $user;
            }, $users);
            sendResponse(['success' => true, 'data' => $usersSafe]);
            
        } elseif ($action === 'me') {
            // פרטי המשתמש הנוכחי + ההרשאות האפקטיביות לפי מודל ההרשאות
            $user = getCurrentUser();
            if ($user) {
                unset($user['password']);
                $user['permissions'] = getUserEffectivePermissions($user);
                sendResponse(['success' => true, 'data' => $user]);
            } else {
                sendResponse(['success' => false, 'error' => 'משתמש לא נמצא'], 404);
            }
            
        } elseif ($action === 'get' && $id) {
            // פרטי משתמש ספציפי
            requirePermission('manage_users');
            $users = getUsers();
            foreach ($users as $user) {
                if ($user['id'] === $id) {
                    unset($user['password']);
                    sendResponse(['success' => true, 'data' => $user]);
                }
            }
            sendResponse(['success' => false, 'error' => 'משתמש לא נמצא'], 404);
        }
        break;

    case 'POST':
        requireLogin();
        validateCsrf();
        $input = getJSONInput();
        
        if ($action === 'create') {
            // יצירת משתמש חדש
            requirePermission('manage_users');
            
            if (empty($input['username']) || empty($input['password'])) {
                sendResponse(['success' => false, 'error' => 'שם משתמש וסיסמא הם שדות חובה'], 400);
            }
            
            if (strlen($input['password']) < 6) {
                sendResponse(['success' => false, 'error' => 'הסיסמא חייבת להכיל לפחות 6 תווים'], 400);
            }
            
            $result = addUser($input);
            sendResponse($result, $result['success'] ? 201 : 400);
            
        } elseif ($action === 'update' && $id) {
            // עדכון משתמש – הרשאות נבדכות בתוך updateUser (מנהל: הכל; רגיל: רק את עצמו)
            $result = updateUser($id, $input);
            sendResponse($result, $result['success'] ? 200 : 400);
            
        } elseif ($action === 'reset-password' && $id) {
            // איפוס סיסמא
            requirePermission('manage_users');
            
            if (empty($input['newPassword'])) {
                sendResponse(['success' => false, 'error' => 'סיסמא חדשה היא שדה חובה'], 400);
            }
            
            if (strlen($input['newPassword']) < 6) {
                sendResponse(['success' => false, 'error' => 'הסיסמא חייבת להכיל לפחות 6 תווים'], 400);
            }
            
            $result = resetPassword($id, $input['newPassword']);
            sendResponse($result, $result['success'] ? 200 : 400);
            
        } elseif ($action === 'change-password') {
            // שינוי סיסמא של המשתמש הנוכחי
            if (empty($input['oldPassword']) || empty($input['newPassword'])) {
                sendResponse(['success' => false, 'error' => 'יש להזין סיסמא ישנה וחדשה'], 400);
            }
            
            if (strlen($input['newPassword']) < 6) {
                sendResponse(['success' => false, 'error' => 'הסיסמא החדשה חייבת להכיל לפחות 6 תווים'], 400);
            }
            
            $result = changePassword($input['oldPassword'], $input['newPassword']);
            sendResponse($result, $result['success'] ? 200 : 400);
            
        } elseif ($action === 'update-profile') {
            // עדכון פרופיל של המשתמש הנוכחי
            $user = getCurrentUser();
            if (!$user) {
                sendResponse(['success' => false, 'error' => 'משתמש לא נמצא'], 404);
            }
            
            $result = updateUser($user['id'], $input);
            sendResponse($result, $result['success'] ? 200 : 400);
        }
        break;

    case 'DELETE':
        requireLogin();
        validateCsrf();
        requirePermission('manage_users');
        
        if ($id) {
            $result = deleteUser($id);
            sendResponse($result, $result['success'] ? 200 : 400);
        } else {
            sendResponse(['success' => false, 'error' => 'חסר מזהה משתמש'], 400);
        }
        break;

    default:
        sendResponse(['success' => false, 'error' => 'מתודה לא נתמכת'], 405);
}
