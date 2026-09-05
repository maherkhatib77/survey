<?php
/**
 * api/config.php – Central Configuration & Security Helper for Matzpen Net
 */

if (!defined('MATZPEN_CONFIG_LOADED')) {
    define('MATZPEN_CONFIG_LOADED', true);
}

// Allowed Domains for CORS and API access
$allowedDomains = [
    'localhost',
    '127.0.0.1',
    'ejpisga.org.il',
    'www.ejpisga.org.il'
];

/**
 * Validates and sets CORS & Security Headers
 */
function apply_security_headers_and_cors() {
    global $allowedDomains;

    header('Content-Type: application/json; charset=utf-8');
    header('X-Content-Type-Options: nosniff');
    header('X-Frame-Options: DENY');
    header('X-XSS-Protection: 1; mode=block');

    $origin = $_SERVER['HTTP_ORIGIN'] ?? '';
    $host = $_SERVER['HTTP_HOST'] ?? '';
    
    // Clean host from port if present
    $hostName = preg_replace('/:\d+$/', '', $host);

    $isAllowed = false;

    // Check if Origin matches allowed domains
    if (!empty($origin)) {
        $parsedUrl = parse_url($origin);
        $originHost = $parsedUrl['host'] ?? '';
        
        foreach ($allowedDomains as $domain) {
            if ($originHost === $domain || substr($originHost, -strlen('.' . $domain)) === '.' . $domain) {
                $isAllowed = true;
                header('Access-Control-Allow-Origin: ' . $origin);
                break;
            }
        }
    } else {
        // Direct browser or same-host requests (e.g. from script on same domain without Origin header)
        foreach ($allowedDomains as $domain) {
            if ($hostName === $domain || substr($hostName, -strlen('.' . $domain)) === '.' . $domain) {
                $isAllowed = true;
                break;
            }
        }
    }

    // Allow options preflight
    if (($_SERVER['REQUEST_METHOD'] ?? '') === 'OPTIONS') {
        if ($isAllowed) {
            header('Access-Control-Allow-Methods: GET, POST, OPTIONS, DELETE');
            header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With');
            header('Access-Control-Max-Age: 86400');
            http_response_code(200);
            exit;
        } else {
            http_response_code(403);
            echo json_encode(['success' => false, 'error' => 'Origin not allowed']);
            exit;
        }
    }

    if (!$isAllowed && !empty($origin)) {
        http_response_code(403);
        echo json_encode(['success' => false, 'error' => 'Origin not allowed: ' . htmlspecialchars($origin)]);
        exit;
    }
}

// Mailer Configuration
function get_smtp_config() {
    return [
        'host'       => 'smtp.gmail.com',
        'port'       => 465,
        'username'   => 'register@ejpisga.org.il',
        'password'   => 'hiheunonmkxypxlp', // Centralized credential, out of API endpoints
        'from_email' => 'register@ejpisga.org.il',
        'from_name'  => 'מרכז פיתוח סגלי הוראה - פסגה'
    ];
}
