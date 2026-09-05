<?php
/**
 * create-page-file.php
 * 
 * Creates a physical HTML file in the pages/ directory
 * The generated page matches the site's design system:
 * - Same header/footer/structure as page.html, faq.html, team.html
 * - Loads ../css/style.css for design tokens
 * - Loads DataStore (data.js + global-ui.js) for dynamic settings
 * - Uses Arabic (ar) as default front-end language
 * 
 * Expected POST body (JSON):
 * {
 *   "filename": "teachers.html",   // Required
 *   "title": "Teachers Page",       // Required
 *   "content": "<p>HTML content</p>" // Required
 * }
 */

require_once __DIR__ . '/config.php';
apply_security_headers_and_cors();

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['success' => false, 'error' => 'Method not allowed']);
    exit;
}

// Diagnostic: if action=diag, return environment info for debugging
$input_raw = file_get_contents('php://input');
$input = json_decode($input_raw, true);

if ($input && isset($input['action']) && $input['action'] === 'diag') {
    $pagesDir = dirname(__DIR__) . '/pages/';
    $diag = [
        'php_version' => PHP_VERSION,
        'script_path' => __FILE__,
        'base_dir' => dirname(__DIR__),
        'pages_dir' => $pagesDir,
        'pages_exists' => is_dir($pagesDir),
        'pages_writable' => is_writable($pagesDir),
        'pages_perms' => is_dir($pagesDir) ? substr(sprintf('%o', fileperms($pagesDir)), -4) : 'N/A',
        'pages_owner' => (function_exists('posix_getpwuid') && is_dir($pagesDir)) ? posix_getpwuid(fileowner($pagesDir))['name'] : (is_dir($pagesDir) ? fileowner($pagesDir) : 'N/A'),
        'current_user' => function_exists('posix_getpwuid') ? posix_getpwuid(posix_geteuid())['name'] : get_current_user(),
        'doc_root' => $_SERVER['DOCUMENT_ROOT'] ?? 'N/A',
        'server_software' => $_SERVER['SERVER_SOFTWARE'] ?? 'N/A'
    ];
    // Try a test write
    if (is_dir($pagesDir) && is_writable($pagesDir)) {
        $testFile = $pagesDir . '_diag_test_' . time() . '.tmp';
        $testWrite = @file_put_contents($testFile, 'test');
        $diag['test_write'] = $testWrite !== false;
        if ($testWrite !== false) @unlink($testFile);
    } else {
        $diag['test_write'] = false;
        $diag['test_write_reason'] = !is_dir($pagesDir) ? 'Directory does not exist' : 'Directory not writable';
    }
    echo json_encode(['success' => true, 'diag' => $diag]);
    exit;
}

if (!$input) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'Invalid JSON input']);
    exit;
}

// Handle delete action
$action = isset($input['action']) ? $input['action'] : 'save';

if ($action === 'delete') {
    $filename = isset($input['filename']) ? basename(trim($input['filename'])) : '';
    
    // Support both with and without .html extension
    if (!empty($filename) && substr($filename, -5) !== '.html') {
        $filename .= '.html';
    }
    
    if (empty($filename)) {
        http_response_code(400);
        echo json_encode(['success' => false, 'error' => 'Filename is required']);
        exit;
    }
    
    $pagesDir = dirname(__DIR__) . '/pages/';
    $filePath = $pagesDir . $filename;
    
    if (file_exists($filePath)) {
        if (unlink($filePath)) {
            echo json_encode(['success' => true, 'message' => 'Page file deleted successfully', 'filename' => $filename]);
        } else {
            http_response_code(500);
            echo json_encode(['success' => false, 'error' => 'Failed to delete page file']);
        }
    } else {
        echo json_encode(['success' => true, 'message' => 'File did not exist', 'filename' => $filename]);
    }
    exit;
}

// Validate required fields for save
$filename = isset($input['filename']) ? trim($input['filename']) : '';
$title = isset($input['title']) ? trim($input['title']) : '';
$content = isset($input['content']) ? $input['content'] : '';

if (empty($filename)) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'Filename is required']);
    exit;
}

if (empty($title)) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'Title is required']);
    exit;
}

// Security: sanitize filename
$filename = basename($filename);
if (!preg_match('/^[a-zA-Z0-9_-]+\.html$/', $filename)) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'Invalid filename. Only alphanumeric, hyphens, underscores allowed with .html extension']);
    exit;
}

// Ensure pages directory exists
$pagesDir = dirname(__DIR__) . '/pages/';
if (!is_dir($pagesDir)) {
    if (!mkdir($pagesDir, 0775, true)) {
        http_response_code(500);
        echo json_encode(['success' => false, 'error' => 'Failed to create pages directory. Please create it manually and set permissions to 775 (chmod 775 pages/). Path: ' . $pagesDir]);
        exit;
    }
}

// Check write permissions
if (!is_writable($pagesDir)) {
    $owner = function_exists('posix_getpwuid') ? posix_getpwuid(fileowner($pagesDir))['name'] : 'unknown';
    $perms = substr(sprintf('%o', fileperms($pagesDir)), -4);
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => 'Pages directory is not writable. Current permissions: ' . $perms . ', Owner: ' . $owner . '. Run: chmod 775 ' . basename($pagesDir) . '/']);
    exit;
}

// ── Read site settings ──
$basePath = dirname(__DIR__);
$siteNameAr = 'بوصلة نت';
$siteNameHe = 'מצפן נט';
$siteLogo = '';
$footerTextAr = '';
$footerTextHe = '';

// Read settings.json
$settingsPath = $basePath . '/data/settings.json';
if (file_exists($settingsPath)) {
    $settings = json_decode(file_get_contents($settingsPath), true);
    if ($settings) {
        if (isset($settings['siteNameAr'])) $siteNameAr = $settings['siteNameAr'];
        if (isset($settings['siteNameHe'])) $siteNameHe = $settings['siteNameHe'];
        if (isset($settings['logoUrl'])) $siteLogo = $settings['logoUrl'];
        if (isset($settings['copyrightAr'])) $footerTextAr = $settings['copyrightAr'];
        if (isset($settings['copyrightHe'])) $footerTextHe = $settings['copyrightHe'];
    }
}

// Read homepage.json for richer settings (logo, footerText, siteName)
$homepagePath = $basePath . '/data/homepage.json';
if (file_exists($homepagePath)) {
    $homepage = json_decode(file_get_contents($homepagePath), true);
    if ($homepage) {
        if (isset($homepage['logo']) && !empty($homepage['logo'])) {
            $siteLogo = $homepage['logo'];
        }
        if (isset($homepage['siteName']['ar'])) $siteNameAr = $homepage['siteName']['ar'];
        if (isset($homepage['siteName']['he'])) $siteNameHe = $homepage['siteName']['he'];
        if (isset($homepage['footerText']['ar'])) $footerTextAr = $homepage['footerText']['ar'];
        if (isset($homepage['footerText']['he'])) $footerTextHe = $homepage['footerText']['he'];
    }
}

// Default footer fallback
if (empty($footerTextAr)) {
    $footerTextAr = $siteNameAr . ' © ' . date('Y') . ' | وزارة التربية والتعليم';
}

// Build the HTML page
$htmlContent = buildHtmlPage($filename, $title, $content, $siteNameAr, $siteNameHe, $siteLogo, $footerTextAr, $footerTextHe);

// Write the file
$filePath = $pagesDir . $filename;
$result = file_put_contents($filePath, $htmlContent);

if ($result === false) {
    $dirPerms = is_dir($pagesDir) ? substr(sprintf('%o', fileperms($pagesDir)), -4) : 'N/A';
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => 'Failed to write HTML file. Check that the web server user has write access to: ' . basename($pagesDir) . '/ (current perms: ' . $dirPerms . ')']);
    exit;
}

echo json_encode([
    'success' => true,
    'message' => 'Page file created successfully',
    'filename' => $filename,
    'filepath' => 'pages/' . $filename,
    'size' => $result
]);


/**
 * Builds an HTML page matching the unified site design system
 * (Exact same header/footer structure as faq.html, team.html, catalog.html)
 */
function buildHtmlPage($filename, $title, $content, $siteNameAr, $siteNameHe, $siteLogo, $footerTextAr, $footerTextHe) {
    // Ensure title is the Arabic one as requested for Front-End default
    $pageTitle = !empty($title) ? $title : $siteNameAr;
    
    $html = '<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>' . htmlspecialchars($pageTitle) . '</title>
    <link rel="stylesheet" href="../css/style.css">
    <link href="https://fonts.googleapis.com/css2?family=Noto+Sans+Arabic:wght@300;400;500;600;800;900&family=Tajawal:wght@400;500;700;800&display=swap" rel="stylesheet">
    <link rel="icon" href="data:image/svg+xml,<svg xmlns=\'http://www.w3.org/2000/svg\' viewBox=\'0 0 100 100\'><text y=\'.9em\' font-size=\'90\'>🧭</text></svg>">
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: \'Noto Sans Arabic\', \'Tajawal\', sans-serif; min-height: 100vh; background: var(--gray-50, #f3f3f3); display: flex; flex-direction: column; }
        
        /* Unified Header */
        .custom-page-header { background: linear-gradient(135deg, var(--primary, #0ca7aa) 0%, var(--primary-dark, #09787a) 100%); padding: 0; position: sticky; top: 0; z-index: 100; box-shadow: 0 4px 16px rgba(0,0,0,.06); }
        .header-inner { max-width: 1200px; margin: 0 auto; padding: 16px 24px; display: flex; align-items: center; justify-content: space-between; gap: 16px; }
        .page-main-title { color: #fff; font-size: 28px; font-weight: 800; margin: 0; font-family: \'Noto Sans Arabic\', \'Tajawal\', sans-serif; }
        .btn-back { background: rgba(255,255,255,.18); border: 1px solid rgba(255,255,255,.3); color: #fff; padding: 8px 18px; border-radius: 20px; font-size: 14px; font-weight: 600; cursor: pointer; transition: all .2s; font-family: \'Noto Sans Arabic\', \'Tajawal\', sans-serif; text-decoration: none; display: inline-flex; align-items: center; gap: 6px; }
        .btn-back:hover { background: rgba(255,255,255,.3); }
        
        /* Content Area (Styled for TinyMCE output) */
        .custom-page-content { flex: 1; max-width: 1200px; width: 100%; margin: 0 auto; padding: 32px 24px; background: #fff; border-radius: 12px; box-shadow: 0 2px 12px rgba(0,0,0,.06); margin-top: 24px; margin-bottom: 24px; }
        .custom-page-content img { max-width: 100%; height: auto; border-radius: 8px; margin: 12px 0; }
        .custom-page-content table { border-collapse: collapse; width: 100%; margin: 16px 0; }
        .custom-page-content td, .custom-page-content th { border: 1px solid var(--gray-200, #e5e5e5); padding: 10px 14px; text-align: right; }
        .custom-page-content th { background: var(--gray-50, #f7f7f7); font-weight: 700; }
        .custom-page-content a { color: var(--primary, #0ca7aa); text-decoration: underline; }
        .custom-page-content h1, .custom-page-content h2, .custom-page-content h3 { margin: 24px 0 12px; color: var(--gray-700, #24343f); line-height: 1.4; }
        .custom-page-content p { margin-bottom: 12px; line-height: 1.9; }
        .custom-page-content ul, .custom-page-content ol { margin: 12px 0; padding-right: 24px; }
        .custom-page-content li { margin-bottom: 6px; line-height: 1.8; }
        
        /* Footer */
        .custom-page-footer { text-align: center; padding: 18px; color: var(--gray-300, #999999); font-size: 12px; border-top: 1px solid var(--gray-100, #f2f2f2); background: rgba(255,255,255,.7); flex-shrink: 0; }
        
        @media (max-width: 768px) { 
            .header-inner { flex-wrap: wrap; } 
            .page-main-title { font-size: 22px; } 
            .custom-page-content { padding: 20px 16px; margin-top: 16px; } 
        }
    </style>
</head>
<body>
    <header class="custom-page-header">
        <div class="header-inner">
            <h1 class="page-main-title">' . htmlspecialchars($pageTitle) . '</h1>
            <a href="../index.html" class="btn-back">← الرئيسية</a>
        </div>
    </header>
    
    <main class="custom-page-content">
        ' . $content . '
    </main>
    
    <footer class="custom-page-footer">
        ' . htmlspecialchars($footerTextAr) . '
    </footer>
</body>
</html>';

    return $html;
}


?>