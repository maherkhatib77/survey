<?php
/**
 * Responses API - ניהול תגובות
 * POST submit - שליחת תגובה (ציבורי - רק לטפסים מפורסמים)
 * GET list - צפייה בתגובות (דורש התחברות)
 * DELETE clear - מחיקת תגובות (דורש התחברות)
 */
require_once 'config.php';

$method = $_SERVER['REQUEST_METHOD'];
$action = isset($_GET['action']) ? $_GET['action'] : '';
$formId = isset($_GET['formId']) ? $_GET['formId'] : '';

switch ($method) {
    case 'GET':
        requireLogin();
        if ($action === 'list' && $formId) {
            $responses = getFormResponses($formId);
            sendResponse(['success' => true, 'data' => $responses]);
        } elseif ($action === 'count' && $formId) {
            $responses = getFormResponses($formId);
            sendResponse(['success' => true, 'count' => count($responses)]);
        } else {
            sendResponse(['success' => false, 'error' => 'פעולה לא חוקית'], 400);
        }
        break;

    case 'POST':
        $input = getJSONInput();
        if (!$input || !$formId) {
            sendResponse(['success' => false, 'error' => 'נתונים לא תקינים'], 400);
        }

        if ($action === 'submit') {
            // שליחת תגובה - ציבורי (רק לטפסים מפורסמים)
            // בדיקה שהטופס קיים ומפורסם
            $form = getForm($formId);
            
            // Debug logging
            error_log("submit action for formId: $formId");
            error_log("Form found: " . ($form ? 'yes' : 'no'));
            if ($form) {
                error_log("Form status: " . ($form['status'] ?? 'not set'));
                error_log("Form file exists: " . (file_exists(FORMS_DIR . '/' . sanitizeFilename($formId) . '.json') ? 'yes' : 'no'));
            }
            
            if (!$form) {
                error_log("Form not found for formId: $formId");
                sendResponse(['success' => false, 'error' => 'טופס לא נמצא'], 404);
            }
            if (($form['status'] ?? 'draft') !== 'published') {
                error_log("Form not published. Status: " . ($form['status'] ?? 'not set'));
                
                // אפשר למנהלים מחוברים לשלוח תשובות גם לטפסים שלא פורסמו (לבדיקה)
                if (isLoggedIn()) {
                    error_log("Admin user logged in, allowing submission for testing");
                } else {
                    sendResponse(['success' => false, 'error' => 'הטופס אינו פעיל. יש לפרסם את הטופס תחילה דרך ממשק הניהול.'], 403);
                }
            }

            $response = [
                'id' => generateUUID(),
                'formId' => $formId,
                'data' => $input['data'] ?? [],
                'submittedAt' => date('c'),
                'respondentInfo' => [
                    'ip' => $_SERVER['REMOTE_ADDR'] ?? 'unknown',
                    'userAgent' => $_SERVER['HTTP_USER_AGENT'] ?? 'unknown',
                ],
            ];

            if (isset($input['signature'])) $response['signature'] = $input['signature'];
            if (isset($input['calculatedValues'])) $response['calculatedValues'] = $input['calculatedValues'];

            $saved = saveResponse($formId, $response);
            
            // Debug logging
            error_log("saveResponse returned: " . ($saved ? 'success' : 'failed'));
            
            if ($saved) {
                sendResponse(['success' => true, 'data' => $response], 201);
            } else {
                error_log("Failed to save response for formId: $formId");
                sendResponse(['success' => false, 'error' => 'שגיאה בשמירת התגובה'], 500);
            }
            
        } elseif ($action === 'admin-submit') {
            // שליחת תגובה - מנהל (עובד גם לטפסים שלא מפורסמים)
            requireLogin();
            
            $form = getForm($formId);
            if (!$form) {
                sendResponse(['success' => false, 'error' => 'טופס לא נמצא'], 404);
            }

            $response = [
                'id' => isset($input['id']) ? $input['id'] : generateUUID(),
                'formId' => $formId,
                'data' => $input['data'] ?? [],
                'submittedAt' => isset($input['submittedAt']) ? $input['submittedAt'] : date('c'),
                'respondentInfo' => $input['respondentInfo'] ?? [
                    'ip' => $_SERVER['REMOTE_ADDR'] ?? 'unknown',
                    'userAgent' => $_SERVER['HTTP_USER_AGENT'] ?? 'unknown',
                ],
            ];

            if (isset($input['signature'])) $response['signature'] = $input['signature'];
            if (isset($input['calculatedValues'])) $response['calculatedValues'] = $input['calculatedValues'];

            $saved = saveResponse($formId, $response);
            if ($saved) {
                sendResponse(['success' => true, 'data' => $response], 201);
            } else {
                sendResponse(['success' => false, 'error' => 'שגיאה בשמירת התגובה'], 500);
            }
        } else {
            sendResponse(['success' => false, 'error' => 'פעולה לא חוקית'], 400);
        }
        break;

    case 'DELETE':
        requireLogin();
        if ($action === 'clear' && $formId) {
            $filepath = RESPONSES_DIR . '/' . sanitizeFilename($formId) . '.json';
            if (file_exists($filepath)) {
                unlink($filepath);
                $form = getForm($formId);
                if ($form) {
                    $form['responseCount'] = 0;
                    saveForm($form);
                }
                sendResponse(['success' => true, 'message' => 'כל התגובות נמחקו']);
            } else {
                sendResponse(['success' => false, 'error' => 'לא נמצאו תגובות'], 404);
            }
        } else {
            sendResponse(['success' => false, 'error' => 'פעולה לא חוקית'], 400);
        }
        break;

    default:
        sendResponse(['success' => false, 'error' => 'מתודה לא נתמכת'], 405);
}
