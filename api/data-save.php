<?php
/**
 * data-save.php – כתיבת קובץ JSON מאובטחת
 */
require_once __DIR__ . '/config.php';
apply_security_headers_and_cors();

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['success' => false, 'error' => 'Method not allowed – use POST']);
    exit;
}

$raw = file_get_contents('php://input');
if (empty($raw)) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'No data received']);
    exit;
}

$input = json_decode($raw, true);
if (!$input || !isset($input['filename']) || !isset($input['data'])) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'Invalid input – missing filename or data']);
    exit;
}

// 1. AUTHENTICATION
$session = isset($input['session']) ? $input['session'] : null;
if (!$session || empty($session['userId'])) {
    http_response_code(401);
    echo json_encode(['success' => false, 'error' => 'Unauthorized: Missing session']);
    exit;
}

$dataDir = dirname(__DIR__) . '/data';
$usersPath = $dataDir . '/users.json';
$isValidUser = false;

if (file_exists($usersPath)) {
    $usersContent = @file_get_contents($usersPath);
    $users = json_decode($usersContent, true);
    if (is_array($users)) {
        foreach ($users as $u) {
            if (isset($u['id']) && $u['id'] === $session['userId'] && isset($u['isActive']) && $u['isActive'] === true) {
                $isValidUser = true;
                break;
            }
        }
    }
}

if (!$isValidUser) {
    http_response_code(403);
    echo json_encode(['success' => false, 'error' => 'Forbidden: Invalid or inactive session']);
    exit;
}

// 2. FILE VALIDATION
$filename = basename($input['filename']);
if (!preg_match('/\.json$/i', $filename)) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'File must end with .json']);
    exit;
}

$blockedFiles = ['dev-creds.json'];
if (in_array($filename, $blockedFiles)) {
    http_response_code(403);
    echo json_encode(['success' => false, 'error' => 'Cannot overwrite protected file']);
    exit;
}

if (!is_dir($dataDir)) {
    if (!mkdir($dataDir, 0755, true)) {
        http_response_code(500);
        echo json_encode(['success' => false, 'error' => 'Failed to create data directory']);
        exit;
    }
}

$targetPath = $dataDir . '/' . $filename;
$data = $input['data'];

// 3. WRITE WITH FILE LOCKING
$jsonContent = json_encode($data, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT);
$result = @file_put_contents($targetPath, $jsonContent, LOCK_EX);

if ($result === false) {
    if (file_exists($targetPath)) {
        @chmod($targetPath, 0664);
        $result = @file_put_contents($targetPath, $jsonContent, LOCK_EX);
    }
    if ($result === false) {
        http_response_code(500);
        echo json_encode([
            'success' => false,
            'error' => 'Failed to write file. Check folder permissions (should be 755 for folder, 664 for files).',
            'path' => $targetPath
        ]);
        exit;
    }
}

@chmod($targetPath, 0664);
echo json_encode(['success' => true, 'file' => $filename]);
?>