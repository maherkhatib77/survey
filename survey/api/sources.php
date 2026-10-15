<?php
/**
 * Data Sources API - ניהול מאגרי נתונים
 */
require_once 'config.php';
csrfBootstrap();

// הערה: SOURCES_DIR כבר מוגדר ב-config.php – הגדרה חוזרת כאן גרמה ל-Warning
// ("Constant SOURCES_DIR already defined") שהודפס לפני ה-JSON ושבר את הלקוח.

$method = $_SERVER['REQUEST_METHOD'];
$action = isset($_GET['action']) ? $_GET['action'] : '';
$id = isset($_GET['id']) ? $_GET['id'] : '';

// יצירת תיקייה
if (!is_dir(SOURCES_DIR)) {
    mkdir(SOURCES_DIR, 0755, true);
}

switch ($method) {
    case 'GET':
        if ($action === 'list') {
            // רשימת כל המאגרים
            requireLogin();
            $sources = getAllSources();
            sendResponse(['success' => true, 'data' => $sources]);

        } elseif ($action === 'fields') {
            // רשימת שדות מאגר (ללא ערכי הרשומות) – מותר גם ללא התחברות.
            // משמש למילוי טפסים: אפשרות fallback אם דפדפן חוסם Cookie
            // (Privacy Badger / חסימת צד שלישי) והבקשה action=get מחזירה 401.
            $source = getSource($id);
            if (!$source) {
                sendResponse(['success' => false, 'error' => 'מאגר לא נמצא'], 404);
            }
            // חשיפה מינימלית: שדות + רשומות מקוצרות (value/label) בלבד
            sendResponse([
                'success' => true,
                'data' => [
                    'id' => $source['id'] ?? $id,
                    'name' => $source['name'] ?? '',
                    'fields' => $source['fields'] ?? [],
                    'records' => array_map(function ($r) use ($source) {
                        $display = $source['displayField'] ?? null;
                        $out = [];
                        foreach ((array)$r as $k => $v) {
                            // החזר רק שדה התצוגה ושדה הערך – לא כל הרשומה
                            if ($display !== null && $k === $display) $out[$k] = $v;
                        }
                        if (!$out) $out = $r; // אם אין displayField – החזר את כולם
                        return $out;
                    }, $source['records'] ?? []),
                ]
            ]);

        } elseif ($action === 'get' && $id) {
            // קבלת מאגר בודד (כולל רשומות).
            // מדיניות גישה:
            //  - משתמשים מחוברים: גישה מלאה (כבעבר).
            //  - מבקרים אנונימיים (מילוי טופס ציבורי): גישה רק למאגרים
            //    המשמשים שדות 'record' בטופס מפורסם – אחרת השדות בטופס
            //    ייראו ריקים (401). בנוסף, אם ה-Session של הממלא תקין
            //    אך הוא אינו מנהל – נחזיר עותק מצומצם (displayField +
            //    valueField) כדי לצמצם חשיפה של שדות מיותרים.
            if (!isLoggedIn() && !isSourcePublicForAnonymous($id)) {
                requireLogin(); // מחזיר 401
            }
            $source = getSource($id);
            if (!$source) {
                sendResponse(['success' => false, 'error' => 'מאגר לא נמצא'], 404);
            }
            // החזר את המאגר המלא כולל רשומות
            // (עבור אנונימי – ללא שדות פנימיים רגישים כמו createdBy)
            if (!isLoggedIn()) {
                unset($source['createdBy']);
            }
            sendResponse(['success' => true, 'data' => $source]);
            
        } elseif ($action === 'search' && $id) {
            // חיפוש במאגר – התחברות או מאגר ציבורי (למילוי טופס אנונימי)
            if (!isLoggedIn() && !isSourcePublicForAnonymous($id)) {
                requireLogin(); // מחזיר 401
            }
            $query = $_GET['q'] ?? '';
            $limit = intval($_GET['limit'] ?? 20);
            $source = getSource($id);
            
            if (!$source || empty($source['records'])) {
                sendResponse(['success' => true, 'data' => []]);
            }
            
            $results = searchRecords($source['records'], $query, $limit);
            sendResponse(['success' => true, 'data' => $results]);

        } elseif ($action === 'export' && $id) {
            // ייצוא מאגר לקובץ CSV / Excel – דורש התחברות
            requireLogin();
            $source = getSource($id);
            if (!$source) {
                sendResponse(['success' => false, 'error' => 'מאגר לא נמצא'], 404);
            }
            $format = strtolower($_GET['format'] ?? 'csv');
            if (!in_array($format, ['csv', 'excel', 'xlsx'], true)) $format = 'csv';
            streamSourceExport($source, $format);
            exit();
        }
        break;

    case 'POST':
        requireLogin();
        validateCsrf();
        
        if ($action === 'create') {
            // יצירת מאגר חדש
            $input = getJSONInput();
            if (!$input) sendResponse(['success' => false, 'error' => 'נתונים לא תקינים'], 400);
            
            $source = [
                'id' => generateUUID(),
                'name' => $input['name'] ?? 'מאגר חדש',
                'description' => $input['description'] ?? '',
                'fields' => $input['fields'] ?? [],
                'records' => $input['records'] ?? [],
                'createdAt' => date('c'),
                'updatedAt' => date('c'),
                'recordCount' => count($input['records'] ?? [])
            ];
            
            if (saveSource($source)) {
                sendResponse(['success' => true, 'data' => $source], 201);
            } else {
                sendResponse(['success' => false, 'error' => 'שגיאה בשמירה'], 500);
            }
            
        } elseif ($action === 'import-csv') {
            // ייבוא מ-CSV
            if (!isset($_FILES['file'])) {
                sendResponse(['success' => false, 'error' => 'לא הועלה קובץ'], 400);
            }

            $file = $_FILES['file'];
            if ($file['error'] !== UPLOAD_ERR_OK) {
                $uploadErrors = [
                    UPLOAD_ERR_INI_SIZE   => 'הקובץ גדול ממכסת ההעלאה המותרת בשרת (upload_max_filesize)',
                    UPLOAD_ERR_FORM_SIZE  => 'הקובץ גדול מהמכסה בטופס',
                    UPLOAD_ERR_PARTIAL    => 'הקובץ הועלה חלקית – נסה שוב',
                    UPLOAD_ERR_NO_FILE    => 'לא נבחר קובץ',
                    UPLOAD_ERR_NO_TMP_DIR => 'שגיאת שרת: תיקיית זמנית חסרה',
                    UPLOAD_ERR_CANT_WRITE => 'שגיאת שרת: כתיבה לדיסק נכשלה',
                    UPLOAD_ERR_EXTENSION  => 'ההעלאה נבלמה על ידי תוסף PHP',
                ];
                sendResponse(['success' => false, 'error' => $uploadErrors[$file['error']] ?? 'שגיאה בהעלאת הקובץ'], 400);
            }

            // סינון סוג קובץ: CSV/טקסט בלבד
            $ext = strtolower(pathinfo($file['name'], PATHINFO_EXTENSION));
            $allowedExt = ['csv', 'txt'];
            $mimeOk = true;
            if (function_exists('finfo_open')) {
                $finfo = finfo_open(FILEINFO_MIME_TYPE);
                $mime = finfo_file($finfo, $file['tmp_name']);
                finfo_close($finfo);
                $mimeOk = in_array($mime, ['text/plain', 'text/csv', 'application/octet-stream', 'text/x-csv'], true)
                         || strpos($mime, 'text/') === 0;
            }
            if (!in_array($ext, $allowedExt, true) || !$mimeOk) {
                sendResponse(['success' => false, 'error' => 'נא להעלות קובץ CSV בלבד'], 400);
            }

            // הגבלת גודל (5MB) – גם אם השרת מאפשר יותר
            if ($file['size'] > 5 * 1024 * 1024) {
                sendResponse(['success' => false, 'error' => 'גודל הקובץ עולה על 5MB'], 400);
            }

            $csvData = parseCSV($file['tmp_name']);
            if (empty($csvData['headers'])) {
                sendResponse(['success' => false, 'error' => 'הקובץ ריק או שאינו מכיל שורת כותרות תקינה'], 400);
            }

            $source = [
                'id' => generateUUID(),
                'name' => $_POST['name'] ?? 'מאגר מיובא',
                'description' => $_POST['description'] ?? '',
                'fields' => $csvData['headers'],
                'records' => $csvData['records'],
                'createdAt' => date('c'),
                'updatedAt' => date('c'),
                'recordCount' => count($csvData['records']),
                'createdBy' => getCurrentUserId() ?: null,
            ];

            if (saveSource($source)) {
                sendResponse(['success' => true, 'data' => $source], 201);
            } else {
                error_log('sources.php import-csv: saveSource failed for ' . $source['id']);
                sendResponse(['success' => false, 'error' => 'שגיאה בשמירת המאגר – יש לבדוק הרשאות כתיבה לתיקיית הנתונים'], 500);
            }

        } elseif ($action === 'update' && $id) {
            // עדכון מאגר
            $input = getJSONInput();
            $existing = getSource($id);
            if (!$existing) sendResponse(['success' => false, 'error' => 'מאגר לא נמצא'], 404);
            
            $input['id'] = $id;
            $input['updatedAt'] = date('c');
            $input['createdAt'] = $existing['createdAt'];
            $input['recordCount'] = count($input['records'] ?? []);
            
            if (saveSource($input)) {
                sendResponse(['success' => true, 'data' => $input]);
            } else {
                sendResponse(['success' => false, 'error' => 'שגיאה בעדכון'], 500);
            }
            
        } elseif ($action === 'import-records') {
            // ייבוא רשומות למאגר קיים
            if (!isset($_FILES['file']) || !isset($_POST['sourceId'])) {
                sendResponse(['success' => false, 'error' => 'חסרים נתונים'], 400);
            }
            
            $sourceId = $_POST['sourceId'];
            $existing = getSource($sourceId);
            if (!$existing) {
                sendResponse(['success' => false, 'error' => 'מאגר לא נמצא'], 404);
            }
            
            $file = $_FILES['file'];
            if ($file['error'] !== UPLOAD_ERR_OK) {
                sendResponse(['success' => false, 'error' => 'שגיאה בהעלאה'], 400);
            }
            
            $csvData = parseCSV($file['tmp_name']);
            
            // מיזוג רשומות קיימות עם חדשות
            $existingRecords = $existing['records'] ?? [];
            $newRecords = $csvData['records'];
            $mergedRecords = array_merge($existingRecords, $newRecords);
            
            $existing['records'] = $mergedRecords;
            $existing['updatedAt'] = date('c');
            $existing['recordCount'] = count($mergedRecords);
            
            if (saveSource($existing)) {
                sendResponse([
                    'success' => true,
                    'imported' => count($newRecords),
                    'total' => count($mergedRecords)
                ]);
            } else {
                sendResponse(['success' => false, 'error' => 'שגיאה בשמירה'], 500);
            }
        }
        break;

    case 'DELETE':
        requireLogin();
        validateCsrf();
        if ($id) {
            if (deleteSource($id)) {
                sendResponse(['success' => true, 'message' => 'המאגר נמחק']);
            } else {
                sendResponse(['success' => false, 'error' => 'מאגר לא נמצא'], 404);
            }
        }
        break;

    default:
        sendResponse(['success' => false, 'error' => 'מתודה לא נתמכת'], 405);
}

// ===== Functions =====
function getAllSources() {
    $sources = [];
    $files = glob(SOURCES_DIR . '/*.json');
    foreach ($files as $file) {
        $source = readJSON($file);
        if ($source) {
            // לא להחזיר את כל הרשומות ברשימה
            unset($source['records']);
            $sources[] = $source;
        }
    }
    return $sources;
}

function getSource($id) {
    $filepath = SOURCES_DIR . '/' . sanitizeFilename($id) . '.json';
    return readJSON($filepath);
}

function saveSource($source) {
    $filepath = SOURCES_DIR . '/' . sanitizeFilename($source['id']) . '.json';
    return writeJSON($filepath, $source);
}

function deleteSource($id) {
    $filepath = SOURCES_DIR . '/' . sanitizeFilename($id) . '.json';
    if (file_exists($filepath)) {
        return unlink($filepath);
    }
    return false;
}

function parseCSV($filepath) {
    $handle = fopen($filepath, 'r');
    if (!$handle) return ['headers' => [], 'records' => []];

    // זיהוי והסרת BOM (תו נסתר ש-Excel מוסיף ל-CSV – גרם לכותרת "\ufeffערך / קוד")
    $peek = fread($handle, 3);
    if ($peek !== "\xEF\xBB\xBF") {
        rewind($handle);
    }

    // קריאת כותרות
    $headers = fgetcsv($handle, 0, ',');
    if (!$headers) {
        fclose($handle);
        return ['headers' => [], 'records' => []];
    }

    // ניקוי כותרות: הסרת BOM שיורי, trim ותיקון קידוד
    $cleanHeaders = [];
    foreach ($headers as $h) {
        $h = preg_replace('/^\xEF\xBB\xBF/', '', (string)$h);
        $h = str_replace("\xEF\xBB\xBF", '', $h);
        if (function_exists('mb_convert_encoding')) {
            $conv = @mb_convert_encoding($h, 'UTF-8', 'UTF-8');
            if ($conv !== false) $h = $conv;
        }
        $cleanHeaders[] = trim($h);
    }
    // מניעת כותרות ריקות/כפולות (מפתחות לא תקינים ב-JSON)
    $seen = [];
    $headers = [];
    foreach ($cleanHeaders as $i => $h) {
        if ($h === '') $h = 'שדה_' . ($i + 1);
        if (isset($seen[$h])) { $seen[$h]++; $h .= '_' . $seen[$h]; }
        else $seen[$h] = 1;
        $headers[] = $h;
    }

    // קריאת רשומות
    $records = [];
    while (($row = fgetcsv($handle, 0, ',')) !== false) {
        // דילוג על שורות ריקות לגמרי
        if (count($row) === 1 && ($row[0] === null || trim((string)$row[0]) === '')) continue;
        // התאמת אורך השורה לכותרות גם אם חסרות/עודפות עמודות
        if (count($row) < count($headers)) $row = array_pad($row, count($headers), '');
        elseif (count($row) > count($headers)) $row = array_slice($row, 0, count($headers));
        $record = [];
        foreach ($headers as $i => $header) {
            $val = str_replace("\xEF\xBB\xBF", '', (string)$row[$i]);
            $record[$header] = trim($val);
        }
        $records[] = $record;
    }

    fclose($handle);
    return ['headers' => $headers, 'records' => $records];
}

/**
 * ייצוא מאגר – CSV ו-Excel.
 * פורמט 'excel' מייצר קובץ SpreadsheetML (XML) שנפתח ישירות ב-Excel/ LibreOffice
 * עם תמיכה מלאה ב-UTF-8 (כולל עברית) – ללא צורך בספריות חיצוניות כמו PhpSpreadsheet.
 */
function streamSourceExport($source, $format) {
    $fields = $source['fields'] ?? [];
    $records = $source['records'] ?? [];
    $baseName = preg_replace('/[^\p{Hebrew}\p{L}\p{N}_-]+/u', '_', (string)($source['name'] ?? 'source')) ?: 'source';

    // ניקוי כל תווי הבקרה הלא-הדירים מהנתונים (מונע שגיאות XML ומזריקות CSV)
    $cleanVal = function ($v) {
        $v = (string)$v;
        $v = preg_replace('/[\x00-\x08\x0B\x0C\x0E-\x1F]/u', '', $v);
        return $v;
    };

    if ($format === 'csv') {
        $filename = $baseName . '.csv';
        fbSetContentType('text/csv; charset=UTF-8'); // מונע דריסה ע"י כותרת JSON גנרית
        header('Content-Disposition: attachment; filename="' . $filename . '"');

        $out = fopen('php://output', 'w');
        fwrite($out, "\xEF\xBB\xBF"); // BOM – כדי ש-Excel יזהה UTF-8 ויציג עברית תקין
        fputcsv($out, $fields);
        foreach ($records as $record) {
            $row = [];
            foreach ($fields as $f) {
                $val = $cleanVal($record[$f] ?? '');
                // מניעת Formula Injection בתאי CSV
                if ($val !== '' && strpos('=+-@', $val[0]) !== false) $val = "'" . $val;
                $row[] = $val;
            }
            fputcsv($out, $row);
        }
        fclose($out);
        return;
    }

    // ===== Excel (SpreadsheetML 2003) – נפתח ב-Excel ללא גרירת עמודות =====
    $filename = $baseName . '.xls';
    fbSetContentType('application/vnd.ms-excel; charset=UTF-8'); // מונע דריסה ע"י כותרת JSON גנרית
    header('Content-Disposition: attachment; filename="' . $filename . '"');

    $xmlEsc = function ($s) use ($cleanVal) {
        return htmlspecialchars($cleanVal($s), ENT_QUOTES | ENT_XML1, 'UTF-8');
    };

    $xml  = '<?xml version="1.0" encoding="UTF-8"?>' . "\n";
    $xml .= '<?mso-application progid="Excel.Sheet"?>' . "\n";
    $xml .= '<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"'
          . ' xmlns:o="urn:schemas-microsoft-com:office:office"'
          . ' xmlns:x="urn:schemas-microsoft-com:office:excel"'
          . ' xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">' . "\n";
    $xml .= '<Styles><Style ss:ID="hdr"><Font ss:Bold="1"/><Interior ss:Color="#DDEBF7" ss:Pattern="Solid"/></Style></Styles>' . "\n";
    $sheetName = function_exists('mb_substr')
        ? mb_substr((string)($source['name'] ?? 'Data'), 0, 30)
        : substr((string)($source['name'] ?? 'Data'), 0, 30);
    // שם גיליון ב-Excel לא יכול להכיל את התווים : \ / ? * [ ]
    $sheetName = preg_replace('/[:\\\\\/\?\*\[\]]/u', '_', $sheetName);
    $xml .= '<Worksheet ss:Name="' . $xmlEsc($sheetName) . '"><Table>' . "\n";

    // שורת כותרות
    $xml .= '<Row>';
    foreach ($fields as $f) {
        $xml .= '<Cell ss:StyleID="hdr"><Data ss:Type="String">' . $xmlEsc($f) . '</Data></Cell>';
    }
    $xml .= '</Row>' . "\n";

    // שורות נתונים
    foreach ($records as $record) {
        $xml .= '<Row>';
        foreach ($fields as $f) {
            $val = $cleanVal($record[$f] ?? '');
            // מספרים טהורים (כולל שליליים/עשרוניים) יוצאו כתאים – Excel יכיר אותם כמספר
            if ($val !== '' && preg_match('/^-?\d+(\.\d+)?$/', $val)) {
                $xml .= '<Cell><Data ss:Type="Number">' . $val . '</Data></Cell>';
            } else {
                $xml .= '<Cell><Data ss:Type="String">' . $xmlEsc($val) . '</Data></Cell>';
            }
        }
        $xml .= '</Row>' . "\n";
    }

    $xml .= '</Table></Worksheet></Workbook>';
    echo $xml;
}

function searchRecords($records, $query, $limit) {
    if (empty($query)) return array_slice($records, 0, $limit);
    
    $query = mb_strtolower($query);
    $results = [];
    
    foreach ($records as $record) {
        foreach ($record as $value) {
            if (mb_strpos(mb_strtolower($value), $query) !== false) {
                $results[] = $record;
                break;
            }
        }
        if (count($results) >= $limit) break;
    }
    
    return $results;
}
