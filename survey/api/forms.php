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
            $input['id'] = generateUUID();
            $input['createdAt'] = date('c');
            $input['updatedAt'] = date('c');
            $input['responseCount'] = 0;
            
            if (saveForm($input)) {
                sendResponse(['success' => true, 'data' => $input], 201);
            } else {
                sendResponse(['success' => false, 'error' => 'שגיאה בשמירת הטופס'], 500);
            }
        } elseif ($action === 'update' && $id) {
            $existingForm = getForm($id);
            if (!$existingForm) sendResponse(['success' => false, 'error' => 'טופס לא נמצא'], 404);
            
            $input['id'] = $id;
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
        if ($id) {
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
