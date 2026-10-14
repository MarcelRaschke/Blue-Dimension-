<?php
/**
 * Performance metrics and analytics endpoint
 * Provides deployment history, uptime, and performance statistics
 */

header('Content-Type: application/json');
http_response_code(200);

$startTime = microtime(true);

// Get deployment info from repository if available
$metrics = [
    'status' => 'healthy',
    'timestamp' => date('c'),
    'uptime' => getServerUptime(),
    'performance' => [
        'response_time_ms' => 0,
        'cpu_load' => getSystemLoad(),
        'disk_usage' => getStorageInfo()
    ],
    'deployment' => [
        'last_deployment' => getLastDeploymentTime(),
        'deployment_frequency' => getDeploymentFrequency(),
        'environment' => 'production'
    ],
    'system' => [
        'php_version' => phpversion(),
        'web_server' => $_SERVER['SERVER_SOFTWARE'] ?? 'unknown',
        'os' => php_uname('s'),
        'current_time' => date('Y-m-d H:i:s'),
    ]
];

$metrics['performance']['response_time_ms'] = round((microtime(true) - $startTime) * 1000, 2);

echo json_encode($metrics, JSON_UNESCAPED_SLASHES | JSON_PRETTY_PRINT);

/**
 * Get server uptime in seconds (approximate from boot time)
 */
function getServerUptime() {
    if (file_exists('/proc/uptime')) {
        $uptime = file_get_contents('/proc/uptime');
        $uptimeSeconds = (int)explode(' ', trim($uptime))[0];

        $days = floor($uptimeSeconds / 86400);
        $hours = floor(($uptimeSeconds % 86400) / 3600);
        $minutes = floor(($uptimeSeconds % 3600) / 60);

        return "$days days, $hours hours, $minutes minutes";
    }
    return 'unknown';
}

/**
 * Get system load average
 */
function getSystemLoad() {
    if (function_exists('sys_getloadavg')) {
        $load = sys_getloadavg();
        return [
            '1min' => round($load[0], 2),
            '5min' => round($load[1], 2),
            '15min' => round($load[2], 2)
        ];
    }
    return null;
}

/**
 * Get disk usage information
 */
function getStorageInfo() {
    $diskSpace = disk_free_space('/');
    $diskTotal = disk_total_space('/');

    if ($diskSpace && $diskTotal) {
        $usagePercent = round(((($diskTotal - $diskSpace) / $diskTotal) * 100), 2);
        return [
            'free_bytes' => $diskSpace,
            'total_bytes' => $diskTotal,
            'used_percent' => $usagePercent,
            'status' => $usagePercent > 90 ? 'warning' : ($usagePercent > 95 ? 'critical' : 'ok')
        ];
    }
    return null;
}

/**
 * Get last deployment time from git
 */
function getLastDeploymentTime() {
    $projectRoot = dirname(dirname(dirname(__FILE__)));
    $headFile = $projectRoot . '/.git/HEAD';

    if (file_exists($headFile)) {
        $lastModified = filemtime($projectRoot . '/.git');
        return date('c', $lastModified);
    }
    return null;
}

/**
 * Estimate deployment frequency from deployment record file
 */
function getDeploymentFrequency() {
    $projectRoot = dirname(dirname(dirname(__FILE__)));
    $deploymentRecord = $projectRoot . '/.github/deployment-record.json';

    if (file_exists($deploymentRecord)) {
        $content = file_get_contents($deploymentRecord);
        $record = json_decode($content, true);

        if (is_array($record) && !empty($record)) {
            $count = count($record);
            return round($count / 7, 2) . ' deployments/week';
        }
    }

    return 'unknown';
}
