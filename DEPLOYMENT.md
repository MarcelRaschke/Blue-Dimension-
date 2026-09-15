# Deployment Guide

Production deployment for djjessejay.ch using GitHub Actions.

## Automatic Deployment

Deployments trigger automatically on:
- **Merge to `main` branch** → Production deployment
- **Manual trigger** → Actions tab → Deploy workflow → "Run workflow"

## Manual Deployment Steps

### 1. Prepare Your Changes

```bash
# Create feature branch
git checkout -b feature/your-feature

# Make changes
echo "// your changes" >> yourfile.php

# Commit with conventional message
git commit -m "feat(module): your feature description"

# Push to remote
git push origin feature/your-feature
```

### 2. Create Pull Request

```bash
# Via GitHub CLI
gh pr create --title "feat: your feature" --body "Description of changes"

# Or via GitHub UI
# Visit https://github.com/MarcelRaschke/blue-dimension/pulls
# Click "New pull request"
```

### 3. Automated Checks

PR triggers:
- ✓ PHP syntax validation
- ✓ Commit message validation
- ✓ File size checks
- ✓ Code quality checks
- ✓ Security scanning

All checks must pass before merge.

### 4. Code Review & Merge

```bash
# Merge via GitHub CLI
gh pr merge <pr-number> --squash

# Or via GitHub UI
# Click "Merge pull request" button
```

### 5. Automatic Deployment

After merge to `main`:
1. Deploy workflow starts automatically
2. PHP syntax validation
3. Asset preparation
4. Deployment status updates
5. Success notification

---

## Pre-Deployment Validation

Run locally before pushing:

```bash
# PHP syntax
find . -name "*.php" -exec php -l {} \;

# Code formatting
php-cs-fixer fix --dry-run --diff

# Static analysis
phpstan analyse --level=5 .

# Security check
psalm --security-analysis
```

---

## Environment Setup

### Local Configuration

```bash
# 1. Clone repository
git clone https://github.com/MarcelRaschke/blue-dimension.git
cd blue-dimension

# 2. Create environment file
cp .env.example .env

# 3. Edit with production values
nano .env
```

### Required Environment Variables

```
# djjessejay.ch
SITE_NAME=Blue Dimension - DJ Jesse Jay
SITE_URL=https://djjessejay.ch
ADMIN_EMAIL=admin@djjessejay.ch

# Radio Stream
RADIO_STREAM_URL=https://radio-lora.ch/stream
PROGRAM_TITLE=Blue Dimension
PROGRAM_DAY=Thursday
PROGRAM_TIME=00:00-06:00

# (Optional) IPFS for decentralized hosting
IPFS_GATEWAY_URL=https://gateway.pinata.cloud/ipfs
IPFS_API_URL=http://localhost:5001

# (Optional) Web3/NFT gating
WEB3_PROVIDER=https://mainnet.infura.io/v3/YOUR_KEY
CONTRACT_ADDRESS=0x...
```

---

## GitHub Secrets Configuration

Set in Repository → Settings → Secrets and variables → Actions

### Required for Production Deploy

```
DEPLOY_KEY        → SSH private key for deployment server
DEPLOY_HOST       → Production server hostname (e.g., server.example.com)
DEPLOY_USER       → SSH user (e.g., deploy)
```

### Optional for Advanced Features

```
IPFS_API_TOKEN     → Pinata API credentials
WEB3_PRIVATE_KEY   → Ethereum account private key
INFURA_API_KEY     → Infura provider API key
```

### Adding Secrets via CLI

```bash
# SSH key
cat ~/.ssh/deploy_key | gh secret set DEPLOY_KEY

# Single value
gh secret set DEPLOY_HOST --body "server.djjessejay.ch"

# View all secrets
gh secret list
```

---

## Deployment Strategies

### Option 1: FTP/SFTP Deployment

```yaml
# Add to deploy.yml after validation
- name: Deploy via SFTP
  uses: wangyucode/sftp-upload-action@v2.0.2
  with:
    host: ${{ secrets.DEPLOY_HOST }}
    username: ${{ secrets.DEPLOY_USER }}
    privateKey: ${{ secrets.DEPLOY_KEY }}
    localDir: "."
    remoteDir: "/var/www/djjessejay.ch"
    sftpArgs: "-o ConnectTimeout=5"
```

### Option 2: Docker Registry Deployment

```yaml
# Push to container registry
- name: Build & Push Docker Image
  uses: docker/build-push-action@v5
  with:
    push: true
    tags: ghcr.io/marcelraschke/blue-dimension:latest
```

### Option 3: Cloud Platform (Vercel/Railway/Heroku)

```bash
# For PHP hosting, integrate with:
# - Railway.app (native PHP support)
# - Heroku (PHP buildpack)
# - Render.com (easy GitHub deployment)

# Example Railway integration:
gh secret set RAILWAY_TOKEN --body "YOUR_TOKEN"
```

---

## Rollback Procedures

### 1. Automatic Rollback (if configured)
Monitor deployment status in:
- Repository → Environments → production
- Click failed deployment → view logs
- Automated rollback if health checks fail

### 2. Manual Rollback

```bash
# View deployment history
gh deployment list

# Get previous commit
git log --oneline main | head -5

# Revert commit
git revert <commit-hash>
git push origin main

# This triggers new deployment with reverted code
```

### 3. Database Rollback (if applicable)

```bash
# SSH to server
ssh deploy@djjessejay.ch

# Restore from backup
cd /var/backups
./restore-database.sh <date>

# Verify deployment
curl https://djjessejay.ch/health-check
```

---

## Monitoring Post-Deployment

### GitHub Deployment Dashboard
1. Repository → Environments
2. Click "production"
3. View active deployment & history
4. Check logs for errors

### Application Health Checks
```bash
# Test endpoint
curl -I https://djjessejay.ch

# Check PHP status
curl https://djjessejay.ch/health.php

# View logs
ssh deploy@djjessejay.ch
tail -f /var/log/php/error.log
```

### Performance Monitoring
- Add monitoring service (e.g., UptimeRobot, Pingdom)
- Set up alerts for downtime
- Monitor response times & error rates

---

## Troubleshooting

### Deployment Fails in GitHub Actions

**Check logs:**
```bash
# View workflow run
gh run view <run-id>

# View job logs
gh run view <run-id> --log
```

**Common issues:**
- PHP syntax error → run `php -l *.php` locally
- Missing secrets → GitHub Settings → Secrets
- File permissions → check SSH key access
- Network issues → retry deployment manually

### Deployment Succeeds But Site Down

```bash
# SSH to server
ssh deploy@djjessejay.ch

# Check PHP-FPM
sudo systemctl status php8.3-fpm

# Check web server
sudo systemctl status nginx  # or apache2

# View application logs
tail -f /var/www/djjessejay.ch/storage/logs/app.log
```

### Database Connection Issues

```bash
# Test database connection
php -r "mysqli_connect('localhost', 'user', 'pass', 'db');"

# Verify credentials in .env
grep DB_ /var/www/djjessejay.ch/.env

# Check database server
sudo systemctl status mysql  # or mariadb
```

---

## Security Considerations

### Secrets Management
✓ Store in GitHub Secrets (encrypted at rest)
✗ Never commit `.env` or credentials to Git
✗ Never log secrets in workflow output

### SSH Key Security
```bash
# Generate deployment key (4096-bit RSA)
ssh-keygen -t rsa -b 4096 -f deploy_key -N ""

# Public key → authorized_keys on server
ssh-copy-id -i deploy_key.pub deploy@server

# Private key → GitHub Secret
cat deploy_key | gh secret set DEPLOY_KEY

# Secure local copy
chmod 600 deploy_key
```

### Firewall & Access Control
- Restrict SSH to GitHub Actions IP ranges
- Use VPN for sensitive deployments
- Enable branch protection on `main`
- Require code review before deployment

---

## Performance Optimization

### Pre-Deployment Checks
- Minify PHP/JavaScript
- Compress images/media
- Run static analysis
- Performance testing

### Post-Deployment Optimization
```bash
# Clear caches
redis-cli FLUSHALL  # if using Redis
rm -rf /var/www/djjessejay.ch/cache/*

# Optimize Composer autoloader
composer dump-autoload --optimize

# Warm up caches
php /var/www/djjessejay.ch/bin/console cache:warm
```

---

## Continuous Monitoring

### Set Up Alerts
1. GitHub Notifications (email/Slack)
2. UptimeRobot (99.9% SLA monitoring)
3. CloudFlare Analytics
4. Application error tracking

### Weekly Checks
- [ ] Review deployment history
- [ ] Check security updates
- [ ] Verify backups
- [ ] Monitor performance metrics
- [ ] Update dependencies via Dependabot PRs

---

**Next Steps:**
1. Configure GitHub Secrets for your environment
2. Test deployment with a feature branch
3. Set up monitoring/alerting
4. Document any custom deployment steps
5. Train team on deployment workflow

For questions, see [CI-CD.md](CI-CD.md) or repository Issues.
