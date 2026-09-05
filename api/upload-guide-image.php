<?php
require_once __DIR__ . '/config.php';
apply_security_headers_and_cors();

// קריאת הנתונים שנשלחו מהדפדפן
$input = json_decode(file_get_contents('php://input'), true);
$imageData = isset($input['image']) ? $input['image'] : '';
$guideId = isset($input['guideId']) ? preg_replace('/[^a-z0-9_]/i', '', $input['guideId']) : 'new';
$type = isset($input['type']) ? $input['type'] : 'main';

// בדיקה שהתמונה תקינה
if (empty($imageData) || !preg_match('/^data:image\/(png|jpeg|jpg);base64,/', $imageData, $imgType)) {
    echo json_encode(['success' => false, 'error' => 'נתוני תמונה לא תקינים']);
    exit;
}

// חילוץ ה-Base64 נטו וסיומת הקובץ
$imageData = substr($imageData, strpos($imageData, ',') + 1);
$ext = ($imgType[1] === 'jpeg') ? 'jpg' : $imgType[1];

// הגדרת נתיב התיקייה הייעודית
$uploadDir = __DIR__ . '/../uploads/guides/';

// יצירת התיקייה אם היא לא קיימת
if (!is_dir($uploadDir)) {
    if (!mkdir($uploadDir, 0755, true)) {
        echo json_encode(['success' => false, 'error' => 'המערכת לא הצליחה ליצור את תיקיית uploads/guides. בדוק הרשאות.']);
        exit;
    }
}

// יצירת שם קובץ ייחודי
$filename = 'guide_' . $guideId . '_' . $type . '_' . time() . '.' . $ext;
$filepath = $uploadDir . $filename;

// שמירת הקובץ בשרת
if (file_put_contents($filepath, base64_decode($imageData))) {
    // החזרת הנתיב היחסי כדי שהדפדפן יוכל להציג אותו
    $url = 'uploads/guides/' . $filename;
    echo json_encode(['success' => true, 'url' => $url]);
} else {
    echo json_encode(['success' => false, 'error' => 'שגיאה בשמירת הקובץ בשרת. בדוק הרשאות כתיבה לתיקייה.']);
}
?>