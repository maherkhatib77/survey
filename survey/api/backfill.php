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

// חילוץ רשומות ממאגר – תמיכה בפורמט סטנדרטי (records) ובפורמט ישן (data)
function bfExtractRecords($src) {
    if (!is_array($src)) return [];
    if (isset($src['records']) && is_array($src['records'])) return $src['records'];
    if (isset($src['data']) && is_array($src['data'])) return $src['data'];
    return [];
}

// בניית מפתח ערכי המאגר לפי מזהה מקור
function bfBuildSourceIndex($sourceId) {
    static $cache = [];
    if (isset($cache[$sourceId])) return $cache[$sourceId];
    $index = [];
    $file = SOURCES_DIR . '/' . sanitizeFilename($sourceId) . '.json';
    if (!is_file($file)) {
        error_log('backfill: source file not found: ' . $file);
        $cache[$sourceId] = $index;
        return $index;
    }
    $src = readJSON($file);
    $records = bfExtractRecords($src);
    if (!$records) { $cache[$sourceId] = $index; return $index; }
    foreach ($records as $rec) {
        if (!is_array($rec)) continue;
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

// זיהוי שדה ה"סמל" של הרשומה במבנה התגובה השמור (recordField / record / label)
function bfResolveSymbol($symRaw, $field) {
    if (is_string($symRaw) || is_numeric($symRaw)) return trim((string)$symRaw);
    if (!is_array($symRaw)) return '';
    // מערך של רשומות (multiple) – ניקח את הראשונה
    if (isset($symRaw[0]) && is_array($symRaw[0])) $symRaw = $symRaw[0];
    if (!is_array($symRaw)) return is_scalar($symRaw) ? trim((string)$symRaw) : '';
    // 1) שדה ה-value של הרשומה לפי הגדרת הטופס
    $rf = $field['recordField'] ?? '';
    if ($rf !== '' && isset($symRaw[$rf]) && is_scalar($symRaw[$rf])) {
        $s = trim((string)$symRaw[$rf]);
        if ($s !== '') return $s;
    }
    // 2) עמודה ראשונה במאגר (עמודת הקוד)
    $idx = bfBuildSourceIndex($field['sourceId'] ?? '');
    $firstCols = [];
    foreach ($idx as $rec) { $firstCols[] = (string)reset($rec); break; }
    if ($firstCols) {
        foreach ($symRaw as $k => $v) {
            if (is_scalar($v) && in_array(trim((string)$v), $firstCols, true)) return trim((string)$v);
        }
    }
    // 3) שדות נפוצים
    foreach (['value', 'code', 'id', 'symbol', 'סמל מוסד', 'ערך'] as $alt) {
        if (isset($symRaw[$alt]) && is_scalar($symRaw[$alt]) && trim((string)$symRaw[$alt]) !== '') {
            return trim((string)$symRaw[$alt]);
        }
    }
    // 4) אחרון: שדה label אם אינו טקסט חופשי
    foreach (['label', 'name', 'תווית (עברית)', 'שם'] as $alt) {
        if (isset($symRaw[$alt]) && is_scalar($symRaw[$alt])) {
            $cand = trim((string)$symRaw[$alt]);
            if ($cand !== '' && preg_match('/^\d{3,7}$/', $cand)) return $cand;
        }
    }
    return '';
}

// פונקציית מינימום להשלמת autoFill על גבי תגובה בודדת (רשימת שדות + index cache)
function bfApplyAutoFill(array &$data, array $autoFillFields, array $byId, array &$updatedList, array &$skippedList, array &$unmatchedList): int {
    $changedCount = 0;
    foreach ($autoFillFields as $field) {
        $fid = $field['id'];
        $symRaw = isset($data[$fid]) ? $data[$fid] : '';
        $hadRecord = isset($data[$fid . '_record']) && is_array($data[$fid . '_record']);
        $sym = bfResolveSymbol($symRaw, $field);
        if ($sym === '') continue; // לא הוזן סמל — אין על מה להשלים

        $index = bfBuildSourceIndex($field['sourceId']);
        $rec = isset($index[$sym]) ? $index[$sym] : null;
        if (!$rec) {
            $unmatchedList[] = ['responseId' => '', 'symbol' => $sym, 'sourceId' => $field['sourceId']];
            continue;
        }

        // 1) השלמת הרשומה השמורה (_record) — רק אם אינה קיימת
        $recKey = $fid . '_record';
        if (!isset($data[$recKey]) || !is_array($data[$recKey])) {
            $data[$recKey] = $rec;
            $changedCount++;
            $updatedList[] = ['responseId' => '', 'field' => '_record', 'from' => null, 'to' => 'record'];
        }

        // 2) השלמת שדות יעד לפי autoFill
        $__applied = 0;
        foreach ($field['autoFill'] as $mapping) {
            $targetId = $mapping['targetField'] ?? '';
            $sourceCol = bfCleanKey($mapping['sourceField'] ?? '');
            if (!$targetId || !isset($byId[$targetId]) || $sourceCol === '') continue;
            $newVal = isset($rec[$sourceCol]) ? $rec[$sourceCol] : '';
            if ($newVal === '') continue; // אין ערך במאגר — לא נמציא נתונים
            $curExists = array_key_exists($targetId, $data);
            $curVal = $curExists ? $data[$targetId] : null;
            $curStr = is_scalar($curVal) ? trim((string)$curVal) : '';
            if ($curExists && $curStr !== '') {
                $skippedList[] = ['responseId' => '', 'target' => $byId[$targetId]['label'] ?? $targetId, 'kept' => $curStr];
                continue; // לא דורסים תשובה קיימת
            }
            $data[$targetId] = $newVal;
            $changedCount++;
            $__applied++;
            $updatedList[] = [
                'responseId' => '',
                'target' => $byId[$targetId]['label'] ?? $targetId,
                'from' => $curExists ? '' : null,
                'to' => $newVal
            ];
        }

        // 3) תגובות שנשמרו לפני שהוגדרו מיפויי autoFill בטופס:
        //    השלמה לפי שם התווית של עמודות המאגר (תאימים לתרגום "שם מוסד" וכו')
        if ($__applied === 0 && !$hadRecord) {
            $labels = [];
            foreach ($byId as $tid => $tf) {
                if (($tf['type'] ?? '') === 'record') continue; // אין השלמה לשדה רשומה אחר
                $lbl = bfCleanKey(preg_replace('/\s+/u', ' ', (string)($tf['label'] ?? '')));
                if ($lbl !== '') $labels[$lbl] = $tid;
            }
            foreach ($rec as $col => $val) {
                $colN = bfCleanKey(preg_replace('/\s+/u', ' ', (string)$col));
                if ($val === '' || !isset($labels[$colN])) continue;
                $targetId = $labels[$colN];
                $curExists = array_key_exists($targetId, $data);
                $curStr = $curExists && is_scalar($data[$targetId]) ? trim((string)$data[$targetId]) : '';
                if ($curExists && $curStr !== '') {
                    $skippedList[] = ['responseId' => '', 'target' => $byId[$targetId]['label'] ?? $targetId, 'kept' => $curStr];
                    continue;
                }
                $data[$targetId] = $val;
                $changedCount++;
                $updatedList[] = [
                    'responseId' => '',
                    'target' => $byId[$targetId]['label'] ?? $targetId,
                    'from' => $curExists ? '' : null,
                    'to' => $val,
                    'via' => 'label-match:' . $colN
                ];
            }
        }
    }
    return $changedCount;
}

try {
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
            if (!$__f || (($__f['createdBy'] ?? null) !== ($__cu['id'] ?? '') && ($__f['createdBy'] ?? null) !== ($__cu['username'] ?? ''))) {
                sendResponse(['success' => false, 'error' => 'אין לך גישה לפעולה זו עבור סקר זה'], 403);
            }
        }
    } catch (Exception $e) {
        error_log('backfill auth error: ' . $e->getMessage());
        sendResponse(['success' => false, 'error' => 'שגיאת הרשאה: ' . $e->getMessage()], 500);
    } catch (Error $e) {
        error_log('backfill auth fatal: ' . $e->getMessage() . ' @ line ' . $e->getLine());
        sendResponse(['success' => false, 'error' => 'שגיאה פנימית בשרת (פורט בלוג)'], 500);
    }

    try {

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
        $__rid = $resp['id'] ?? '';
        $__upd = []; $__skp = []; $__unm = [];
        $__n = bfApplyAutoFill($data, $autoFillFields, $byId, $__upd, $__skp, $__unm);
        foreach ($__upd as $u) { $u['responseId'] = $__rid; $updatedList[] = $u; }
        foreach ($__skp as $s) { $s['responseId'] = $__rid; $skippedList[] = $s; }
        foreach ($__unm as $u2) { $u2['responseId'] = $__rid; $unmatchedList[] = $u2; }
        $changedCount += $__n;
        unset($data);
    }
    unset($resp);

    $result = [
        'totalResponses' => count($responses),
        'changes' => $changedCount,
        'details' => $updatedList,
        'alreadyFilled' => count($skippedList),
        'unmatchedSymbols' => array_values(array_unique(array_map(function ($u) { return $u['symbol']; }, $unmatchedList))),
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
        error_log('backfill error: ' . $e->getMessage() . ' @ line ' . $e->getLine());
        sendResponse(['success' => false, 'error' => 'שגיאה: ' . $e->getMessage()], 500);
    } catch (Error $e) {
        error_log('backfill fatal: ' . $e->getMessage() . ' @ line ' . $e->getLine());
        sendResponse(['success' => false, 'error' => 'שגיאה פנימית בשרת (פורט בלוג)'], 500);
    }
} catch (Throwable $t) {
    error_log('backfill unexpected: ' . $t->getMessage() . ' @ line ' . $t->getLine());
    sendResponse(['success' => false, 'error' => 'שגיאה פנימית בשרת (פורט בלוג)'], 500);
}
