# Deployment Best Practices & Troubleshooting

Comprehensive guide for managing Blue Dimension deployment automation, monitoring, and troubleshooting.

## Deployment Pipeline Overview

```
Code Push to main
    ↓
[1] Validate: PHP syntax, code quality checks
    ↓ (success)
[2] Backup: Create timestamped backup on server
    ↓ (success)
[3] Deploy: SFTP upload files to production
    ↓ (success)
[4] Verify: Health checks (2-min timeout, 5 retries)
    ├─ Health check passes
    │  ├─ ✅ Update GitHub Deployments: success
    │  ├─ ✅ Slack notification: success message
    │  └─ ✅ Keep application live
    └─ Health check fails
       ├─ ⚠️ Trigger automatic rollback
       ├─ ⚠️ Restore from backup
       ├─ ⚠️ Update GitHub Deployments: failure
       ├─ ⚠️ Slack notification: rollback alert
       └─ ⚠️ Manual intervention may be required
```

## Pre-Deployment Checklist

Before pushing code to main:

- [ ] Code tested locally or in development branch
- [ ] No secrets (.env files) included in commit
- [ ] PHP syntax validation passed: `php -l path/to/file.php`
- [ ] No breaking database schema changes without migration
- [ ] Third-party dependencies updated and scanned
- [ ] Commit message is clear and descriptive

### Local Testing Before Push

```bash
# Validate PHP syntax
find . -name "*.php" -type f ! -path "./vendor/*" -exec php -l {} \;

# Check for secrets
git diff --cached | grep -i "password\|secret\|token\|key"

# Test with local Docker stack
docker-compose -f docker-compose.dev.yml up -d
sleep 10
curl http://localhost:8000/health.php
docker-compose -f docker-compose.dev.yml down
```

## Monitoring Deployment Status

### GitHub Actions Dashboard

Monitor workflow runs:
```
https://github.com/MarcelRaschke/Blue-Dimension-/actions
```

Key workflows:
- **deploy.yml** - Production deployment pipeline
- **monitor.yml** - Continuous health monitoring (5-min interval)
- **build-and-push-image.yml** - GHCR image publishing
- **test-docker-setup.yml** - Docker validation tests

### GitHub Deployments Tab

Track deployment history:
```
https://github.com/MarcelRaschke/Blue-Dimension-/deployments
```

Shows:
- Deployment timestamp
- Commit hash and author
- Deployment status (success/failure)
- Health check results

### Slack Notifications

Real-time alerts for:
- ✅ Successful deployments
- ⚠️ Failed deployments with rollback
- ❌ Deployment errors
- 🔍 Health check failures (every 5 min)

## Rollback Procedures

### Automatic Rollback (Triggered by Failed Health Check)

When health checks fail during deployment:

1. Deployment detects health check failure
2. Automatic rollback initiated (< 5 seconds)
3. Previous version restored from backup
4. GitHub Deployments status updated: **failure**
5. Slack alert sent with rollback details

**Expected behavior:**
- Website remains accessible throughout
- User sees previous stable version
- No manual intervention required
- Team notified via Slack

### Manual Rollback via Git

If automated rollback fails or manual control needed:

```bash
# View deployment history
git log --oneline -10

# Revert to previous version
git revert <commit-hash>
git push origin main

# Or reset to specific commit (use with caution)
git reset --hard <commit-hash>
git push -f origin main
```

### Manual Rollback via SSH

Direct server intervention:

```bash
# SSH to production server
ssh deploy@djjessejay.ch

# List available backups
ls -lhS /var/backups/deployments/

# Restore specific backup
cd /var/backups/deployments/
tar -xzf deployment-<timestamp>.tar.gz -C /home/deploy/public_html/

# Restart PHP-FPM (if needed)
sudo systemctl restart php-fpm
```

## Health Monitoring

### Health Check Endpoints

**Simple Health Check:**
```bash
curl https://djjessejay.ch/health.php
# Returns: { "status": "healthy", "timestamp": "...", "php_version": "8.3.x" }
```

**Detailed Diagnostics:**
```bash
curl https://djjessejay.ch/health/check.json.php
# Returns: { "status": "ok", "database": "connected", "cache": "available", ... }
```

**Performance Metrics:**
```bash
curl https://djjessejay.ch/health/metrics.json.php
# Returns: { "uptime_seconds": 86400, "load_average": [0.1, 0.15, 0.2], "disk_usage": "45%" }
```

### Monitoring Workflow (Every 5 Minutes)

The `monitor.yml` workflow runs automatically:

```yaml
# Schedule: Every 5 minutes
# Checks: All three health endpoints
# Alert threshold: > 2 seconds response time or non-200 status
# Action: Slack notification if unhealthy
```

### Setting Up Alerts

Configure Slack webhook for monitoring:

```bash
# In GitHub Settings → Secrets and variables → Actions
SLACK_WEBHOOK = https://hooks.slack.com/services/YOUR/WEBHOOK/URL
```

Alert messages include:
- Response time
- HTTP status code
- Endpoint tested
- Server uptime
- Disk usage warnings

## Common Issues & Resolution

### Issue: Deployment Succeeds But Website Unresponsive

**Symptoms:**
- GitHub Deployments shows success
- Health check returned 200 OK
- Website throws 500 error

**Diagnosis:**
```bash
# Check server logs
tail -f /var/log/php-fpm/error.log
tail -f /var/log/nginx/error.log

# Test health endpoint
curl -v https://djjessejay.ch/health.php
curl -v https://djjessejay.ch/

# Check database connection
mysql -h localhost -u app -p jessejay -e "SELECT 1;"
```

**Resolution:**
1. Review recent code changes in failed commit
2. Check error logs for PHP/database errors
3. Verify .env file configuration
4. Trigger manual rollback if unresolvable
5. File GitHub issue with error logs

### Issue: Backup Creation Fails

**Symptoms:**
- Deploy workflow logs show backup warning
- Deployment continues (backup non-blocking)

**Diagnosis:**
```bash
# Check backup directory permissions
ls -ld /var/backups/deployments/

# Check available disk space
df -h /var/backups/

# Test backup manually
ssh deploy@djjessejay.ch "tar -czf /tmp/test.tar.gz /home/deploy/public_html/"
```

**Resolution:**
1. Ensure backup directory exists: `mkdir -p /var/backups/deployments/`
2. Check disk space: `df -h` (need > 5GB)
3. Verify SSH key permissions: `chmod 600 ~/.ssh/id_rsa`
4. Run backup script manually: `./scripts/backup-deployment.sh`

### Issue: Health Check Timeout (> 2 seconds)

**Symptoms:**
- Health check endpoint responds slowly
- Automatic rollback triggers
- Website performance degrades

**Diagnosis:**
```bash
# Check response time
time curl https://djjessejay.ch/health.php

# Monitor server load
ssh deploy@djjessejay.ch "top -b -n 1"

# Check PHP-FPM status
ssh deploy@djjessejay.ch "ps aux | grep php-fpm"
```

**Resolution:**
1. Identify slow queries in application
2. Optimize database indexes
3. Clear cache: `redis-cli FLUSHALL`
4. Increase PHP-FPM workers (if available)
5. Scale infrastructure (if persistent)

### Issue: SFTP Upload Fails

**Symptoms:**
- Deploy step reports "SFTP upload failed"
- Files not transferred to server
- Deployment marked as failure

**Diagnosis:**
```bash
# Test SSH connectivity
ssh -i /path/to/key deploy@djjessejay.ch "echo OK"

# Test SFTP access
sftp -i /path/to/key deploy@djjessejay.ch

# Check remote path exists
ssh deploy@djjessejay.ch "ls -la /home/deploy/public_html/"
```

**Resolution:**
1. Verify GitHub Secrets configured (DEPLOY_KEY, DEPLOY_HOST, DEPLOY_USER)
2. Check SSH key file permissions: `chmod 600 deploy_key`
3. Confirm SFTP path exists and is writable
4. Test SFTP manually to verify connectivity
5. Check firewall rules (port 22 open)

## Performance Optimization

### Deployment Speed

**Baseline (with caching):**
- Validation: ~30 seconds
- Backup: ~10 seconds
- SFTP upload: ~20-60 seconds (depends on file count)
- Health check: ~5 seconds
- Total: ~2-3 minutes

**Optimize:**
1. GitHub Actions cache reduces validation time
2. Exclude large files from deployment (via EXCLUDE in deploy.yml)
3. Use incremental backups (only changed files)
4. Parallel workflow jobs for independent steps

### Health Check Optimization

**Current baseline:**
- Response time: < 500ms
- Timeout threshold: 2 seconds
- Retry attempts: 5
- Interval: 30-60 seconds

**Recommendations:**
```php
// Optimize health.php endpoint
- Cache database connectivity check (5-min TTL)
- Lazy-load non-critical diagnostics
- Return minimal data (< 1KB)
- Use persistent connections
```

## Disaster Recovery

### Complete Backup Recovery

Restore entire deployment from backup:

```bash
ssh deploy@djjessejay.ch

# Stop web server
sudo systemctl stop nginx

# Restore backup
cd /var/backups/deployments/
BACKUP_FILE=$(ls -t deployment-*.tar.gz | head -1)
tar -xzf $BACKUP_FILE -C /home/deploy/

# Restart web server
sudo systemctl start nginx

# Verify health
curl http://localhost/health.php
```

### Database Recovery

If database is corrupted:

```bash
# Dump current database (for investigation)
mysqldump -u app -p jessejay > /tmp/corrupted.sql

# Restore from backup (if available)
mysql -u app -p jessejay < /var/backups/database/jessejay-backup.sql

# Verify tables
mysql -u app -p jessejay -e "SHOW TABLES;"
```

### Rollback to Specific Commit

Revert to known-good deployment:

```bash
# View history
git log --oneline | head -20

# Revert to specific commit
git revert <commit-hash>  # Creates new commit
git push origin main

# Or reset (use with extreme caution)
git reset --hard <commit-hash>
git push -f origin main
```

## Security Best Practices

### Secrets Management

✅ **DO:**
- Store secrets in GitHub Secrets (Settings → Secrets)
- Rotate deploy keys regularly (quarterly)
- Use SSH keys instead of passwords
- Enable branch protection on main

❌ **DON'T:**
- Commit .env files with secrets
- Share SSH keys in logs or messages
- Use same key across multiple services
- Store plaintext passwords in code

### Deployment Security

```bash
# Audit secrets in git history
git log -S "password" --oneline

# Check for leaked credentials
grep -r "password\|secret\|token" . --exclude-dir=.git

# Verify SSH key permissions
chmod 600 ~/.ssh/id_rsa
chmod 644 ~/.ssh/id_rsa.pub
```

### Access Control

- Deploy key has limited permissions (SFTP write-only to `/home/deploy/public_html/`)
- GitHub Actions use least-privilege principles
- SSH key rotation every 90 days
- Deploy user account has no shell access

## Maintenance Tasks

### Weekly

- [ ] Review deployment history in GitHub
- [ ] Check Slack alerts for anomalies
- [ ] Monitor application error logs
- [ ] Verify backup files exist

### Monthly

- [ ] Clean up old backups (keep last 30 days)
- [ ] Review security scanning results
- [ ] Test manual rollback procedure
- [ ] Update documentation

### Quarterly

- [ ] Rotate SSH/deploy keys
- [ ] Audit GitHub Secrets access
- [ ] Review performance metrics
- [ ] Plan infrastructure upgrades

## Reference

**Key Files:**
- `.github/workflows/deploy.yml` - Deployment pipeline
- `.github/workflows/monitor.yml` - Health monitoring
- `scripts/backup-deployment.sh` - Backup creation
- `scripts/restore-deployment.sh` - Rollback restoration
- `public/health.php` - Simple health check
- `public/health/check.json.php` - Detailed diagnostics
- `public/health/metrics.json.php` - Performance metrics

**External Resources:**
- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [SFTP Deployment Action](https://github.com/easingthemes/ssh-deploy)
- [Slack GitHub Integration](https://github.com/slackapi/slack-github-action)
- [MySQL Backup & Recovery](https://dev.mysql.com/doc/refman/8.0/en/backup-types.html)

**Support:**
- GitHub Issues: https://github.com/MarcelRaschke/Blue-Dimension-/issues
- Deployment Logs: https://github.com/MarcelRaschke/Blue-Dimension-/actions
- Server Logs: `/var/log/nginx/`, `/var/log/php-fpm/`
