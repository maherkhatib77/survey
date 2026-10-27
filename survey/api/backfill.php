<?php
/**
 * Backfill API - השלמת שדות אוטומטיים (מילוי לפי מאגר) בתגובות שנשמרו בעבר
 * GET  ?action=preview&formId=...  - סריקה בלבד: מה מתוכנן להשתנות (ללא כתיבה)
 * POST ?action=run&formId=...      - ביצוע בפועל + גיבוי של קובץ התגובות המקורי
 *
 * דורש: התחברות + הרשאת manage_forms + אימות CSRF (לפעולת ההרצה).
 */
require_once 'config.php';
csrfBootstrap();

$method = $_SERVER['REQUEST_METHOD'];
$action = isset($_GET['action']) ? $_GET['action'] : '';
$formId = isset($_GET['formId']) ? $_GET['formId'] : '';

if (!preg_match('/^[a-f0-9\-]{36}$/i', $formId)) {
    sendResponse(['success' => false, 'error' => 'מזהה טופס לא חוקי'], 400);
}

// ניקוי מפתח: הסרת BOM/רווחים (מאגרים שהועלו מ-CSV מכילים לעיתים \ufeff)
function bfCleanKey($k) { return str_replace("\xEF\xBB\xBF", '', trim((string)$k)); }

// בניית מפתח ערכי המאגר לפי מזהה מקור
function bfBuildSourceIndex($sourceId) {
    static $cache = [];
    if (isset($cache[$sourceId])) return $cache[$sourceId];
    $index = [];
    $src = readJSON(SOURCES_DIR . '/' . $sourceId . '.json');
    if (!$src || empty($src['records'])) { $cache[$sourceId] = $index; return $index; }
    foreach ($src['records'] as $rec) {
        $clean = [];
        foreach ($rec as $k => $v) { $clean[bfCleanKey($k)] = is_scalar($v) ? trim((string)$v) : $v; }
        // מפתח ראשי: עמודת הקוד/ערך הראשונה (למשל "סמל מוסד" / "ערך / קוד")
        $keys = array_keys($clean);
        if (!$keys) continue;
        $primary = $clean[$keys[0]];
        if ($primary !== '' && $primary !== null) {
            $index[(string)$primary] = $clean;
        }
    }
    $cache[$sourceId] = $index;
    return $index;
}

try {
    requireLogin();
    // Backfill = כתיבה לתגובות השמורות: נדרשת הרשאת עריכת סקרים (ללא קשר לבעלות,
    // כי מדובר בפעולת תחזוקת נתונים מבוקרת; משתמש רגיל עם edit_forms מורשה).
    requirePermission('edit_forms');
    if ($method === 'POST' && $action === 'run') validateCsrf();

    // בדיקת בעלות: משתמש רגיל יכול להריץ backfill רק על סקרים שהוא יצר
    $__cu = getCurrentUser();
    if ($__cu && ($__cu['role'] ?? 'user') !== 'admin') {
        $__f = getForm($formId);
        if (!$__f || ($__f['createdBy'] ?? null) !== ($__cu['id'] ?? '') && ($__f['createdBy'] ?? null) !== ($__cu['username'] ?? '')) {
            sendResponse(['success' => false, 'error' => 'אין לך גישה לפעולה זו עבור סקר זה'], 403);
        }
    }

    $form = getForm($formId);
    if (!$form) sendResponse(['success' => false, 'error' => 'טופס לא נמצא'], 404);

    // איסוף כל השדות (כולל מטריצות/עמודות)
    $allFields = [];
    foreach (($form['pages'] ?? []) as $page) {
        foreach (($page['fields'] ?? []) as $f) $allFields[] = $f;
    }
    $byId = [];
    foreach ($allFields as $f) $byId[$f['id']] = $f;

    // שדות רשומה עם מיפויי מילוי אוטומטי
    $autoFillFields = [];
    foreach ($allFields as $f) {
        if (($f['type'] ?? '') === 'record' && !empty($f['sourceId']) && !empty($f['autoFill']) && is_array($f['autoFill'])) {
            $autoFillFields[] = $f;
        }
    }
    if (!$autoFillFields) {
        sendResponse(['success' => true, 'data' => ['total' => 0, 'updated' => [], 'skipped' => [], 'unmatched' => [], 'message' => 'לטופס זה אין שדות עם מילוי אוטומטי ממאגר']]);
    }

    $file = RESPONSES_DIR . '/' . $formId . '.json';
    $raw = readJSON($file);
    if ($raw === null) {
        sendResponse(['success' => false, 'error' => 'קובץ התגובות לא נמצא או לא תקין'], 404);
    }
    $isEnvelope = is_array($raw) && isset($raw['responses']) && is_array($raw['responses']);
    $responses = $isEnvelope ? $raw['responses'] : $raw;

    $updatedList = [];   // פירוט השינויים (ל-preview ולדווח)
    $skippedList = [];   // תגובות שכבר מלאות
    $unmatchedList = []; // סמלים שלא נמצאו במאגר
    $changedCount = 0;

    foreach ($responses as &$resp) {
        if (!is_array($resp)) continue;
        $data =& $resp['data'];
        if (!is_array($data)) $data = [];
        foreach ($autoFillFields as $field) {
            $fid = $field['id'];
            $symRaw = isset($data[$fid]) ? $data[$fid] : '';
            // אם הערך הוא רשומה/מערכת — ננסה לחלץ מחרוזת
            if (is_array($symRaw)) {
                $symRaw = isset($symRaw[0]) && is_array($symRaw[0]) ? (string)reset($symRaw[0]) : '';
            }
            $sym = trim((string)$symRaw);
            if ($sym === '') continue; // לא הוזן סמל — אין על מה להשלים

            $index = bfBuildSourceIndex($field['sourceId']);
            $rec = isset($index[$sym]) ? $index[$sym] : null;
            if (!$rec) {
                $unmatchedList[] = ['responseId' => $resp['id'] ?? '', 'symbol' => $sym, 'sourceId' => $field['sourceId']];
                continue;
            }

            // 1) השלמת הרשומה השמורה (_record) — יש למחוק רק אם קיימת ולא תואמת
            $recKey = $fid . '_record';
            if (!isset($data[$recKey]) || !is_array($data[$recKey])) {
                $data[$recKey] = $rec;
                $changedCount++;
                $updatedList[] = ['responseId' => $resp['id'] ?? '', 'field' => '_record', 'from' => null, 'to' => 'record'];
            }

            // 2) השלמת שדות יעד לפי autoFill
            foreach ($field['autoFill'] as $mapping) {
                $targetId = $mapping['targetField'] ?? '';
                $sourceCol = bfCleanKey($mapping['sourceField'] ?? '');
                if (!$targetId || !isset($byId[$targetId]) || $sourceCol === '') continue;
                $newVal = isset($rec[$sourceCol]) ? $rec[$sourceCol] : '';
                if ($newVal === '' ) continue; // אין ערך במאגר — לא נמציא נתונים
                $curExists = array_key_exists($targetId, $data);
                $curVal = $curExists ? $data[$targetId] : null;
                $curStr = is_scalar($curVal) ? trim((string)$curVal) : '';
                if ($curExists && $curStr !== '') {
                    $skippedList[] = ['responseId' => $resp['id'] ?? '', 'target' => $byId[$targetId]['label'] ?? $targetId, 'kept' => $curStr];
                    continue; // לא דורסים תשובה קיימת
                }
                $data[$targetId] = $newVal;
                $changedCount++;
                $updatedList[] = [
                    'responseId' => $resp['id'] ?? '',
                    'target' => $byId[$targetId]['label'] ?? $targetId,
                    'from' => $curExists ? '' : null,
                    'to' => $newVal
                ];
            }
        }
        unset($data);
    }
    unset($resp);

    $result = [
        'totalResponses' => count($responses),
        'changes' => $changedCount,
        'details' => $updatedList,
        'alreadyFilled' => count($skippedList),
        'unmatchedSymbols' => array_values(array_map(function ($u) { return $u['symbol']; }, array_unique(array_map(function ($u) { return serialize($u); }, $unmatchedList)))),
    ];

    if ($method === 'GET' && $action === 'preview') {
        $result['dryRun'] = true;
        sendResponse(['success' => true, 'data' => $result]);
    }

    if ($method === 'POST' && $action === 'run') {
        if ($changedCount > 0) {
            // גיבוי של קובץ התגובות לפני הכתיבה
            $backupFile = RESPONSES_DIR . '/' . $formId . '.backup-' . date('Ymd-His') . '.json';
            @copy($file, $backupFile);
            $payload = $isEnvelope ? $raw : $responses;
            if (!writeJSON($file, $payload)) {
                sendResponse(['success' => false, 'error' => 'כתיבת הקובץ נכשלה. בדוק הרשאות לתיקיית data/responses'], 500);
            }
            // אין עדכון מונה — מקור האמת (countRealResponses) קורא ישירות מהקבצים
            $result['backup'] = basename($backupFile);
        }
        $result['dryRun'] = false;
        sendResponse(['success' => true, 'data' => $result]);
    }

    sendResponse(['success' => false, 'error' => 'פעולה לא חוקית'], 400);
} catch (Exception $e) {
    sendResponse(['success' => false, 'error' => 'שגיאה: ' . $e->getMessage()], 500);
} catch (Error $e) {
    error_log('backfill error: ' . $e->getMessage());
    sendResponse(['success' => false, 'error' => 'שגיאה פנימית בשרת (פורט בלוג)'], 500);
}
