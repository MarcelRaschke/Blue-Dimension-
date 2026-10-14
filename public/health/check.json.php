<?php
/**
 * Detailed health diagnostics endpoint for deployment verification
 * Returns comprehensive health status in JSON format
 */

header('Content-Type: application/json');
http_response_code(200);

$startTime = microtime(true);

$dbStatus = checkDatabaseHealth();

$healthCheck = [
    'status' => 'healthy',
    'timestamp' => date('c'),
    'checks' => [
        'php_execution' => [
            'status' => 'ok',
            'version' => phpversion()
        ],
        'file_system' => [
            'status' => 'ok',
            'writable' => is_writable(dirname(__FILE__))
        ],
        'memory' => [
            'status' => 'ok',
            'current_usage' => memory_get_usage(true),
            'peak_usage' => memory_get_peak_usage(true),
            'limit' => ini_get('memory_limit')
        ],
        'critical_files' => [
            'status' => checkCriticalFiles() ? 'ok' : 'error'
        ],
        'database' => [
            'status' => $dbStatus['connected'] ? 'ok' : 'error',
            'details' => $dbStatus
        ]
    ],
    'response_time_ms' => round((microtime(true) - $startTime) * 1000, 2)
];

// Set status to error if any critical check failed
if ($healthCheck['checks']['critical_files']['status'] === 'error' || !$dbStatus['connected']) {
    $healthCheck['status'] = 'degraded';
    http_response_code(200); // Still return 200 but mark as degraded
}

echo json_encode($healthCheck, JSON_UNESCAPED_SLASHES | JSON_PRETTY_PRINT);

/**
 * Verify critical project files exist
 */
function checkCriticalFiles() {
    $projectRoot = dirname(dirname(dirname(__FILE__)));
    $criticalFiles = [
        $projectRoot . '/README.md',
        $projectRoot . '/.github/workflows/deploy.yml',
        $projectRoot . '/.env.example'
    ];

    foreach ($criticalFiles as $file) {
        if (!file_exists($file)) {
            return false;
        }
    }

    return true;
}

/**
 * Check database connectivity with minimal overhead
 */
function checkDatabaseHealth() {
    $result = [
        'connected' => true,
        'checked_at' => date('c'),
        'databases' => []
    ];

    // Try MySQL connection (main app database)
    if (isset($_ENV['DB_HOST']) || getenv('DB_HOST')) {
        $host = $_ENV['DB_HOST'] ?? getenv('DB_HOST') ?? 'localhost';
        $user = $_ENV['DB_USER'] ?? getenv('DB_USER') ?? 'root';
        $pass = $_ENV['DB_PASS'] ?? getenv('DB_PASS') ?? '';

        try {
            $conn = new mysqli($host, $user, $pass);
            if ($conn->connect_error) {
                $result['databases']['mysql'] = false;
                $result['connected'] = false;
            } else {
                $result['databases']['mysql'] = true;
                $conn->close();
            }
        } catch (Exception $e) {
            $result['databases']['mysql'] = false;
            $result['connected'] = false;
        }
    }

    return $result;
}
