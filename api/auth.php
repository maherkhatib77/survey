<?php
/**
 * api/auth.php – Secure Server-Side Authentication & Session Management
 * + Password Recovery (שכחתי סיסמה / איפוס סיסמה)
 */

require_once __DIR__ . '/helpers.php';
apply_security_headers_and_cors();

// Start secure session
if (session_status() === PHP_SESSION_NONE) {
    ini_set('session.cookie_httponly', 1);
    ini_set('session.use_only_cookies', 1);
    session_start();
}

$rawInput = file_get_contents('php://input');
$input = json_decode($rawInput, true) ?? [];
$action = $_GET['action'] ?? ($input['action'] ?? 'check');

$usersPath = USERS_JSON_PATH;

// 1. ACTION: LOGIN
if ($action === 'login') {
    $username = trim($input['username'] ?? '');
    $password = (string)($input['password'] ?? '');

    if (empty($username) || $password === '') {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'נא להזין שם משתמש וסיסמה']);
        exit;
    }

    // Brute-force protection
    $lock = is_login_locked($username);
    if ($lock['locked']) {
        http_response_code(429);
        echo json_encode([
            'success' => false,
            'locked' => true,
            'retry_after' => $lock['retry_after'],
            'message' => 'מספר ניסיונות החיבור גדול מדי. נא לנסות שוב בעוד ' . $lock['retry_after'] . ' שניות.'
        ]);
        exit;
    }

    $users = get_all_users($usersPath);
    $matchedUser = null;

    foreach ($users as $idx => $u) {
        if (isset($u['username']) && hash_equals((string)$u['username'], $username) && ($u['isActive'] ?? true) !== false) {
            list($isValid, $needsUpgrade) = verify_user_password($password, $u['password'] ?? '');
            if ($isValid) {
                if ($needsUpgrade) {
                    $users[$idx]['password'] = function_exists('password_hash')
                        ? password_hash($password, PASSWORD_BCRYPT)
                        : fallback_password_hash($password);
                    save_all_users($users, $usersPath);
                }
                $matchedUser = $users[$idx];
                break;
            }
        }
    }

    if (!$matchedUser) {
        record_failed_login($username);
        http_response_code(401);
        echo json_encode(['success' => false, 'message' => GENERIC_LOGIN_ERROR]);
        exit;
    }

    clear_login_attempts($username);

    // Set server session
    $_SESSION['userId'] = $matchedUser['id'];
    $_SESSION['username'] = $matchedUser['username'];
    $_SESSION['role'] = $matchedUser['role'] ?? 'guide';
    $_SESSION['fullName'] = $matchedUser['fullName'] ?? '';

    $sessionData = [
        'userId'    => $matchedUser['id'],
        'username'  => $matchedUser['username'],
        'fullName'  => $matchedUser['fullName'] ?? '',
        'role'      => $matchedUser['role'] ?? 'guide',
        'loginTime' => date('c')
    ];

    echo json_encode([
        'success' => true,
        'user'    => sanitize_user($matchedUser),
        'session' => $sessionData
    ]);
    exit;
}

// 2. ACTION: CHECK SESSION
if ($action === 'check') {
    if (!empty($_SESSION['userId'])) {
        $users = get_all_users($usersPath);
        foreach ($users as $u) {
            if ($u['id'] === $_SESSION['userId'] && ($u['isActive'] ?? true) !== false) {
                echo json_encode([
                    'success' => true,
                    'user'    => sanitize_user($u),
                    'session' => [
                        'userId'   => $u['id'],
                        'username' => $u['username'],
                        'fullName' => $u['fullName'] ?? '',
                        'role'     => $u['role'] ?? 'guide'
                    ]
                ]);
                exit;
            }
        }
    }

    echo json_encode(['success' => false, 'user' => null]);
    exit;
}

// 3. ACTION: LOGOUT
if ($action === 'logout') {
    destroy_server_session();
    echo json_encode(['success' => true, 'message' => 'Logged out successfully']);
    exit;
}

// ============================================================================
// 4. PASSWORD RECOVERY – "שכחתי סיסמה"
// ============================================================================

const RESET_TOKEN_TTL = 3600; // שעה אחת

/**
 * האם PHPMailer זמין? (לשליחת מייל אמיתית)
 */
function _mailer_available() {
    return file_exists(__DIR__ . '/PHPMailer/PHPMailer.php')
        && function_exists('get_smtp_config');
}

/**
 * שליחת מייל באמצעות PHPMailer (אם זמין) או mail() כגיבוי.
 * @return bool האם השליחה בוצעה
 */
function send_recovery_email($toEmail, $toName, $resetLink) {
    $subject = 'איפוס סיסמה - מצפן נט';
    $body = "שלום {$toName},\n\n"
          . "התקבלה בקשה לאיפוס הסיסמה לחשבונך במערכת מצפן נט.\n\n"
          . "לחיצה על הקישור הבא תאפשר להגדיר סיסמה חדשה (תוקף הקישור: שעה אחת):\n"
          . $resetLink . "\n\n"
          . "אם לא ביקשת איפוס סיסמה - ניתן להתעלם מהודעה זו.\n";

    if (_mailer_available()) {
        try {
            require_once __DIR__ . '/PHPMailer/PHPMailer.php';
            require_once __DIR__ . '/PHPMailer/SMTP.php';
            require_once __DIR__ . '/PHPMailer/Exception.php';

            $smtp = get_smtp_config();
            $mail = new \PHPMailer\PHPMailer\PHPMailer(true);
            $mail->isSMTP();
            $mail->Host       = $smtp['host'];
            $mail->Port       = $smtp['port'];
            $mail->SMTPAuth   = true;
            $mail->Username   = $smtp['username'];
            $mail->Password   = $smtp['password'];
            $mail->SMTPSecure = \PHPMailer\PHPMailer\PHPMailer::ENCRYPTION_SMTPS;
            $mail->CharSet    = 'UTF-8';
            $mail->setFrom($smtp['from_email'], $smtp['from_name']);
            $mail->addAddress($toEmail, $toName);
            $mail->isHTML(false);
            $mail->Subject = $subject;
            $mail->Body    = $body;
            return $mail->send();
        } catch (\Throwable $e) {
            error_log('[auth.php] PHPMailer failed: ' . $e->getMessage());
            // fallback to mail()
        }
    }

    $smtpCfg = get_smtp_config();
    $headers = 'From: ' . $smtpCfg['from_email'] . "\r\n"
             . 'Content-Type: text/plain; charset=UTF-8' . "\r\n";
    return @mail($toEmail, '=?UTF-8?B?' . base64_encode($subject) . '?=', $body, $headers);
}

// 4a. ACTION: FORGOT_PASSWORD – יצירת טוקן ושליחת קישור
if ($action === 'forgot_password') {
    $username = trim((string)($input['username'] ?? ''));
    $email    = strtolower(trim((string)($input['email'] ?? '')));
    // תמיכה אחורנית גם במזהה יחיד (identifier)
    $identifier = trim($input['identifier'] ?? '');

    if ($username === '' && $email === '' && $identifier === '') {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'נא להזין שם משתמש וכתובת דוא"ל']);
        exit;
    }

    // Rate limit – ננצל את מנגנון הנעילה לפי IP עם מזהה ייעודי
    $lock = is_login_locked('reset:' . ($_SERVER['REMOTE_ADDR'] ?? 'unknown'));
    if ($lock['locked']) {
        http_response_code(429);
        echo json_encode(['success' => false, 'message' => 'יותר מדי בקשות איפוס. נא לנסות שוב מאוחר יותר.']);
        exit;
    }

    $users = get_all_users($usersPath);
    $matchedUser = null;

    if ($username !== '' || $email !== '') {
        // מצב עיקרי: שם משתמש + דוא"ל – חובה שהשניים יתאימו לאותו חשבון
        foreach ($users as $u) {
            $isActive = ($u['isActive'] ?? true) !== false;
            if (!$isActive) continue;
            $userMatches = isset($u['username']) && strcasecmp($u['username'], $username) === 0;
            $emailMatches = isset($u['email']) && strcasecmp(trim($u['email']), $email) === 0;
            if ($userMatches && $emailMatches) {
                $matchedUser = $u;
                break;
            }
        }
    } else {
        // מצב אחורי: מזהה יחיד (שם משתמש או דוא"ל)
        foreach ($users as $u) {
            $isActive = ($u['isActive'] ?? true) !== false;
            if ($isActive && (
                (isset($u['username']) && strcasecmp($u['username'], $identifier) === 0) ||
                (isset($u['email']) && strcasecmp($u['email'], $identifier) === 0)
            )) {
                $matchedUser = $u;
                break;
            }
        }
    }

    // תמיד מחזירים הצלחה – כדי לא לחשוף אילו משתמשים קיימים
    $genericResponse = [
        'success' => true,
        'message' => 'אם הפרטים תואמים לחשבון רשום, נשלח קישור לאיפוס הסיסמה לכתובת הדוא"ל הרשומה.'
    ];

    if (!$matchedUser || empty($matchedUser['email'])) {
        record_failed_login('reset:' . ($_SERVER['REMOTE_ADDR'] ?? 'unknown'));
        echo json_encode($genericResponse);
        exit;
    }

    // יצירת טוקן חד-פעמי
    $token = bin2hex(random_bytes(32));
    $tokenHash = hash('sha256', $token);

    $resets = [];
    if (file_exists(RESET_TOKENS_PATH)) {
        $resets = json_decode(@file_get_contents(RESET_TOKENS_PATH), true) ?: [];
    }
    // ניקוי טוקנים ישנים + הגבלת 3 טוקנים פעילים למשתמש
    $now = time();
    $resets = array_values(array_filter($resets, function ($r) use ($now) {
        return isset($r['expires']) && $r['expires'] > $now;
    }));
    $userActive = array_filter($resets, function ($r) use ($matchedUser) {
        return ($r['userId'] ?? '') === $matchedUser['id'];
    });
    if (count($userActive) >= 3) {
        $resets = array_values(array_filter($resets, function ($r) use ($matchedUser) {
            return ($r['userId'] ?? '') !== $matchedUser['id'];
        }));
    }

    $resets[] = [
        'tokenHash' => $tokenHash,
        'userId'    => $matchedUser['id'],
        'username'  => $matchedUser['username'],
        'createdAt' => $now,
        'expires'   => $now + RESET_TOKEN_TTL,
        'used'      => false
    ];
    @file_put_contents(RESET_TOKENS_PATH, json_encode($resets, JSON_UNESCAPED_UNICODE), LOCK_EX);

    // בניית קישור האיפוס
    $scheme = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') ? 'https' : 'http';
    $host   = $_SERVER['HTTP_X_FORWARDED_HOST'] ?? $_SERVER['HTTP_HOST'] ?? 'localhost';
    $resetLink = $scheme . '://' . $host . dirname($_SERVER['SCRIPT_NAME']) . '/../reset-password.html?token=' . $token;
    $resetLink = preg_replace('#/api/\.\./#', '/', $resetLink);

    $mailSent = send_recovery_email($matchedUser['email'], $matchedUser['fullName'] ?? $matchedUser['username'], $resetLink);

    if (!$mailSent) {
        // לא חושפים את הטוקן בתגובה – נשמר רק ביומן השרת למנהל
        error_log('[auth.php] Password reset mail FAILED for user ' . $matchedUser['username'] . '. Link: ' . $resetLink);
    }

    echo json_encode($genericResponse);
    exit;
}

// 4b. ACTION: VALIDATE_RESET_TOKEN – בדיקת תקינות קישור
if ($action === 'validate_reset_token') {
    $token = trim($input['token'] ?? ($_GET['token'] ?? ''));

    if ($token === '' || strlen($token) !== 64) {
        echo json_encode(['valid' => false, 'message' => 'הקישור אינו תקין']);
        exit;
    }

    $resets = file_exists(RESET_TOKENS_PATH)
        ? (json_decode(@file_get_contents(RESET_TOKENS_PATH), true) ?: [])
        : [];

    $tokenHash = hash('sha256', $token);
    foreach ($resets as $r) {
        if (!empty($r['used'])) continue;
        if (($r['expires'] ?? 0) < time()) continue;
        if (hash_equals($r['tokenHash'], $tokenHash)) {
            echo json_encode(['valid' => true, 'username' => $r['username'] ?? '']);
            exit;
        }
    }
    echo json_encode(['valid' => false, 'message' => 'הקישור אינו תקין או שתם תוקפו']);
    exit;
}

// 4c. ACTION: RESET_PASSWORD – הגדרת סיסמה חדשה
if ($action === 'reset_password') {
    $token = trim($input['token'] ?? '');
    $newPassword = (string)($input['password'] ?? '');

    if ($token === '' || strlen($token) !== 64) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'הקישור אינו תקין']);
        exit;
    }

    if (strlen($newPassword) < 8) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'הסיסמה החדשה חייבת להכיל לפחות 8 תווים']);
        exit;
    }

    $resets = file_exists(RESET_TOKENS_PATH)
        ? (json_decode(@file_get_contents(RESET_TOKENS_PATH), true) ?: [])
        : [];

    $tokenHash = hash('sha256', $token);
    $matchIndex = -1;
    foreach ($resets as $i => $r) {
        if (empty($r['used']) && ($r['expires'] ?? 0) >= time() && hash_equals($r['tokenHash'], $tokenHash)) {
            $matchIndex = $i;
            break;
        }
    }

    if ($matchIndex === -1) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'הקישור אינו תקין או שתם תוקפו. נא לבקש קישור חדש.']);
        exit;
    }

    $users = get_all_users($usersPath);
    $userFound = false;
    foreach ($users as $idx => $u) {
        if (($u['id'] ?? '') === $resets[$matchIndex]['userId']) {
            $users[$idx]['password'] = function_exists('password_hash')
                ? password_hash($newPassword, PASSWORD_BCRYPT)
                : fallback_password_hash($newPassword);
            $users[$idx]['updatedAt'] = date('c');
            $userFound = true;
            break;
        }
    }

    if (!$userFound || !save_all_users($users, $usersPath)) {
        http_response_code(500);
        echo json_encode(['success' => false, 'message' => 'שגיאה בשמירת הסיסמה החדשה. פנה למנהל המערכת.']);
        exit;
    }

    // סימון הטוקן כבוי + ביטול כל הטוקנים של אותו משתמש
    foreach ($resets as $i => $r) {
        if (($r['userId'] ?? '') === $resets[$matchIndex]['userId']) {
            $resets[$i]['used'] = true;
        }
    }
    @file_put_contents(RESET_TOKENS_PATH, json_encode($resets, JSON_UNESCAPED_UNICODE), LOCK_EX);

    // ניתוק session צד-שרת אם קיים למשתמש הזה
    if (!empty($_SESSION['userId']) && $_SESSION['userId'] === $resets[$matchIndex]['userId']) {
        destroy_server_session();
    }

    echo json_encode(['success' => true, 'message' => 'הסיסמה שונתה בהצלחה. ניתן להתחבר כעת.']);
    exit;
}

http_response_code(400);
echo json_encode(['success' => false, 'error' => 'Unknown action']);
