<?php
/**
 * Forms API - ניהול טפסים
 * GET list-public - רשימת טפסים מפורסמים (ציבורי)
 * GET list - רשימת כל הטפסים (דורש התחברות)
 * GET get - טופס בודד (ציבורי למפורסם, מנהל לכל)
 * POST create/update - דורש התחברות
 * DELETE - דורש התחברות
 */
require_once 'config.php';
csrfBootstrap();


$method = $_SERVER['REQUEST_METHOD'];
$action = isset($_GET['action']) ? $_GET['action'] : '';
$id = isset($_GET['id']) ? $_GET['id'] : '';

switch ($method) {
    case 'GET':
        if ($action === 'list-public') {
            // רשימת טפסים מפורסמים - ציבורי
            $forms = getPublishedForms();
            // נחזיר רק מידע בסיסי
            $publicForms = array_map(function($f) {
                return [
                    'id' => $f['id'],
                    'title' => $f['settings']['title'] ?? 'ללא כותרת',
                    'description' => $f['settings']['description'] ?? '',
                    'createdAt' => $f['createdAt'] ?? '',
                    'responseCount' => $f['responseCount'] ?? 0
                ];
            }, $forms);
            sendResponse(['success' => true, 'data' => $publicForms]);
            
        } elseif ($action === 'list') {
            // רשימת כל הטפסים - דורש התחברות
            requireLogin();
            $forms = getAllForms();
            // סינון לפי בעלות: משתמש רגיל רואה רק סקרים שהוא יצר
            // (סקרים ללא createdBy – היסטוריים – גלויים למנהלים בלבד)
            $cu = getCurrentUser();
            if (($cu['role'] ?? 'user') !== 'admin') {
                $forms = array_values(array_filter($forms, function($f) use ($cu) {
                    return isset($f['createdBy']) && $f['createdBy'] === ($cu['username'] ?? '');
                }));
            }
            sendResponse(['success' => true, 'data' => $forms]);
            
        } elseif ($action === 'get' && $id) {
            $form = getForm($id);
            if (!$form) {
                sendResponse(['success' => false, 'error' => 'טופס לא נמצא'], 404);
            }
            // אם הטופס לא מפורסם - רק מנהל יכול לצפות
            if (($form['status'] ?? 'draft') !== 'published') {
                if (!isLoggedIn()) {
                    sendResponse(['success' => false, 'error' => 'טופס לא זמין'], 403);
                }
            }
            sendResponse(['success' => true, 'data' => $form]);
            
        } else {
            sendResponse(['success' => false, 'error' => 'פעולה לא חוקית'], 400);
        }
        break;

    case 'POST':
        requireLogin();
        validateCsrf();
        $input = getJSONInput();
        if (!$input) sendResponse(['success' => false, 'error' => 'נתונים לא תקינים'], 400);

        if ($action === 'create') {
            requirePermission('create_forms');
            $input['id'] = generateUUID();
            $input['createdAt'] = date('c');
            $input['updatedAt'] = date('c');
            $input['responseCount'] = 0;
            // בעלות הסקר נקבעת בצד השרת – אין אפשרות לזיוף
            $__cu = getCurrentUser();
            $input['createdBy'] = $__cu['username'] ?? '';
            $input['createdByName'] = $__cu['fullName'] ?? '';
            
            if (saveForm($input)) {
                sendResponse(['success' => true, 'data' => $input], 201);
            } else {
                sendResponse(['success' => false, 'error' => 'שגיאה בשמירת הטופס'], 500);
            }
        } elseif ($action === 'update' && $id) {
            requirePermission('edit_forms');
            $existingForm = getForm($id);
            if (!$existingForm) sendResponse(['success' => false, 'error' => 'טופס לא נמצא'], 404);

            // בדיקת בעלות: משתמש רגיל יכול לערוך רק סקרים שהוא יצר
            $__cu = getCurrentUser();
            if ($__cu && ($__cu['role'] ?? 'user') !== 'admin') {
                $owner = $existingForm['createdBy'] ?? null;
                if ($owner !== ($__cu['username'] ?? '')) {
                    sendResponse(['success' => false, 'error' => 'ניתן לערוך רק סקרים שאתה יצרת'], 403);
                }
            }

            $input['id'] = $id;
            $input['createdAt'] = $existingForm['createdAt'];
            $input['createdBy'] = $existingForm['createdBy'] ?? ($__cu['username'] ?? '');
            $input['updatedAt'] = date('c');
            $input['createdAt'] = $existingForm['createdAt'];
            $input['responseCount'] = $existingForm['responseCount'] ?? 0;
            
            if (saveForm($input)) {
                sendResponse(['success' => true, 'data' => $input]);
            } else {
                sendResponse(['success' => false, 'error' => 'שגיאה בעדכון הטופס'], 500);
            }
        } else {
            sendResponse(['success' => false, 'error' => 'פעולה לא חוקית'], 400);
        }
        break;

    case 'DELETE':
        requireLogin();
        validateCsrf();
        requirePermission('delete_forms');
        // בדיקת בעלות למשתמש רגיל
        if ($id) {
            $__cu = getCurrentUser();
            if ($__cu && ($__cu['role'] ?? 'user') !== 'admin') {
                $__form = getForm($id);
                if (!$__form) sendResponse(['success' => false, 'error' => 'טופס לא נמצא'], 404);
                if (($__form['createdBy'] ?? null) !== ($__cu['username'] ?? '')) {
                    sendResponse(['success' => false, 'error' => 'ניתן למחוק רק סקרים שאתה יצרת'], 403);
                }
            }
            if (deleteFormFile($id)) {
                sendResponse(['success' => true, 'message' => 'הטופס נמחק בהצלחה']);
            } else {
                sendResponse(['success' => false, 'error' => 'טופס לא נמצא'], 404);
            }
        } else {
            sendResponse(['success' => false, 'error' => 'חסר מזהה טופס'], 400);
        }
        break;

    default:
        sendResponse(['success' => false, 'error' => 'מתודה לא נתמכת'], 405);
}
