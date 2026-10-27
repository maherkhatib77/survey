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

// מילוני תרגום עברית->ערבית לעמודות מאגר "בתי ספר" <-> תוויות שדות בטפסים בערבית.
// משמש כאשר שם השדה אינו זהה לעמודת המאגר (למשל "المرحلة التعليمية" מול "שלב חינוך במוסד").
function bfTranslationMap(): array {
    return [
        'שלב חינוך במוסד' => ['المرحلة التعليمية', 'مرحلة التعليم في المدرسة', 'المرحلة'],
        'סוג חינוך מוסד'   => ['نوع التعليم في المدرسة', 'نوع التربية', 'سוג الحوكمة'],
        'מעמד משפטי'       => ['المكانة القانونية', 'الوضع القانوني'],
        'שם מוסד'          => ['اسم المدرسة', 'اسم المؤسسة'],
        'שם מנהל'          => ['اسم المدير', 'اسم المدير/ة'],
        'שם מפקח'          => ['اسم المفتش', 'اسم المفتش/ة', 'المفتح'],
    ];
}

// בניית מפת targetField -> sourceField: מיפויי autoFill מוצהרים + תרגום אוטומטי של עמודות המאגר
function bfBuildMappings(array $allFields, ?array $symbolField): array {
    $m = [];
    foreach ($allFields as $f) {
        if (($f['type'] ?? '') !== 'record' || empty($f['autoFill']) || !is_array($f['autoFill'])) continue;
        foreach ($f['autoFill'] as $mp) {
            $tid = $mp['targetField'] ?? '';
            $src = bfCleanKey($mp['sourceField'] ?? '');
            if ($tid && $src !== '') $m[$tid] = $src;
        }
    }
    // תרגום: עבור שדות יעד שלא הוגדר להם מיפוי — נסה להתאים לפי מילון
    if ($symbolField && !empty($symbolField['sourceId'])) {
        $index = bfBuildSourceIndex($symbolField['sourceId']);
        $cols = [];
        foreach ($index as $rec) { foreach ($rec as $k => $v) $cols[bfCleanKey((string)$k)] = true; break; }
        $dict = bfTranslationMap();
        foreach ($allFields as $f) {
            $tid = $f['id'];
            if (isset($m[$tid])) continue;
            if (($f['type'] ?? '') === 'record') continue; // שדות רשומה אחרים מטופלים בהצמדת רשומה
            $lbl = bfCleanKey(preg_replace('/\s+/u', ' ', (string)($f['label'] ?? '')));
            if ($lbl === '') continue;
            foreach ($cols as $col => $_) {
                $variants = $dict[$col] ?? [];
                if (in_array($lbl, $variants, true)) { $m[$tid] = $col; break; }
            }
        }
    }
    return $m;
}

// זיהוי שדה ה"סמל" בטופס: שדה record whose displayField points at the institution-symbol column
function bfDetectSymbolField(array $allFields): ?array {
    foreach ($allFields as $f) {
        if (($f['type'] ?? '') !== 'record' || empty($f['sourceId'])) continue;
        $df = bfCleanKey((string)($f['displayField'] ?? ''));
        if ($df !== '' && preg_match('/סמל|סמל מוסד|institution|symbol/iu', $df)) return $f;
    }
    return null;
}

// פענוח ערך רשומת-מאגר (object / מערך objects / מחרוזת) למחרוזת הצגה
function bfDecodeRecordValue($v) {
    if (is_string($v) || is_numeric($v)) return trim((string)$v);
    if (is_array($v)) {
        $first = reset($v);
        if (is_array($first)) $v = $first; // מערך רשומות -> הראשונה
    }
    if (!is_array($v)) return is_scalar($v) ? trim((string)$v) : '';
    foreach (['תווית (ערבית)', 'תווית (עברית)', 'label', 'name', 'value'] as $k) {
        if (isset($v[$k]) && is_scalar($v[$k]) && trim((string)$v[$k]) !== '') return trim((string)$v[$k]);
    }
    foreach ($v as $val) if (is_scalar($val) && trim((string)$val) !== '') return trim((string)$val);
    return '';
}

// השלמת שדה יעד אחד (רק אם ריק) — מחזיר true אם בוצע שינוי
function bfSetIfEmpty(array &$data, string $targetId, $newVal, array $byId, array &$updatedList, array &$skippedList, string $via = ''): bool {
    $newStr = is_scalar($newVal) ? trim((string)$newVal) : '';
    if ($newStr === '') return false; // אין ערך במאגר — לא נמציא נתונים
    $tgt = $byId[$targetId] ?? null;
    $tType = $tgt['type'] ?? 'text';
    $curExists = array_key_exists($targetId, $data);
    $curRaw = $curExists ? $data[$targetId] : null;
    $curStr = '';
    if ($curExists) {
        if (is_scalar($curRaw)) $curStr = trim((string)$curRaw);
        elseif (is_array($curRaw)) $curStr = bfDecodeRecordValue($curRaw);
    }
    if ($curExists && $curStr !== '') {
        $skippedList[] = ['responseId' => '', 'target' => ($byId[$targetId]['label'] ?? $targetId), 'kept' => $curStr];
        return false; // לא דורסים תשובה קיימת
    }
    // התאמת הערך לסוג שדה היעד (record/select/radio/checkbox -> מבנה אחסון תקין)
    $final = $newStr;
    if ($tType === 'record' && !empty($tgt['sourceId'])) {
        $idx = bfBuildSourceIndex($tgt['sourceId']);
        $rec = null;
        // 1) חיפוש לפי עמודת התצוגה
        $df = bfCleanKey((string)($tgt['displayField'] ?? ''));
        if ($df !== '') {
            foreach ($idx as $r) { if (($r[$df] ?? '') === $newStr) { $rec = $r; break; } }
        }
        // 2) לפי המפתח הראשי (עמודת הקוד)
        if (!$rec && isset($idx[$newStr])) $rec = $idx[$newStr];
        // 3) לפי עמודה ראשונה
        if (!$rec) { foreach ($idx as $r) { if ((string)reset($r) === $newStr) { $rec = $r; break; } } }
        if ($rec) {
            $data[$targetId] = $rec; // יש ללקוח את כל הרשומה -> הצגה תקינה בדוח/CSV
            $changed = true;
        } else {
            $data[$targetId] = $newStr; // לא נמצאה רשומה — נשמור כמחרוזת (הצגה חלקית אך עדיף מריק)
        }
    } elseif ($tType === 'checkbox') {
        $final = [$newStr];
        $data[$targetId] = $final;
    } else {
        $data[$targetId] = $final;
    }
    $updatedList[] = [
        'responseId' => '',
        'target' => ($byId[$targetId]['label'] ?? $targetId),
        'from' => $curExists ? '' : null,
        'to' => $newStr,
        'via' => $via
    ];
    return true;
}

// פונקציית הליבה להשלמת autoFill על גבי תגובה בודדת
// $allFields = כל שדות הטופס; $symbolField = שדה הרשומה עם סמל המוסד (או null);
// $mappings = מפת targetField->sourceField מכל שדות ה-autoFill
function bfApplyAutoFill(array &$data, ?array $symbolField, array $mappings, array $byId, array &$updatedList, array &$skippedList, array &$unmatchedList): int {
    $changedCount = 0;

    // מקור רשומה ישיר: _record של שדה הסמל (נשמר ע"י הלקוח בעת הבחירה)
    $directRec = null;
    if ($symbolField) {
        $rk = $symbolField['id'] . '_record';
        if (isset($data[$rk]) && is_array($data[$rk]) && $data[$rk]) $directRec = $data[$rk];
    }

    // זיהוי סמל: קודם משדה הסמל, ואם אין — חיפוש רשומת מאגר בתגובה שעמודת התצוגה שלה היא סמל מוסד
    $sym = '';
    $symField = $symbolField;
    if ($symField) {
        $sym = bfResolveSymbol($data[$symField['id']] ?? '', $symField);
    }
    if ($sym === '' && !$directRec) {
        foreach ($byId as $tid => $tf) {
            if (($tf['type'] ?? '') !== 'record' || empty($tf['sourceId'])) continue;
            $df = bfCleanKey((string)($tf['displayField'] ?? ''));
            if (!preg_match('/סמל/iu', $df)) continue;
            $cand = $data[$tid] ?? '';
            $cs = bfResolveSymbol($cand, $tf);
            if ($cs === '' && is_array($cand)) $cs = bfDecodeRecordValue($cand);
            if ($cs !== '') { $sym = $cs; $symField = $tf; break; }
        }
    }

    // השגת רשומת המאגר: מה-_record השמור, או חיפוש לפי סמל
    $rec = $directRec;
    if (!$rec && $sym !== '' && $symField) {
        $index = bfBuildSourceIndex($symField['sourceId']);
        $rec = $index[$sym] ?? null;
        if (!$rec) {
            $unmatchedList[] = ['responseId' => '', 'symbol' => $sym, 'sourceId' => $symField['sourceId']];
        }
    }
    if (!$rec) return $changedCount;

    // נרמול מפתחות הרשומה (הסרת BOM) לצורך מיפוי
    $cleanRec = [];
    foreach ($rec as $k => $v) { $cleanRec[bfCleanKey((string)$k)] = $v; }

    // 1) השלמה לפי מיפויי autoFill המוצהרים בטופס
    foreach ($mappings as $targetId => $sourceCol) {
        if (!isset($byId[$targetId])) continue;
        $newVal = $cleanRec[$sourceCol] ?? '';
        if (bfSetIfEmpty($data, $targetId, $newVal, $byId, $updatedList, $skippedList, 'autoFill')) $changedCount++;
    }

    // 2) השלמה לפי תוויות (Label-Match): שדה whose label equals a source column name
    //    (מטפל בשדות שלא הוגדר להם מיפוי autoFill, למשל "שם מוסד" ↔ שדה עם אותו תווית)
    foreach ($byId as $tid => $tf) {
        if (isset($mappings[$tid])) continue; // כבר טופל במיפוי המוצהר
        $lbl = bfCleanKey(preg_replace('/\s+/u', ' ', (string)($tf['label'] ?? '')));
        if ($lbl === '' || !array_key_exists($lbl, $cleanRec)) continue;
        $newVal = $cleanRec[$lbl];
        if (bfSetIfEmpty($data, $tid, $newVal, $byId, $updatedList, $skippedList, 'label-match:' . $lbl)) $changedCount++;
    }

    // 3) הצמדת רשומת מאגר לשדות record נוספים (למשל "المرحلة التعليمية" ממאגר "שלב חינוך"):
    //    מפתיעים את ערך עמודת המאגר ומחפשים רשומה מתאימה במאגר של שדה היעד.
    foreach ($byId as $tid => $tf) {
        if (($tf['type'] ?? '') !== 'record' || empty($tf['sourceId'])) continue;
        if (isset($mappings[$tid])) continue;
        $curExists = array_key_exists($tid, $data);
        $curRaw = $curExists ? $data[$tid] : null;
        $curStr = '';
        if ($curExists) {
            if (is_scalar($curRaw)) $curStr = trim((string)$curRaw);
            elseif (is_array($curRaw)) $curStr = bfDecodeRecordValue($curRaw);
        }
        if ($curStr !== '') {
            $skippedList[] = ['responseId' => '', 'target' => ($tf['label'] ?? $tid), 'kept' => $curStr];
            continue;
        }
        $lbl = bfCleanKey(preg_replace('/\s+/u', ' ', (string)($tf['label'] ?? '')));
        $dict = bfTranslationMap();
        $srcCol = null;
        foreach ($cleanRec as $col => $val) {
            if (in_array($lbl, $dict[$col] ?? [], true)) { $srcCol = $col; break; }
        }
        if ($srcCol === null) continue;
        $val = is_scalar($cleanRec[$srcCol]) ? trim((string)$cleanRec[$srcCol]) : '';
        if ($val === '') continue;
        if (bfSetIfEmpty($data, $tid, $val, $byId, $updatedList, $skippedList, 'record-attach:' . $srcCol)) $changedCount++;
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

    // שדה הסמל + מפת מיפוי autoFill (כולל תרגום אוטומטי עברית->ערבית)
    $symbolField = bfDetectSymbolField($allFields);
    $mappings = bfBuildMappings($allFields, $symbolField);
    if (!$symbolField && !$mappings) {
        sendResponse(['success' => true, 'data' => ['totalResponses' => 0, 'changes' => 0, 'details' => [], 'alreadyFilled' => 0, 'unmatchedSymbols' => [], 'dryRun' => ($method === 'GET'), 'message' => 'לטופס זה אין שדה סמל מוסד/מילוי אוטומטי ממאגר — אין מה להשלים']]);
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
        $__n = bfApplyAutoFill($data, $symbolField, $mappings, $byId, $__upd, $__skp, $__unm);
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
