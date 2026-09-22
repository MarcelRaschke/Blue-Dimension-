<?php
/**
 * Simple health check endpoint for deployment verification
 * Returns 200 OK with JSON status if application is running
 */

header('Content-Type: application/json');
http_response_code(200);

echo json_encode([
    'status' => 'healthy',
    'timestamp' => date('c'),
    'php_version' => phpversion(),
    'memory_usage' => memory_get_usage(true),
    'peak_memory' => memory_get_peak_usage(true)
], JSON_UNESCAPED_SLASHES | JSON_PRETTY_PRINT);
