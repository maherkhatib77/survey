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
        'שלב חינוך במוסד' => ['المرحلة التعليمية', 'مرحلة التعليم في المدرسة', 'المرحلة', 'المرحلة التعليمية في المؤسسة'],
        'סוג חינוך מוסד'   => ['نوع التعليم في المدرسة', 'نوع التربية', 'سוג החינוך', 'نوع التربية في المؤسسة'],
        'מעמד משפטי'       => ['المكانة القانونية', 'الوضع القانوني', 'المكانة القانونية للمؤسسة'],
        'שם מוסד'          => ['اسم المدرسة', 'اسم المؤسسة'],
        'שם מנהל'          => ['اسم المدير', 'اسم المدير/ة'],
        'שם מפקח'          => ['اسم المفتش', 'اسم المفتش/ة', 'المفتش'],
    ];
}

// נרמול טקסט להשוואה גסה: הסרת BOM/לו"ה/רווחים כפולים, הורדת סימני פסיק ונקודותיים, אותיות קטנות
function bfNormText($s): string {
    $s = str_replace("\xEF\xBB\xBF", '', (string)$s);
    $s = trim(preg_replace('/\s+/u', ' ', $s));
    $s = str_replace(['،', '؟', '؛', '.', '،'], ['', '?', '', '', ''], $s);
    if (function_exists('mb_strtolower')) return mb_strtolower($s, 'UTF-8');
    return strtolower($s); // מספיק לASCII; בעברית/ערבית אין הבחנת רישיות
}

// השוואת substring ידידותית-יוניקוד (עם fallback אם mbstring אינו זמין)
function bfStrContains(string $haystack, string $needle): bool {
    if ($needle === '') return false;
    if (function_exists('mb_strpos')) return mb_strpos($haystack, $needle, 0, 'UTF-8') !== false;
    return strpos($haystack, $needle) !== false;
}

// זיהוי "שאלת מטריצה" שהתשובה שלה היא הציר המתאים לעמודת מאגר נתונה
// (למשל עמודה "שלב חינוך במוסד" <-> שאלה "المرحلة التعليمية").
function bfMatrixQuestionForColumn(string $col, array $allFields): ?string {
    $dict = bfTranslationMap();
    $variants = array_merge([$col], $dict[$col] ?? []);
    $normVariants = array_map('bfNormText', $variants);
    foreach ($allFields as $f) {
        if (($f['type'] ?? '') !== 'matrix') continue;
        $qn = bfNormText($f['label'] ?? '');
        foreach ($normVariants as $nv) {
            if ($nv !== '' && ($qn === $nv || bfStrContains($qn, $nv))) {
                return $f['id'];
            }
        }
    }
    return null;
}

// האם התגובה לשאלת מטריצה ריקה? (מבנה אחסון לקוח: {rowId => colValue | [colValues]})
function bfMatrixIsEmpty($cur): bool {
    if ($cur === null || $cur === '' || $cur === []) return true;
    if (is_array($cur)) {
        foreach ($cur as $rv) {
            if (is_array($rv)) { if ($rv) return false; }
            elseif (is_scalar($rv) && trim((string)$rv) !== '') return false;
        }
        return true;
    }
    return trim((string)$cur) === '';
}

// התאמת תווית שדה/שאלה לעמודת מאגר: זהות (נרמול) או היכללה דו-כיוונית
function bfLabelMatchesColumn(string $labelNorm, string $colNorm): bool {
    if ($labelNorm === '' || $colNorm === '') return false;
    return $labelNorm === $colNorm
        || bfStrContains($labelNorm, $colNorm)
        || bfStrContains($colNorm, $labelNorm);
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
    // תרגום: עבור שדות יעד שלא הוגדר להם מיפוי — נסה להתאים לפי מילון + התאמת חלקית
    if ($symbolField && !empty($symbolField['sourceId'])) {
        $index = bfBuildSourceIndex($symbolField['sourceId']);
        $cols = [];
        foreach ($index as $rec) { foreach ($rec as $k => $v) $cols[bfCleanKey((string)$k)] = true; break; }
        $dict = bfTranslationMap();
        $normCols = [];
        foreach (array_keys($cols) as $c) $normCols[$c] = bfNormText($c);
        foreach ($allFields as $f) {
            $tid = $f['id'];
            if (isset($m[$tid])) continue;
            if (($f['type'] ?? '') === 'record') continue; // שדות רשומה אחרים מטופלים בהצמדת רשומה
            $lbl = bfNormText($f['label'] ?? '');
            if ($lbl === '') continue;
            foreach ($normCols as $col => $cn) {
                // 1) גרסה עברית של העמודה מופיעה ברשימת התרגומים של התווית
                $hit = false;
                foreach ($dict as $heCol => $arVariants) {
                    if ($heCol !== $col) continue;
                    foreach ($arVariants as $var) {
                        if (bfLabelMatchesColumn($lbl, bfNormText($var))) { $hit = true; break 2; }
                    }
                }
                // 2) התאמה חלקית ישירה בין תווית השדה לשם עמודת המאגר
                if (!$hit && bfLabelMatchesColumn($lbl, $cn)) { $m[$tid] = $col; break; }
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

// הצמדת רשומת מאגר (record) לערך שנבחר בשדה record — לפי displayField, עמודה ראשונה או מפתח index
function bfAttachRecordValue($val, $tgtField) {
    if (!is_array($tgtField) || empty($tgtField['sourceId'])) return null;
    $idx = bfBuildSourceIndex($tgtField['sourceId']);
    // 1) חיפוש לפי עמודת התצוגה
    $df = bfCleanKey((string)($tgtField['displayField'] ?? ''));
    if ($df !== '') {
        foreach ($idx as $r) { if (($r[$df] ?? '') === $val) return $r; }
    }
    // 2) לפי המפתח הראשי (עמודת הקוד)
    if (isset($idx[$val])) return $idx[$val];
    // 3) לפי עמודה ראשונה
    foreach ($idx as $r) { if ((string)reset($r) === $val) return $r; }
    return null;
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
        $rec = bfAttachRecordValue($newStr, $tgt);
        if ($rec) {
            $data[$targetId] = $rec; // יש ללקוח את כל הרשומה -> הצגה תקינה בדוח/CSV
        } else {
            $data[$targetId] = $newStr; // לא נמצאה רשומה — נשמור כמחרוזת (הצגה חלקית אך עדיף מריק)
        }
    } elseif ($tType === 'checkbox') {
        $final = [$newStr];
        $data[$targetId] = $final;
    } else {
        $data[$targetId] = $final;
    }
    // עבור שדה record: עדכן גם את "רשומת הבחירה" (_record) ואת עמודת ה-value שלה
    // כך שמנגנוני autoFill בדוחות/מילוי יזהו את ההצמדה במבנה הסטנדרטי של הלקוח.
    if ($tType === 'record' && !empty($tgt['sourceId']) && isset($data[$targetId]) && is_array($data[$targetId])) {
        $rf = bfCleanKey((string)($tgt['recordField'] ?? ''));
        if ($rf === '') $rf = (string)reset(array_keys($data[$targetId]));
        if ($rf !== '' && array_key_exists($rf, $data[$targetId])) {
            $data[$targetId . '_record'] = [$rf => $data[$targetId][$rf]];
        }
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
// $allFieldsRef = כל שדות הטופס (כולל מטריצות) לזיהוי צירי מילוי; נדרש להשלמת מטריצות.
function bfApplyAutoFill(array &$data, ?array $symbolField, array $mappings, array $byId, array &$updatedList, array &$skippedList, array &$unmatchedList, array $allFieldsRef = []): int {
    if (!$allFieldsRef) $allFieldsRef = array_values($byId);
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
        $lbl = bfNormText($tf['label'] ?? '');
        $dict = bfTranslationMap();
        $srcCol = null;
        foreach ($cleanRec as $col => $val) {
            $matched = false;
            foreach ($dict[$col] ?? [] as $var) {
                if (bfLabelMatchesColumn($lbl, bfNormText($var))) { $matched = true; break; }
            }
            if (!$matched && bfLabelMatchesColumn($lbl, bfNormText($col))) $matched = true;
            if ($matched) { $srcCol = $col; break; }
        }
        if ($srcCol === null) continue;
        $val = is_scalar($cleanRec[$srcCol]) ? trim((string)$cleanRec[$srcCol]) : '';
        if ($val === '') continue;
        // הצמדת רשומת-מאגר מלאה כשהערך תואם רשומה בשלב-א'; אחרת מילוי טקסט חופשי.
        // (חשוב: אין למלא "יסודי בלבד" בתוך מאגר שבו קיימות רק הרשומות "יסודי"/"חטיבת ביניים"... —
        //  bfSetIfEmpty יזהה שאין התאמה וישמור את הערך כמחרוזת קריאה, עדיף מהשדה הריק.)
        if (bfSetIfEmpty($data, $tid, $val, $byId, $updatedList, $skippedList, 'record-attach:' . $srcCol)) $changedCount++;
    }

    // 4) השלמת צירי מטריצה (matrix rows) מעמודות המאגר:
    //    אם שאלת המטריצה תוארת לעמודת מאגר (למשל "المرحلة التعليمية" <-> "שלב חינוך במוסד"),
    //    והמשיב לא סימן באף שורה — סמן אוטומטית את השורה שהתווית שלה תואמת לערך במאגר.
    $matrixFilled = [];
    foreach ($cleanRec as $col => $val) {
        if (!is_scalar($val)) continue;
        $valStr = trim((string)$val);
        if ($valStr === '' || $valStr === 'כן' || $valStr === 'לא') continue;
        $qid = bfMatrixQuestionForColumn(bfCleanKey((string)$col), $allFieldsRef);
        if ($qid === null || !isset($byId[$qid])) continue;
        if (array_key_exists($qid, $matrixFilled)) continue; // עמודה אחת לכל שאלה לכל היותר
        $q = $byId[$qid];
        $rows = !empty($q['matrixRows']) ? $q['matrixRows'] : ($q['rows'] ?? []);
        if (!$rows) continue;
        $cur = $data[$qid] ?? [];
        if (!bfMatrixIsEmpty($cur)) {
            $skippedList[] = ['responseId' => '', 'target' => ($q['label'] ?? $qid), 'kept' => 'כבר נענתה'];
            $matrixFilled[$qid] = true;
            continue;
        }
        // חיפוש שורת מטריצה שהתווית שלה תואמת לערך במאגר (התאמה מלאה או היכללה דו-כיוונית)
        $rowMatch = null; $rowIdMatch = null;
        $valNorm = bfNormText($valStr);
        foreach ($rows as $row) {
            if (!is_array($row)) continue;
            $rt = (string)($row['label'] ?? '');
            $rtNorm = bfNormText($rt);
            if ($rtNorm !== '' && ($rtNorm === $valNorm
                || bfStrContains($rtNorm, $valNorm)
                || bfStrContains($valNorm, $rtNorm))) { $rowMatch = $rt; $rowIdMatch = $row['id'] ?? $rt; break; }
        }
        if ($rowMatch === null) continue;
        // מבנה אחסון לקוח: {rowId => colValue}; עבור הצמדת מאגר נשתמש בערך העמודה הראשונה
        // כערך "מסומן" — זהה ל-V שמציג הדוח.
        $firstColVal = '';
        $colsArr = !empty($q['matrixColumns']) ? $q['matrixColumns'] : ($q['columns'] ?? []);
        if ($colsArr) {
            $c0 = reset($colsArr);
            $firstColVal = is_array($c0) ? (string)($c0['value'] ?? '') : (string)$c0;
        }
        if ($firstColVal === '') $firstColVal = '1';
        $data[$qid] = [$rowIdMatch => $firstColVal];
        $matrixFilled[$qid] = true;
        $updatedList[] = [
            'responseId' => '',
            'target' => ($q['label'] ?? $qid) . ' → ' . $rowMatch,
            'from' => null,
            'to' => $valStr,
            'via' => 'matrix-column:' . bfCleanKey((string)$col)
        ];
        $changedCount++;
    }

    return $changedCount;
}

// ===== מנוע השלמת מטריצות חסרות (matrix-complete) =====
// לוגיקה: לכל שאלת מטריצה שהמשיב דילג על חלק משורותיה — מסיקים ערך עקבי
// מתוך תשובות המשיב בשאר המטריצות שבסקר. אסטרטגיות (לפי סדר עדיפות):
//  A) ממוצע הציונים של המשיב בכל המטריצות -> העמודה הקרובה ביותר לממוצע.
//     (מתאים למטריצות סולם 1-5 / "מאוד"-"לא"; מתעלם מערכי טקסט לא-מספריים)
//  B) שכיח (Mode): אם המשיב בחר בעמודה אחת ברוב שורות המטריצות שלו -> נשתמש בה.
//  C) היסטוריה לפי אותה שורה: אם אותו משיב (לפי מזהה מוסד/שם) ענה על אותה
//     שורת מטריצה בתגובה אחרת באותו הסקר -> נעתיק את ציונו מהפעם הקודמת.
//  D) ברירת מחדל: העמודה האמצעית בסולם (שמרני, מסומן כ-via=default).
// החוקים: לא דורסים שורות שנענו; אין הוספת עמודות שאינן קיימות בטופס;
// רק סעיפים (שורות) חסרים ממולאים; נוצר גיבוי לפני הכתיבה (ב-run).

/** שלוף רשימת {id,label,value} של עמודות מטריצה */
function mcColumns($f) {
    $cols = !empty($f['matrixColumns']) ? $f['matrixColumns'] : ($f['columns'] ?? []);
    $out = [];
    foreach ($cols as $c) {
        if (is_array($c)) {
            $out[] = ['id' => (string)($c['id'] ?? $c['value'] ?? ''), 'label' => (string)($c['label'] ?? ''), 'value' => (string)($c['value'] ?? $c['id'] ?? '')];
        } else {
            $out[] = ['id' => (string)$c, 'label' => (string)$c, 'value' => (string)$c];
        }
    }
    return $out;
}

/** שורות מטריצה: [{id,label}] */
function mcRows($f) {
    $rows = !empty($f['matrixRows']) ? $f['matrixRows'] : ($f['rows'] ?? []);
    $out = [];
    foreach ($rows as $r) {
        if (is_array($r)) $out[] = ['id' => (string)($r['id'] ?? $r['label'] ?? ''), 'label' => (string)($r['label'] ?? '')];
        else $out[] = ['id' => (string)$r, 'label' => (string)$r];
    }
    return $out;
}

/** האם ערך עמודה הוא מספרי (לצורך ממוצע)? */
function mcNumericValue($col) {
    // עדיפות ל-value; אם הטקסט עצמו מכיל ספרה בודדת (1-10) — נחלץ
    $v = trim($col['value']);
    if ($v !== '' && is_numeric($v)) return (float)$v;
    if (preg_match('/^\s*(\d{1,2})\s*$/', $col['label'], $m)) return (float)$m[1];
    return null;
}

/** נרמול תשובת מטריצה לשורה: scalar | [scalars] | null */
function mcCellNormalize($cell) {
    if ($cell === null || $cell === '' || $cell === []) return null;
    if (is_array($cell)) {
        // מבנה אובייקט (למשל {value:"bdegree_keira", label:"..."} או רשומת מאגר) — חילוץ ערך
        foreach (['value', 'id', 'label'] as $k) {
            if (isset($cell[$k]) && is_scalar($cell[$k]) && trim((string)$cell[$k]) !== '') return [trim((string)$cell[$k])];
        }
        $flat = [];
        foreach ($cell as $x) {
            if (is_scalar($x) && trim((string)$x) !== '') $flat[] = trim((string)$x);
            elseif (is_array($x)) { // רשימה של אובייקטי עמודה
                foreach (['value', 'id', 'label'] as $k) {
                    if (isset($x[$k]) && is_scalar($x[$k]) && trim((string)$x[$k]) !== '') { $flat[] = trim((string)$x[$k]); break; }
                }
            }
        }
        return $flat ?: null;
    }
    if (is_scalar($cell)) return [trim((string)$cell)];
    return null;
}

/** האם לתגובה יש מילוי כלשהו (גם חלקי) בשאלת המטריצה? בדיקה לפי שורות הטופס + כל מפתח */
function mcHasAnyFill($cur, array $rows) {
    if (!is_array($cur) || !$cur) return false;
    foreach ($rows as $r) {
        if (mcCellNormalize($cur[$r['id']] ?? ($cur[$r['label']] ?? null)) !== null) return true;
    }
    // מפתחות לא מוכרים (למשל אחרי שינוי/המרת שורות) — אם יש בהם ערך → נחשב כמילוי
    foreach ($cur as $k => $v) {
        if (mcCellNormalize($v) !== null) return true;
    }
    return false;
}

/** מיפוי ערך-עמודה -> id העמודה (עבור כתיבה במבנה האחסון) */
function mcColIdByValue(array $cols, $val) {
    foreach ($cols as $c) {
        if ($c['value'] === $val || $c['id'] === $val || $c['label'] === $val) return $c['id'];
    }
    return null;
}

/** זיהוי id העמודה שבה המשיב השתמש בתגובה (לצורך ממוצע/שכיח).
 *  תואם גם מבנה ישן שבו נשמר value/label ולא id. */
function mcResolveAnswerColId($rawVal, array $targetCols, ?array $sourceCols = null) {
    if (!is_scalar($rawVal)) return null;
    $val = trim((string)$rawVal);
    if ($val === '') return null;
    // 1) התאמה ישירה מול עמודות השאלה הנוכחית
    $cid = mcColIdByValue($targetCols, $val);
    if ($cid !== null) return $cid;
    // 2) נרמול חסר: השוואת טקסט מטבע-לשונית (עברית/ערבית, רווחים/פסיקים)
    $norm = function ($s) {
        $s = trim((string)$s);
        if (function_exists('mb_strtolower')) $s = mb_strtolower($s, 'UTF-8');
        $s = str_replace(['_', ' ', '-', '،'], ['_', '', '', ''], $s);
        $s = str_replace(["׳", "״"], ['', ''], $s);
        return $s;
    };
    foreach ($targetCols as $c) {
        if ($norm($c['value']) === $norm($val) || $norm($c['label']) === $norm($val)) return $c['id'];
    }
    // 3) התאמה מול עמודות שאלת המקור (אם ידועות) -> מציאת עמודה עקבית בערכים
    if ($sourceCols !== null) {
        $srcIdx = null;
        foreach ($sourceCols as $i => $sc) {
            if ($sc['value'] === $val || $sc['id'] === $val || $sc['label'] === $val) { $srcIdx = $i; break; }
        }
        if ($srcIdx === null) {
            foreach ($sourceCols as $i => $sc) {
                if ($norm($sc['value']) === $norm($val) || $norm($sc['label']) === $norm($val)) { $srcIdx = $i; break; }
            }
        }
        if ($srcIdx !== null) {
            // א. מיפוי לפי index בסולם — שני הסולמות מאותו משפחת ליקרט (אותו מספר שלבים,
            //    והשלב הראשון שלהם הוא השלילה/המינימום של הסולם). זה מכסה מצב שבו מטריצות
            //    באותו סקר כתובות בעברית ובערבית או בניסוחים שונים של אותו סולם.
            $isLikert = function ($cols) use ($norm) {
                $first = $norm($cols[0]['label'] ?? '') . ' ' . $norm($cols[0]['value'] ?? '');
                return (bool)preg_match('/^(לא|אף|אינם|זרו|لا|ليست|بدرجة_قليلة|غير)/u', $first) || preg_match('/(لا|قليلة|low|min|never|אף_פעם)/u', $first);
            };
            if (count($targetCols) === count($sourceCols) && count($sourceCols) >= 2
                && $isLikert($sourceCols) && $isLikert($targetCols)) {
                return $targetCols[$srcIdx]['id'];
            }
            // ב. מיפוי לפי טקסט נרמל של עמודת המקור מול היעד
            $srcLabel = '';
            foreach ($sourceCols as $i => $sc) if ($i === $srcIdx) $srcLabel = $sc['label'];
            foreach ($targetCols as $tc) {
                if ($norm($tc['label']) === $norm($srcLabel) || $norm($tc['value']) === $norm($srcLabel)) return $tc['id'];
            }
        }
    }
    return null;
}

/** זיהוי "מזהה משיב" לתגובה (לצורך היסטוריה בין-תגובתית): סמל מוסד או שם מלא */
function mcRespondentKey(array $respData, array $allFields) {
    // 1) שדה record עם עמודת תצוגה של סמל
    foreach ($allFields as $f) {
        if (($f['type'] ?? '') !== 'record' || empty($f['sourceId'])) continue;
        $df = bfCleanKey((string)($f['displayField'] ?? ''));
        if ($df !== '' && preg_match('/סמל/iu', $df)) {
            $sym = bfResolveSymbol($respData[$f['id']] ?? '', $f);
            if ($sym !== '') return 'inst:' . $sym;
        }
    }
    // 2) שדה טקסט עם שם מלא/שם משתמש
    foreach ($allFields as $f) {
        $lbl = bfNormText($f['label'] ?? '');
        if (!in_array($f['type'] ?? '', ['text', 'email'], true)) continue;
        if (preg_match('/שם.*מלא|full.?name|اسم.*(كامل|المستخدم)|שם משתמש/iu', $lbl)) {
            $v = $respData[$f['id']] ?? '';
            if (is_scalar($v) && trim((string)$v) !== '') return 'name:' . bfNormText($v);
        }
    }
    return null;
}

/**
 * חישוב ערך מומלץ לשורת מטריצה חסרה עבור משיב אחד.
 * מחזיר [value, via] או null אם אין המלעה סבירה.
 */
function mcSuggest($rowLabel, array $respondentMatrixAnswers, ?array $historyRowVal, array $cols) {
    // A+B: שקלול תשובות המשיב בשאר המטריצות
    $nums = [];      // ערכים מספריים
    $counts = [];    // שכיחות ערכים (גם לא-מספריים)
    foreach ($respondentMatrixAnswers as $entry) {
        // כל איבר הוא [rawValue, sourceCols|null]
        $v = is_array($entry) ? ($entry[0] ?? null) : $entry;
        $srcCols = is_array($entry) ? ($entry[1] ?? null) : null;
        if (!is_scalar($v)) continue;
        $cid = mcResolveAnswerColId((string)$v, $cols, $srcCols);
        if ($cid === null) continue; // ערך שלא ניתן לשייך לעמודות השאלה הנתונה
        $colObj = null;
        foreach ($cols as $c) if ($c['id'] === $cid) { $colObj = $c; break; }
        $nv = mcNumericValue($colObj);
        if ($nv !== null) $nums[] = $nv;
        $key = $colObj['value'];
        $counts[$key] = ($counts[$key] ?? 0) + 1;
    }
    // A) ממוצע -> העמודה המספרית הקרובה
    if (count($nums) >= 2) {
        $avg = array_sum($nums) / count($nums);
        $best = null; $bestDist = INF;
        foreach ($cols as $c) {
            $nv = mcNumericValue($c);
            if ($nv === null) continue;
            $dist = abs($nv - $avg);
            if ($dist < $bestDist) { $bestDist = $dist; $best = $c['value']; }
        }
        if ($best !== null) return [$best, 'avg(' . round($avg, 2) . ')'];
    }
    // C) היסטוריה: אותו משיב ענה על אותה שורה בתגובה אחרת
    if ($historyRowVal !== null) return [$historyRowVal, 'history'];
    // B) שכיח
    if ($counts) {
        arsort($counts);
        $mode = (string)array_key_first($counts);
        if (mcColIdByValue($cols, $mode) !== null) return [$mode, 'mode'];
    }
    // D) ברירת מחדל: עמודה אמצעית (בסולם מספרי) או ראשונה
    $numericCols = array_values(array_filter($cols, function ($c) { return mcNumericValue($c) !== null; }));
    if ($numericCols) {
        $mid = $numericCols[(int)floor(count($numericCols) / 2)];
        return [$mid['value'], 'default-mid'];
    }
    if ($cols) return [$cols[0]['value'], 'default-first'];
    return null;
}

/**
 * הרצת מנוע השלמת מטריצות על כלל התגובות.
 * $dryRun=true — לא כותבים כלום.
 */
function runMatrixCompletion(array $form, array &$responses, bool $dryRun) {
    $allFields = [];
    foreach (($form['pages'] ?? []) as $page) {
        foreach (($page['fields'] ?? []) as $f) $allFields[] = $f;
    }
    $matrixFields = array_values(array_filter($allFields, function ($f) { return ($f['type'] ?? '') === 'matrix'; }));
    if (!$matrixFields) {
        return ['totalResponses' => count($responses), 'changes' => 0, 'details' => [], 'skipped' => 0, 'message' => 'לסקר זה אין שאלות מטריצה'];
    }

    // מעבר ראשון: איסוף תשובות לפי משיב (להיסטוריה) ומילויים קיימים
    $respKeys = [];       // idx -> respondentKey
    $answersByKey = [];   // key => [ [fieldId => [rowLabel => [values]]], ... ]
    $matrixColsById = []; // fieldId -> columns (לצורך תרגום ערכי מקור)
    foreach ($matrixFields as $mf) $matrixColsById[$mf['id']] = mcColumns($mf);
    foreach ($responses as $i => $resp) {
        if (!is_array($resp)) continue;
        $data = $resp['data'] ?? [];
        if (!is_array($data)) $data = [];
        $key = mcRespondentKey($data, $allFields) ?? ('idx:' . $i);
        $respKeys[$i] = $key;
        $perResp = [];
        foreach ($matrixFields as $mf) {
            $rows = mcRows($mf);
            $ans = [];
            $cur = $data[$mf['id']] ?? null;
            if (is_array($cur)) {
                foreach ($rows as $r) {
                    $norm = mcCellNormalize($cur[$r['id']] ?? ($cur[$r['label']] ?? null));
                    if ($norm !== null) $ans[$r['label']] = $norm;
                }
            }
            $perResp[$mf['id']] = $ans;
        }
        $answersByKey[$key][] = $perResp;
    }

    $updatedList = [];
    $skippedCount = 0;
    $skippedEmpty = 0;   // מטריצות שלא נענו כלל — לא ממלאים (כבוד הנענה)
    $changedCount = 0;

    // מעבר שני: זיהוי ומילוי חוסרים
    foreach ($responses as $i => &$resp) {
        if (!is_array($resp)) continue;
        $key = $respKeys[$i] ?? ('idx:' . $i);
        $histEntries = $answersByKey[$key] ?? [];
        // היסטוריה = תגובות אותו משיב (כולל הנוכחית — שורות שנענו בה לא נדרסות בכל מקרה)
        $history = $histEntries;

        if (!isset($resp['data']) || !is_array($resp['data'])) $resp['data'] = [];
        $newData = [];
        $anyChange = false;

        foreach ($matrixFields as $mf) {
            $cols = mcColumns($mf);
            $rows = mcRows($mf);
            if (!$cols || !$rows) continue;
            $fid = $mf['id'];
            $cur = $resp['data'][$fid] ?? null;
            if (!is_array($cur)) $cur = [];
            // הגנה על כבוד הנענה: אם המשיב לא מילא כלום בשאלה זו — אין למלא עבורו.
            // השלמה מתבצעת רק במטריצות שנענו חלקית (דילוג על שורות בודדות).
            if (!mcHasAnyFill($cur, $rows)) { $skippedEmpty++; continue; }
            $filledHere = 0;

            // תשובות המשיב בשאר המטריצות (לצורך ממוצע/שכיח) — כולל עמודות המקור לתרגום
            $otherAnswers = [];
            foreach ($matrixFields as $of) {
                if ($of['id'] === $fid) continue;
                $srcCols = $matrixColsById[$of['id']] ?? null;
                foreach ($history as $h) {
                    foreach (($h[$of['id']] ?? []) as $vals) {
                        foreach ($vals as $vv) $otherAnswers[] = [$vv, $srcCols];
                    }
                }
            }

            foreach ($rows as $r) {
                $existing = mcCellNormalize($cur[$r['id']] ?? ($cur[$r['label']] ?? null));
                if ($existing !== null) { $skippedCount++; continue; } // נענה — לא דורסים

                // (1) היסטוריה: אותו משיב ענה על אותה שורה בדיוק בתגובה אחרת -> העתקה מדויקת
                $histVal = null;
                foreach ($history as $h) {
                    if (isset($h[$fid][$r['label']])) { $hv = $h[$fid][$r['label']]; $histVal = $hv[0] ?? null; if ($histVal !== null) break; }
                }
                if ($histVal !== null) {
                    $hcid = mcResolveAnswerColId($histVal, $cols);
                    if ($hcid === null) {
                        foreach ($matrixFields as $of) {
                            if ($of['id'] === $fid) continue;
                            $tmp = mcResolveAnswerColId($histVal, $matrixColsById[$of['id']] ?? []);
                            if ($tmp !== null) {
                                foreach ($matrixColsById[$of['id']] as $oc) if ($oc['id'] === $tmp) { $hcid = mcResolveAnswerColId($oc['value'], $cols, [$oc]); break 2; }
                                foreach ($matrixColsById[$of['id']] as $oc) if ($oc['id'] === $tmp) { $hcid = mcResolveAnswerColId($oc['label'], $cols, [$oc]); break 2; }
                            }
                        }
                    }
                    if ($hcid !== null) {
                        $cur[$r['id']] = $hcid;
                        $filledHere++; $changedCount++;
                        $hLabel = $hcid; foreach ($cols as $c) if ($c['id'] === $hcid) $hLabel = $c['value'];
                        $updatedList[] = ['responseId' => $resp['id'] ?? '', 'target' => ($mf['label'] ?? $fid) . ' → ' . $r['label'], 'from' => null, 'to' => $hLabel, 'via' => 'matrix:history'];
                        continue;
                    }
                }

                // (2) הסקה מסולם המטריצה הנוכחית עצמה (ממוצע/שכיח של יתר השורות שנענו)
                $selfAnswers = [];
                $selfNums = []; $selfCounts = [];
                foreach ($rows as $rr) {
                    if ($rr['id'] === $r['id']) continue;
                    $ex = mcCellNormalize($cur[$rr['id']] ?? ($cur[$rr['label']] ?? null));
                    if ($ex === null) continue;
                    foreach ($ex as $v) {
                        $cid2 = mcColIdByValue($cols, $v);
                        if ($cid2 === null) continue;
                        $colObj2 = null; foreach ($cols as $c) if ($c['id'] === $cid2) $colObj2 = $c;
                        $nv2 = mcNumericValue($colObj2);
                        if ($nv2 !== null) $selfNums[] = $nv2;
                        $selfCounts[$colObj2['value']] = ($selfCounts[$colObj2['value']] ?? 0) + 1;
                    }
                }
                $val = null; $via = null;
                if (count($selfNums) >= 1) {
                    $avg = array_sum($selfNums) / count($selfNums);
                    $best = null; $bestDist = INF;
                    foreach ($cols as $c) {
                        $nv = mcNumericValue($c);
                        if ($nv === null) continue;
                        $dist = abs($nv - $avg);
                        if ($dist < $bestDist) { $bestDist = $dist; $best = $c['value']; }
                    }
                    if ($best !== null) { $val = $best; $via = 'self-avg(' . round($avg, 2) . ')'; }
                }
                if ($val === null && $selfCounts) {
                    arsort($selfCounts);
                    $modeKey = (string)array_key_first($selfCounts);
                    if (mcColIdByValue($cols, $modeKey) !== null) { $val = $modeKey; $via = 'self-mode'; }
                }

                // (3)fallback רגיל: שאר המטריצות + היסטוריה + ברירת מחדל
                if ($val === null) {
                    $sug = mcSuggest($r['label'], $otherAnswers, null, $cols);
                    if ($sug === null) continue;
                    [$val, $via] = $sug;
                    $via = 'cross-' . $via;
                }
                $cid = mcColIdByValue($cols, $val);
                if ($cid === null) continue;
                $cur[$r['id']] = $cid;
                $filledHere++;
                $changedCount++;
                $updatedList[] = [
                    'responseId' => $resp['id'] ?? '',
                    'target' => ($mf['label'] ?? $fid) . ' → ' . $r['label'],
                    'from' => null,
                    'to' => $val,
                    'via' => 'matrix:' . $via
                ];
            }
            if ($filledHere > 0) { $resp['data'][$fid] = $cur; $anyChange = true; }
        }
        unset($newData);
    }
    unset($resp);

    return [
        'totalResponses' => count($responses),
        'changes' => $changedCount,
        'details' => $updatedList,
        'alreadyFilled' => $skippedCount,
        'untouchedEmptyMatrices' => $skippedEmpty,
    ];
}

try {
    try {
        requireLogin();
        // Backfill = כתיבה לתגובות השמורות: נדרשת הרשאת עריכת סקרים (ללא קשר לבעלות,
        // כי מדובר בפעולת תחזוקת נתונים מבוקרת; משתמש רגיל עם edit_forms מורשה).
        requirePermission('edit_forms');
        if ($method === 'POST' && ($action === 'run' || $action === 'matrix-complete')) validateCsrf();

        // בדיקת בעלות: משתמש רגיל יכול להריץ backfill רק על סקרים שהוא יצר
        $__cu = getCurrentUser();
        if ($__cu && ($__cu['role'] ?? 'user') !== 'admin') {
            $__f = getForm($formId);
            if (!$__f || (($__f['createdBy'] ?? null) !== ($__cu['id'] ?? '') && ($__f['createdBy'] ?? null) !== ($__cu['username'] ?? ''))) {
                sendResponse(['success' => false, 'error' => 'אין לך גישה לפעולה זו עבור סקר זה'], 403);
            }
        }
    } catch (Throwable $e) {
        // Exception + Error כאחד — sendResponse קורא exit() ולכן הוא חייב להיות
        // מחוץ לבלוק ה-catch (exit בתוך catch עלול להיחסם בסביבות מסוימות).
        error_log('backfill auth fatal: ' . get_class($e) . ': ' . $e->getMessage() . ' @ line ' . $e->getLine());
        $__authErr = true;
    }
    if (!empty($__authErr)) {
        sendResponse(['success' => false, 'error' => 'שגיאת הרשאה/התחברות. ייתכן שפג תוקף החיבור — רענן את הדף והתחבר מחדש. הפרטים נרשמו בלוג PHP.'], 403);
    }

    try {

    $form = getForm($formId);
    if (!$form) sendResponse(['success' => false, 'error' => 'טופס לא נמצא'], 404);

    // ===== מסלול matrix-preview / matrix-complete: השלמת סעיפי מטריצה חסרים =====
    if ($action === 'matrix-preview' || $action === 'matrix-complete') {
        $mFile = RESPONSES_DIR . '/' . $formId . '.json';
        $mRaw = readJSON($mFile);
        if ($mRaw === null) {
            sendResponse(['success' => true, 'data' => ['totalResponses' => 0, 'changes' => 0, 'details' => [], 'alreadyFilled' => 0, 'dryRun' => true, 'message' => 'אין עדיין תגובות לסקר זה']]);
        }
        $mEnv = is_array($mRaw) && isset($mRaw['responses']) && is_array($mRaw['responses']);
        $mResps = $mEnv ? $mRaw['responses'] : $mRaw;
        $mResult = runMatrixCompletion($form, $mResps, true);
        if (!empty($mResult['message'])) {
            sendResponse(['success' => true, 'data' => ['totalResponses' => count($mResps), 'changes' => 0, 'details' => [], 'alreadyFilled' => 0, 'dryRun' => true, 'message' => $mResult['message']]]);
        }
        $mResult['dryRun'] = ($action === 'matrix-preview');
        if ($action === 'matrix-preview') {
            sendResponse(['success' => true, 'data' => $mResult]);
        }
        // matrix-complete (POST): כתיבה + גיבוי
        if ($mResult['changes'] > 0) {
            $mBackup = RESPONSES_DIR . '/' . $formId . '.backup-matrix-' . date('Ymd-His') . '.json';
            @copy($mFile, $mBackup);
            $mPayload = $mEnv ? array_merge($mRaw, ['responses' => $mResps]) : $mResps;
            if (!writeJSON($mFile, $mPayload)) {
                sendResponse(['success' => false, 'error' => 'כתיבת הקובץ נכשלה. בדוק הרשאות לתיקיית data/responses'], 500);
            }
            $mResult['backup'] = basename($mBackup);
        }
        sendResponse(['success' => true, 'data' => $mResult]);
    }

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
        $__n = bfApplyAutoFill($data, $symbolField, $mappings, $byId, $__upd, $__skp, $__unm, $allFields);
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
