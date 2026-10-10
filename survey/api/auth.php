<?php
/**
 * Auth API - ניהול התחברות + CSRF Token + שחזור סיסמה
 */
require_once 'config.php';
csrfBootstrap(); // הבטחת Cookie CSRF כבר בהזמנה הראשונה (לפני כל חריגה)

// ייבוא קונפיגורציית SMTP המרכזית של מצפן נט (לשליחת מייל איפוס)
if (is_readable(__DIR__ . '/../../api/config.php')) {
    require_once __DIR__ . '/../../api/config.php'; // מגדיר get_smtp_config() – ללא פלט צדדי
}

// ===== הגדרת מתודה/פעולה =====
$method = $_SERVER['REQUEST_METHOD'];
$action = isset($_GET['action']) ? $_GET['action'] : '';

// רשימת פעולות POST ציבוריות שנמצאות מחוץ להגנת ה-Session.
// ההגנה עליהן: כותרת X-CSRF-Token (Double Submit) + SameSite=Lax על Cookie ה-CSRF.
$publicPostActions = ['login', 'forgot-password', 'reset-password'];

if ($method === 'POST' && !in_array($action, $publicPostActions, true)) {
    validateCsrf(); // logout ו-change-password – דורשים טוקן תקין
}

switch ($method) {
    case 'POST':
        $input = getJSONInput();

        // logout לא דורש input
        if ($action === 'logout') {
            sendResponse(logoutUser());
            break;
        }

        // בקשת קישור איפוס סיסמה – ציבורי, ללא צורך ב-token מראש?
        // נדרש token CSRF גם כאן (מתקבל מ-cookie בהזמנה) – מוגן מפני POST זדוני cross-site
        if ($action === 'forgot-password') {
            if (!$input) sendResponse(['success' => false, 'error' => 'נתונים לא תקינים'], 400);
            $identifier = trim($input['identifier'] ?? '');
            $username   = trim($input['username'] ?? '');
            $email      = strtolower(trim($input['email'] ?? ''));
            if (empty($identifier) && empty($username)) {
                sendResponse(['success' => false, 'error' => 'יש להזין שם משתמש או כתובת אימייל'], 400);
            }

            // מצב עיקרי: אימות לפי שם משתמש + דוא"ל הרשום במערכת (שניהם חייבים להתאים לאותו חשבון)
            $result = null;
            if ($username !== '' && $email !== '') {
                $users = getUsers();
                $matchedUser = null;
                foreach ($users as $u) {
                    $isActive = ($u['isActive'] ?? true) !== false;
                    if (!$isActive) continue;
                    if (isset($u['username']) && strcasecmp($u['username'], $username) === 0
                        && isset($u['email']) && strcasecmp(trim($u['email']), $email) === 0) {
                        $matchedUser = $u;
                        break;
                    }
                }
                // תמיד תשובה גנרית – אין חשיפה האם החשבון/אימייל קיימים
                $generic = ['success' => true, 'message' => 'אם הפרטים תואמים לחשבון רשום, נשלח קישור לאיפוס הסיסמה לכתובת הדוא"ל הרשומה.'];
                if ($matchedUser && !empty($matchedUser['username'])) {
                    $result = requestPasswordReset($matchedUser['username']);
                    if (isset($result['success']) && $result['success'] === false && strpos($result['error'] ?? '', 'יותר מדי') !== false) {
                        sendResponse($result, 429); // rate limit אכן חל
                    }
                } else {
                    usleep(300000); // השהיה קלה למניעת timing attack
                    $result = $generic;
                }
            } elseif ($email !== '') {
                // אימות לפי דוא"ל בלבד (מזהה את בעל החשבון ע"י כתובתו הרשומה)
                $generic = ['success' => true, 'message' => 'אם הפרטים תואמים לחשבון רשום, נשלח קישור לאיפוס הסיסמה לכתובת הדוא"ל הרשומה.'];
                $matchedUser = findUserByEmail($email);
                if ($matchedUser && ($matchedUser['active'] ?? true) !== false && !empty($matchedUser['username'])) {
                    $result = requestPasswordReset($matchedUser['username']);
                    if (isset($result['success']) && $result['success'] === false && strpos($result['error'] ?? '', 'יותר מדי') !== false) {
                        sendResponse($result, 429);
                    }
                } else {
                    usleep(300000);
                    $result = $generic;
                }
            } else {
                $result = requestPasswordReset($identifier !== '' ? $identifier : $username);
            }
            sendResponse($result, (isset($result['success']) && $result['success']) ? 200 : 429);
        }

        // השלמת איפוס סיסמה באמצעות טוקן – ציבורי
        if ($action === 'reset-password') {
            if (!$input) sendResponse(['success' => false, 'error' => 'נתונים לא תקינים'], 400);
            $token = $input['token'] ?? '';
            $newPassword = $input['newPassword'] ?? '';
            if (empty($token) || empty($newPassword)) {
                sendResponse(['success' => false, 'error' => 'חסר טוקן או סיסמא חדשה'], 400);
            }
            $result = completePasswordReset($token, $newPassword);
            sendResponse($result, $result['success'] ? 200 : 400);
        }

        if (!$input) sendResponse(['success' => false, 'error' => 'נתונים לא תקינים'], 400);

        if ($action === 'login') {
            $username = $input['username'] ?? '';
            $password = $input['password'] ?? '';

            if (empty($username) || empty($password)) {
                sendResponse(['success' => false, 'error' => 'יש להזין שם משתמש וסיסמא'], 400);
            }

            $result = loginUser($username, $password);
            sendResponse($result, $result['success'] ? 200 : 401);

        } elseif ($action === 'logout') {
            sendResponse(logoutUser());

        } elseif ($action === 'change-password') {
            requireLogin();
            $oldPass = $input['oldPassword'] ?? '';
            $newPass = $input['newPassword'] ?? '';

            if (empty($oldPass) || empty($newPass)) {
                sendResponse(['success' => false, 'error' => 'יש להזין סיסמא ישנה וחדשה'], 400);
            }
            if (strlen($newPass) < 8) {
                sendResponse(['success' => false, 'error' => 'הסיסמא החדשה חייבת להכיל לפחות 8 תווים'], 400);
            }

            sendResponse(changePassword($oldPass, $newPass));
        }
        break;

    case 'GET':
        if ($action === 'check') {
            // החזרת פרטי משתמש + הודעה אם זו התקנה עם סיסמת ברירת מחדל
            $needsPasswordChange = false;
            if (isLoggedIn()) {
                $u = getCurrentUser();
                if ($u && $u['username'] === DEFAULT_ADMIN_USER && !IS_LOCALHOST) {
                    $needsPasswordChange = !empty($u['defaultPassword']);
                }
            }
            sendResponse([
                'success' => true,
                'loggedIn' => isLoggedIn(),
                'username' => $_SESSION['username'] ?? null,
                'role' => $_SESSION['role'] ?? null,
                'needsPasswordChange' => $needsPasswordChange
            ]);

        } elseif ($action === 'csrf-token') {
            // חלוקת Token הגנת CSRF (נקרא בדפי הניהול וההתחברות)
            sendResponse(['success' => true, 'token' => getCsrfToken()]);

        } elseif ($action === 'validate-reset-token') {
            $token = $_GET['token'] ?? '';
            $valid = $token !== '' && validateResetToken($token) !== null;
            sendResponse(['success' => true, 'valid' => $valid]);

        } elseif ($action === 'dev-reset-link') {
            // מוגבל לסביבת פיתוח מקומית בלבד (localhost).
            // משמש כ"דלת אחורית מבוקרת" כאשר SMTP אינו מוגדר והמיילים נרשמים ל-mail_outbox.json –
            // המנהל יכול לקבל קישור איפוס ישירות בדפדפן עבור חשבון שהוכח בעלות על הדוא"ל שלו.
            if (!IS_LOCALHOST) {
                sendResponse(['success' => false, 'error' => 'פעולה זמינה בסביבת פיתוח מקומית בלבד'], 403);
            }
            $email = strtolower(trim($_GET['email'] ?? ''));
            $user = findUserByEmail($email);
            if (!$user || ($user['active'] ?? true) === false) {
                sendResponse(['success' => false, 'error' => 'לא נמצא חשבון פעיל עם כתובת דוא"ל זו'], 404);
            }
            $token = createPasswordResetToken($user);
            sendResponse(['success' => true, 'resetLink' => buildResetLink($token)]);
        }
        break;

    default:
        sendResponse(['success' => false, 'error' => 'מתודה לא נתמכת'], 405);
}
