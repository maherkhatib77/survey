<?php
/**
 * Responses API - ניהול תגובות
 * POST submit - שליחת תגובה (ציבורי - רק לטפסים מפורסמים)
 * GET list - צפייה בתגובות (דורש התחברות)
 * DELETE clear - מחיקת תגובות (דורש התחברות)
 */
require_once 'config.php';
csrfBootstrap();


$method = $_SERVER['REQUEST_METHOD'];
$action = isset($_GET['action']) ? $_GET['action'] : '';
$formId = isset($_GET['formId']) ? $_GET['formId'] : '';

switch ($method) {
    case 'GET':
        requireLogin();
        requirePermission('view_responses');
        // בדיקת בעלות: משתמש רגיל יכול לצפות בתגובות של הסקרים שהוא יצר בלבד
        $__cu = getCurrentUser();
        if ($__cu && ($__cu['role'] ?? 'user') !== 'admin' && $formId) {
            $__form = getForm($formId);
            if (!$__form || ($__form['createdBy'] ?? null) !== ($__cu['username'] ?? '')) {
                sendResponse(['success' => false, 'error' => 'אין לך גישה לתגובות סקר זה'], 403);
            }
        }
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
        // שליחת תגובה ציבורית (submit) מתאפשרת ללא token – הקוראים הם מבקרי טפסים אנונימיים.
        // שאר פעולות הכתיבה כאן דורשות token (admin-submit נבדק שוב בהמשך).
        if ($action !== 'submit') validateCsrf();
        $input = getJSONInput();
        if (!$input || !$formId) {
            sendResponse(['success' => false, 'error' => 'נתונים לא תקינים'], 400);
        }

        if ($action === 'submit') {
            // שליחת תגובה - ציבורי (רק לטפסים מפורסמים)
            // בדיקה שהטופס קיים ומפורסם
            $form = getForm($formId);

            if (!$form) {
                sendResponse(['success' => false, 'error' => 'טופס לא נמצא'], 404);
            }
            if (($form['status'] ?? 'draft') !== 'published') {
                // אפשר למנהלים מחוברים לשלוח תשובות גם לטפסים שלא פורסמו (לבדיקה)
                if (isLoggedIn()) {
                    // מותר לצורך בדיקה
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

            if ($saved) {
                sendResponse(['success' => true, 'data' => $response], 201);
            } else {
                sendResponse(['success' => false, 'error' => 'שגיאה בשמירת התגובה'], 500);
            }
            
        } elseif ($action === 'admin-submit') {
            // שליחת תגובה - מנהל (עובד גם לטפסים שלא מפורסמים)
            requireLogin();
            validateCsrf();
            
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

        } elseif ($action === 'import') {
            // ייבוא תגובות מקובץ JSON שיוצר בייצוא הדוחות / מגיבוי
            // הגוף: { formId, responses: [...] } או מעטפת מלאה { form: {...}, responses: [...] }
            requireLogin();
            requirePermission('create_forms');
            validateCsrf();

            // זיהוי formId: מה-GET או מתוך המעטפה/התגובות שבגוף
            $impFormId = $formId;
            if (!$impFormId && isset($input['formId'])) $impFormId = $input['formId'];
            if (!$impFormId && isset($input['form']['id'])) $impFormId = $input['form']['id'];

            if (!$impFormId) {
                sendResponse(['success' => false, 'error' => 'לא זוהה מזהה סקר (formId) בקובץ הייבוא'], 400);
            }
            $form = getForm($impFormId);
            if (!$form) {
                sendResponse(['success' => false, 'error' => 'הסקר "' . htmlspecialchars($impFormId, ENT_QUOTES) . '" אינו קיים במערכת. יש ליצור סקר זהה או להשתמש בקובץ הייצוא של הסקר הקיים.'], 404);
            }
            // בעלות: משתמש רגיל מייבא רק לסקרים שלו
            $__cu = getCurrentUser();
            if ($__cu && ($__cu['role'] ?? 'user') !== 'admin') {
                if (($form['createdBy'] ?? null) !== ($__cu['username'] ?? '')) {
                    sendResponse(['success' => false, 'error' => 'אין לך גישה לייבוא תגובות לסקר זה'], 403);
                }
            }

            // חילוץ רשימת התגובות – תמיכה בשלושה פורמטים:
            // א) מעטפת ייצוא מלאה: { form: {...}, responses: [...] }
            // ב) אובייקט: { responses: [...] }
            // ג) מערך גולמי של תגובות
            $rows = null;
            if (isset($input['responses']) && is_array($input['responses'])) {
                $rows = $input['responses'];
            } elseif (is_array($input) && array_values($input) === $input) {
                $rows = $input; // מערך גולמי
            }
            if ($rows === null || count($rows) === 0) {
                sendResponse(['success' => false, 'error' => 'לא נמצאו תגובות בקובץ. ודא שהקובץ הוא פלט "ייצוא JSON" של המערכת'], 400);
            }

            // טעינת תגובות קיימות לשם מניעת כפילויות לפי id
            $existing = getFormResponses($impFormId);
            $existingIds = [];
            foreach ($existing as $e) {
                if (isset($e['id'])) $existingIds[$e['id']] = true;
            }

            $imported = 0;
            $skipped = 0;
            $invalid = 0;
            $newItems = [];
            foreach ($rows as $row) {
                if (!is_array($row) || !isset($row['data']) || !is_array($row['data'])) {
                    $invalid++;
                    continue;
                }
                $rid = isset($row['id']) && is_string($row['id']) ? $row['id'] : generateUUID();
                if (isset($existingIds[$rid])) { $skipped++; continue; }
                $existingIds[$rid] = true;
                $resp = [
                    'id' => $rid,
                    'formId' => $impFormId,
                    'data' => $row['data'],
                    'submittedAt' => isset($row['submittedAt']) ? $row['submittedAt'] : date('c'),
                    'respondentInfo' => $row['respondentInfo'] ?? ['ip' => 'import', 'userAgent' => 'json-import'],
                ];
                if (isset($row['signature'])) $resp['signature'] = $row['signature'];
                if (isset($row['calculatedValues'])) $resp['calculatedValues'] = $row['calculatedValues'];
                $newItems[] = $resp;
                $imported++;
            }

            if ($imported > 0) {
                // כתיבה אטומית: קריאת המערך הקיים + הוספה + שמירה בבת אחת
                $merged = array_merge($existing, $newItems);
                $filepath = RESPONSES_DIR . '/' . sanitizeFilename($impFormId) . '.json';
                if (!file_exists(RESPONSES_DIR)) @mkdir(RESPONSES_DIR, 0755, true);
                $fp = @fopen($filepath, 'c');
                $okWrite = false;
                if ($fp && flock($fp, LOCK_EX)) {
                    ftruncate($fp, 0);
                    rewind($fp);
                    $okWrite = (fwrite($fp, json_encode($merged, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT)) !== false);
                    fflush($fp);
                    flock($fp, LOCK_UN);
                    fclose($fp);
                } elseif ($fp) { fclose($fp); }
                if (!$okWrite) {
                    error_log('responses import: failed writing ' . $filepath);
                    sendResponse(['success' => false, 'error' => 'כשל בכתיבת קובץ התגובות. בדוק הרשאות כתיבה לתיקיית data/responses'], 500);
                }
                $form['responseCount'] = count($merged);
                saveForm($form);
            }

            sendResponse(['success' => true, 'imported' => $imported, 'skippedDuplicates' => $skipped, 'invalid' => $invalid]);
        } else {
            sendResponse(['success' => false, 'error' => 'פעולה לא חוקית'], 400);
        }
        break;

    case 'DELETE':
        requireLogin();
        validateCsrf();
        requirePermission('delete_forms');
        // בעלות: משתמש רגיל מוחק תגובות רק בסקרים שלו
        $__cu = getCurrentUser();
        if ($__cu && ($__cu['role'] ?? 'user') !== 'admin' && $formId) {
            $__form = getForm($formId);
            if (!$__form || ($__form['createdBy'] ?? null) !== ($__cu['username'] ?? '')) {
                sendResponse(['success' => false, 'error' => 'אין לך גישה לפעולה זו'], 403);
            }
        }
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
