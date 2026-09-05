<?php
/**
 * api/get-booked-dates.php
 * Returns an array of occupied/booked dates WITHOUT leaking personal identifiable information (PII).
 */

require_once __DIR__ . '/config.php';
apply_security_headers_and_cors();

$type = $_GET['type'] ?? 'workshop';
$dataFile = ($type === 'sim') 
    ? dirname(__DIR__) . '/data/workshop_sim_bookings.json' 
    : dirname(__DIR__) . '/data/workshop_bookings.json';

$bookedDates = [];

if (file_exists($dataFile)) {
    $content = @file_get_contents($dataFile);
    $bookings = json_decode($content, true);

    if (is_array($bookings)) {
        foreach ($bookings as $booking) {
            $status = strtolower($booking['status'] ?? 'pending');
            // An active reservation is either pending or approved
            if ($status === 'pending' || $status === 'approved') {
                if (!empty($booking['meetingDate'])) {
                    $bookedDates[] = trim($booking['meetingDate']);
                }
            }
        }
    }
}

// Return unique dates only
$bookedDates = array_values(array_unique($bookedDates));

echo json_encode([
    'success' => true,
    'dates'   => $bookedDates
], JSON_UNESCAPED_UNICODE);
