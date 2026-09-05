<?php
require_once __DIR__ . '/config.php';
apply_security_headers_and_cors();

// 1. קריאת הנתונים שנשלחו מהטופס
$input = file_get_contents('php://input');
$data = json_decode($input, true);

if (!$data || empty($data['fullName']) || empty($data['phone'])) {
    echo json_encode(['success' => false, 'message' => 'נתונים לא תקינים או חסרים']);
    exit;
}

// 2. נתיב לקובץ ה-JSON
$filePath = __DIR__ . '/../data/registrations.json';

// 3. קריאת הנתונים הקיימים או יצירת מערך ריק
$currentData = [];
if (file_exists($filePath)) {
    $jsonContent = file_get_contents($filePath);
    $currentData = json_decode($jsonContent, true);
    if (!is_array($currentData)) {
        $currentData = [];
    }
}

// 4. הוספת הרשומה החדשה
$data['id'] = $data['id'] ?? ('reg_' . time());
$data['createdAt'] = $data['createdAt'] ?? date('c');
$currentData[] = $data;

// 5. שמירה חזרה לקובץ עם קידוד UTF-8 לתמיכה בעברית/ערבית ונעילת קובץ
$saveResult = file_put_contents($filePath, json_encode($currentData, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE), LOCK_EX);

if ($saveResult !== false) {
    echo json_encode(['success' => true, 'message' => 'הרישום נשמר בהצלחה']);
} else {
    echo json_encode(['success' => false, 'message' => 'שגיאה בשמירה לקובץ. בדוק הרשאות תיקייה.']);
}
?>