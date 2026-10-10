<?php
/**
 * Data Sources API - ניהול מאגרי נתונים
 */
require_once 'config.php';
csrfBootstrap();

define('SOURCES_DIR', DATA_DIR . '/sources');

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
            
        } elseif ($action === 'get' && $id) {
            // קבלת מאגר בודד (כולל רשומות) – דורש התחברות: UUID אינו אמצעי אבטחה
            requireLogin();
            $source = getSource($id);
            if (!$source) {
                sendResponse(['success' => false, 'error' => 'מאגר לא נמצא'], 404);
            }
            // החזר את המאגר המלא כולל רשומות
            sendResponse(['success' => true, 'data' => $source]);
            
        } elseif ($action === 'search' && $id) {
            // חיפוש במאגר – דורש התחברות (מניעת דליפת רשומות)
            requireLogin();
            $query = $_GET['q'] ?? '';
            $limit = intval($_GET['limit'] ?? 20);
            $source = getSource($id);
            
            if (!$source || empty($source['records'])) {
                sendResponse(['success' => true, 'data' => []]);
            }
            
            $results = searchRecords($source['records'], $query, $limit);
            sendResponse(['success' => true, 'data' => $results]);
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
    
    // קריאת כותרות
    $headers = fgetcsv($handle, 0, ',');
    if (!$headers) {
        fclose($handle);
        return ['headers' => [], 'records' => []];
    }
    
    // ניקוי כותרות
    $headers = array_map(function($h) {
        return trim(mb_convert_encoding($h, 'UTF-8', 'UTF-8'));
    }, $headers);
    
    // קריאת רשומות
    $records = [];
    while (($row = fgetcsv($handle, 0, ',')) !== false) {
        if (count($row) === count($headers)) {
            $record = [];
            foreach ($headers as $i => $header) {
                $record[$header] = trim($row[$i]);
            }
            $records[] = $record;
        }
    }
    
    fclose($handle);
    return ['headers' => $headers, 'records' => $records];
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
