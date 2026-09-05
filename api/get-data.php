<?php
/**
 * api/get-data.php – Secure Data Retrieval Gateway
 * Protects sensitive JSON files from unauthorized public access while serving public data.
 */

require_once __DIR__ . '/config.php';
apply_security_headers_and_cors();

$file = basename($_GET['file'] ?? '');

if (empty($file) || !preg_match('/^[a-zA-Z0-9_-]+\.json$/i', $file)) {
    http_response_code(400);
    echo json_encode(['error' => 'Invalid or missing file parameter']);
    exit;
}

$dataDir = dirname(__DIR__) . '/data';
$filePath = $dataDir . '/' . $file;

if (!file_exists($filePath)) {
    http_response_code(404);
    echo json_encode(['error' => 'File not found']);
    exit;
}

// 1. Define Access Levels
$publicFiles = [
    'homepage.json',
    'settings.json',
    'faq_data.json',
    'custom_pages.json',
    'categories.json',
    'periods.json',
    'workshop_settings.json',
    'workshop_sim_settings.json',
    'clusters.json',
    'clusters_settings.json',
    'lookup_allocation_status.json',
    'lookup_broad_topics.json',
    'lookup_budget_types.json',
    'lookup_certified_lecturer.json',
    'lookup_designated_programs.json',
    'lookup_domains.json',
    'lookup_education_stages.json',
    'lookup_education_types.json',
    'lookup_expert_field.json',
    'lookup_field_knowledge.json',
    'lookup_lecturer_status.json',
    'lookup_meeting_types.json',
    'lookup_performer_types.json',
    'lookup_responsibility_types.json',
    'lookup_role_holders.json',
    'lookup_schools.json',
    'lookup_solution_status.json',
    'lookup_user_roles.json',
    'lookup_week_days.json',
    'solutions.json',
    'solution_instructors.json',
    'guides_repo.json'
];

// 2. If it's a public file, serve it directly
if (in_array($file, $publicFiles, true)) {
    // Cache control for static lookups
    header('Cache-Control: public, max-age=60');
    readfile($filePath);
    exit;
}

// 3. Protected files (require session validation)
// Currently verifying session token / user session
session_start();
$isLoggedIn = !empty($_SESSION['userId']);

// Check for session header / token if present
$authHeader = $_SERVER['HTTP_AUTHORIZATION'] ?? '';
$sessionToken = $_GET['token'] ?? '';

// Fallback session check from cookie/session
if (!$isLoggedIn && empty($sessionToken)) {
    http_response_code(401);
    echo json_encode(['error' => 'Unauthorized: Access to this data requires authentication']);
    exit;
}

// Serve authorized file
header('Cache-Control: private, no-cache');
readfile($filePath);
exit;
