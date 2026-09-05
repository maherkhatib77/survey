<?php
header('Content-Type: application/json');
echo json_encode(['success' => true, 'message' => 'PHP עובד מצוין!']);
file_put_contents(__DIR__ . '/test_log.txt', 'Test OK at ' . date('Y-m-d H:i:s'));
?>