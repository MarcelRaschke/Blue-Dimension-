# Phase 3: Continuous Monitoring & Performance Analytics

> Hinweis: Die PHP-Health-Endpunkte (`health.php`, `health/check.json.php`, `health/metrics.json.php`) sind mit der statischen Auslieferung entfallen. Ersatz: `/` (Startseite), `/news.html` und `/gallery.html`. Details: `docs/CI-ANALYSE.md`.

## Overview

Phase 3 implements continuous health monitoring, performance metrics tracking, and deployment analytics for the Blue Dimension production environment. This phase runs automatically on a 5-minute schedule and provides real-time visibility into system health.

## Components

### 1. Monitoring Workflow (`.github/workflows/monitor.yml`)

Automated health checks running every 5 minutes to verify production system health.

**Features:**
- Simple health check endpoint verification (`/`)
- Detailed health diagnostics endpoint verification (`/news.html`)
- Performance metrics endpoint verification (`/gallery.html`)
- Response time monitoring and alerting
- Slack notifications for health failures
- GitHub Environments deployment history tracking
- Job summary with health status report

**Check Schedule:**
```
*/5 * * * * (UTC)
```

**Execution Time:** ~2-3 seconds per run

### 2. Health Check Endpoints

#### Simple Health Endpoint (`/`)
Returns basic health status with PHP version and memory usage.

**Response:**
```json
{
  "status": "healthy",
  "timestamp": "2026-09-22T12:00:00+00:00",
  "php_version": "8.3.0",
  "memory_usage": 2097152,
  "peak_memory": 4194304
}
```

**Threshold:** 200ms response time

#### Detailed Health Endpoint (`/news.html`)
Returns comprehensive health diagnostics including file system and critical file verification.

**Response:**
```json
{
  "status": "healthy",
  "timestamp": "2026-09-22T12:00:00+00:00",
  "checks": {
    "php_execution": {"status": "ok", "version": "8.3.0"},
    "file_system": {"status": "ok", "writable": true},
    "memory": {"status": "ok", ...},
    "critical_files": {"status": "ok"}
  },
  "response_time_ms": 1.45
}
```

**Threshold:** 2000ms response time (warning if exceeded)

#### Performance Metrics Endpoint (`/gallery.html`)
Returns system performance metrics and deployment analytics.

**Response:**
```json
{
  "status": "healthy",
  "timestamp": "2026-09-22T12:00:00+00:00",
  "uptime": "up 42 days, 3 hours, 15 minutes",
  "performance": {
    "response_time_ms": 0.89,
    "cpu_load": {"1min": 0.45, "5min": 0.38, "15min": 0.42},
    "disk_usage": {"free_bytes": 53687091200, "total_bytes": 107374182400, "used_percent": 50.02, "status": "ok"}
  },
  "deployment": {
    "last_deployment": "2026-09-22T10:30:00+00:00",
    "deployment_frequency": "3.2 commits/day",
    "environment": "production"
  },
  "system": {
    "php_version": "8.3.0",
    "web_server": "nginx/1.24.0",
    "os": "Linux",
    "current_time": "2026-09-22 12:00:00"
  }
}
```

**Status Indicators:**
- Disk usage > 90%: Warning
- Disk usage > 95%: Critical
- Response time > 2000ms: Warning

### 3. Alert System

#### Health Check Failures
When any health check fails, the system automatically:
1. Records failure in job logs
2. Sends Slack notification via webhook
3. Updates GitHub Environments with failure status
4. Creates a run summary for review

**Slack Alert Format:**
```
⚠️ Production Health Alert
Environment: djjessejay.ch
Status: Health check failed
Timestamp: [timestamp]
Simple Health: [outcome]
Detailed Health: [outcome]
View Workflow Run: [link]
```

#### Performance Alerts
- Response time > 2000ms: Warning notification
- Disk usage > 90%: Warning notification
- Disk usage > 95%: Critical alert

### 4. Deployment History Tracking

The monitoring workflow tracks deployment history and provides statistics:

**Metrics Tracked:**
- Total deployments in last week
- Success rate percentage
- Commit SHAs and deployment times
- Deployment environment
- Status for each deployment

**GitHub Environments:**
- Environment name: `production`
- Environment URL: `https://djjessejay.ch`
- Deployment history visible in GitHub UI
- Protection rules: None (can be added for approval requirements)

## Configuration

### GitHub Secrets Required

**Already configured:**
- `DEPLOY_KEY` - SSH private key for server access
- `DEPLOY_HOST` - Production server hostname
- `DEPLOY_USER` - SSH user for deployment
- `SLACK_WEBHOOK` - Slack webhook for notifications

### Workflow Permissions

```yaml
permissions:
  contents: read
  deployments: write
```

- `contents: read` - Read repository for health checks
- `deployments: write` - Write deployment status to GitHub Environments

### Cron Schedule

The default 5-minute interval can be adjusted in `.github/workflows/monitor.yml`:

```yaml
on:
  schedule:
    - cron: '*/5 * * * *'  # Run every 5 minutes
```

**Cron Expression Guide:**
- `*/5 * * * *` - Every 5 minutes (288 runs/day)
- `*/10 * * * *` - Every 10 minutes (144 runs/day)
- `0 * * * *` - Every hour (24 runs/day)
- `0 */6 * * *` - Every 6 hours (4 runs/day)

## Monitoring Dashboard

### GitHub Actions Dashboard
View health check runs: `https://github.com/MarcelRaschke/Blue-Dimension-/actions/workflows/monitor.yml`

**Status Summary:**
- Green checkmark: All health checks passed
- Red X: One or more health checks failed
- Yellow warning: Performance warnings detected

### GitHub Environments
View deployment history: `https://github.com/MarcelRaschke/Blue-Dimension-/deployments/activity_log?environment=production`

**Information Shown:**
- Deployment timestamp
- Commit SHA and message
- Deployment status (success/failure)
- Environment URL link
- Automatic rollback history

### Slack Channel
Production health alerts sent to configured webhook:
- ✅ All systems operational (every 1 hour)
- ⚠️ Performance warnings (immediate)
- ❌ Health check failures (immediate)

## Testing the Monitoring System

### Manual Test: Trigger Health Check
```bash
# Run workflow manually
gh workflow run monitor.yml --repo MarcelRaschke/Blue-Dimension-
```

### Test Health Endpoints Locally
```bash
# Test simple health endpoint
curl https://djjessejay.ch/

# Test detailed health endpoint
curl https://djjessejay.ch/news.html

# Test metrics endpoint
curl https://djjessejay.ch/gallery.html
```

### Test Slack Notifications
To test Slack notifications without triggering a failure:
1. Temporarily change webhook URL to a test channel
2. Manually trigger workflow with `gh workflow run monitor.yml`
3. Verify notification arrives in Slack
4. Revert webhook URL

### Verify Performance Thresholds
```bash
# Measure response time
time curl https://djjessejay.ch/news.html
```

## Troubleshooting

### Health Check Timeout
**Symptom:** Workflow times out waiting for health endpoint

**Solution:**
1. Check server status: `ssh deploy@djjessejay.ch 'systemctl status nginx'`
2. Check PHP-FPM: `ssh deploy@djjessejay.ch 'systemctl status php8.3-fpm'`
3. Check network connectivity: `ssh deploy@djjessejay.ch 'ping 8.8.8.8'`

### Disk Usage Critical
**Symptom:** Disk usage > 95% alert

**Solution:**
1. SSH into server: `ssh deploy@djjessejay.ch`
2. Check disk usage: `df -h`
3. Find large files: `du -sh /* | sort -h`
4. Clean backup directory: `rm -rf /var/backups/deployments/backup_*_*.tar.gz` (keep last 5)
5. Clear old logs: `find /var/log -name "*.log" -mtime +30 -delete`

### Response Time Exceeding Threshold
**Symptom:** Response time > 2000ms warning

**Solution:**
1. Check system load: `ssh deploy@djjessejay.ch 'uptime'`
2. Check processes: `ssh deploy@djjessejay.ch 'ps aux | head -20'`
3. Monitor memory: `ssh deploy@djjessejay.ch 'free -h'`
4. Consider scaling or optimizing database queries

### Slack Webhook Invalid
**Symptom:** Slack notifications fail silently

**Solution:**
1. Verify webhook URL is correct in GitHub Secrets
2. Test webhook manually:
   ```bash
   curl -X POST -H 'Content-type: application/json' \
     --data '{"text":"Test"}' \
     $SLACK_WEBHOOK
   ```
3. Check Slack channel permissions
4. Regenerate webhook if necessary

## Performance Baseline

**Expected Response Times (after warming up):**
- Simple health endpoint: 50-150ms
- Detailed health endpoint: 100-200ms
- Metrics endpoint: 150-300ms

**System Capacity:**
- CPU load: < 2.0 on single core
- Memory usage: < 50%
- Disk usage: < 80%
- Network latency to health endpoints: < 100ms

## Future Enhancements

### Phase 4: Advanced Monitoring (Future)
- [ ] Database connectivity checks
- [ ] Redis cache health monitoring
- [ ] API endpoint performance tracking
- [ ] Custom metric collection
- [ ] Prometheus metrics export
- [ ] Grafana dashboard integration
- [ ] Email alerts for critical failures
- [ ] PagerDuty integration for on-call alerts

### Phase 5: Log Aggregation (Future)
- [ ] Centralized log collection
- [ ] Error rate tracking
- [ ] Performance profiling
- [ ] User experience monitoring

## Related Documentation

- [Deployment Automation](../README.md#deployment-automation)
- [Health Endpoints](../README.md#health-endpoints)
- [Rollback Procedures](../README.md#rollback)
- [GitHub Actions Workflows](.github/workflows/)

## Support

For monitoring-related issues:
1. Check GitHub Actions run logs
2. Review Slack alert messages
3. SSH into production and check system status
4. Contact infrastructure team for server-level troubleshooting
