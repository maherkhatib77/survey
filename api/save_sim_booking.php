<?php
// 1. הגדרות כותרות ומניעת פלט שגיאות שישברו את ה-JSON
require_once __DIR__ . '/config.php';
apply_security_headers_and_cors();

ini_set('display_errors', 0);
error_reporting(0);
if (ob_get_level()) { ob_end_clean(); }
ob_start();

// 2. ייבוא ספריית PHPMailer (חייב להיות בתחילת הקובץ, לפני כל לוגיקה!)
use PHPMailer\PHPMailer\PHPMailer;
use PHPMailer\PHPMailer\SMTP;
use PHPMailer\PHPMailer\Exception;

$phpMailerPath = __DIR__ . '/PHPMailer/PHPMailer.php';
if (file_exists($phpMailerPath)) {
    require_once __DIR__ . '/PHPMailer/Exception.php';
    require_once $phpMailerPath;
    require_once __DIR__ . '/PHPMailer/SMTP.php';
}

// 3. לוגיקה ראשית עטופה ב-try...catch להבטחת החזרת JSON תמיד
try {
    $rawInput = file_get_contents('php://input');
    $input = json_decode($rawInput, true);

    if (!$input) {
        throw new Exception('נתונים לא תקינים או ריקים');
    }

    $meetingDate = $input['meetingDate'] ?? '';
    $bookingsFile = __DIR__ . '/../data/workshop_sim_bookings.json';
    
    // טעינת הזמנות קיימות
    $existingBookings = [];
    if (file_exists($bookingsFile)) {
        $existingBookings = json_decode(file_get_contents($bookingsFile), true) ?: [];
    }

    // בדיקת התנגשות תאריכים (רק אם הסטטוס הוא pending או approved)
    foreach ($existingBookings as $booking) {
        if (($booking['meetingDate'] ?? '') === $meetingDate) {
            $status = strtolower($booking['status'] ?? 'pending');
            if ($status === 'pending' || $status === 'approved') {
                throw new Exception('عذراً، هذا التاريخ محجوز بالفعل. يرجى اختيار تاريخ آخر.');
            }
        }
    }

    // שמירת ההזמנה החדשה
    $input['id'] = $input['id'] ?? ('sim_booking_' . time());
    $input['createdAt'] = $input['createdAt'] ?? date('c');
    $input['status'] = $input['status'] ?? 'pending';
    $existingBookings[] = $input;

    // וידוא שהתיקייה data/ קיימת וניתנת לכתיבה
    $dataDir = dirname($bookingsFile);
    if (!is_dir($dataDir)) {
        if (!mkdir($dataDir, 0755, true)) {
            throw new Exception('ش خطأ في الخادم: لا يمكن إنشاء مجلد البيانات.');
        }
    }

    if (file_put_contents($bookingsFile, json_encode($existingBookings, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE), LOCK_EX) === false) {
        throw new Exception('فشل في حفظ الحجز. تحقق من صلاحيات المجلد.');
    }

    // ==========================================
    // 4. לוגיקת שליחת מיילים (עטופה ב-try משלה כדי לא להפיל את השמירה אם המייל נכשל)
    // ==========================================
    $emailStatus = ['manager' => false, 'user' => false, 'error' => ''];
    
    if (file_exists($phpMailerPath)) {
        try {
            // קריאת מייל המנהל מהגדרות הסימולציה
            $settingsFile = __DIR__ . '/../data/workshop_sim_settings.json';
            $managerEmail = 'register@ejpisga.org.il'; // ברירת מחדל
            $managerName = 'الإدارة';
            
            if (file_exists($settingsFile)) {
                $settings = json_decode(file_get_contents($settingsFile), true);
                if (is_array($settings) && isset($settings[0]['responsible']['email']) && !empty(trim($settings[0]['responsible']['email']))) {
                    $managerEmail = trim($settings[0]['responsible']['email']);
                    $managerName = trim($settings[0]['responsible']['name'] ?? 'الإدارة');
                }
            }

            $smtpConfig = get_smtp_config();
            $mail = new PHPMailer(true);
            $mail->isSMTP();
            $mail->Host = $smtpConfig['host'];
            $mail->SMTPAuth = true;
            $mail->Username = $smtpConfig['username'];
            $mail->Password = $smtpConfig['password'];
            $mail->SMTPSecure = PHPMailer::ENCRYPTION_SMTPS;
            $mail->Port = $smtpConfig['port'];
            $mail->CharSet = 'UTF-8';
            $mail->setFrom($smtpConfig['from_email'], 'مركز تطوير طواقم التربية والتعليم');
            $mail->isHTML(false);

            // א. שליחת מייל למנהל האחראי
            if (!empty($managerEmail) && filter_var($managerEmail, FILTER_VALIDATE_EMAIL)) {
                $mail->clearAddresses();
                $mail->addAddress($managerEmail, $managerName);
                $mail->Subject = "🎭 حجز ورشة محاكاة جديد: " . ($input['workshopName'] ?? '') . " - " . ($input['schoolName'] ?? '');
                $mail->Body = "تفاصيل الحجز الجديد:\n\n" .
                              "🏫 المدرسة: " . ($input['schoolName'] ?? '') . "\n" .
                              "👤 جهة الاتصال: " . ($input['contactPerson'] ?? '') . "\n" .
                              "📱 الهاتف: " . ($input['mobile'] ?? '') . "\n" .
                              "📧 البريد: " . ($input['contactEmail'] ?? 'غير متوفر') . "\n" .
                              "📚 الورشة: " . ($input['workshopName'] ?? '') . "\n" .
                              "👥 المشاركون: " . ($input['participantsCount'] ?? '0') . "\n" .
                              "📅 التاريخ: {$meetingDate}\n" .
                              "⏰ الوقت: " . ($input['startTime'] ?? '') . " - " . ($input['endTime'] ?? '') . "\n\n" .
                              "مع التحية،\nنظام بوصلة نت";
                
                if ($mail->send()) {
                    $emailStatus['manager'] = true;
                }
            }

            // ב. שליחת מייל אסמכתה למזמין (אם הוזן אימייל תקין)
            $contactEmail = $input['contactEmail'] ?? '';
            if (!empty($contactEmail) && filter_var($contactEmail, FILTER_VALIDATE_EMAIL)) {
                $mail->clearAddresses();
                $mail->addAddress($contactEmail, $input['contactPerson'] ?? 'العزيز');
                $mail->Subject = "✅ تأكيد استلام طلب حجز ورشة محاكاة";
                $mail->Body = "مرحباً " . ($input['contactPerson'] ?? '') . ",\n\n" .
                              "تم استلام طلبك بنجاح وهو قيد المراجعة:\n\n" .
                              "📅 التاريخ: {$meetingDate}\n" .
                              "⏰ الوقت: " . ($input['startTime'] ?? '') . " - " . ($input['endTime'] ?? '') . "\n" .
                              "👥 المشاركون: " . ($input['participantsCount'] ?? '0') . "\n\n" .
                              "سنتواصل معك قريباً للتأكيد النهائي.\n\nمع التحية،\nفريق بوصلة نت 🧭";
                
                if ($mail->send()) {
                    $emailStatus['user'] = true;
                }
            }
        } catch (Exception $e) {
            $emailStatus['error'] = $e->getMessage();
            error_log("Sim Booking Email Error: " . $e->getMessage());
        } catch (\Exception $e) {
            $emailStatus['error'] = $e->getMessage();
            error_log("Sim Booking Email Error: " . $e->getMessage());
        }
    } else {
        $emailStatus['error'] = 'مكتبة PHPMailer غير موجودة';
    }

    // 5. החזרת תגובת הצלחה (מובטח שזה הדבר היחיד שיצא לדפדפן)
    ob_end_clean();
    echo json_encode([
        'success' => true,
        'message' => 'تم استلام الطلب بنجاح',
        'emailStatus' => $emailStatus
    ]);
    exit;

} catch (Exception $e) {
    // 6. החזרת תגובת שגיאה חסינה (גם כאן מובטח JSON נקי, ללא HTML)
    ob_end_clean();
    error_log("Sim Booking Critical Error: " . $e->getMessage());
    
    echo json_encode([
        'success' => false,
        'message' => $e->getMessage()
    ]);
    exit;
}
?>