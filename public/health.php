<?php
/**
 * Simple health check endpoint for deployment verification
 * Returns 200 OK with JSON status if application is running
 */

header('Content-Type: application/json');
http_response_code(200);

$health = [
    'status' => 'healthy',
    'timestamp' => date('c'),
    'php_version' => phpversion(),
    'memory_usage' => memory_get_usage(true),
    'peak_memory' => memory_get_peak_usage(true),
    'database' => checkDatabaseHealth()
];

// Return unhealthy status if database is down
if (!$health['database']['connected']) {
    http_response_code(503);
}

echo json_encode($health, JSON_UNESCAPED_SLASHES | JSON_PRETTY_PRINT);

/**
 * Check database connectivity with minimal overhead
 */
function checkDatabaseHealth() {
    $result = [
        'connected' => false,
        'checked_at' => date('c')
    ];

    // Try MySQL connection (main app database)
    if (isset($_ENV['DB_HOST']) || getenv('DB_HOST')) {
        $host = $_ENV['DB_HOST'] ?? getenv('DB_HOST') ?? 'localhost';
        $user = $_ENV['DB_USER'] ?? getenv('DB_USER') ?? 'root';
        $pass = $_ENV['DB_PASS'] ?? getenv('DB_PASS') ?? '';

        try {
            $conn = new mysqli($host, $user, $pass);
            if ($conn->connect_error) {
                $result['mysql'] = false;
            } else {
                $result['mysql'] = true;
                $conn->close();
            }
        } catch (Exception $e) {
            $result['mysql'] = false;
        }
    }

    $result['connected'] = isset($result['mysql']) ? $result['mysql'] : true;
    return $result;
}
