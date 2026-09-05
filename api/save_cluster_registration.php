<?php
require_once __DIR__ . '/config.php';
apply_security_headers_and_cors();

ini_set('display_errors', 0);
error_reporting(0);
if (ob_get_level()) { ob_end_clean(); }
ob_start();

try {
    $rawInput = file_get_contents('php://input');
    $input = json_decode($rawInput, true);

    if (!$input) {
        throw new Exception('נתונים לא תקינים או ריקים');
    }

    $registrationsFile = __DIR__ . '/../data/cluster_registrations.json';
    
    // טעינת רישומים קיימים
    $existingRegistrations = [];
    if (file_exists($registrationsFile)) {
        $existingRegistrations = json_decode(file_get_contents($registrationsFile), true) ?: [];
    }

    // הוספת הרישום החדש
    $input['id'] = $input['id'] ?? ('cluster_reg_' . time());
    $input['createdAt'] = $input['createdAt'] ?? date('c');
    $input['status'] = $input['status'] ?? 'pending';
    $existingRegistrations[] = $input;

    // וידוא שהתיקייה data/ קיימת
    $dataDir = dirname($registrationsFile);
    if (!is_dir($dataDir)) {
        if (!mkdir($dataDir, 0755, true)) {
            throw new Exception('שגיאה: לא ניתן ליצור את תיקיית הנתונים.');
        }
    }

    // שמירה לקובץ עם נעילה
    if (file_put_contents($registrationsFile, json_encode($existingRegistrations, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE), LOCK_EX) === false) {
        throw new Exception('فشل في حفظ التسجيل. تحقق من صلاحيات المجلد.');
    }

    ob_end_clean();
    echo json_encode([
        'success' => true,
        'message' => 'تم حفظ التسجيل بنجاح'
    ]);
    exit;

} catch (Exception $e) {
    ob_end_clean();
    error_log("Cluster Registration Error: " . $e->getMessage());
    
    echo json_encode([
        'success' => false,
        'message' => $e->getMessage()
    ]);
    exit;
}
?>